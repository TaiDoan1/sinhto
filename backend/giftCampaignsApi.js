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
  let branchIds = [];
  try { branchIds = JSON.parse(row.branchIds || '[]'); } catch { branchIds = []; }
  if (!Array.isArray(branchIds)) branchIds = [];
  // Tương thích dữ liệu cũ (chỉ có branchId đơn)
  if (branchIds.length === 0 && row.branchId) branchIds = [row.branchId];
  return {
    ...row,
    rewardType: row.rewardType || 'gift', // 'gift' | 'percent' | 'amount'
    applyMode: row.applyMode || 'phone', // 'phone' (giới hạn theo SĐT) | 'all' (áp mọi đơn)
    branchIds,
    discountPercent: Number(row.discountPercent) || 0,
    discountAmount: Number(row.discountAmount) || 0,
    giftProtein: Number(row.giftProtein) || 0,
    totalLimit: Number(row.totalLimit) || 0,
    redeemedCount: Number(row.redeemedCount) || 0,
    active: !!row.active,
  };
}

// Chương trình áp cho 1 chi nhánh nếu chọn "Tất cả" (ALL) hoặc chứa đúng chi nhánh đó
function campaignAppliesToBranch(c, branchId) {
  if (!branchId) return true;
  return (c.branchIds || []).includes('ALL') || (c.branchIds || []).includes(branchId);
}

function registerGiftCampaignRoutes(app, db, { broadcast }) {
  // --- Danh sách chương trình (POS lọc theo chi nhánh + đang bật) ---
  app.get('/api/gift-campaigns', (req, res) => {
    const { branchId, active } = req.query;
    let sql = 'SELECT * FROM gift_campaigns WHERE 1=1';
    const params = [];
    if (active !== undefined) {
      sql += ' AND active = ?';
      params.push(active === 'true' || active === '1' ? 1 : 0);
    }
    sql += ' ORDER BY createdAt DESC';
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      let list = (rows || []).map(parseCampaignRow);
      // Lọc theo chi nhánh trong JS (branchIds là JSON, có thể chứa 'ALL')
      if (branchId) list = list.filter((c) => campaignAppliesToBranch(c, branchId));
      res.json(list);
    });
  });

  // --- Tạo chương trình mới (Admin) ---
  app.post('/api/gift-campaigns', (req, res) => {
    const { name, branchIds, rewardType, giftSize, giftProtein, discountPercent, discountAmount, totalLimit, applyMode } = req.body;
    const branches = Array.isArray(branchIds) ? branchIds.filter(Boolean) : [];
    const type = ['gift', 'percent', 'amount'].includes(rewardType) ? rewardType : 'gift';
    const mode = applyMode === 'all' ? 'all' : 'phone';
    if (!name || branches.length === 0) {
      return res.status(400).json({ error: 'Cần tên chương trình và ít nhất 1 chi nhánh' });
    }
    if (type === 'percent' && !(Number(discountPercent) > 0)) {
      return res.status(400).json({ error: 'Nhập % giảm hợp lệ' });
    }
    if (type === 'amount' && !(Number(discountAmount) > 0)) {
      return res.status(400).json({ error: 'Nhập số tiền giảm hợp lệ' });
    }
    const limit = Number(totalLimit) || 0;
    if (mode === 'phone' && limit <= 0) {
      return res.status(400).json({ error: 'Chế độ theo SĐT cần nhập giới hạn số lượt' });
    }
    const id = `GIFT-${Date.now()}`;
    const now = new Date().toISOString();
    const campaign = {
      id, name,
      branchId: branches[0] || '', // giữ cột cũ cho tương thích
      branchIds: JSON.stringify(branches),
      rewardType: type,
      giftSize: giftSize || '360ml',
      giftProtein: giftProtein || 20,
      discountPercent: type === 'percent' ? Number(discountPercent) : 0,
      discountAmount: type === 'amount' ? Number(discountAmount) : 0,
      totalLimit: limit,
      redeemedCount: 0,
      active: 1,
      applyMode: mode,
      createdAt: now,
      updatedAt: now,
    };
    db.run(
      `INSERT INTO gift_campaigns (id, name, branchId, branchIds, rewardType, giftSize, giftProtein, discountPercent, discountAmount, totalLimit, redeemedCount, active, applyMode, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [campaign.id, campaign.name, campaign.branchId, campaign.branchIds, campaign.rewardType, campaign.giftSize,
       campaign.giftProtein, campaign.discountPercent, campaign.discountAmount, campaign.totalLimit,
       campaign.redeemedCount, campaign.active, campaign.applyMode, campaign.createdAt, campaign.updatedAt],
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

      const branches = Array.isArray(req.body.branchIds) ? req.body.branchIds.filter(Boolean) : undefined;
      const next = {
        name: req.body.name !== undefined ? req.body.name : existing.name,
        branchIds: branches !== undefined ? JSON.stringify(branches) : (existing.branchIds || '[]'),
        branchId: branches !== undefined ? (branches[0] || '') : existing.branchId,
        rewardType: req.body.rewardType !== undefined ? req.body.rewardType : (existing.rewardType || 'gift'),
        giftSize: req.body.giftSize !== undefined ? req.body.giftSize : existing.giftSize,
        giftProtein: req.body.giftProtein !== undefined ? req.body.giftProtein : existing.giftProtein,
        discountPercent: req.body.discountPercent !== undefined ? Number(req.body.discountPercent) : (existing.discountPercent || 0),
        discountAmount: req.body.discountAmount !== undefined ? Number(req.body.discountAmount) : (existing.discountAmount || 0),
        totalLimit: req.body.totalLimit !== undefined ? req.body.totalLimit : existing.totalLimit,
        applyMode: req.body.applyMode !== undefined ? (req.body.applyMode === 'all' ? 'all' : 'phone') : (existing.applyMode || 'phone'),
        active: req.body.active !== undefined ? (req.body.active ? 1 : 0) : existing.active,
        updatedAt: new Date().toISOString(),
      };
      db.run(
        `UPDATE gift_campaigns SET name=?, branchId=?, branchIds=?, rewardType=?, giftSize=?, giftProtein=?, discountPercent=?, discountAmount=?, totalLimit=?, applyMode=?, active=?, updatedAt=? WHERE id=?`,
        [next.name, next.branchId, next.branchIds, next.rewardType, next.giftSize, next.giftProtein, next.discountPercent, next.discountAmount, next.totalLimit, next.applyMode, next.active, next.updatedAt, req.params.id],
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
