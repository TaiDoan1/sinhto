/**
 * Nhắn tin hàng loạt (bulk campaign) qua Facebook Messenger cho CSKH.
 *
 * Ý tưởng: CSKH soạn sẵn nhiều câu chào khác nhau (5–10 câu), chọn danh sách khách
 * (lọc theo ngày thêm khách / ngày nhắn gần nhất / tag / CSKH phụ trách), rồi gửi.
 * Mỗi khách nhận NGẪU NHIÊN 1 câu theo kiểu "chia đều, không lặp liên tiếp" — vừa tự
 * nhiên hơn vừa giảm rủi ro bị Facebook đánh spam vì gửi cùng 1 đoạn text hàng loạt.
 *
 * LƯU Ý CHÍNH SÁCH FACEBOOK 24H: chỉ được chủ động nhắn khách trong vòng 24h kể từ tin
 * cuối CỦA KHÁCH (inbound). Ngoài 24h, Graph API sẽ trả lỗi và tin đó tính là "thất bại"
 * — đây là hàng rào tự nhiên, ta cảnh báo trên UI trước khi gửi.
 *
 * Lưu ý SQL: dùng định danh camelCase KHÔNG có dấu ngoặc kép — lớp adapter (db.js toPg)
 * sẽ tự thêm ngoặc kép khi chạy trên Postgres; tự thêm ngoặc ở đây sẽ bị nhân đôi và lỗi.
 */
const { sendToMessenger } = require('./facebookApi');

const SEND_DELAY_MS = 800; // giãn cách giữa mỗi tin để tránh bị Facebook giới hạn tần suất
const WINDOW_24H_MS = 24 * 60 * 60 * 1000;

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// Chiến dịch đang chạy nền bị YÊU CẦU DỪNG (in-memory, cùng process với vòng lặp gửi). Vòng lặp
// kiểm tra Set này mỗi vòng để ngưng gửi các tin còn lại ngay lập tức.
const cancelledCampaigns = new Set();
function parseJsonArray(raw) {
  try {
    const t = JSON.parse(raw || '[]');
    return Array.isArray(t) ? t : [];
  } catch {
    return [];
  }
}

function publicBaseUrl(req) {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `${req.protocol}://${req.get('host')}`;
}

// Fisher–Yates shuffle (không dùng để bảo mật, chỉ để trộn thứ tự câu chào)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Gán câu chào cho từng khách: "chia đều, không lặp liên tiếp".
 * Trộn ngẫu nhiên danh sách câu chào rồi phát theo vòng tròn — mỗi câu được dùng số lần
 * chênh nhau tối đa 1, và 2 khách liền nhau không bao giờ nhận cùng 1 câu (khi có ≥2 câu).
 */
