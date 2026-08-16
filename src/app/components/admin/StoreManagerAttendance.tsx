import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ChevronRight, Loader2, Search } from 'lucide-react';
import * as api from '../../utils/api';
import { useBranches } from '../../contexts/BranchContext';
import type { WorkShift } from '../../types/employee';
import type { Employee } from './EmployeeRegistration';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const from = `${y}-${String(mo).padStart(2, '0')}-01`;
  const last = new Date(y, mo, 0).getDate();
  const to = `${y}-${String(mo).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

function hhmm(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
}

/** Số phút làm THỰC TẾ giữa 1 lần check-in và check-out (0 nếu thiếu 1 trong 2). */
function workMinutes(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  return Math.round((b - a) / 60000);
}

/** Số phút theo GIỜ CA TRÊN LỊCH (endTime - startTime) — dùng để tính lương: KHÔNG tính OT/ở lại
 * trễ, KHÔNG trừ giờ đi sớm/đi trễ. Giống hệt cách HRPayroll tính công. Ca qua đêm cộng 24h. */
function scheduledMinutes(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let h = eh + em / 60 - (sh + sm / 60);
  if (h <= 0) h += 24;
  return Math.round(h * 60);
}

/** Định dạng phút → "8h30" / "8h" / "45p". */
function fmtDuration(mins: number) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}p`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

interface DayShift {
  id?: string;
  checkIn?: string;
  checkOut?: string;
  startTime?: string;
  endTime?: string;
  actualMins: number;
  schedMins: number;
  overtimeHours?: number;
  overtimeStatus?: string;
  overtimeReason?: string;
}

/** Bảng chấm công cho Cửa hàng trưởng: chọn khoảng ngày (hoặc cả tháng) → mỗi nhân viên có 2 loại
 * ngày công: THỰC TẾ (theo giờ check-in/check-out thật) và TÍNH LƯƠNG (chỉ theo giờ ca trên lịch,
 * không OT, không trừ đi sớm/đi trễ — khớp bảng lương). Ngày làm 2–3 ca hiện giờ TỪNG CA riêng.
 * KHÔNG hiển thị tiền lương. */
