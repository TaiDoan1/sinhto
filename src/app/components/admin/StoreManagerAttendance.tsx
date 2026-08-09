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

/** Bảng chấm công cho Cửa hàng trưởng: chọn tháng → xem số ngày công + giờ check-in/out từng ngày
 * của từng nhân viên (theo chi nhánh). KHÔNG hiển thị lương/tiền. */
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

  // Gộp ca theo nhân viên → theo ngày (check-in sớm nhất, check-out muộn nhất mỗi ngày)
  const byEmp = useMemo(() => {
    const m = new Map<string, Map<string, { checkIn?: string; checkOut?: string }>>();
    shifts.forEach((s) => {
      if (!s.employeeId || !s.checkIn) return; // chỉ tính ngày có check-in
      if (!m.has(s.employeeId)) m.set(s.employeeId, new Map());
      const days = m.get(s.employeeId)!;
      const cur = days.get(s.date) || {};
      if (s.checkIn && (!cur.checkIn || s.checkIn < cur.checkIn)) cur.checkIn = s.checkIn;
      if (s.checkOut && (!cur.checkOut || s.checkOut > cur.checkOut)) cur.checkOut = s.checkOut;
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
        const dayList = days ? [...days.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)) : [];
        return { emp: e, dayCount: dayList.length, dayList };
      })
      .sort((a, b) => (b.dayCount - a.dayCount) || (a.emp.fullName || '').localeCompare(b.emp.fullName || ''));
  }, [employees, byEmp, branchFilter, search]);

  const totalDays = rows.reduce((s, r) => s + r.dayCount, 0);

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

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm text-emerald-800 font-semibold">
        Tháng {month.split('-')[1]}/{month.split('-')[0]} · {rows.length} nhân viên · {totalDays} lượt ngày công
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-400 py-10 text-sm">Không có nhân viên phù hợp.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ emp, dayCount, dayList }) => {
            const open = expanded[emp.id];
            return (
              <div key={emp.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setExpanded((p) => ({ ...p, [emp.id]: !p[emp.id] }))}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">{emp.fullName}</p>
                      <p className="text-xs text-gray-500">{branchLabel(emp.branch) || emp.branch || 'Chưa gán CN'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-emerald-700">{dayCount}</span>
                    <span className="text-xs text-gray-400"> ngày công</span>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {dayList.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-400">Không có ngày công nào trong tháng.</div>
                    ) : dayList.map((d) => (
                      <div key={d.date} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="text-gray-600">{new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                        <span className="font-semibold text-gray-800">
                          <span className="text-emerald-700">{hhmm(d.checkIn)}</span>
                          {' → '}
                          <span className={d.checkOut ? 'text-gray-800' : 'text-amber-600'}>{hhmm(d.checkOut)}</span>
                        </span>
                      </div>
                    ))}
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
