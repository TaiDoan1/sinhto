import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ChevronDown, ChevronRight, Loader2, Search } from 'lucide-react';
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

/** Bảng chấm công cho Cửa hàng trưởng: chọn tháng → mỗi nhân viên có 2 loại ngày công:
 *  - THỰC TẾ: theo giờ check-in/check-out thật.
 *  - TÍNH LƯƠNG: chỉ theo giờ ca trên lịch (không OT, không trừ đi sớm/đi trễ) — khớp bảng lương.
 * KHÔNG hiển thị tiền lương. */
export function StoreManagerAttendance() {
  const { activeBranches, branchLabel } = useBranches();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.fetchEmployees().then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const { from, to } = monthRange(month);
    api.fetchShifts({ from, to })
      .then((data: WorkShift[]) => setShifts(data || []))
      .catch(() => setShifts([]))
      .finally(() => setLoading(false));
  }, [month]);

  // Gộp ca theo nhân viên → theo ngày. Chỉ tính ngày có check-in.
  //  - actualMins: tổng giờ THỰC TẾ (cộng từng ca đã check-in + check-out trong ngày).
  //  - schedMins:  tổng giờ THEO LỊCH của các ca đã check-in trong ngày (để tính lương).
  //  - in/out:     check-in sớm nhất, check-out muộn nhất (chỉ để hiển thị khoảng giờ).
  const byEmp = useMemo(() => {
    const m = new Map<string, Map<string, { checkIn?: string; checkOut?: string; actualMins: number; schedMins: number }>>();
    shifts.forEach((s) => {
      if (!s.employeeId || !s.checkIn) return; // chỉ tính ngày có check-in
      if (!m.has(s.employeeId)) m.set(s.employeeId, new Map());
      const days = m.get(s.employeeId)!;
      const cur = days.get(s.date) || { actualMins: 0, schedMins: 0 };
      if (s.checkIn && (!cur.checkIn || s.checkIn < cur.checkIn)) cur.checkIn = s.checkIn;
      if (s.checkOut && (!cur.checkOut || s.checkOut > cur.checkOut)) cur.checkOut = s.checkOut;
      cur.actualMins += workMinutes(s.checkIn, s.checkOut);
      cur.schedMins += scheduledMinutes(s.startTime, s.endTime);
      days.set(s.date, cur);
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
              .map(([date, v]) => ({ date, ...v }))
              .sort((a, b) => a.date.localeCompare(b.date))
          : [];
        const dayCount = dayList.length;
        const totalActual = dayList.reduce((s, d) => s + d.actualMins, 0);
        const totalSched = dayList.reduce((s, d) => s + d.schedMins, 0);
        return { emp: e, dayCount, dayList, totalActual, totalSched };
      })
      .sort((a, b) => (b.dayCount - a.dayCount) || (a.emp.fullName || '').localeCompare(b.emp.fullName || ''));
  }, [employees, byEmp, branchFilter, search]);

  const totalDays = rows.reduce((s, r) => s + r.dayCount, 0);
  const totalActualAll = rows.reduce((s, r) => s + r.totalActual, 0);
  const totalSchedAll = rows.reduce((s, r) => s + r.totalSched, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-gray-800">Chấm công nhân viên</h3>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="ml-auto border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white">
          <option value="ALL">Tất cả chi nhánh</option>
          {activeBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm nhân viên..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm text-emerald-800 font-semibold flex flex-wrap gap-x-4 gap-y-1">
        <span>Tháng {month.split('-')[1]}/{month.split('-')[0]} · {rows.length} NV · {totalDays} ngày công</span>
        <span className="text-sky-700">Thực tế: {fmtDuration(totalActualAll)}</span>
        <span className="text-emerald-700">Tính lương: {fmtDuration(totalSchedAll)}</span>
      </div>

      <p className="text-[11px] text-gray-400 px-1 -mt-1">
        <b>Thực tế</b> = theo giờ check-in/out thật. <b>Tính lương</b> = theo giờ ca trên lịch (không tính OT, không trừ đi sớm/đi trễ).
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-400 py-10 text-sm">Không có nhân viên phù hợp.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ emp, dayCount, dayList, totalActual, totalSched }) => {
            const open = expanded[emp.id];
            return (
              <div key={emp.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setExpanded((p) => ({ ...p, [emp.id]: !p[emp.id] }))}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
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
                    </div>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-gray-100">
                    <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                      <span>Ngày · giờ vào–ra</span>
                      <span className="flex gap-3"><span className="text-sky-600">Thực tế</span><span className="text-emerald-600">Lương</span></span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {dayList.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400">Không có ngày công nào trong tháng.</div>
                      ) : dayList.map((d) => (
                        <div key={d.date} className="flex items-center justify-between px-4 py-2 text-sm gap-2">
                          <span className="text-gray-600 min-w-0">
                            <span className="font-medium text-gray-700">{new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                            <span className="ml-2 text-xs text-gray-500">
                              <span className="text-emerald-700">{hhmm(d.checkIn)}</span>
                              {' → '}
                              <span className={d.checkOut ? 'text-gray-600' : 'text-amber-600'}>{hhmm(d.checkOut)}</span>
                            </span>
                          </span>
                          <span className="flex gap-3 shrink-0 font-bold text-xs">
                            <span className="text-sky-700 w-12 text-right">{fmtDuration(d.actualMins)}</span>
                            <span className="text-emerald-700 w-12 text-right">{fmtDuration(d.schedMins)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
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
