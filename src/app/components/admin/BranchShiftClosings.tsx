import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, CheckCircle2, PlayCircle, CalendarClock, ListOrdered, Printer, X } from 'lucide-react';
import * as api from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';
import { useOrders } from '../../contexts/OrderContext';
import { buildShiftClosingReceiptData, printShiftClosingReceipt, DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE } from '../../utils/posPrint';

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
  status: string;
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
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
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
  const [date, setDate] = useState(todayStr());
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [detailShift, setDetailShift] = useState<ShiftRow | null>(null);
  const { subscribe } = useSSE();
  const { orders, history } = useOrders();
  const allOrders = useMemo(() => [...orders, ...history], [orders, history]);

  const load = () => {
    api
      .fetchShifts({ branch: branchId, date })
      .then((data: ShiftRow[]) => setShifts(data))
      .catch((err) => console.error('Failed to load shifts:', err));
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

  const handlePrintShift = async (shift: ShiftRow) => {
    const shiftOrders = getShiftOrders(shift);
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
    printShiftClosingReceipt(data);
  };

  const sorted = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dayTotal = sorted.reduce((sum, s) => sum + getStat(s).total, 0);
  const closedCount = sorted.filter((s) => s.status === 'completed').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Kết Ca Nhân Viên</h2>
          <p className="text-gray-600 mt-1">
            {closedCount}/{sorted.length} đã kết ca • Tổng doanh thu: {dayTotal.toLocaleString('vi-VN')}đ
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

      {sorted.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">Không có ca làm nào ngày này</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((shift) => {
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
                  <button
                    type="button"
                    onClick={() => handlePrintShift(shift)}
                    disabled={stat.count === 0}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    In bill
                  </button>
                </div>
              </div>
            );
          })}
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
              {getShiftOrders(detailShift)
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
              {getShiftOrders(detailShift).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Không có đơn hàng nào</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
