import { useState, useEffect, useMemo } from 'react';
import { Wallet, Loader2, ChevronDown, ChevronRight, CheckCircle, RefreshCw } from 'lucide-react';
import * as api from '../../utils/api';

interface ComboRow {
  id: string;
  commissionStaffId?: string | null;
  commissionStaffName?: string | null;
  commissionAmount?: number;
  commissionStatus?: string;
  mgrStaffId?: string | null;
  mgrStaffName?: string | null;
  mgrCommissionAmount?: number;
  _share?: number;
  _role?: 'seller' | 'mgr';
  commissionType?: string;
  isRenewal?: boolean;
  planName?: string;
  customerName?: string;
  customerPhone?: string;
  totalPrice?: number;
  status?: string;
  closedAt?: string | Date | null;
  createdAt?: string | Date | null;
}

interface StaffGroup {
  staffId: string;
  staffName: string;
  newCount: number;
  renewCount: number;
  total: number;
  paid: number;
  unpaid: number;
  combos: ComboRow[];
}

function fmt(n: number) {
  return (n || 0).toLocaleString('vi-VN') + 'đ';
}

function earnedDate(c: ComboRow): Date | null {
  const d = c.closedAt || c.createdAt;
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function ComboCommissionReport() {
  const [combos, setCombos] = useState<ComboRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>(currentMonth()); // '' = tất cả
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState('');

  const load = () => {
    setLoading(true);
    api
      .fetchComboSubscriptions()
      .then((rows: ComboRow[]) => setCombos(rows.filter((c) => ((c.commissionAmount || 0) > 0 && c.commissionStaffId) || ((c.mgrCommissionAmount || 0) > 0 && c.mgrStaffId))))
      .catch(() => setCombos([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const inPeriod = (c: ComboRow) => {
    if (!month) return true;
    const d = earnedDate(c);
    if (!d) return false;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return key === month;
  };

  const groups = useMemo<StaffGroup[]>(() => {
    const map = new Map<string, StaffGroup>();
    const add = (staffId: string | null | undefined, staffName: string | null | undefined, c: ComboRow, share: number, role: 'seller' | 'mgr') => {
      if (!staffId || share <= 0) return;
      if (!map.has(staffId)) {
        map.set(staffId, { staffId, staffName: staffName || 'NV ' + staffId, newCount: 0, renewCount: 0, total: 0, paid: 0, unpaid: 0, combos: [] });
      }
      const g = map.get(staffId)!;
      g.total += share;
      if (c.isRenewal) g.renewCount += 1; else g.newCount += 1;
      if (c.commissionStatus === 'paid') g.paid += share; else g.unpaid += share;
      g.combos.push({ ...c, _share: share, _role: role });
    };
    for (const c of combos) {
      if (!inPeriod(c)) continue;
      add(c.commissionStaffId, c.commissionStaffName, c, c.commissionAmount || 0, 'seller');
      add(c.mgrStaffId, c.mgrStaffName, c, c.mgrCommissionAmount || 0, 'mgr');
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [combos, month]);

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  const grandUnpaid = groups.reduce((s, g) => s + g.unpaid, 0);

  const markPaid = async (c: ComboRow, paid: boolean) => {
    setBusyId(c.id);
    try {
      await api.updateComboCommission(c.id, { commissionStatus: paid ? 'paid' : 'approved' });
      setCombos((prev) => prev.map((x) => (x.id === c.id ? { ...x, commissionStatus: paid ? 'paid' : 'approved' } : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi cập nhật');
    } finally {
      setBusyId('');
    }
  };

  const markAllPaidForStaff = async (g: StaffGroup) => {
    const unpaid = g.combos.filter((c) => c.commissionStatus !== 'paid');
    if (!unpaid.length) return;
    if (!confirm(`Đánh dấu ĐÃ TRẢ ${unpaid.length} khoản hoa hồng (${fmt(g.unpaid)}) cho ${g.staffName}?`)) return;
    setBusyId(g.staffId);
    try {
      for (const c of unpaid) {
        await api.updateComboCommission(c.id, { commissionStatus: 'paid' });
      }
      setCombos((prev) => prev.map((x) => (unpaid.some((u) => u.id === x.id) ? { ...x, commissionStatus: 'paid' } : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi cập nhật');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Hoa Hồng CSKH (Combo)</h2>
            <p className="text-sm text-gray-500">Hoa hồng gắn cố định theo người chốt combo — gồm cả bán mới & gia hạn</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          {month && (
            <button onClick={() => setMonth('')} className="text-xs font-semibold text-gray-500 hover:text-gray-700">Tất cả</button>
          )}
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Tải lại">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-xs text-emerald-700 font-semibold">Tổng hoa hồng {month ? `tháng ${month.split('-')[1]}/${month.split('-')[0]}` : '(tất cả)'}</p>
          <p className="text-2xl font-black text-emerald-800 mt-1">{fmt(grandTotal)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs text-amber-700 font-semibold">Chưa trả</p>
          <p className="text-2xl font-black text-amber-800 mt-1">{fmt(grandUnpaid)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Chưa có hoa hồng combo nào trong kỳ này.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isOpen = expanded[g.staffId];
            return (
              <div key={g.staffId} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [g.staffId]: !p[g.staffId] }))}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">{g.staffName}</p>
                      <p className="text-xs text-gray-500">{g.newCount} bán mới · {g.renewCount} gia hạn</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-emerald-700">{fmt(g.total)}</p>
                    {g.unpaid > 0 ? (
                      <p className="text-xs text-amber-600 font-semibold">Chưa trả {fmt(g.unpaid)}</p>
                    ) : (
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 justify-end"><CheckCircle className="w-3 h-3" /> Đã trả đủ</p>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50/50">
                    {g.unpaid > 0 && (
                      <button
                        onClick={() => markAllPaidForStaff(g)}
                        disabled={busyId === g.staffId}
                        className="w-full mb-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                      >
                        {busyId === g.staffId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Đánh dấu đã trả tất cả ({fmt(g.unpaid)})
                      </button>
                    )}
                    {g.combos.map((c) => {
                      const paid = c.commissionStatus === 'paid';
                      const d = earnedDate(c);
                      return (
                        <div key={c.id} className="flex items-center justify-between gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {c.customerName || 'Khách'} · {c.planName || 'Combo'}
                              {c.isRenewal && <span className="ml-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">gia hạn</span>}
                              {c._role === 'mgr'
                                ? <span className="ml-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">quản lý</span>
                                : <span className="ml-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">người chốt</span>}
                            </p>
                            <p className="text-xs text-gray-500">
                              {fmt(c.totalPrice || 0)} · HH nhận {fmt(c._share ?? c.commissionAmount ?? 0)}
                              {d ? ` · ${d.toLocaleDateString('vi-VN')}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => markPaid(c, !paid)}
                            disabled={busyId === c.id}
                            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60 ${
                              paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                          >
                            {busyId === c.id ? '...' : paid ? '✓ Đã trả' : 'Đánh dấu trả'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
