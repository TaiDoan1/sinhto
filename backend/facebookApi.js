/**
 * Facebook Messenger inbox cho CSKH — webhook nhận tin nhắn từ Facebook Page,
 * lưu vào fb_conversations/fb_messages, và route gửi trả lời qua Graph API.
 */
const GRAPH_API_VERSION = 'v19.0';

function parseConversationRow(row) {
  if (!row) return null;
  let tags = [];
  try {
    tags = JSON.parse(row.tags || '[]');
  } catch {
    tags = [];
  }
  return { ...row, unreadCount: Number(row.unreadCount) || 0, tags };
}

function upsertConversation(db, psid, patch, cb) {
  db.get('SELECT * FROM fb_conversations WHERE psid = ?', [psid], (err, existing) => {
    if (err) return cb(err);
    const now = new Date().toISOString();
    if (existing) {
      let existingTags = [];
      try {
        existingTags = JSON.parse(existing.tags || '[]');
      } catch {
        existingTags = [];
      }
      const merged = {
        ...existing,
        customerName: patch.customerName || existing.customerName,
        lastMessageText: patch.lastMessageText ?? existing.lastMessageText,
        lastMessageAt: patch.lastMessageAt ?? existing.lastMessageAt,
        lastDirection: patch.lastDirection ?? existing.lastDirection,
        updatedAt: now,
        tags: existingTags,
      };
      db.run(
        `UPDATE fb_conversations SET customerName = ?, lastMessageText = ?, lastMessageAt = ?,
         lastDirection = ?, updatedAt = ? WHERE id = ?`,
        [
          merged.customerName,
          merged.lastMessageText,
          merged.lastMessageAt,
          merged.lastDirection,
          now,
          existing.id,
        ],
        (e2) => cb(e2, merged)
      );
    } else {
      const id = `FBCONV-${Date.now()}`;
      const conv = {
        id,
        psid,
        customerName: patch.customerName || 'Khách Facebook',
        profilePic: patch.profilePic || '',
        linkedCustomerPhone: null,
        lastMessageText: patch.lastMessageText || '',
        lastMessageAt: patch.lastMessageAt || now,
        lastDirection: patch.lastDirection || 'in',
        unreadCount: patch.unreadCount || 0,
        assignedStaffId: null,
        assignedStaffName: null,
        tags: [],
        createdAt: now,
        updatedAt: now,
      };
      db.run(
        `INSERT INTO fb_conversations (id, psid, customerName, profilePic, linkedCustomerPhone,
         lastMessageText, lastMessageAt, lastDirection, unreadCount, assignedStaffId, assignedStaffName,
         createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conv.id, conv.psid, conv.customerName, conv.profilePic, conv.linkedCustomerPhone,
          conv.lastMessageText, conv.lastMessageAt, conv.lastDirection, conv.unreadCount,
          conv.assignedStaffId, conv.assignedStaffName, conv.createdAt, conv.updatedAt,
        ],
        (e2) => cb(e2, conv)
      );
    }
  });
}

function insertMessage(db, conversationId, direction, text, attachments, staff, cb) {
  const id = `FBMSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const msg = {
    id,
    conversationId,
    direction,
    text,
    attachments: attachments || [],
    staffId: staff?.staffId || null,
    staffName: staff?.staffName || null,
    createdAt: now,
  };
  db.run(
    `INSERT INTO fb_messages (id, conversationId, direction, text, staffId, staffName, createdAt, attachments)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [msg.id, msg.conversationId, msg.direction, msg.text, msg.staffId, msg.staffName, msg.createdAt, JSON.stringify(msg.attachments)],
    (err) => cb(err, msg)
  );
}

function parseMessageRow(row) {
  if (!row) return null;
  let attachments = [];
  try {
    attachments = JSON.parse(row.attachments || '[]');
  } catch {
    attachments = [];
  }
  return { ...row, attachments };
}

async function fetchProfileName(psid) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${psid}?fields=first_name,last_name&access_token=${token}`
    );
    const data = await res.json();
    if (data.first_name) return `${data.first_name} ${data.last_name || ''}`.trim();
  } catch (e) {
    console.error('fb fetchProfileName error:', e.message);
  }
  return null;
}

async function sendToMessenger(psid, { text, imageUrl } = {}) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('Chưa cấu hình FB_PAGE_ACCESS_TOKEN trên server');
  const message = imageUrl
    ? { attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } } }
    : { text };
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: psid },
        message,
        messaging_type: 'RESPONSE',
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Gửi tin nhắn Facebook thất bại');
  return data;
}

