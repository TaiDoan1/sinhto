/**
 * Excel Backup API
 * Endpoint để trigger backup từ admin panel
 */

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { getPool, isPostgres } = require('./db');

let db;

function setDb(database) {
  db = database;
}

async function queryDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres()) {
      getPool().query(sql, params)
        .then(result => resolve(result.rows))
        .catch(reject);
    } else {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    }
  });
}

async function createExcelBackup() {
  const backupDir = path.join(__dirname, '../public/images/uploads/_backups/excel');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const filename = `backup_${timestamp}.xlsx`;
  const filepath = path.join(backupDir, filename);
  const workbook = new ExcelJS.Workbook();

  try {
    // Sheet 1: Tóm tắt hôm nay
    const today = new Date().toISOString().split('T')[0];
    const summarySheet = workbook.addWorksheet('Tóm tắt hôm nay');

    const query = isPostgres()
      ? `SELECT
          COUNT(DISTINCT "employeeId") as emp_count,
          COUNT(*) as shift_count,
          SUM(CASE WHEN "checkInPhoto" != '' THEN 1 ELSE 0 END) as checkin_photos,
          SUM(CASE WHEN "checkOutPhoto" != '' THEN 1 ELSE 0 END) as checkout_photos
        FROM shifts
        WHERE DATE("date") = $1`
      : `SELECT
          COUNT(DISTINCT employeeId) as emp_count,
          COUNT(*) as shift_count,
          SUM(CASE WHEN checkInPhoto != '' THEN 1 ELSE 0 END) as checkin_photos,
          SUM(CASE WHEN checkOutPhoto != '' THEN 1 ELSE 0 END) as checkout_photos
        FROM shifts
        WHERE DATE(date) = ?`;

    const params = isPostgres() ? [today] : [today];
    const stats = (await queryDb(query, params))[0];

    summarySheet.addRow(['📊 Tóm tắt ' + today]);
    summarySheet.lastRow.font = { bold: true, size: 14 };
    summarySheet.addRow([]);
    summarySheet.addRow(['Số nhân viên check-in:', stats?.emp_count || 0]);
    summarySheet.addRow(['Tổng shifts:', stats?.shift_count || 0]);
    summarySheet.addRow(['Ảnh check-in:', stats?.checkin_photos || 0]);
    summarySheet.addRow(['Ảnh check-out:', stats?.checkout_photos || 0]);

    summarySheet.columns = [
      { width: 30 },
      { width: 15 }
    ];

    // Sheet 2: Check-in-out history
    const historySheet = workbook.addWorksheet('Check-in-out');

    const historyQuery = isPostgres()
      ? `SELECT
          DATE(s."date")::text as date,
          e."fullName" as name,
          e."employeeId" as emp_id,
          s."startTime" as start_time,
          s."endTime" as end_time,
          COALESCE(TO_CHAR(NULLIF(s."checkIn", '')::timestamp, 'HH24:MI'), '-') as checkin_time,
          COALESCE(TO_CHAR(NULLIF(s."checkOut", '')::timestamp, 'HH24:MI'), '-') as checkout_time,
          CASE WHEN s."checkInPhoto" != '' THEN '✅' ELSE '❌' END as checkin_photo,
          CASE WHEN s."checkOutPhoto" != '' THEN '✅' ELSE '❌' END as checkout_photo,
          s.branch
        FROM shifts s
        LEFT JOIN employees e ON s."employeeId" = e.id
        WHERE DATE(s."date") >= DATE($1)
        ORDER BY s."date" DESC, s."employeeId"`
      : `SELECT
          DATE(s.date) as date,
          e.fullName as name,
          e.employeeId as emp_id,
          s.startTime as start_time,
          s.endTime as end_time,
          COALESCE(CASE WHEN s.checkIn THEN TIME(s.checkIn) ELSE '-' END, '-') as checkin_time,
          COALESCE(CASE WHEN s.checkOut THEN TIME(s.checkOut) ELSE '-' END, '-') as checkout_time,
          CASE WHEN s.checkInPhoto != '' THEN '✅' ELSE '❌' END as checkin_photo,
          CASE WHEN s.checkOutPhoto != '' THEN '✅' ELSE '❌' END as checkout_photo,
          s.branch
        FROM shifts s
        LEFT JOIN employees e ON s.employeeId = e.id
        WHERE DATE(s.date) >= DATE('now', '-1 day')
        ORDER BY s.date DESC, s.employeeId`;

    const historyParams = isPostgres() ? [new Date(Date.now() - 86400000).toISOString().split('T')[0]] : [];
    const historyRows = await queryDb(historyQuery, historyParams);

    const headerRow = historySheet.addRow(['Ngày', 'Tên NV', 'Mã NV', 'Giờ vào ca', 'Giờ tan ca', 'Check-in', 'Check-out', 'Ảnh In', 'Ảnh Out', 'Chi nhánh']);
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const row of historyRows) {
      historySheet.addRow([
        row.date, row.name, row.emp_id, row.start_time, row.end_time,
        row.checkin_time, row.checkout_time, row.checkin_photo, row.checkout_photo, row.branch
      ]);
    }

    historySheet.columns = [
      { width: 12 }, { width: 20 }, { width: 12 }, { width: 12 }, { width: 12 },
      { width: 12 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 15 }
    ];

    // Sheet 3: Employee stats (7 days)
    const statsSheet = workbook.addWorksheet('Thống kê nhân viên');

    const statsQuery = isPostgres()
      ? `SELECT
          e."fullName" as name,
          e."employeeId" as emp_id,
          COUNT(*) as shift_count,
          SUM(CASE WHEN NULLIF(s."checkIn", '') IS NOT NULL THEN 1 ELSE 0 END) as checkin_count,
          SUM(CASE WHEN NULLIF(s."checkOut", '') IS NOT NULL THEN 1 ELSE 0 END) as checkout_count,
          SUM(CASE WHEN s."checkInPhoto" != '' THEN 1 ELSE 0 END) as photo_in,
          SUM(CASE WHEN s."checkOutPhoto" != '' THEN 1 ELSE 0 END) as photo_out
        FROM shifts s
        LEFT JOIN employees e ON s."employeeId" = e.id
        WHERE DATE(s."date") >= DATE($1)
        GROUP BY e.id, e."fullName", e."employeeId"
        ORDER BY shift_count DESC`
      : `SELECT
          e.fullName as name,
          e.employeeId as emp_id,
          COUNT(*) as shift_count,
          SUM(CASE WHEN s.checkIn IS NOT NULL THEN 1 ELSE 0 END) as checkin_count,
          SUM(CASE WHEN s.checkOut IS NOT NULL THEN 1 ELSE 0 END) as checkout_count,
          SUM(CASE WHEN s.checkInPhoto != '' THEN 1 ELSE 0 END) as photo_in,
          SUM(CASE WHEN s.checkOutPhoto != '' THEN 1 ELSE 0 END) as photo_out
        FROM shifts s
        LEFT JOIN employees e ON s.employeeId = e.id
        WHERE DATE(s.date) >= DATE('now', '-7 days')
        GROUP BY e.id, e.fullName, e.employeeId
        ORDER BY shift_count DESC`;

    const statsParams = isPostgres() ? [new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]] : [];
    const statsRows = await queryDb(statsQuery, statsParams);

    const statsHeaderRow = statsSheet.addRow(['Tên NV', 'Mã NV', 'Số ca', 'Check-in', 'Check-out', 'Ảnh In', 'Ảnh Out']);
    statsHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    statsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const row of statsRows) {
      statsSheet.addRow([row.name, row.emp_id, row.shift_count, row.checkin_count, row.checkout_count, row.photo_in, row.photo_out]);
    }

    statsSheet.columns = [
      { width: 20 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 10 }
    ];

    // Save workbook
    await workbook.xlsx.writeFile(filepath);
    console.log(`✅ Backup created: ${filepath}`);
    return filename;
  } catch (error) {
    console.error('Backup error:', error);
    throw error;
  }
}

