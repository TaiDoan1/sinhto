/**
 * Facebook Messenger inbox cho CSKH — webhook nhận tin nhắn từ Facebook Page,
 * lưu vào fb_conversations/fb_messages, và route gửi trả lời qua Graph API.
 */
const GRAPH_API_VERSION = 'v19.0';

function parseConversationRow(row) {
  if (!row) return null;
  return { ...row, unreadCount: Number(row.unreadCount) || 0 };
}

function upsertConversation(db, psid, patch, cb) {
  db.get('SELECT * FROM fb_conversations WHERE psid = ?', [psid], (err, existing) => {
    if (err) return cb(err);
    const now = new Date().toISOString();
    if (existing) {
      const merged = {
        ...existing,
        customerName: patch.customerName || existing.customerName,
        lastMessageText: patch.lastMessageText ?? existing.lastMessageText,
        lastMessageAt: patch.lastMessageAt ?? existing.lastMessageAt,
        lastDirection: patch.lastDirection ?? existing.lastDirection,
        updatedAt: now,
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

function insertMessage(db, conversationId, direction, text, staff, cb) {
  const id = `FBMSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const msg = {
    id,
    conversationId,
    direction,
    text,
    staffId: staff?.staffId || null,
    staffName: staff?.staffName || null,
    createdAt: now,
  };
  db.run(
    `INSERT INTO fb_messages (id, conversationId, direction, text, staffId, staffName, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [msg.id, msg.conversationId, msg.direction, msg.text, msg.staffId, msg.staffName, msg.createdAt],
    (err) => cb(err, msg)
  );
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

async function sendToMessenger(psid, text) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('Chưa cấu hình FB_PAGE_ACCESS_TOKEN trên server');
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text },
        messaging_type: 'RESPONSE',
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Gửi tin nhắn Facebook thất bại');
  return data;
}

function registerFacebookRoutes(app, db, { broadcast }) {
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
        if (!psid || !text || event.message?.is_echo) return;

        const profileName = await fetchProfileName(psid);
        upsertConversation(
          db,
          psid,
          {
            customerName: profileName || undefined,
            lastMessageText: text,
            lastMessageAt: new Date().toISOString(),
            lastDirection: 'in',
            unreadCount: undefined, // tính riêng bên dưới
          },
          (err, conv) => {
            if (err) return console.error('fb upsertConversation error:', err.message);
            db.run('UPDATE fb_conversations SET unreadCount = unreadCount + 1 WHERE id = ?', [conv.id]);
            insertMessage(db, conv.id, 'in', text, null, (e2, msg) => {
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
        res.json(rows || []);
      }
    );
  });

  // --- Trả lời khách qua Messenger ---
  app.post('/api/facebook/conversations/:id/reply', (req, res) => {
    const { text, staffId, staffName } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });

    db.get('SELECT * FROM fb_conversations WHERE id = ?', [req.params.id], async (err, conv) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!conv) return res.status(404).json({ error: 'conversation not found' });

      try {
        await sendToMessenger(conv.psid, text.trim());
      } catch (e) {
        return res.status(502).json({ error: e.message });
      }

      const now = new Date().toISOString();
      insertMessage(db, conv.id, 'out', text.trim(), { staffId, staffName }, (e2, msg) => {
        if (e2) return res.status(500).json({ error: e2.message });
        db.run(
          'UPDATE fb_conversations SET lastMessageText = ?, lastMessageAt = ?, lastDirection = ?, unreadCount = 0, updatedAt = ? WHERE id = ?',
          [text.trim(), now, 'out', now, conv.id]
        );
        broadcast('FB_MESSAGE_CREATED', msg);
        broadcast('FB_CONVERSATION_UPDATED', { ...conv, lastMessageText: text.trim(), lastMessageAt: now, lastDirection: 'out', unreadCount: 0 });
        res.json(msg);
      });
    });
  });

  // --- Đánh dấu đã đọc / gán khách / liên kết SĐT ---
  app.patch('/api/facebook/conversations/:id', (req, res) => {
    const { markRead, linkedCustomerPhone, assignedStaffId, assignedStaffName, customerName } = req.body;
    db.get('SELECT * FROM fb_conversations WHERE id = ?', [req.params.id], (err, conv) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!conv) return res.status(404).json({ error: 'conversation not found' });

      const next = {
        unreadCount: markRead ? 0 : conv.unreadCount,
        linkedCustomerPhone: linkedCustomerPhone !== undefined ? linkedCustomerPhone : conv.linkedCustomerPhone,
        assignedStaffId: assignedStaffId !== undefined ? assignedStaffId : conv.assignedStaffId,
        assignedStaffName: assignedStaffName !== undefined ? assignedStaffName : conv.assignedStaffName,
        customerName: customerName || conv.customerName,
        updatedAt: new Date().toISOString(),
      };
      db.run(
        `UPDATE fb_conversations SET unreadCount = ?, linkedCustomerPhone = ?, assignedStaffId = ?,
         assignedStaffName = ?, customerName = ?, updatedAt = ? WHERE id = ?`,
        [next.unreadCount, next.linkedCustomerPhone, next.assignedStaffId, next.assignedStaffName, next.customerName, next.updatedAt, conv.id],
        (e2) => {
          if (e2) return res.status(500).json({ error: e2.message });
          const updated = { ...conv, ...next };
          broadcast('FB_CONVERSATION_UPDATED', updated);
          res.json(updated);
        }
      );
    });
  });
}

module.exports = { registerFacebookRoutes };