function publicBaseUrl(req) {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `${req.protocol}://${req.get('host')}`;
}

function dbGet(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbRun(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function upsertConversationAsync(db, psid, patch) {
  return new Promise((resolve, reject) => {
    upsertConversation(db, psid, patch, (err, conv) => (err ? reject(err) : resolve(conv)));
  });
}

// Nạp lại lịch sử hội thoại cũ (trước khi webhook được kích hoạt) qua Facebook Conversations API.
// Cũng dùng làm cơ chế đồng bộ định kỳ thay cho webhook thật (App chưa qua App Review nên
// Facebook không tự đẩy tin nhắn khách thật tới webhook — xem ghi chú ở nơi gọi setInterval).
async function backfillConversations(db, { maxPages = 1, broadcast } = {}) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;
  if (!token) throw new Error('Chưa cấu hình FB_PAGE_ACCESS_TOKEN trên server');
  if (!pageId) throw new Error('Chưa cấu hình FB_PAGE_ID trên server');

  // Chỉ lấy ~25-30 hội thoại gần nhất (đủ dùng, tránh kéo cả trăm hội thoại cũ không cần thiết).
  let url =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/conversations` +
    `?fields=participants,updated_time,messages.limit(25){message,from,created_time,attachments}&limit=25&access_token=${token}`;

  let conversations = 0;
  let messages = 0;

  for (let page = 0; page < maxPages && url; page++) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Lỗi Facebook Conversations API');

    for (const conv of data.data || []) {
      const customer = (conv.participants?.data || []).find((p) => p.id !== pageId);
      if (!customer) continue;
      const msgs = (conv.messages?.data || []).slice().reverse(); // API trả mới→cũ, đảo lại thành cũ→mới
      if (!msgs.length) continue;

      const last = msgs[msgs.length - 1];
      const lastAttachments = (last.attachments?.data || []).map((a) => a.image_data?.url).filter(Boolean);
      const lastIsInbound = last.from?.id !== pageId;
      const existedBefore = !!(await dbGet(db, 'SELECT id FROM fb_conversations WHERE psid = ?', [customer.id]));
      const convRow = await upsertConversationAsync(db, customer.id, {
        customerName: customer.name,
        lastMessageText: last.message || (lastAttachments.length ? '[Hình ảnh]' : ''),
        lastMessageAt: last.created_time,
        lastDirection: lastIsInbound ? 'in' : 'out',
      });
      conversations++;

      let newInbound = 0;
      for (const m of msgs) {
        const attachments = (m.attachments?.data || []).map((a) => a.image_data?.url).filter(Boolean);
        if (!m.message && !attachments.length) continue;
        const localId = `FBMSG-${m.id}`;
        const existing = await dbGet(db, 'SELECT id FROM fb_messages WHERE id = ?', [localId]);
        if (existing) continue;
        const direction = m.from?.id === pageId ? 'out' : 'in';
        await dbRun(
          db,
          `INSERT INTO fb_messages (id, conversationId, direction, text, staffId, staffName, createdAt, attachments)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [localId, convRow.id, direction, m.message || '', null, null, m.created_time, JSON.stringify(attachments)]
        );
        messages++;
        if (direction === 'in') newInbound++;
        broadcast?.('FB_MESSAGE_CREATED', {
          id: localId, conversationId: convRow.id, direction, text: m.message || '', attachments,
          staffId: null, staffName: null, createdAt: m.created_time,
        });
      }

      // Chỉ báo "chưa đọc" khi: hội thoại đã từng thấy trước đó (không phải lần nạp lịch sử đầu
      // tiên — vì phần lớn tin cũ đó đã được trả lời từ trước) VÀ tin mới nhất vẫn là của khách
      // (chưa được ai trả lời) — tránh báo nhầm những hội thoại đã trả lời rồi thành "chưa đọc".
      if (newInbound > 0 && existedBefore && lastIsInbound) {
        await dbRun(db, 'UPDATE fb_conversations SET unreadCount = unreadCount + ? WHERE id = ?', [newInbound, convRow.id]);
        const updated = await dbGet(db, 'SELECT * FROM fb_conversations WHERE id = ?', [convRow.id]);
        broadcast?.('FB_CONVERSATION_UPDATED', parseConversationRow(updated));
      } else if (!lastIsInbound) {
        await dbRun(db, 'UPDATE fb_conversations SET unreadCount = 0 WHERE id = ?', [convRow.id]);
      }
    }

    url = data.paging?.next || null;
  }

  return { conversations, messages };
}