module.exports = function(app, database) {
  if (database) {
    setDb(database);
  }

  // GET /api/backup/status
  app.get('/api/backup/status', (req, res) => {
    const backupDir = path.join(__dirname, '../public/images/uploads/_backups/excel');

    try {
      if (!fs.existsSync(backupDir)) {
        return res.json({ status: 'no-backup', files: [] });
      }

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.xlsx'))
        .map(f => ({
          name: f,
          path: `/backups/excel/${f}`,
          size: (fs.statSync(path.join(backupDir, f)).size / 1024).toFixed(1),
          created: fs.statSync(path.join(backupDir, f)).mtime
        }))
        .sort((a, b) => new Date(b.created) - new Date(a.created));

      res.json({ status: 'success', files, lastBackup: files[0]?.created || null });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/backup/trigger
  app.post('/api/backup/trigger', async (req, res) => {
    try {
      const filename = await createExcelBackup();
      const backupDir = path.join(__dirname, '../public/images/uploads/_backups/excel');
      const filepath = path.join(backupDir, filename);

      res.json({
        status: 'success',
        message: 'Backup completed',
        file: `/backups/excel/${filename}`,
        size: (fs.statSync(filepath).size / 1024).toFixed(1)
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Backup failed',
        error: error.message
      });
    }
  });

  // GET /api/backup/download/:filename
  app.get('/api/backup/download/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }

      const filepath = path.join(__dirname, '../public/images/uploads/_backups/excel', filename);
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.download(filepath);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log('✅ Backup API endpoints registered');
};
