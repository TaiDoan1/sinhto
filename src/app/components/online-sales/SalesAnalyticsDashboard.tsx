import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as api from '../../utils/api';
import type { TeamStat } from '../../types/onlineSales';

type RangePreset = '7d' | '30d' | 'month';

const PRESET_LABEL: Record<RangePreset, string> = {
  '7d': '7 ngày qua',
  '30d': '30 ngày qua',
  month: 'Tháng này',
};

interface RevenueEvent {
  date: Date;
  amount: number;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Khoảng ngày hiện tại + khoảng ngay trước đó cùng độ dài — để tính % so với kỳ trước. */
function rangeDates(preset: RangePreset) {
  const end = endOfDay(new Date());
  let start: Date;
  if (preset === '7d') {
    start = startOfDay(new Date());
    start.setDate(start.getDate() - 6);
  } else if (preset === '30d') {
    start = startOfDay(new Date());
    start.setDate(start.getDate() - 29);
  } else {
    start = startOfDay(new Date(end.getFullYear(), end.getMonth(), 1));
  }
  const spanMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - spanMs);
  return { start, end, prevStart, prevEnd };
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-gray-400">—</span>;
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      <Icon className="w-3 h-3" />
      {positive ? '+' : ''}
      {value}%
    </span>
  );
}

function KpiCard({ label, value, change }: { label: string; value: string; change: number | null }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <div className="mt-1.5">
        <ChangeBadge value={change} />
        <span className="text-xs text-gray-400 ml-1">so với kỳ trước</span>
      </div>
    </div>
  );
}

/**
 * Trang "Số liệu" của cổng CSKH — lấy cảm hứng từ giao diện Grab Merchant: bộ chọn khoảng
 * thời gian, các thẻ KPI có % so với kỳ trước, biểu đồ doanh thu theo ngày, và bảng hiệu suất
 * theo từng nhân viên CSKH (tận dụng API /online-sales/team-stats đã có sẵn nhưng chưa dùng).
 *
 * Doanh thu gộp từ 2 nguồn: combo đã chốt (combo_subscriptions.closedAt) + đơn bán lẻ CSKH
 * (orders có source="online_sales", đã hoàn tất). Tính client-side vì lượng dữ liệu còn nhỏ —
 * nếu sau này nhiều dữ liệu hơn, nên chuyển sang 1 API tổng hợp riêng theo ngày ở backend.
 */
export function SalesAnalyticsDashboard() {
  const [preset, setPreset] = useState<RangePreset>('7d');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.fetchComboSubscriptions().catch(() => []),
      api.fetchOrders().catch(() => []),
      api.fetchOnlineSalesTeamStats().catch(() => []),
    ])
      .then(([combos, orders, stats]) => {
        const comboEvents: RevenueEvent[] = (combos || [])
          .filter((c: any) => c.closedAt && ['active', 'paused', 'completed'].includes(c.status))
          .map((c: any) => ({ date: new Date(c.closedAt), amount: Number(c.totalPrice) || 0 }));
        const orderEvents: RevenueEvent[] = (orders || [])
          .filter((o: any) => o.source === 'online_sales' && o.status === 'completed')
          .map((o: any) => ({ date: new Date(o.time), amount: Number(o.total) || 0 }));
        setEvents([...comboEvents, ...orderEvents]);
        setTeamStats(stats || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const { start, end, prevStart, prevEnd } = useMemo(() => rangeDates(preset), [preset]);

  const inRange = (d: Date, a: Date, b: Date) => d.getTime() >= a.getTime() && d.getTime() <= b.getTime();

  const currentEvents = useMemo(() => events.filter((e) => inRange(e.date, start, end)), [events, start, end]);
  const prevEvents = useMemo(() => events.filter((e) => inRange(e.date, prevStart, prevEnd)), [events, prevStart, prevEnd]);

  const currentTotal = useMemo(() => currentEvents.reduce((s, e) => s + e.amount, 0), [currentEvents]);
  const prevTotal = useMemo(() => prevEvents.reduce((s, e) => s + e.amount, 0), [prevEvents]);
  const currentCount = currentEvents.length;
  const prevCount = prevEvents.length;
  const currentAvg = currentCount > 0 ? currentTotal / currentCount : 0;
  const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    const cursor = new Date(start);
    while (cursor <= end) {
      map.set(dayKey(cursor), 0);
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const ev of currentEvents) {
      const key = dayKey(ev.date);
      map.set(key, (map.get(key) || 0) + ev.amount);
    }
    return Array.from(map.entries()).map(([key, revenue]) => {
      const [, m, d] = key.split('-');
      return { date: `${d}/${m}`, revenue };
    });
  }, [currentEvents, start, end]);

  return (
    <div className={`space-y-6 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800">Số liệu</h2>
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
          {(['7d', '30d', 'month'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                preset === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {PRESET_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Tổng doanh thu" value={`${currentTotal.toLocaleString('vi-VN')}đ`} change={pctChange(currentTotal, prevTotal)} />
        <KpiCard label="Số giao dịch" value={String(currentCount)} change={pctChange(currentCount, prevCount)} />
        <KpiCard label="Giá trị TB / giao dịch" value={`${Math.round(currentAvg).toLocaleString('vi-VN')}đ`} change={pctChange(currentAvg, prevAvg)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 mb-4">Doanh thu theo ngày</h3>
        {currentTotal === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Chưa có doanh thu trong khoảng thời gian này</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}tr` : v.toLocaleString('vi-VN'))}
              />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString('vi-VN')}đ`, 'Doanh thu']} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-gray-500" />
          <h3 className="font-bold text-gray-800">Hiệu suất theo nhân viên (tháng này)</h3>
        </div>
        {teamStats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu nhân viên CSKH</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-400 border-b">
                  <th className="pb-2 pr-4">Nhân viên</th>
                  <th className="pb-2 pr-4">Doanh thu</th>
                  <th className="pb-2 pr-4">Combo active</th>
                  <th className="pb-2 pr-4">Khách hàng</th>
                  <th className="pb-2">Chờ chốt</th>
                </tr>
              </thead>
              <tbody>
                {teamStats.map((s) => (
                  <tr key={s.staffId} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold text-gray-800">{s.fullName}</td>
                    <td className="py-2.5 pr-4 font-bold text-emerald-700">{s.revenueMonth.toLocaleString('vi-VN')}đ</td>
                    <td className="py-2.5 pr-4">{s.comboCount}</td>
                    <td className="py-2.5 pr-4">{s.customerCount}</td>
                    <td className="py-2.5">
                      {s.pendingClaims > 0 ? (
                        <span className="text-amber-600 font-semibold">{s.pendingClaims}</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
