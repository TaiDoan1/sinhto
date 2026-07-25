/**
 * Chương trình khuyến mãi tặng quà (VD: mua 1 ly bất kỳ tặng 1 ly 360ml 20g protein,
 * giới hạn 1000 ly, áp dụng 1 chi nhánh) — Admin tạo chương trình, POS thu SĐT khách và
 * gợi ý tặng khi còn hạn mức, không cần khách có điểm/tài khoản thành viên.
 */
const GIFT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm I,O,0,1
function generateGiftCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += GIFT_CODE_CHARS[Math.floor(Math.random() * GIFT_CODE_CHARS.length)];
  }
  return code;
}

function parseCampaignRow(row) {
  if (!row) return null;
  return {
    ...row,
    giftProtein: Number(row.giftProtein) || 0,
    totalLimit: Number(row.totalLimit) || 0,
    redeemedCount: Number(row.redeemedCount) || 0,
    active: !!row.active,
  };
}

function registerGiftCampaignRoutes(app, db, { broadcast }) {
  // --- Danh sách chương trình (POS lọc theo chi nhánh + đang bật) ---
  app.get('/api/gift-campaigns', (req, res) => {
    const { branchId, active } = req.query;
    let sql = 'SELECT * FROM gift_campaigns WHERE 1=1';
    const params = [];
    if (branchId) {
      sql += ' AND branchId = ?';
      params.push(branchId);
    }
    if (active !== undefined) {
      sql += ' AND active = ?';
      params.push(active === 'true' || active === '1' ? 1 : 0);
    }
    sql += ' ORDER BY createdAt DESC';
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map(parseCampaignRow));
    });
  });

  // --- Tạo chương trình mới (Admin) ---
  app.post('/api/gift-campaigns', (req, res) => {
    const { name, branchId, giftSize, giftProtein, totalLimit } = req.body;
    if (!name || !branchId || !totalLimit) {
      return res.status(400).json({ error: 'name, branchId, totalLimit là bắt buộc' });
    }
    const id = `GIFT-${Date.now()}`;
    const now = new Date().toISOString();
    const campaign = {
      id, name, branchId,
      giftSize: giftSize || '360ml',
      giftProtein: giftProtein || 20,
      totalLimit,
      redeemedCount: 0,
      active: 1,
      createdAt: now,
      updatedAt: now,
    };
    db.run(
      `INSERT INTO gift_campaigns (id, name, branchId, giftSize, giftProtein, totalLimit, redeemedCount, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [campaign.id, campaign.name, campaign.branchId, campaign.giftSize, campaign.giftProtein,
       campaign.totalLimit, campaign.redeemedCount, campaign.active, campaign.createdAt, campaign.updatedAt],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        broadcast('GIFT_CAMPAIGN_UPDATED', parseCampaignRow(campaign));
        res.json(parseCampaignRow(campaign));
      }
    );
  });

  // --- Sửa / bật-tắt chương trình (Admin) ---
  app.patch('/api/gift-campaigns/:id', (req, res) => {
    db.get('SELECT * FROM gift_campaigns WHERE id = ?', [req.params.id], (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!existing) return res.status(404).json({ error: 'campaign not found' });

      const next = {
        name: req.body.name !== undefined ? req.body.name : existing.name,
        branchId: req.body.branchId !== undefined ? req.body.branchId : existing.branchId,
        giftSize: req.body.giftSize !== undefined ? req.body.giftSize : existing.giftSize,
        giftProtein: req.body.giftProtein !== undefined ? req.body.giftProtein : existing.giftProtein,
        totalLimit: req.body.totalLimit !== undefined ? req.body.totalLimit : existing.totalLimit,
        active: req.body.active !== undefined ? (req.body.active ? 1 : 0) : existing.active,
        updatedAt: new Date().toISOString(),
      };
      db.run(
        `UPDATE gift_campaigns SET name=?, branchId=?, giftSize=?, giftProtein=?, totalLimit=?, active=?, updatedAt=? WHERE id=?`,
        [next.name, next.branchId, next.giftSize, next.giftProtein, next.totalLimit, next.active, next.updatedAt, req.params.id],
        (e2) => {
          if (e2) return res.status(500).json({ error: e2.message });
          const updated = parseCampaignRow({ ...existing, ...next });
          broadcast('GIFT_CAMPAIGN_UPDATED', updated);
          res.json(updated);
        }
      );
    });
  });

  app.delete('/api/gift-campaigns/:id', (req, res) => {
    db.run('DELETE FROM gift_campaigns WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      broadcast('GIFT_CAMPAIGN_DELETED', { id: req.params.id });
      res.json({ ok: true });
    });
  });

  // --- POS "chốt" 1 lượt tặng — tăng redeemedCount có điều kiện để tránh vượt hạn mức khi
  // nhiều máy POS cùng chi nhánh bấm gần như đồng thời (UPDATE có điều kiện, không phải
  // đọc-rồi-ghi, tránh race condition). ---
  app.post('/api/gift-campaigns/:id/redeem', (req, res) => {
    const { customerPhone, productName, orderId, staffId, staffName } = req.body;
    const phone = (customerPhone || '').trim();
    if (!phone) {
      return res.status(400).json({ error: 'Thiếu số điện thoại khách hàng' });
    }
    db.get(
      'SELECT id FROM gift_redemptions WHERE campaignId = ? AND customerPhone = ?',
      [req.params.id, phone],
      (e0, existing) => {
        if (e0) return res.status(500).json({ error: e0.message });
        if (existing) {
          return res.status(409).json({ error: 'Số điện thoại này đã nhận quà trong chương trình này rồi' });
        }
        db.run(
          'UPDATE gift_campaigns SET redeemedCount = redeemedCount + 1 WHERE id = ? AND active = 1 AND redeemedCount < totalLimit',
          [req.params.id],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (!this.changes) {
              return res.status(409).json({ error: 'Chương trình đã hết hạn mức hoặc đang tắt' });
            }
            const now = new Date().toISOString();
            db.get('SELECT * FROM gift_campaigns WHERE id = ?', [req.params.id], (e2, campaign) => {
              if (e2) return res.status(500).json({ error: e2.message });

              const tryInsert = (attempt = 0) => {
                if (attempt > 8) {
                  return res.status(500).json({ error: 'Không tạo được mã quà tặng duy nhất' });
                }
                const redemptionId = `GIFTRD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const code = generateGiftCode();
                db.run(
                  `INSERT INTO gift_redemptions (id, campaignId, branchId, customerPhone, productName, orderId, staffId, staffName, createdAt, code)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [redemptionId, req.params.id, campaign?.branchId, phone, productName || '', orderId || '', staffId || '', staffName || '', now, code],
                  (e3) => {
                    if (e3) {
                      if (String(e3.message || '').toLowerCase().includes('unique')) {
                        return tryInsert(attempt + 1);
                      }
                      return res.status(500).json({ error: e3.message });
                    }
                    broadcast('GIFT_CAMPAIGN_UPDATED', parseCampaignRow(campaign));
                    res.json({ ok: true, campaign: parseCampaignRow(campaign), code });
                  }
                );
              };
              tryInsert();
            });
          }
        );
      }
    );
  });

  // --- Lịch sử tặng (Admin xem báo cáo) ---
  app.get('/api/gift-campaigns/:id/redemptions', (req, res) => {
    db.all(
      'SELECT * FROM gift_redemptions WHERE campaignId = ? ORDER BY createdAt DESC',
      [req.params.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      }
    );
  });
}

module.exports = { registerGiftCampaignRoutes };