function registerFacebookRoutes(app, db, { broadcast }) {
  // Dọn dữ liệu cũ: các bản ghi đồng bộ trước khi có logic chống báo nhầm "chưa đọc" có thể
  // đang lưu unreadCount > 0 dù tin cuối cùng đã là của staff (đã trả lời) — chạy 1 lần khi khởi động.
  db.run("UPDATE fb_conversations SET unreadCount = 0 WHERE lastDirection = 'out' AND unreadCount > 0", [], (err) => {
    if (err) console.error('fb cleanup unreadCount error:', err.message);
  });

  // --- Webhook verify (Meta gọi khi bạn đăng ký webhook URL) ---
  app.get('/api/facebook/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  });

  // --- Webhook nhận sự kiện tin nhắn ---
  app.post('/api/facebook/webhook', (req, res) => {
    const body = req.body;
    if (body.object !== 'page') return res.sendStatus(404);

    (body.entry || []).forEach((entry) => {
      (entry.messaging || []).forEach(async (event) => {
        const psid = event.sender?.id;
        const text = event.message?.text;
        const attachments = (event.message?.attachments || [])
          .filter((a) => a.type === 'image')
          .map((a) => a.payload?.url)
          .filter(Boolean);
        console.log('[fb webhook] event:', JSON.stringify({ psid, text, attachments, isEcho: event.message?.is_echo }));
        if (!psid || (!text && !attachments.length) || event.message?.is_echo) return;

        const profileName = await fetchProfileName(psid);
        upsertConversation(
          db,
          psid,
          {
            customerName: profileName || undefined,
            lastMessageText: text || (attachments.length ? '[Hình ảnh]' : ''),
            lastMessageAt: new Date().toISOString(),
            lastDirection: 'in',
            unreadCount: undefined, // tính riêng bên dưới
          },
          (err, conv) => {
            if (err) return console.error('fb upsertConversation error:', err.message);
            db.run('UPDATE fb_conversations SET unreadCount = unreadCount + 1 WHERE id = ?', [conv.id]);
            insertMessage(db, conv.id, 'in', text || '', attachments, null, (e2, msg) => {
              if (e2) return console.error('fb insertMessage error:', e2.message);
              broadcast('FB_MESSAGE_CREATED', msg);
              broadcast('FB_CONVERSATION_UPDATED', { ...conv, unreadCount: (conv.unreadCount || 0) + 1 });
            });
          }
        );
      });
    });

    res.sendStatus(200);
  });

  // --- Nạp lại lịch sử hội thoại cũ từ Facebook ---
  app.post('/api/facebook/backfill', async (req, res) => {
    try {
      const result = await backfillConversations(db, { broadcast });
      res.json(result);
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  // --- Danh sách hội thoại ---
  app.get('/api/facebook/conversations', (req, res) => {
    db.all('SELECT * FROM fb_conversations ORDER BY lastMessageAt DESC', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map(parseConversationRow));
    });
  });

  // --- Tin nhắn trong 1 hội thoại ---
  app.get('/api/facebook/conversations/:id/messages', (req, res) => {
    db.all(
      'SELECT * FROM fb_messages WHERE conversationId = ? ORDER BY createdAt ASC',
      [req.params.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json((rows || []).map(parseMessageRow));
      }
    );
  });

  // --- Trả lời khách qua Messenger (text và/hoặc ảnh — imageUrl là đường dẫn tương đối đã upload) ---
  app.post('/api/facebook/conversations/:id/reply', (req, res) => {
    const { text, imageUrl, staffId, staffName } = req.body;
    const trimmedText = (text || '').trim();
    if (!trimmedText && !imageUrl) return res.status(400).json({ error: 'text hoặc imageUrl bắt buộc' });

    db.get('SELECT * FROM fb_conversations WHERE id = ?', [req.params.id], async (err, conv) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!conv) return res.status(404).json({ error: 'conversation not found' });

      const fullImageUrl = imageUrl ? `${publicBaseUrl(req)}${imageUrl}` : null;

      try {
        if (fullImageUrl) await sendToMessenger(conv.psid, { imageUrl: fullImageUrl });
        if (trimmedText) await sendToMessenger(conv.psid, { text: trimmedText });
      } catch (e) {
        return res.status(502).json({ error: e.message });
      }

      const now = new Date().toISOString();
      const attachments = fullImageUrl ? [fullImageUrl] : [];
      const previewText = trimmedText || (fullImageUrl ? '[Hình ảnh]' : '');
      insertMessage(db, conv.id, 'out', trimmedText, attachments, { staffId, staffName }, (e2, msg) => {
        if (e2) return res.status(500).json({ error: e2.message });
        db.run(
          'UPDATE fb_conversations SET lastMessageText = ?, lastMessageAt = ?, lastDirection = ?, unreadCount = 0, updatedAt = ? WHERE id = ?',
          [previewText, now, 'out', now, conv.id]
        );
        broadcast('FB_MESSAGE_CREATED', msg);
        broadcast('FB_CONVERSATION_UPDATED', { ...conv, lastMessageText: previewText, lastMessageAt: now, lastDirection: 'out', unreadCount: 0 });
        res.json(msg);
      });
    });
  });

  // --- Đánh dấu đã đọc / gán khách / liên kết SĐT ---
  app.patch('/api/facebook/conversations/:id', (req, res) => {
    const { markRead, linkedCustomerPhone, assignedStaffId, assignedStaffName, customerName, tags } = req.body;
    db.get('SELECT * FROM fb_conversations WHERE id = ?', [req.params.id], (err, conv) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!conv) return res.status(404).json({ error: 'conversation not found' });

      const next = {
        unreadCount: markRead ? 0 : conv.unreadCount,
        linkedCustomerPhone: linkedCustomerPhone !== undefined ? linkedCustomerPhone : conv.linkedCustomerPhone,
        assignedStaffId: assignedStaffId !== undefined ? assignedStaffId : conv.assignedStaffId,
        assignedStaffName: assignedStaffName !== undefined ? assignedStaffName : conv.assignedStaffName,
        customerName: customerName || conv.customerName,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : conv.tags,
        updatedAt: new Date().toISOString(),
      };
      db.run(
        `UPDATE fb_conversations SET unreadCount = ?, linkedCustomerPhone = ?, assignedStaffId = ?,
         assignedStaffName = ?, customerName = ?, tags = ?, updatedAt = ? WHERE id = ?`,
        [next.unreadCount, next.linkedCustomerPhone, next.assignedStaffId, next.assignedStaffName, next.customerName, next.tags, next.updatedAt, conv.id],
        (e2) => {
          if (e2) return res.status(500).json({ error: e2.message });
          const updated = parseConversationRow({ ...conv, ...next });
          broadcast('FB_CONVERSATION_UPDATED', updated);
          res.json(updated);
        }
      );
    });
  });

  // App chưa qua Facebook App Review nên webhook chỉ nhận được tin của Admin/Tester —
  // tự động đồng bộ định kỳ qua Conversations API để bù cho tin nhắn khách hàng thật.
  if (process.env.FB_PAGE_ACCESS_TOKEN && process.env.FB_PAGE_ID) {
    setInterval(() => {
      backfillConversations(db, { broadcast }).catch((e) => console.error('fb auto-poll error:', e.message));
    }, 10000);
  }
}

module.exports = { registerFacebookRoutes, sendToMessenger, insertMessage };
