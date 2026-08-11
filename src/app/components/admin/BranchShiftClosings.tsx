import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, CheckCircle2, PlayCircle, CalendarClock, ListOrdered, Printer, X, Wrench, RotateCcw } from 'lucide-react';
import * as api from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';
import { useOrders } from '../../contexts/OrderContext';
import { useToast } from '../../contexts/ToastContext';
import { useBranches } from '../../contexts/BranchContext';
import { buildShiftClosingReceiptData, printShiftClosingReceipt, DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE } from '../../utils/posPrint';
import { getModeFromPath } from '../../utils/appMode';

function formatItemLine(item: any) {
  return typeof item === 'string' ? item : `${item.quantity || 1}x ${item.productName || item.name}`;
}

interface ShiftRow {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType?: string;
  status: string;
  reason?: string;
  checkIn?: string;
  checkOut?: string;
  closingOrderCount?: number;
  closingRevenue?: number;
  startCash?: number;
  endCashActual?: number;
}

interface BranchShiftClosingsProps {
  branchId: string;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
}

const statusMeta: Record<string, { label: string; className: string; icon: typeof PlayCircle }> = {
  scheduled: { label: 'Chưa vào ca', className: 'bg-gray-100 text-gray-600', icon: CalendarClock },
  pending: { label: 'Chờ duyệt', className: 'bg-gray-100 text-gray-600', icon: CalendarClock },
  approved: { label: 'Chưa vào ca', className: 'bg-gray-100 text-gray-600', icon: CalendarClock },
  in_progress: { label: 'Đang làm ca', className: 'bg-amber-100 text-amber-700', icon: PlayCircle },
  completed: { label: 'Đã kết ca', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: 'Đã hủy', className: 'bg-red-100 text-red-600', icon: CalendarClock },
};