export function StoreManagerAttendance() {
  const { activeBranches, branchLabel } = useBranches();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [from, setFrom] = useState(monthRange(currentMonth()).from);
  const [to, setTo] = useState(monthRange(currentMonth()).to);
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailEmpId, setDetailEmpId] = useState<string | null>(null); // nhân viên đang mở popup chi tiết
  const [otHoursEdit, setOtHoursEdit] = useState<Record<string, string>>({});
  const [otOpen, setOtOpen] = useState<Record<string, boolean>>({}); // chip OT nào đang xổ chi tiết

  // Khoảng ngày dùng để lấy/lọc dữ liệu (tự đảo nếu nhập từ > đến)
  const range = useMemo(() => (from <= to ? { lo: from, hi: to } : { lo: to, hi: from }), [from, to]);

  // Ca có làm thêm giờ (OT) trong khoảng đang xem — duyệt/sửa giờ NGAY tại màn Chấm công.
  const otShifts = useMemo(() => shifts.filter((s: any) =>
    (s.overtimeStatus === 'pending' || s.overtimeStatus === 'approved') &&
    (branchFilter === 'ALL' || (s.branch || '') === branchFilter)
  ), [shifts, branchFilter]);

  const handleReviewOt = async (shift: any, action: 'approve' | 'reject') => {
    try {
      const edited = otHoursEdit[shift.id];
      const hours = edited !== undefined && edited !== '' ? Number(edited) : undefined;
      const updated = await api.shiftOvertime(shift.id, action, action === 'approve' && hours !== undefined ? { hours } : undefined);
      setShifts((prev) => prev.map((s) => (s.id === shift.id ? { ...s, ...updated } : s)));
      setOtHoursEdit((prev) => { const n = { ...prev }; delete n[shift.id]; return n; });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi duyệt làm thêm giờ');
    }
  };

  useEffect(() => {
    api.fetchEmployees().then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.fetchShifts({ from: range.lo, to: range.hi })
      .then((data: WorkShift[]) => setShifts(data || []))
      .catch(() => setShifts([]))
      .finally(() => setLoading(false));
  }, [range.lo, range.hi]);

  // Chọn tháng nhanh → tự set khoảng từ–đến của tháng đó.
  const pickMonth = (m: string) => {
    setMonth(m);
    if (!m) return;
    const r = monthRange(m);
    setFrom(r.from);
    setTo(r.to);
  };

  // Gộp ca theo nhân viên → theo ngày → DANH SÁCH TỪNG CA (giữ riêng để ngày nhiều ca hiện đúng).
  const byEmp = useMemo(() => {
    const m = new Map<string, Map<string, DayShift[]>>();
    shifts.forEach((s) => {
      if (!s.employeeId || !s.checkIn) return; // chỉ tính ca có check-in
      if (!m.has(s.employeeId)) m.set(s.employeeId, new Map());
      const days = m.get(s.employeeId)!;
      const list = days.get(s.date) || [];
      list.push({
        id: s.id,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        startTime: s.startTime,
        endTime: s.endTime,
        actualMins: workMinutes(s.checkIn, s.checkOut),
        schedMins: scheduledMinutes(s.startTime, s.endTime),
        overtimeHours: (s as any).overtimeHours,
        overtimeStatus: (s as any).overtimeStatus,
        overtimeReason: (s as any).overtimeReason,
      });
      days.set(s.date, list);
    });
    return m;
  }, [shifts]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees
      .filter((e) => branchFilter === 'ALL' || (e.branch || '') === branchFilter)
      .filter((e) => !term || (e.fullName || '').toLowerCase().includes(term) || (e.employeeId || '').toLowerCase().includes(term))
      .map((e) => {
        const days = byEmp.get(e.id);
        const dayList = days
          ? [...days.entries()]
              .map(([date, list]) => {
                const sorted = [...list].sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''));
                return {
                  date,
                  shifts: sorted,
                  actualMins: sorted.reduce((s, x) => s + x.actualMins, 0),
                  schedMins: sorted.reduce((s, x) => s + x.schedMins, 0),
                };
              })
              .sort((a, b) => a.date.localeCompare(b.date))
          : [];
        const dayCount = dayList.length;
        // Ngày công TÍNH LƯƠNG = số ngày có giờ ca theo lịch (ca có giờ vào–ra hợp lệ).
        const payrollDays = dayList.filter((d) => d.schedMins > 0).length;
        const totalActual = dayList.reduce((s, d) => s + d.actualMins, 0);
        const totalSched = dayList.reduce((s, d) => s + d.schedMins, 0);
        return { emp: e, dayCount, payrollDays, dayList, totalActual, totalSched };
      })
      .sort((a, b) => (b.dayCount - a.dayCount) || (a.emp.fullName || '').localeCompare(b.emp.fullName || ''));
  }, [employees, byEmp, branchFilter, search]);

  const totalDays = rows.reduce((s, r) => s + r.dayCount, 0);
  const totalPayrollDays = rows.reduce((s, r) => s + r.payrollDays, 0);
  const totalActualAll = rows.reduce((s, r) => s + r.totalActual, 0);
  const totalSchedAll = rows.reduce((s, r) => s + r.totalSched, 0);

  const fmtDay = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-gray-800">Chấm công nhân viên</h3>
        </div>
        <input type="month" value={month} onChange={(e) => pickMonth(e.target.value)}
          className="ml-auto border border-gray-200 rounded-lg px-3 py-2 text-sm" title="Chọn nhanh cả tháng" />
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white">
          <option value="ALL">Tất cả chi nhánh</option>
          {activeBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Lọc theo khoảng ngày */}
      <div className="flex items-center gap-2 flex-wrap bg-white border border-gray-200 rounded-lg px-3 py-2">
        <span className="text-xs font-semibold text-gray-500">Từ ngày</span>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setMonth(''); }}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
        <span className="text-xs font-semibold text-gray-500">đến</span>
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setMonth(''); }}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
        <button type="button"
          onClick={() => pickMonth(currentMonth())}
          className="ml-auto text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline">
          Tháng này
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm nhân viên..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm text-emerald-800 font-semibold flex flex-wrap gap-x-4 gap-y-1">
        <span>{fmtDay(range.lo)}–{fmtDay(range.hi)} · {rows.length} NV · {totalDays} ngày công</span>
        <span className="text-sky-700">Thực tế: {fmtDuration(totalActualAll)}</span>
        <span className="text-emerald-700">Tính lương: {fmtDuration(totalSchedAll)} ({totalPayrollDays} ngày)</span>
      </div>

      <p className="text-[11px] text-gray-400 px-1 -mt-1">
        <b>Thực tế</b> = theo giờ check-in/out thật. <b>Tính lương</b> = theo giờ ca trên lịch (không tính OT, không trừ đi sớm/đi trễ).
      </p>

      {otShifts.filter((s: any) => s.overtimeStatus === 'pending').length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 text-sm text-orange-800 font-semibold flex items-center gap-2">
          ⏰ Có {otShifts.filter((s: any) => s.overtimeStatus === 'pending').length} ca xin làm thêm giờ chờ duyệt — mở chi tiết nhân viên bên dưới để <b>duyệt / sửa giờ theo đúng ngày</b>.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-400 py-10 text-sm">Không có nhân viên phù hợp.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ emp, dayCount, payrollDays, dayList, totalActual, totalSched }) => {
            const hasPendingOt = dayList.some((d) => d.shifts.some((sh) => sh.overtimeStatus === 'pending'));
            return (
              <div key={emp.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setDetailEmpId(emp.id)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    {hasPendingOt && <span className="text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full shrink-0">OT</span>}
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">{emp.fullName}</p>
                      <p className="text-xs text-gray-500">{branchLabel(emp.branch) || emp.branch || 'Chưa gán CN'} · <span className="font-semibold text-emerald-700">{dayCount}</span> ngày công</p>
                    </div>
                  </div>
                  <div className="flex items-stretch gap-1.5 shrink-0">
                    <div className="text-center rounded-lg bg-sky-50 px-2.5 py-1 min-w-[74px]">
                      <div className="text-[10px] font-bold uppercase text-sky-600/80 leading-tight">Thực tế</div>
                      <div className="text-sm font-black text-sky-700">{fmtDuration(totalActual)}</div>
                    </div>
                    <div className="text-center rounded-lg bg-emerald-50 px-2.5 py-1 min-w-[74px]">
                      <div className="text-[10px] font-bold uppercase text-emerald-600/80 leading-tight">Tính lương</div>
                      <div className="text-sm font-black text-emerald-700">{fmtDuration(totalSched)}</div>
                      <div className="text-[10px] font-bold text-emerald-600/90 leading-tight">{payrollDays} ngày</div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Popup chi tiết chấm công 1 nhân viên (thay cho xổ xuống) */}
      {detailEmpId && (() => {
        const dr = rows.find((r) => r.emp.id === detailEmpId);
        if (!dr) return null;
        // Tổng giờ OT ĐÃ DUYỆT của nhân viên trong kỳ (chỉ cộng ca đã duyệt).
        const otApprovedHours = dr.dayList.reduce((t, d) =>
          t + d.shifts.reduce((s, sh) => s + (sh.overtimeStatus === 'approved' ? (Number(sh.overtimeHours) || 0) : 0), 0), 0);
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setDetailEmpId(null)} aria-label="Đóng" />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="relative px-4 sm:px-5 py-4 border-b border-gray-100">
                <button type="button" onClick={() => setDetailEmpId(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-xl leading-none">✕</button>
                <div className="pr-9">
                  <h3 className="font-black text-gray-900 text-lg truncate">{dr.emp.fullName}</h3>
                  <p className="text-xs text-gray-500">{branchLabel(dr.emp.branch) || dr.emp.branch || 'Chưa gán CN'} · {fmtDay(range.lo)}–{fmtDay(range.hi)}</p>
                </div>
                <div className="flex gap-2 mt-2.5">
                  <div className="flex-1 text-center rounded-lg bg-sky-50 px-2 py-1.5">
                    <div className="text-[10px] font-bold uppercase text-sky-600/80 leading-tight">Thực tế</div>
                    <div className="text-sm font-black text-sky-700">{fmtDuration(dr.totalActual)}</div>
                  </div>
                  <div className="flex-1 text-center rounded-lg bg-emerald-50 px-2 py-1.5">
                    <div className="text-[10px] font-bold uppercase text-emerald-600/80 leading-tight">Tính lương</div>
                    <div className="text-sm font-black text-emerald-700">{fmtDuration(dr.totalSched)} <span className="text-[10px] font-bold text-emerald-600/90">· {dr.payrollDays} ngày</span></div>
                  </div>
                  <div className="flex-1 text-center rounded-lg bg-orange-50 px-2 py-1.5">
                    <div className="text-[10px] font-bold uppercase text-orange-600/80 leading-tight">Giờ OT</div>
                    <div className="text-sm font-black text-orange-600">{otApprovedHours > 0 ? `+${otApprovedHours}h` : '0h'}</div>
                  </div>
                </div>
              </div>
              <div className="overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 text-[10px] font-bold uppercase text-gray-400 sticky top-0">
                  <span>Ngày · ca (vào–ra thực tế / lịch)</span>
                  <span className="flex gap-3"><span className="text-sky-600">Thực tế</span><span className="text-emerald-600">Lương</span></span>
                </div>
                <div className="divide-y divide-gray-50">
                  {dr.dayList.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-400">Không có ngày công nào trong khoảng.</div>
                  ) : dr.dayList.map((d) => (
                    <div key={d.date} className="px-4 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-700">
                          {new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                          {d.shifts.length > 1 && <span className="ml-1.5 text-[11px] font-medium text-gray-400">({d.shifts.length} ca)</span>}
                        </span>
                        <span className="flex gap-3 shrink-0 font-bold text-xs">
                          <span className="text-sky-700 w-12 text-right">{fmtDuration(d.actualMins)}</span>
                          <span className="text-emerald-700 w-12 text-right">{fmtDuration(d.schedMins)}</span>
                        </span>
                      </div>
                      {d.shifts.map((sh, i) => {
                        const otVal = otHoursEdit[sh.id || ''] ?? (sh.overtimeHours ? String(sh.overtimeHours) : '');
                        const otApproved = sh.overtimeStatus === 'approved';
                        const hasOt = sh.overtimeStatus === 'pending' || otApproved;
                        return (
                          <div key={i} className="mt-1 pl-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-500 min-w-0">
                                {d.shifts.length > 1 && <span className="text-gray-400">Ca {i + 1}: </span>}
                                <span className="text-emerald-700 font-medium">{hhmm(sh.checkIn)}</span>
                                {' → '}
                                <span className={sh.checkOut ? 'text-gray-600' : 'text-amber-600'}>{hhmm(sh.checkOut)}</span>
                                <span className="ml-2 text-gray-400">Lịch: {sh.startTime && sh.endTime ? `${sh.startTime}–${sh.endTime}` : '—'}</span>
                              </span>
                              {d.shifts.length > 1 && (
                                <span className="flex gap-3 shrink-0 text-[11px] font-semibold">
                                  <span className="text-sky-600 w-12 text-right">{fmtDuration(sh.actualMins)}</span>
                                  <span className="text-emerald-600 w-12 text-right">{fmtDuration(sh.schedMins)}</span>
                                </span>
                              )}
                            </div>
                            {hasOt && (
                              <div className="mt-1">
                                {/* Chip OT nhỏ — bấm mới xổ chi tiết duyệt/sửa giờ */}
                                <button type="button" onClick={() => setOtOpen((p) => ({ ...p, [sh.id || '']: !p[sh.id || ''] }))}
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${otApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                  ⏰ OT{otApproved ? (sh.overtimeHours ? ` +${sh.overtimeHours}h ✓` : ' ✓') : ' (chờ duyệt)'}
                                  <span className="opacity-60">{otOpen[sh.id || ''] ? '▲' : '▼'}</span>
                                </button>
                                {otOpen[sh.id || ''] && (
                                  <div className={`mt-1 flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 border ${otApproved ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
                                    {sh.overtimeReason && <span className="text-[11px] text-gray-600 w-full">Lý do: {sh.overtimeReason}</span>}
                                    <div className="flex items-center gap-1">
                                      <input type="number" min="0" step="0.5" value={otVal}
                                        onChange={(e) => setOtHoursEdit((prev) => ({ ...prev, [sh.id || '']: e.target.value }))}
                                        placeholder="giờ" className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-xs text-center" />
                                      <span className="text-[10px] text-gray-500">giờ OT</span>
                                    </div>
                                    <div className="flex items-center gap-1 ml-auto">
                                      <button onClick={() => handleReviewOt({ id: sh.id }, 'approve')}
                                        className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg">
                                        {otApproved ? 'Cập nhật' : 'Duyệt'}
                                      </button>
                                      <button onClick={() => handleReviewOt({ id: sh.id }, 'reject')}
                                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg">
                                        {otApproved ? 'Bỏ' : 'Từ chối'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
