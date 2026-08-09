import { useEffect, useMemo, useState } from 'react';
import { History, Loader2, Search, LogIn, LogOut } from 'lucide-react';
import * as api from '../../utils/api';
import { useBranches } from '../../contexts/BranchContext';
import type { WorkShift } from '../../types/employee';

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hhmm(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
}

/** Lịch sử check-in/out cho Cửa hàng trưởng: log theo thời gian (mới nhất trước) — mỗi lần
 * check-in / check-out là 1 dòng, kèm nhân viên + chi nhánh + giờ. Lọc theo chi nhánh + khoảng ngày. */
export function StoreManagerCheckinHistory() {
  const { activeBranches, branchLabel } = useBranches();
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [days, setDays] = useState(14); // xem N ngày gần nhất

  useEffect(() => {
    setLoading(true);
    const to = ymd(new Date());
    const fromD = new Date();
    fromD.setDate(fromD.getDate() - (days - 1));
    api.fetchShifts({ from: ymd(fromD), to })
      .then((data: WorkShift[]) => setShifts(data || []))
      .catch(() => setShifts([]))
      .finally(() => setLoading(false));
  }, [days]);

  // Tách mỗi ca thành các sự kiện check-in / check-out riêng, gộp lại rồi sắp mới nhất trước
  const events = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list: { id: string; type: 'in' | 'out'; at: string; name: string; branch?: string; date: string }[] = [];
    shifts.forEach((s) => {
      if (branchFilter !== 'ALL' && (s.branch || '') !== branchFilter) return;
      const name = s.employeeName || '';
      if (term && !name.toLowerCase().includes(term)) return;
      if (s.checkIn) list.push({ id: s.id + '-in', type: 'in', at: s.checkIn, name, branch: s.branch, date: s.date });
      if (s.checkOut) list.push({ id: s.id + '-out', type: 'out', at: s.checkOut, name, branch: s.branch, date: s.date });
    });
    return list.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [shifts, branchFilter, search]);

  // Nhóm theo ngày để hiển thị dễ nhìn
  const byDate = useMemo(() => {
    const m = new Map<string, typeof events>();
    events.forEach((e) => {
      const key = e.date || (e.at || '').split('T')[0];
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    });
    return [...m.entries()];
  }, [events]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-gray-800">Lịch sử check-in/out</h3>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="ml-auto border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white">
          <option value={7}>7 ngày</option>
          <option value={14}>14 ngày</option>
          <option value={30}>30 ngày</option>
        </select>
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

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : events.length === 0 ? (
        <p className="text-center text-gray-400 py-10 text-sm">Chưa có lượt check-in/out nào trong {days} ngày.</p>
      ) : (
        <div className="space-y-3">
          {byDate.map(([date, evs]) => (
            <div key={date}>
              <div className="text-xs font-bold text-gray-400 uppercase mb-1.5 px-1">
                {new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
              </div>
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-50 overflow-hidden">
                {evs.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${e.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {e.type === 'in' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate">{e.name || 'Nhân viên'}</p>
                      <p className="text-xs text-gray-500">{e.type === 'in' ? 'Check-in' : 'Check-out'} · {branchLabel(e.branch) || e.branch || '—'}</p>
                    </div>
                    <span className={`shrink-0 font-black ${e.type === 'in' ? 'text-emerald-700' : 'text-amber-700'}`}>{hhmm(e.at)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
