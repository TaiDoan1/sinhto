/**
 * Online Sales / CSKH API routes
 */
function parseLeadRow(row) {
  if (!row) return null;
  return {
    ...row,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastContactAt: row.lastContactAt,
  };
}

function parseActivityRow(row) {
  if (!row) return null;
  return { ...row, createdAt: row.createdAt };
}

function comboDaysRemaining(startDate, duration) {
  if (!startDate) return 999;
  const start = new Date(startDate);
  const days = duration === 'monthly' ? 30 : duration === 'quarterly' ? 90 : 7;
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

function logSalesActivity(db, data, cb) {
  const id = data.id || `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO sales_activities (id, customerPhone, leadId, careStaffId, careStaffName, activityType, content, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.customerPhone || null,
      data.leadId || null,
      data.careStaffId,
      data.careStaffName,
      data.activityType,
      data.content || '',
      now,
    ],
    (err) => cb(err, { ...data, id, createdAt: now })
  );
}

function registerOnlineSalesRoutes(app, db, broadcast, helpers) {
  const { parseAssignmentRow, upsertCareAssignment } = helpers;

  // --- Dashboard ---
  app.get('/api/online-sales/dashboard', (req, res) => {
    const { careStaffId } = req.query;
    if (!careStaffId) return res.status(400).json({ error: 'careStaffId required' });

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    db.all('SELECT * FROM combo_subscriptions WHERE careStaffId = ?', [careStaffId], (err, combos) => {
      if (err) return res.status(500).json({ error: err.message });

      db.all(
        `SELECT * FROM orders WHERE salesStaffId = ? AND status = 'completed'`,
        [careStaffId],
        (err2, orders) => {
          if (err2) return res.status(500).json({ error: err2.message });

          db.get('SELECT COUNT(*) as c FROM sales_leads WHERE careStaffId = ?', [careStaffId], (_, leadRow) => {
            db.all(
              'SELECT * FROM customer_care_assignments WHERE careStaffId = ?',
              [careStaffId],
              (err3, assignments) => {
                if (err3) return res.status(500).json({ error: err3.message });

                const comboRevenueMonth = combos
                  .filter((c) => c.closedAt && c.closedAt >= monthStart && ['active', 'completed', 'paused'].includes(c.status))
                  .reduce((s, c) => s + (Number(c.totalPrice) || 0), 0);

                const retailRevenueMonth = (orders || [])
                  .filter((o) => o.completedAt && o.completedAt >= monthStart)
                  .reduce((s, o) => s + (Number(o.total) || 0), 0);

                const retailRevenueWeek = (orders || [])
                  .filter((o) => o.completedAt && o.completedAt >= weekAgo.toISOString())
                  .reduce((s, o) => s + (Number(o.total) || 0), 0);

                const activeCombos = combos.filter((c) => c.status === 'active').length;
                const pendingClaims = combos.filter((c) => c.status === 'pending').length;
                const expiringCombos = combos.filter(
                  (c) => c.status === 'active' && comboDaysRemaining(c.startDate, c.comboDuration) <= 7
                ).length;

                const retailCount = assignments.filter((a) => a.customerType === 'retail').length;
                const comboCount = assignments.filter((a) => a.customerType === 'combo').length;
                const leadCount = leadRow?.c || 0;

                const closedLeads = assignments.filter((a) =>
                  ['closed_retail', 'closed_combo'].includes(a.pipelineStage)
                ).length;
                const totalLeads = leadCount + assignments.length;
                const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

                res.json({
                  revenueMonth: comboRevenueMonth + retailRevenueMonth,
                  revenueWeek: retailRevenueWeek,
                  comboRevenueMonth,
                  retailRevenueMonth,
                  pendingClaims,
                  activeCombos,
                  expiringCombos,
                  leadCount,
                  retailCustomerCount: retailCount,
                  comboCustomerCount: comboCount,
                  conversionRate,
                  upsellOpportunities: expiringCombos + assignments.filter((a) => a.pipelineStage === 'upsell_pending').length,
                });
              }
            );
          });
        }
      );
    });
  });

  // --- Tasks ---
  app.get('/api/online-sales/tasks', (req, res) => {
    const { careStaffId } = req.query;
    if (!careStaffId) return res.status(400).json({ error: 'careStaffId required' });

    const tasks = [];
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 1);

    db.all('SELECT * FROM combo_subscriptions WHERE status = ? OR careStaffId = ?', ['pending', careStaffId], (err, combos) => {
      if (err) return res.status(500).json({ error: err.message });

      combos
        .filter((c) => c.status === 'pending')
        .forEach((c) => {
          tasks.push({
            id: `task-pending-${c.id}`,
            type: 'pending_claim',
            title: `Chốt combo: ${c.customerName || c.planName}`,
            subtitle: c.customerPhone,
            priority: 'high',
            customerPhone: c.customerPhone,
            comboId: c.id,
          });
        });

      combos
        .filter((c) => c.careStaffId === careStaffId && c.status === 'active')
        .forEach((c) => {
          const daysLeft = comboDaysRemaining(c.startDate, c.comboDuration);
          if (daysLeft <= 7) {
            tasks.push({
              id: `task-expire-${c.id}`,
              type: daysLeft <= 0 ? 'upsell' : 'expiring_combo',
              title: daysLeft <= 0 ? `Upsale gia hạn: ${c.customerName}` : `Combo sắp hết (${daysLeft} ngày)`,
              subtitle: c.planName || c.customerPhone,
              priority: daysLeft <= 3 ? 'high' : 'medium',
              customerPhone: c.customerPhone,
              comboId: c.id,
              dueHint: `${daysLeft} ngày`,
            });
          }
        });

      db.all('SELECT * FROM sales_leads WHERE careStaffId = ?', [careStaffId], (err2, leads) => {
        if (err2) return res.status(500).json({ error: err2.message });

        leads.forEach((l) => {
          const last = l.lastContactAt ? new Date(l.lastContactAt) : new Date(l.createdAt);
          if (last < staleDate && !['closed_retail', 'closed_combo'].includes(l.pipelineStage)) {
            tasks.push({
              id: `task-lead-${l.id}`,
              type: 'lead_stale',
              title: `Lead chưa follow-up: ${l.fbName || l.customerName || 'Facebook'}`,
              subtitle: l.customerPhone || 'Chưa có SĐT',
              priority: 'medium',
              leadId: l.id,
              customerPhone: l.customerPhone,
            });
          }
        });

        db.all(
          `SELECT * FROM customer_care_assignments WHERE careStaffId = ? AND customerType = 'retail'`,
          [careStaffId],
          (err3, retailAssignments) => {
            if (err3) return res.status(500).json({ error: err3.message });

            retailAssignments
              .filter((a) => a.pipelineStage === 'closed_retail' || a.pipelineStage === 'web_sent')
              .forEach((a) => {
                tasks.push({
                  id: `task-retail-${a.customerPhone}`,
                  type: 'retail_followup',
                  title: `Upsale combo: ${a.customerName || a.customerPhone}`,
                  subtitle: 'Khách lẻ — gợi ý đăng ký combo',
                  priority: 'low',
                  customerPhone: a.customerPhone,
                });
              });

            const priorityOrder = { high: 0, medium: 1, low: 2 };
            tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            res.json(tasks);
          }
        );
      });
    });
  });

  // --- Leads ---
  app.get('/api/online-sales/leads', (req, res) => {
    const { careStaffId } = req.query;
    let sql = 'SELECT * FROM sales_leads';
    const params = [];
    if (careStaffId) {
      sql += ' WHERE careStaffId = ?';
      params.push(careStaffId);
    }
    sql += ' ORDER BY updatedAt DESC';
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(parseLeadRow));
    });
  });

  app.post('/api/online-sales/leads', (req, res) => {
    const body = req.body;
    if (!body.careStaffId || !body.careStaffName) {
      return res.status(400).json({ error: 'careStaffId and careStaffName required' });
    }
    const id = body.id || `LEAD-${Date.now()}`;
    const now = new Date().toISOString();
    const stage = body.pipelineStage || 'fb_new';

    db.run(
      `INSERT INTO sales_leads (id, fbName, customerName, customerPhone, careStaffId, careStaffName, pipelineStage, source, notes, createdAt, updatedAt, lastContactAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.fbName || '',
        body.customerName || '',
        body.customerPhone || '',
        body.careStaffId,
        body.careStaffName,
        stage,
        body.source || 'facebook',
        body.notes || '',
        now,
        now,
        now,
      ],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logSalesActivity(
          db,
          {
            leadId: id,
            customerPhone: body.customerPhone,
            careStaffId: body.careStaffId,
            careStaffName: body.careStaffName,
            activityType: 'lead_created',
            content: `Tạo lead Facebook: ${body.fbName || body.customerName || id}`,
          },
          () => {
            db.get('SELECT * FROM sales_leads WHERE id = ?', [id], (e, row) => {
              const parsed = parseLeadRow(row);
              broadcast('SALES_LEAD_CREATED', parsed);
              res.status(201).json(parsed);
            });
          }
        );
      }
    );
  });

  app.patch('/api/online-sales/leads/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const now = new Date().toISOString();

    db.get('SELECT * FROM sales_leads WHERE id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Lead not found' });

      const merged = { ...row, ...body };
      db.run(
        `UPDATE sales_leads SET fbName=?, customerName=?, customerPhone=?, pipelineStage=?, source=?, notes=?, updatedAt=?, lastContactAt=? WHERE id=?`,
        [
          merged.fbName || '',
          merged.customerName || '',
          merged.customerPhone || '',
          merged.pipelineStage || row.pipelineStage,
          merged.source || row.source,
          merged.notes ?? row.notes,
          now,
          body.lastContactAt !== false ? now : row.lastContactAt,
          id,
        ],
        function (updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          if (merged.customerPhone && body.convertToCustomer) {
            upsertCareAssignment(
              merged.customerPhone,
              merged.customerName || merged.fbName || '',
              merged.careStaffId,
              merged.careStaffName,
              merged.careStaffId,
              (assignErr) => {
                if (assignErr) return res.status(500).json({ error: assignErr.message });
                db.run(
                  `UPDATE customer_care_assignments SET customerType='lead', fbName=?, pipelineStage=?, lastContactAt=?, salesRefCode=? WHERE customerPhone=?`,
                  [
                    merged.fbName || '',
                    merged.pipelineStage,
                    now,
                    body.salesRefCode || '',
                    merged.customerPhone,
                  ]
                );
              }
            );
          }

          if (body.activityType && body.activityContent) {
            logSalesActivity(db, {
              leadId: id,
              customerPhone: merged.customerPhone,
              careStaffId: merged.careStaffId,
              careStaffName: merged.careStaffName,
              activityType: body.activityType,
              content: body.activityContent,
            }, () => {});
          }

          db.get('SELECT * FROM sales_leads WHERE id = ?', [id], (e, updated) => {
            const parsed = parseLeadRow(updated);
            broadcast('SALES_LEAD_UPDATED', parsed);
            res.json(parsed);
          });
        }
      );
    });
  });

  // --- Activities ---
  app.get('/api/online-sales/activities', (req, res) => {
    const { careStaffId, customerPhone, leadId } = req.query;
    let sql = 'SELECT * FROM sales_activities WHERE 1=1';
    const params = [];
    if (careStaffId) { sql += ' AND careStaffId = ?'; params.push(careStaffId); }
    if (customerPhone) { sql += ' AND customerPhone = ?'; params.push(customerPhone); }
    if (leadId) { sql += ' AND leadId = ?'; params.push(leadId); }
    sql += ' ORDER BY createdAt DESC LIMIT 100';
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(parseActivityRow));
    });
  });

  app.post('/api/online-sales/activities', (req, res) => {
    const body = req.body;
    if (!body.careStaffId || !body.careStaffName || !body.activityType) {
      return res.status(400).json({ error: 'careStaffId, careStaffName, activityType required' });
    }
    logSalesActivity(db, body, (err, activity) => {
      if (err) return res.status(500).json({ error: err.message });
      const now = new Date().toISOString();
      if (body.customerPhone) {
        db.run('UPDATE customer_care_assignments SET lastContactAt = ? WHERE customerPhone = ?', [now, body.customerPhone]);
      }
      if (body.leadId) {
        db.run('UPDATE sales_leads SET lastContactAt = ?, updatedAt = ? WHERE id = ?', [now, now, body.leadId]);
      }
      broadcast('SALES_ACTIVITY_CREATED', activity);
      res.status(201).json(activity);
    });
  });

  // --- Extended assignment patch ---
  app.patch('/api/customer-care/assignments/:phone/profile', (req, res) => {
    const phone = decodeURIComponent(req.params.phone);
    const body = req.body;
    const now = new Date().toISOString();

    db.get('SELECT * FROM customer_care_assignments WHERE customerPhone = ?', [phone], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Assignment not found' });

      db.run(
        `UPDATE customer_care_assignments SET
          customerName=COALESCE(?, customerName),
          customerType=COALESCE(?, customerType),
          fbName=COALESCE(?, fbName),
          pipelineStage=COALESCE(?, pipelineStage),
          notes=COALESCE(?, notes),
          tags=COALESCE(?, tags),
          lastContactAt=?
         WHERE customerPhone=?`,
        [
          body.customerName,
          body.customerType,
          body.fbName,
          body.pipelineStage,
          body.notes,
          body.tags,
          now,
          phone,
        ],
        function (updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });
          if (body.activityType && body.careStaffId) {
            logSalesActivity(db, {
              customerPhone: phone,
              careStaffId: body.careStaffId,
              careStaffName: body.careStaffName || '',
              activityType: body.activityType,
              content: body.activityContent || `Cập nhật: ${body.pipelineStage || ''}`,
            }, () => {});
          }
          db.get('SELECT * FROM customer_care_assignments WHERE customerPhone = ?', [phone], (e, updated) => {
            const parsed = parseAssignmentRow(updated);
            broadcast('CARE_ASSIGNMENT_UPDATED', parsed);
            res.json(parsed);
          });
        }
      );
    });
  });

  // --- Admin team stats ---
  app.get('/api/online-sales/team-stats', (req, res) => {
    db.all("SELECT id, fullName, employeeId, username, position FROM employees WHERE position IN ('online_sales', 'customer_care')", [], (err, staff) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!staff.length) return res.json([]);

      const results = [];
      let pending = staff.length;

      staff.forEach((s) => {
        db.all('SELECT totalPrice, status, closedAt FROM combo_subscriptions WHERE careStaffId = ?', [s.id], (e1, combos) => {
          db.all("SELECT total FROM orders WHERE salesStaffId = ? AND status = 'completed'", [s.id], (e2, orders) => {
            db.get('SELECT COUNT(*) as c FROM sales_leads WHERE careStaffId = ?', [s.id], (_, leads) => {
              db.get(
                'SELECT COUNT(*) as c FROM customer_care_assignments WHERE careStaffId = ?',
                [s.id],
                (_, assigns) => {
                  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
                  const comboRev = combos
                    .filter((c) => c.closedAt && c.closedAt >= monthStart)
                    .reduce((sum, c) => sum + (Number(c.totalPrice) || 0), 0);
                  const retailRev = (orders || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0);

                  results.push({
                    staffId: s.id,
                    fullName: s.fullName,
                    employeeId: s.employeeId,
                    username: s.username,
                    revenueMonth: comboRev + retailRev,
                    comboCount: combos.filter((c) => c.status === 'active').length,
                    leadCount: leads?.c || 0,
                    customerCount: assigns?.c || 0,
                    pendingClaims: combos.filter((c) => c.status === 'pending').length,
                  });

                  pending -= 1;
                  if (pending === 0) {
                    results.sort((a, b) => b.revenueMonth - a.revenueMonth);
                    res.json(results);
                  }
                }
              );
            });
          });
        });
      });
    });
  });

  return { logSalesActivity };
}

module.exports = { registerOnlineSalesRoutes, logSalesActivity, comboDaysRemaining };
