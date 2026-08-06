import { useEffect, useState } from 'react';
import { Download, Archive, RotateCcw, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import * as api from '../../utils/api';
import { useBranches } from '../../contexts/BranchContext';
import { useToast } from '../../contexts/ToastContext';

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function yesterday() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

type Summary = Awaited<ReturnType<typeof api.fetchArchiveSummary>>;

export function BackupData() {
  const { branchLabel } = useBranches();
  const { showSuccess, showError } = useToast();

  const [bkFrom, setBkFrom] = useState(firstOfMonth());
  const [bkTo, setBkTo] = useState(yesterday());
  const [backingUp, setBackingUp] = useState(false);

  const [arFrom, setArFrom] = useState(firstOfMonth());
  const [arTo, setArTo] = useState(yesterday());
  const [arConfirm, setArConfirm] = useState('');
  const [archiving, setArchiving] = useState(false);

  const [rsFrom, setRsFrom] = useState(firstOfMonth());
  const [rsTo, setRsTo] = useState(yesterday());
  const [restoring, setRestoring] = useState(false);

  const [summary, setSummary] = useState<Summary | null>(null);

  const loadSummary = () => api.fetchArchiveSummary().then(setSummary).catch(() => {});
  useEffect(() => { loadSummary(); }, []);

  // Khoảng ngày muốn lưu trữ đã được sao lưu phủ trọn chưa?
  const rangeBackedUp = !!summary?.backups?.some((b) => b.fromDate <= arFrom && b.toDate >= arTo);

  const handleBackup = async () => {
    if (bkFrom > bkTo) return showError('Từ ngày phải trước Đến ngày');
    setBackingUp(true);
    try {
      const data = await api.backupOrders(bkFrom, bkTo);
      if (data.orderCount === 0) {
        showError('Không có đơn nào trong khoảng ngày này');
        setBackingUp(false);
        return;
      }
      // 1) File JSON — bản sao lưu khôi phục được
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(jsonBlob, `SaoLuu_Don_${bkFrom}_den_${bkTo}.json`);

      // 2) File Excel — để đọc
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Đơn hàng');
      ws.columns = [
        { header: 'Mã đơn', key: 'id', width: 22 },
        { header: 'Thời gian', key: 'time', width: 20 },
        { header: 'Chi nhánh', key: 'branch', width: 22 },
        { header: 'Khách', key: 'customerName', width: 18 },
        { header: 'SĐT', key: 'customerPhone', width: 14 },
        { header: 'Tổng tiền', key: 'total', width: 14 },
        { header: 'Trạng thái', key: 'status', width: 12 },
      ];
      ws.getRow(1).eachCell((c) => (c.font = { bold: true }));
      data.orders.forEach((o: any) => ws.addRow({
        id: o.id,
        time: o.time ? new Date(o.time).toLocaleString('vi-VN') : '',
        branch: branchLabel(o.branchId || '') || o.branchId || '',
        customerName: o.customerName || '',
        customerPhone: o.customerPhone || '',
        total: Number(o.total) || 0,
        status: o.status || '',
      }));
      ws.getColumn('total').numFmt = '#,##0';
      const buf = await wb.xlsx.writeBuffer();
      downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `SaoLuu_Don_${bkFrom}_den_${bkTo}.xlsx`);

      showSuccess(`Đã sao lưu ${data.orderCount} đơn (JSON + Excel). Giờ có thể chuyển kho lưu trữ khoảng ngày đã sao lưu.`);
      loadSummary();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Sao lưu thất bại');
    } finally {
      setBackingUp(false);
    }
  };

  const handleArchive = async () => {
    if (arConfirm.trim().toUpperCase() !== 'LƯU TRỮ') return showError('Gõ đúng chữ LƯU TRỮ để xác nhận');
    setArchiving(true);
    try {
      const { archived } = await api.archiveOrders(arFrom, arTo);
      showSuccess(archived > 0 ? `Đã chuyển ${archived} đơn vào kho lưu trữ` : 'Không có đơn nào để chuyển');
      setArConfirm('');
      loadSummary();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Lưu trữ thất bại');
    } finally {
      setArchiving(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { restored } = await api.restoreOrders(rsFrom, rsTo);
      showSuccess(restored > 0 ? `Đã khôi phục ${restored} đơn về bảng chính` : 'Không có đơn nào trong kho ở khoảng ngày này');
      loadSummary();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Khôi phục thất bại');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Sao Lưu & Dọn Dữ Liệu</h1>
      <p className="text-sm text-gray-500 mb-6">Sao lưu đơn theo khoảng ngày, chuyển đơn cũ vào kho lưu trữ (khôi phục được).</p>

      {/* Trạng thái kho lưu trữ */}
      <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-700 mb-1">
          <Archive className="w-4 h-4" /> Kho lưu trữ hiện có
        </div>
        {summary ? (
          summary.archivedCount > 0 ? (
            <div>{summary.archivedCount.toLocaleString('vi-VN')} đơn · từ {fmtDate(summary.archivedFrom)} đến {fmtDate(summary.archivedTo)}</div>
          ) : <div>Kho lưu trữ đang trống.</div>
        ) : <div>Đang tải…</div>}
      </div>

      {/* 1. Sao lưu */}
      <section className="mb-6 bg-white rounded-xl shadow-md p-5">
        <div className="flex items-center gap-2 font-bold text-gray-800 mb-3">
          <Download className="w-5 h-5 text-emerald-600" /> 1. Sao lưu đơn hàng
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <DateField label="Từ ngày" value={bkFrom} onChange={setBkFrom} />
          <DateField label="Đến ngày" value={bkTo} onChange={setBkTo} />
          <button
            type="button"
            onClick={handleBackup}
            disabled={backingUp}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {backingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Tải sao lưu
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Tải về 2 file: JSON (khôi phục được) + Excel (để đọc). Hệ thống ghi nhận đã sao lưu khoảng ngày này.</p>
      </section>

      {/* 2. Chuyển kho lưu trữ */}
      <section className="mb-6 bg-white rounded-xl shadow-md p-5">
        <div className="flex items-center gap-2 font-bold text-gray-800 mb-3">
          <Archive className="w-5 h-5 text-amber-600" /> 2. Chuyển đơn cũ vào kho lưu trữ
        </div>
        {!rangeBackedUp ? (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            Chỉ chuyển được sau khi đã <b>Tải sao lưu</b> phủ trọn khoảng ngày này. Hãy sao lưu ở mục 1 trước (cùng khoảng ngày hoặc rộng hơn).
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-3">
            <ShieldCheck className="w-4 h-4 shrink-0" /> Khoảng ngày này đã được sao lưu — an toàn để chuyển kho.
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end mt-3">
          <DateField label="Từ ngày" value={arFrom} onChange={setArFrom} />
          <DateField label="Đến ngày" value={arTo} onChange={setArTo} />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end mt-3">
          <label className="flex-1">
            <span className="text-xs font-semibold text-gray-500 block mb-1">Gõ <b>LƯU TRỮ</b> để xác nhận</span>
            <input
              value={arConfirm}
              onChange={(e) => setArConfirm(e.target.value)}
              placeholder="LƯU TRỮ"
              disabled={!rangeBackedUp}
              className="w-full sm:w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 disabled:bg-gray-50"
            />
          </label>
          <button
            type="button"
            onClick={handleArchive}
            disabled={!rangeBackedUp || archiving || arConfirm.trim().toUpperCase() !== 'LƯU TRỮ'}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            Chuyển vào kho
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Đơn cũ sẽ rời bảng chính (màn hình gọn hơn) nhưng vẫn nằm trong kho — có thể Khôi phục bất cứ lúc nào. Không đụng dữ liệu của hôm nay.</p>
      </section>

      {/* 3. Khôi phục */}
      <section className="bg-white rounded-xl shadow-md p-5">
        <div className="flex items-center gap-2 font-bold text-gray-800 mb-3">
          <RotateCcw className="w-5 h-5 text-sky-600" /> 3. Khôi phục từ kho lưu trữ
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <DateField label="Từ ngày" value={rsFrom} onChange={setRsFrom} />
          <DateField label="Đến ngày" value={rsTo} onChange={setRsTo} />
          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50"
          >
            {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Khôi phục
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Chuyển đơn trong kho ở khoảng ngày này trở lại bảng chính.</p>
      </section>

      <div className="mt-6 flex items-start gap-2 text-xs text-gray-400">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        Lưu ý: đây là lớp tiện lợi trong app. Lưới an toàn chính vẫn là backup tự động của Supabase (PITR).
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex-1">
      <span className="text-xs font-semibold text-gray-500 block mb-1">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full sm:w-44 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
      />
    </label>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