export function BranchShiftClosings({ branchId }: BranchShiftClosingsProps) {
  const { branchLabel } = useBranches();
  // "Mở lại ca" chỉ dành cho Admin (/admin). Tính trong component (đọc lại mỗi render) vì chuyển
  // app dùng pushState — để cấp module sẽ kẹt giá trị cũ.
  const isAdminApp = getModeFromPath() === 'admin';
  const [date, setDate] = useState(todayStr());
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [detailShift, setDetailShift] = useState<ShiftRow | null>(null);
  const [detailShiftOrders, setDetailShiftOrders] = useState<any[] | null>(null);
  const [fixShift, setFixShift] = useState<ShiftRow | null>(null);
  const [fixCheckIn, setFixCheckIn] = useState('');
  const [fixCheckOut, setFixCheckOut] = useState('');
  const [fixIncludeOthers, setFixIncludeOthers] = useState(false);
  const [fixing, setFixing] = useState(false);
  const { subscribe } = useSSE();
  const { showSuccess, showError } = useToast();
  const { orders, history } = useOrders();
  const allOrders = useMemo(() => [...orders, ...history], [orders, history]);

  useEffect(() => {
    if (!detailShift) {
      setDetailShiftOrders(null);
      return;
    }
    // Lấy trực tiếp từ server thay vì cache orders/history — xem lý do ở handlePrintShift bên dưới.
    api
      .fetchOrders({ shiftId: detailShift.id })
      .then((data: any[]) => setDetailShiftOrders(data.map((o) => ({ ...o, time: new Date(o.time) }))))
      .catch(() => setDetailShiftOrders(getShiftOrders(detailShift)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailShift]);

  const load = () => {
    api
      .fetchShifts({ branch: branchId, date })
      .then((data: ShiftRow[]) => setShifts(data))
      .catch((err) => console.error('Failed to load shifts:', err));
  };

  // Mở lại ca đã kết (nhân viên lỡ bấm kết ca khi còn đang làm) — đưa status về 'in_progress'
  // và xoá giờ kết ca, để POS lại nhận ca đang mở, nhân viên đăng nhập lại làm tiếp bình thường.
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const handleReopen = async (shift: ShiftRow) => {
    if (!window.confirm(`Mở lại ca của ${shift.employeeName} (bỏ trạng thái đã kết ca)?\nNhân viên đăng nhập lại máy POS sẽ làm tiếp được ca này.`)) return;
    setReopeningId(shift.id);
    try {
      await api.saveShift({ ...shift, status: 'in_progress', checkOut: '' });
      showSuccess('Đã mở lại ca. Nhân viên đăng nhập lại POS để làm tiếp.');
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Mở lại ca thất bại');
    } finally {
      setReopeningId(null);
    }
  };

  useEffect(() => {
    load();
  }, [branchId, date]);

  useEffect(() => {
    const unsubCreate = subscribe('SHIFT_CREATED', () => load());
    const unsubUpdate = subscribe('SHIFT_UPDATED', () => load());
    const unsubDelete = subscribe('SHIFT_DELETED', () => load());
    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, branchId, date]);

  // So live cho ca dang lam / ca cu chua co snapshot da chot
  const liveStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const o of [...orders, ...history]) {
      if (!o.shiftId) continue;
      const stat = map.get(o.shiftId) || { count: 0, total: 0 };
      stat.count += 1;
      stat.total += o.total || 0;
      map.set(o.shiftId, stat);
    }
    return map;
  }, [orders, history]);

  const getStat = (shift: ShiftRow) => {
    if (shift.status === 'completed' && shift.closingOrderCount != null) {
      return { count: shift.closingOrderCount, total: shift.closingRevenue || 0 };
    }
    return liveStats.get(shift.id) || { count: 0, total: 0 };
  };

  const getShiftOrders = (shift: ShiftRow) => allOrders.filter((o) => o.shiftId === shift.id);

  // ISO (UTC) -> giá trị input datetime-local theo giờ máy (VN)
  const isoToLocalInput = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openFix = (shift: ShiftRow) => {
    // Mặc định điền theo GIỜ CA ĐÃ XẾP (startTime–endTime) trong ngày của ca — đây là khoảng giờ
    // đúng để gom đơn; nếu ca có giờ check-in/out cũ hợp lý thì ưu tiên dùng lại.
    const base = shift.date; // yyyy-mm-dd
    const startDefault = `${base}T${(shift.startTime || '00:00').slice(0, 5)}`;
    // Ca qua đêm (kết thúc < bắt đầu) -> giờ kết ca sang ngày hôm sau
    const overnight = (shift.endTime || '') < (shift.startTime || '');
    const endBase = overnight
      ? new Date(new Date(base + 'T00:00').getTime() + 86400000).toISOString().split('T')[0]
      : base;
    const endDefault = `${endBase}T${(shift.endTime || '23:59').slice(0, 5)}`;
    // Ưu tiên dùng giờ ca đã xếp làm mặc định (giờ check-in/out cũ thường bị ghi sai)
    setFixCheckIn(startDefault || isoToLocalInput(shift.checkIn));
    setFixCheckOut(endDefault || isoToLocalInput(shift.checkOut));
    setFixIncludeOthers(false);
    setFixShift(shift);
  };

  const handleReconcile = async () => {
    if (!fixShift || !fixCheckIn || !fixCheckOut) return;
    setFixing(true);
    try {
      const checkInIso = new Date(fixCheckIn).toISOString();
      const checkOutIso = new Date(fixCheckOut).toISOString();
      const { reassigned, windowTotal } = await api.reconcileShift(fixShift.id, {
        checkIn: checkInIso,
        checkOut: checkOutIso,
        includeOtherShifts: fixIncludeOthers,
      });
      if (reassigned === 0 && !fixIncludeOthers && (windowTotal ?? 0) > 0) {
        showError(`Khoảng giờ này có ${windowTotal} đơn nhưng đều đã thuộc ca khác. Tích "Gộp cả đơn đang thuộc ca khác" rồi thử lại.`);
      } else {
        showSuccess(`Đã gán ${reassigned} đơn vào ca (khoảng giờ có ${windowTotal ?? '?'} đơn). Đang tải lại…`);
        setFixShift(null);
      }
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Gán lại đơn thất bại');
    } finally {
      setFixing(false);
    }
  };

  const handlePrintShift = async (shift: ShiftRow) => {
    // Lấy trực tiếp từ server theo shiftId thay vì lọc cache orders/history (OrderContext chỉ đồng
    // bộ qua SSE — nếu có khoảng thời gian mất kết nối trong ca, cache sẽ thiếu đơn vĩnh viễn dù
    // server vẫn lưu đủ). Chỉ dùng cache làm phương án dự phòng nếu gọi server thất bại.
    let shiftOrders = getShiftOrders(shift);
    try {
      shiftOrders = await api.fetchOrders({ shiftId: shift.id });
    } catch {
      // giữ shiftOrders từ cache nếu server lỗi
    }
    let cashMovements: { type: 'in' | 'out'; amount: number }[] = [];
    let template = DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE;
    try {
      cashMovements = await api.fetchCashMovements(shift.id);
    } catch {
      cashMovements = [];
    }
    try {
      const saved = await api.fetchSetting('shiftClosingBillTemplate');
      if (saved && typeof saved === 'object') template = { ...DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE, ...saved };
    } catch {
      // giữ template mặc định nếu chưa cấu hình
    }
    const data = buildShiftClosingReceiptData(shift, shiftOrders, cashMovements, template);
    printShiftClosingReceipt({ ...data, branchName: branchLabel(shift.branch || branchId) || shift.branch || branchId });
  };

  const sorted = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
  // Ca cần kết = ca làm thật. Loại bỏ:
  //  - Ca ĐÃ HỦY (rejected/cancelled): ca nhân viên xin/đăng ký nhưng bị từ chối duyệt → ẩn hẳn.
  //  - Ca NGHỈ (shiftType 'off'): không hiện thành thẻ kết ca, chỉ gom xuống mục "Nghỉ" cho gọn.
  const isCancelled = (s: ShiftRow) => s.status === 'rejected' || s.status === 'cancelled';
  const isOff = (s: ShiftRow) => s.shiftType === 'off';
  const working = sorted.filter((s) => !isOff(s) && !isCancelled(s));
  const offList = sorted.filter((s) => isOff(s) && !isCancelled(s));
  const dayTotal = working.reduce((sum, s) => sum + getStat(s).total, 0);
  const closedCount = working.filter((s) => s.status === 'completed').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Kết Ca Nhân Viên</h2>
          <p className="text-gray-600 mt-1">
            {closedCount}/{working.length} đã kết ca • Tổng doanh thu: {dayTotal.toLocaleString('vi-VN')}đ
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="outline-none text-sm font-semibold text-gray-700"
          />
        </div>
      </div>

      {working.length === 0 && offList.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">Không có ca làm nào ngày này</p>
        </div>
      ) : (
        <div className="space-y-3">
          {working.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500 text-sm">
              Không có ca cần kết trong ngày.
            </div>
          )}
          {working.map((shift) => {
            const meta = statusMeta[shift.status] || statusMeta.scheduled;
            const StatusIcon = meta.icon;
            const stat = getStat(shift);
            return (
              <div key={shift.id} className="bg-white rounded-lg shadow-md p-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                      {shift.employeeName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{shift.employeeName}</div>
                      <div className="text-sm text-gray-500">
                        {shift.startTime} - {shift.endTime}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${meta.className}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {meta.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t text-sm">
                  <div>
                    <div className="text-gray-400 text-xs">Vào ca</div>
                    <div className="font-semibold text-gray-700">{formatDateTime(shift.checkIn)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Kết ca</div>
                    <div className="font-semibold text-gray-700">{formatDateTime(shift.checkOut)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Số đơn</div>
                    <div className="font-semibold text-gray-700">{stat.count} đơn</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Doanh thu</div>
                    <div className="font-bold text-emerald-700">{stat.total.toLocaleString('vi-VN')}đ</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setDetailShift(shift)}
                    disabled={stat.count === 0}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    Xem chi tiết đơn hàng
                  </button>
                  {isAdminApp && shift.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => handleReopen(shift)}
                      disabled={reopeningId === shift.id}
                      className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-40 ml-auto"
                      title="Nhân viên lỡ bấm kết ca khi còn đang làm — mở lại để làm tiếp"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {reopeningId === shift.id ? 'Đang mở…' : 'Mở lại ca'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openFix(shift)}
                    className={`flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 ${isAdminApp && shift.status === 'completed' ? '' : 'ml-auto'}`}
                    title="Sửa giờ vào/kết ca bị ghi sai & gán lại đơn vào ca"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Sửa giờ / gán đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintShift(shift)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-emerald-700"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    In bill
                  </button>
                </div>
              </div>
            );
          })}

          {offList.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-xs font-bold uppercase text-gray-400 mb-2">Nghỉ ({offList.length})</div>
              <div className="flex flex-wrap gap-2">
                {offList.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm">
                    <span className="font-semibold text-gray-700">{s.employeeName}</span>
                    <span className="text-xs font-semibold text-gray-400">Nghỉ</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {detailShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{detailShift.employeeName}</h3>
                <p className="text-sm text-gray-500">
                  {detailShift.startTime} - {detailShift.endTime} · {getStat(detailShift).count} đơn ·{' '}
                  {getStat(detailShift).total.toLocaleString('vi-VN')}đ
                </p>
              </div>
              <button type="button" onClick={() => setDetailShift(null)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {(detailShiftOrders ?? [])
                .sort((a, b) => a.time.getTime() - b.time.getTime())
                .map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-semibold text-gray-800 text-sm">{order.id}</span>
                      <span className="text-xs text-gray-500">
                        {order.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="space-y-0.5 mb-2">
                      {(order.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="text-xs text-gray-600">
                          • {formatItemLine(item)}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t text-sm">
                      {order.customerPhone && <span className="text-gray-500">{order.customerPhone}</span>}
                      <span className="font-bold text-emerald-700 ml-auto">
                        {(order.total || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                ))}
              {(detailShiftOrders ?? []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Không có đơn hàng nào</p>
              )}
            </div>
          </div>
        </div>
      )}

      {fixShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Sửa giờ ca & gán lại đơn</h3>
                <p className="text-sm text-gray-500">
                  {fixShift.employeeName} · ca {fixShift.startTime}–{fixShift.endTime}
                </p>
              </div>
              <button type="button" onClick={() => setFixShift(null)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                Nhập đúng khoảng giờ ca làm thật. Hệ thống sẽ gán mọi đơn của chi nhánh này bán trong
                khoảng giờ đó <b>mà chưa thuộc ca nào</b> vào ca này, rồi tính lại số đơn & doanh thu.
              </p>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Giờ vào ca</span>
                <input
                  type="datetime-local"
                  value={fixCheckIn}
                  onChange={(e) => setFixCheckIn(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Giờ kết ca</span>
                <input
                  type="datetime-local"
                  value={fixCheckOut}
                  onChange={(e) => setFixCheckOut(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fixIncludeOthers}
                  onChange={(e) => setFixIncludeOthers(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-xs text-gray-600">
                  <b>Gộp cả đơn đang thuộc ca khác</b> trong khoảng giờ này (dùng khi đơn bị gán nhầm
                  sang ca khác). Sẽ chuyển các đơn đó sang ca này.
                </span>
              </label>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t">
              <button
                type="button"
                onClick={handleReconcile}
                disabled={fixing || !fixCheckIn || !fixCheckOut}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fixing ? 'Đang xử lý…' : 'Gán lại đơn & tính lại'}
              </button>
              <button
                type="button"
                onClick={() => setFixShift(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