function buildAssignments(messages, count) {
  const bag = shuffle(messages);
  const out = [];
  for (let i = 0; i < count; i++) out.push(bag[i % bag.length]);
  return out;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS bulk_campaigns (
    id TEXT PRIMARY KEY,
    createdBy TEXT,
    createdByName TEXT,
    messages TEXT DEFAULT '[]',
    imageUrl TEXT DEFAULT '',
    totalRecipients INTEGER DEFAULT 0,
    sentCount INTEGER DEFAULT 0,
    failedCount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'sending',
    createdAt TEXT,
    finishedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS bulk_campaign_recipients (
    id TEXT PRIMARY KEY,
    campaignId TEXT,
    conversationId TEXT,
    psid TEXT,
    customerName TEXT,
    messageUsed TEXT,
    status TEXT DEFAULT 'pending',
    error TEXT,
    sentAt TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bulkrecip_campaign ON bulk_campaign_recipients(campaignId)`,
];

async function ensureBulkSchema(db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await dbRun(db, sql).catch(() => {});
  }
}

// Lấy danh sách khách ứng viên (có hội thoại Facebook) kèm thời điểm khách nhắn gần nhất
// (lastInboundAt) để tính cửa sổ 24h chính xác.
async function loadCandidates(db) {
  const rows = await dbAll(
    db,
    `SELECT c.*,
       (SELECT MAX(m.createdAt) FROM fb_messages m
         WHERE m.conversationId = c.id AND m.direction = 'in') AS lastInboundAt
     FROM fb_conversations c
     ORDER BY c.lastMessageAt DESC`
  );
  const now = Date.now();
  return rows.map((r) => {
    const inboundTs = r.lastInboundAt ? new Date(r.lastInboundAt).getTime() : NaN;
    const within24h = !Number.isNaN(inboundTs) && now - inboundTs < WINDOW_24H_MS;
    return {
      id: r.id,
      psid: r.psid,
      customerName: r.customerName,
      linkedCustomerPhone: r.linkedCustomerPhone || null,
      lastMessageAt: r.lastMessageAt,
      lastInboundAt: r.lastInboundAt || null,
      createdAt: r.createdAt,
      assignedStaffId: r.assignedStaffId || null,
      tags: parseJsonArray(r.tags),
      within24h,
    };
  });
}

// Ghi lại tin đã gửi vào luồng hội thoại để CSKH thấy trong tab "Tin nhắn FB", và báo realtime.
async function recordOutbound(db, conv, { text, imageUrl }, broadcast) {
  const now = new Date().toISOString();
  const msgId = `FBMSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const attachments = imageUrl ? [imageUrl] : [];
  const previewText = text || (imageUrl ? '[Hình ảnh]' : '');
  await dbRun(
    db,
    `INSERT INTO fb_messages (id, conversationId, direction, text, staffId, staffName, createdAt, attachments)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [msgId, conv.id, 'out', text || '', null, 'CSKH (hàng loạt)', now, JSON.stringify(attachments)]
  );
  await dbRun(
    db,
    `UPDATE fb_conversations SET lastMessageText = ?, lastMessageAt = ?, lastDirection = ?, updatedAt = ? WHERE id = ?`,
    [previewText, now, 'out', now, conv.id]
  );
  broadcast?.('FB_MESSAGE_CREATED', {
    id: msgId, conversationId: conv.id, direction: 'out', text: text || '',
    attachments, staffId: null, staffName: 'CSKH (hàng loạt)', createdAt: now,
  });
  broadcast?.('FB_CONVERSATION_UPDATED', {
    ...conv, lastMessageText: previewText, lastMessageAt: now, lastDirection: 'out',
  });
}

// Chạy nền: gửi lần lượt có giãn cách, cập nhật tiến trình + phát SSE.
async function runCampaign(db, campaignId, recipients, messages, fullImageUrl, broadcast) {
  const assignments = buildAssignments(messages.length ? messages : [''], recipients.length);
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    if (cancelledCampaigns.has(campaignId)) break; // DỪNG: ngưng gửi các tin còn lại
    const conv = recipients[i];
    const text = assignments[i];
    const recipId = `BULKR-${Date.now()}-${i}`;
    const now = new Date().toISOString();
    try {
      if (fullImageUrl) await sendToMessenger(conv.psid, { imageUrl: fullImageUrl });
      if (text) await sendToMessenger(conv.psid, { text });
      await recordOutbound(db, conv, { text, imageUrl: fullImageUrl }, broadcast);
      sentCount++;
      await dbRun(
        db,
        `INSERT INTO bulk_campaign_recipients (id, campaignId, conversationId, psid, customerName, messageUsed, status, error, sentAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [recipId, campaignId, conv.id, conv.psid, conv.customerName, text, 'sent', null, now]
      );
    } catch (e) {
      failedCount++;
      await dbRun(
        db,
        `INSERT INTO bulk_campaign_recipients (id, campaignId, conversationId, psid, customerName, messageUsed, status, error, sentAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [recipId, campaignId, conv.id, conv.psid, conv.customerName, text, 'failed', e.message || 'Lỗi gửi', now]
      ).catch(() => {});
    }
    await dbRun(db, `UPDATE bulk_campaigns SET sentCount = ?, failedCount = ? WHERE id = ?`, [sentCount, failedCount, campaignId]).catch(() => {});
    broadcast?.('BULK_CAMPAIGN_PROGRESS', { campaignId, sentCount, failedCount, total: recipients.length, done: false });

    if (i < recipients.length - 1) await sleep(SEND_DELAY_MS);
  }

  const finishedAt = new Date().toISOString();
  const wasCancelled = cancelledCampaigns.delete(campaignId);
  const status = wasCancelled
    ? 'cancelled'
    : (failedCount === recipients.length && recipients.length > 0 ? 'error' : 'done');
  await dbRun(db, `UPDATE bulk_campaigns SET status = ?, finishedAt = ? WHERE id = ?`, [status, finishedAt, campaignId]).catch(() => {});
  broadcast?.('BULK_CAMPAIGN_PROGRESS', { campaignId, sentCount, failedCount, total: recipients.length, done: true, status });
}

function registerBulkMessageRoutes(app, db, { broadcast }) {
  ensureBulkSchema(db).catch((e) => console.error('bulk schema init error:', e.message));

  // Danh sách khách ứng viên để chọn gửi (kèm cờ within24h). Lọc theo ngày/tag làm ở frontend
  // vì tập hội thoại nhỏ; ở đây trả toàn bộ đã kèm dữ liệu cần thiết.
  app.get('/api/bulk-messages/recipients', async (req, res) => {
    try {
      const list = await loadCandidates(db);
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bắt đầu 1 chiến dịch gửi hàng loạt (chạy nền). Trả về campaignId ngay.
  app.post('/api/bulk-messages/send', async (req, res) => {
    const { messages, imageUrl, conversationIds, staffId, staffName } = req.body || {};
    const cleanMessages = Array.isArray(messages)
      ? messages.map((m) => (m || '').trim()).filter(Boolean)
      : [];
    const ids = Array.isArray(conversationIds) ? [...new Set(conversationIds)] : [];

    if (cleanMessages.length === 0 && !imageUrl) {
      return res.status(400).json({ error: 'Cần ít nhất 1 câu chào hoặc 1 ảnh để gửi' });
    }
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Chưa chọn khách hàng nào để gửi' });
    }

    try {
      // Lấy đúng các hội thoại được chọn (chỉ khách có psid mới gửi được).
      const all = await dbAll(db, 'SELECT * FROM fb_conversations');
      const byId = new Map(all.map((c) => [c.id, c]));
      const recipients = ids.map((id) => byId.get(id)).filter((c) => c && c.psid);
      if (recipients.length === 0) {
        return res.status(400).json({ error: 'Không có khách hợp lệ (thiếu Messenger id) để gửi' });
      }

      const fullImageUrl = imageUrl ? `${publicBaseUrl(req)}${imageUrl}` : null;
      const campaignId = `BULK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      await dbRun(
        db,
        `INSERT INTO bulk_campaigns (id, createdBy, createdByName, messages, imageUrl, totalRecipients, sentCount, failedCount, status, createdAt, finishedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [campaignId, staffId || '', staffName || '', JSON.stringify(cleanMessages), imageUrl || '', recipients.length, 0, 0, 'sending', now, null]
      );

      // Chạy nền — không await để trả response ngay; lỗi được ghi vào từng recipient.
      runCampaign(db, campaignId, recipients, cleanMessages, fullImageUrl, broadcast)
        .catch((e) => console.error('bulk runCampaign error:', e.message));

      res.json({ campaignId, total: recipients.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // DỪNG GẤP 1 chiến dịch đang gửi: đánh dấu hủy (vòng lặp nền sẽ ngưng gửi tin còn lại ngay vòng
  // kế tiếp) + set trạng thái 'cancelled'. Tin đã gửi rồi thì không thu hồi được.
  app.post('/api/bulk-messages/:id/cancel', async (req, res) => {
    const { id } = req.params;
    cancelledCampaigns.add(id);
    try {
      await dbRun(
        db,
        `UPDATE bulk_campaigns SET status = 'cancelled', finishedAt = ? WHERE id = ? AND status = 'sending'`,
        [new Date().toISOString(), id]
      );
    } catch (e) { /* vẫn báo hủy — vòng lặp sẽ tự dừng nhờ cancelledCampaigns */ }
    broadcast?.('BULK_CAMPAIGN_PROGRESS', { campaignId: id, done: true, status: 'cancelled' });
    res.json({ ok: true, cancelled: true });
  });

  // Lịch sử chiến dịch (mới nhất trước)
  app.get('/api/bulk-messages/campaigns', async (req, res) => {
    try {
      const rows = await dbAll(db, 'SELECT * FROM bulk_campaigns ORDER BY createdAt DESC LIMIT 100');
      res.json((rows || []).map((r) => ({ ...r, messages: parseJsonArray(r.messages) })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Chi tiết 1 chiến dịch + danh sách người nhận
  app.get('/api/bulk-messages/campaigns/:id', async (req, res) => {
    try {
      const campaign = await dbGet(db, 'SELECT * FROM bulk_campaigns WHERE id = ?', [req.params.id]);
      if (!campaign) return res.status(404).json({ error: 'campaign not found' });
      const recipients = await dbAll(
        db,
        'SELECT * FROM bulk_campaign_recipients WHERE campaignId = ? ORDER BY sentAt ASC',
        [req.params.id]
      );
      res.json({ ...campaign, messages: parseJsonArray(campaign.messages), recipients });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

module.exports = { registerBulkMessageRoutes };
