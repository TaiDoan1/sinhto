/**
 * Tin trả lời lưu sẵn (saved replies) cho CSKH — thư viện tin nhắn mẫu dùng chung,
 * chèn nhanh vào ô soạn tin khi trả lời khách trên Facebook Messenger.
 */
function parseReplyRow(row) {
  if (!row) return null;
  return { ...row, usageCount: Number(row.usageCount) || 0 };
}

function registerSavedRepliesRoutes(app, db, { broadcast }) {
  app.get('/api/saved-replies', (req, res) => {
    db.all('SELECT * FROM saved_replies ORDER BY usageCount DESC, createdAt DESC', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map(parseReplyRow));
    });
  });

  app.post('/api/saved-replies', (req, res) => {
    const { title, message, imageUrl, createdBy } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'title, message là bắt buộc' });
    }
    const id = `REPLY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const reply = {
      id, title, message,
      imageUrl: imageUrl || '',
      usageCount: 0,
      createdBy: createdBy || '',
      createdAt: now,
      updatedAt: now,
    };
    db.run(
      `INSERT INTO saved_replies (id, title, message, imageUrl, usageCount, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [reply.id, reply.title, reply.message, reply.imageUrl, reply.usageCount, reply.createdBy, reply.createdAt, reply.updatedAt],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        broadcast('SAVED_REPLY_UPDATED', parseReplyRow(reply));
        res.json(parseReplyRow(reply));
      }
    );
  });

  app.patch('/api/saved-replies/:id', (req, res) => {
    db.get('SELECT * FROM saved_replies WHERE id = ?', [req.params.id], (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!existing) return res.status(404).json({ error: 'saved reply not found' });

      const next = {
        title: req.body.title !== undefined ? req.body.title : existing.title,
        message: req.body.message !== undefined ? req.body.message : existing.message,
        imageUrl: req.body.imageUrl !== undefined ? req.body.imageUrl : existing.imageUrl,
        usageCount: existing.usageCount,
        updatedAt: new Date().toISOString(),
      };
      db.run(
        `UPDATE saved_replies SET title=?, message=?, imageUrl=?, updatedAt=? WHERE id=?`,
        [next.title, next.message, next.imageUrl, next.updatedAt, req.params.id],
        (e2) => {
          if (e2) return res.status(500).json({ error: e2.message });
          const updated = parseReplyRow({ ...existing, ...next });
          broadcast('SAVED_REPLY_UPDATED', updated);
          res.json(updated);
        }
      );
    });
  });

  // Bấm dùng 1 mẫu tin — tăng usageCount để sắp xếp "Thường xuyên được sử dụng".
  app.post('/api/saved-replies/:id/use', (req, res) => {
    db.run('UPDATE saved_replies SET usageCount = usageCount + 1 WHERE id = ?', [req.params.id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    });
  });

  app.delete('/api/saved-replies/:id', (req, res) => {
    db.run('DELETE FROM saved_replies WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      broadcast('SAVED_REPLY_DELETED', { id: req.params.id });
      res.json({ ok: true });
    });
  });
}

module.exports = { registerSavedRepliesRoutes };
