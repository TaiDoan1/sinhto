import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Loader2 } from 'lucide-react';
import * as api from '../../utils/api';

type OrderRow = {
  id: string;
  source?: string;
  total?: number;
  status?: string;
  time?: string;
  items?: unknown[];
};

function channelLabel(source?: string) {
  if (source === 'counter') return 'Tại quầy (POS)';
  if (source === 'online_sales') return 'CSKH online';
  if (source === 'web' || source === 'mobile') return 'Khách web/app';
  return 'Khác';
}

function isSmoothieItem(item: unknown): boolean {
  if (typeof item === 'string') return true;
  if (item && typeof item === 'object' && 'name' in item) {
    const name = String((item as { name?: string }).name || '').toLowerCase();
    return !name.includes('combo');
  }
  return true;
}

export function RevenueAnalytics() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchOrders()
      .then((data) => setOrders(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const completed = useMemo(
    () => orders.filter((o) => o.status === 'completed'),
    [orders]
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = completed.filter((o) => o.time?.startsWith(todayStr));

  const channelStats = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    todayOrders.forEach((o) => {
      const ch = channelLabel(o.source);
      const cur = map.get(ch) || { revenue: 0, orders: 0 };
      cur.revenue += Number(o.total) || 0;
      cur.orders += 1;
      map.set(ch, cur);
    });
    const total = [...map.values()].reduce((s, v) => s + v.revenue, 0) || 1;
    return [...map.entries()].map(([channel, v]) => ({
      channel,
      revenue: v.revenue,
      orders: v.orders,
      percentage: Math.round((v.revenue / total) * 100),
    }));
  }, [todayOrders]);

  const monthlyChannel = useMemo(() => {
    const months: Record<string, Record<string, number>> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `T${d.getMonth() + 1}`;
      months[key] = { 'Tại quầy': 0, 'Khách web': 0, CSKH: 0 };
    }
    completed.forEach((o) => {
      if (!o.time) return;
      const d = new Date(o.time);
      const key = `T${d.getMonth() + 1}`;
      if (!months[key]) return;
      const rev = (Number(o.total) || 0) / 1_000_000;
      if (o.source === 'counter') months[key]['Tại quầy'] += rev;
      else if (o.source === 'online_sales') months[key].CSKH += rev;
      else months[key]['Khách web'] += rev;
    });
    return Object.entries(months).map(([month, vals]) => ({ month, ...vals }));
  }, [completed]);

  const productMonthly = useMemo(() => {
    const months: Record<string, { Smoothie: number; Combo: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`T${d.getMonth() + 1}`] = { Smoothie: 0, Combo: 0 };
    }
    completed.forEach((o) => {
      if (!o.time) return;
      const key = `T${new Date(o.time).getMonth() + 1}`;
      if (!months[key]) return;
      const items = Array.isArray(o.items) ? o.items : [];
      const rev = Number(o.total) || 0;
      const hasCombo = items.some((it) => !isSmoothieItem(it));
      if (hasCombo) months[key].Combo += rev / 1_000_000;
      else months[key].Smoothie += rev / 1_000_000;
    });
    return Object.entries(months).map(([month, vals]) => ({ month, ...vals }));
  }, [completed]);

  const totalRevenue = channelStats.reduce((s, x) => s + x.revenue, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Phân Tích Doanh Thu</h1>
      <p className="text-sm text-gray-500 mb-6">Dữ liệu thật từ đơn hàng đã hoàn thành · Hôm nay: {totalRevenue.toLocaleString('vi-VN')}đ</p>

      {channelStats.length === 0 ? (
        <p className="text-gray-400 bg-white rounded-xl p-8 text-center">Chưa có đơn hoàn thành hôm nay</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {channelStats.map((stat) => (
            <div key={stat.channel} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex justify-between items-start mb-2 sm:mb-3">
                <div>
                  <div className="text-xs sm:text-sm text-gray-600">{stat.channel}</div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-800">
                    {(stat.revenue / 1_000_000).toFixed(2)}M đ
                  </div>
                </div>
                <div className="bg-emerald-100 text-emerald-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                  {stat.percentage}%
                </div>
              </div>
              <div className="text-xs sm:text-sm text-gray-600">{stat.orders} đơn</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Doanh thu theo kênh (triệu đồng)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyChannel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Tại quầy" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Khách web" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="CSKH" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Smoothie vs Combo (triệu đồng)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productMonthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Smoothie" fill="#10b981" />
              <Bar dataKey="Combo" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
