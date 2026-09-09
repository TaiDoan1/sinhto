import { useMemo, useState } from 'react';
import { Package, Clock, CheckCircle2, ChefHat, Bike, Phone, MapPin, Store, RefreshCw, Search } from 'lucide-react';
import type { Order } from '../../contexts/OrderContext';

// 4 trạng thái CSKH theo dõi (khớp yêu cầu chủ quán):
//   chờ nhận đơn → đã nhận đơn → đã xong đơn → ship đã lấy
// Ánh xạ từ status thật của đơn:
//   pending    = đơn mới, CHỜ máy POS bấm "Nhận Đơn"       → Chờ nhận đơn
//   preparing  = POS đã bấm nhận & đang làm món             → Đã nhận đơn (cửa hàng đã tiếp nhận)
//   ready      = làm xong, chờ shipper/khách                → Đã xong đơn
//   delivering = shipper đã lấy / đang giao                 → Ship đã lấy
//   completed  = đã giao xong                               → Ship đã lấy (đã xong)
export const CSKH_STEPS = [
  { key: 'wait', label: 'Chờ nhận đơn', icon: Clock },
  { key: 'accepted', label: 'Đã nhận đơn', icon: ChefHat },
  { key: 'done', label: 'Đã xong đơn', icon: CheckCircle2 },
  { key: 'picked', label: 'Ship đã lấy', icon: Bike },
] as const;

export function cskhStepIndex(status: Order['status']): number {
  switch (status) {
    case 'pending': return 0;
    case 'preparing': return 1;
    case 'ready': return 2;
    case 'delivering': return 3;
    case 'completed': return 3;
    default: return 0;
  }
}

function statusBadge(status: Order['status'], pickup: boolean) {
  switch (status) {
    case 'preparing':
      return { label: '👨‍🍳 Cửa hàng đã nhận đơn', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'ready':
      return { label: '📦 Đã xong đơn', cls: 'bg-violet-100 text-violet-700 border-violet-200' };
    case 'delivering':
      return pickup
        ? { label: '✅ Khách đã lấy', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
        : { label: '🛵 Ship đã lấy', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'completed':
      return { label: '✓ Hoàn tất', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
    default:
      return { label: '🔔 Chờ cửa hàng nhận', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
}

// Thanh 4 bước — khách tự lấy thì bước cuối đổi nhãn "Khách lấy".
function StepBar({ status, pickup }: { status: Order['status']; pickup: boolean }) {
  const cur = cskhStepIndex(status);
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {CSKH_STEPS.map((s, i) => {
        const done = i <= cur;
        const Icon = s.icon;
        const label = pickup && s.key === 'picked' ? 'Khách lấy' : s.label;
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-center">
              <div className="h-1 flex-1 rounded-full" style={{ background: i === 0 ? 'transparent' : (i <= cur ? '#4f46e5' : 'rgba(0,0,0,0.1)') }} />
              <div
                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all"
                style={{
                  background: done ? '#4f46e5' : '#e5e7eb',
                  color: done ? '#fff' : 'rgba(0,0,0,0.35)',
                  boxShadow: i === cur ? '0 0 0 4px rgba(79,70,229,0.18)' : 'none',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="h-1 flex-1 rounded-full" style={{ background: i === CSKH_STEPS.length - 1 ? 'transparent' : (i < cur ? '#4f46e5' : 'rgba(0,0,0,0.1)') }} />
            </div>
            <span className="text-[9px] font-bold text-center leading-tight" style={{ color: done ? '#4f46e5' : 'rgba(0,0,0,0.35)' }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function itemsSummary(order: Order): string {
  const items = Array.isArray(order.items) ? order.items : [];
  return items
    .map((it: any) => `${it.quantity || 1}× ${it.productName || it.name || 'Món'}`)
    .join(' · ');
}

type Filter = 'active' | 'all' | 'done';

export function CskhOrderTracker({
  orders,
  loading,
  onRefresh,
  onOpen,
}: {
  orders: Order[];
  loading?: boolean;
  onRefresh: () => void;
  onOpen?: (order: Order) => void;
}) {
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');

  const sorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
    [orders]
  );

  const counts = useMemo(() => {
    let active = 0, done = 0;
    for (const o of orders) {
      if (o.status === 'completed' || o.status === 'delivering') done++;
      else active++;
    }
    return { active, done, all: orders.length };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((o) => {
      if (filter === 'active' && (o.status === 'completed' || o.status === 'delivering')) return false;
      if (filter === 'done' && !(o.status === 'completed' || o.status === 'delivering')) return false;
      if (q) {
        const hay = `${o.customerName || ''} ${o.customerPhone || ''} ${o.deliveryAddress || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, filter, search]);

  const tabs: { key: Filter; label: string; badge: number }[] = [
    { key: 'active', label: 'Đang xử lý', badge: counts.active },
    { key: 'done', label: 'Đã lấy/xong', badge: counts.done },
    { key: 'all', label: 'Tất cả', badge: counts.all },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Theo dõi đơn đã chốt</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:border-indigo-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      <p className="text-xs text-gray-500 -mt-1">
        Đơn mới ở <b className="text-amber-600">Chờ nhận đơn</b> — khi máy POS bấm <b>Nhận đơn</b>, trạng thái tự đổi sang <b className="text-blue-600">Đã nhận đơn</b>.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${
              filter === t.key ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${filter === t.key ? 'bg-white/25' : 'bg-gray-100 text-gray-600'}`}>{t.badge}</span>
            )}
          </button>
        ))}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Tìm tên, SĐT, địa chỉ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-full border border-gray-200 text-sm bg-white"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-gray-500">Chưa có đơn nào ở mục này</p>
          <p className="text-sm mt-1">Đơn bạn chốt sẽ hiện ở đây kèm trạng thái cửa hàng.</p>
        </div>
      ) : (
        filtered.map((o) => {
          const pickup = o.deliveryType === 'pickup';
          const badge = statusBadge(o.status, pickup);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onOpen?.(o)}
              className="w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 transition-colors overflow-hidden"
            >
              <div className="px-4 pt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{o.customerName || 'Khách hàng'}</p>
                  {o.customerPhone && (
                    <p className="text-sm text-indigo-700 flex items-center gap-1 mt-0.5"><Phone className="w-3.5 h-3.5" /> {o.customerPhone}</p>
                  )}
                </div>
                <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
              </div>

              <div className="px-3"><StepBar status={o.status} pickup={pickup} /></div>

              <div className="px-4 pb-3 space-y-1">
                <p className="text-sm text-gray-700 flex items-start gap-1.5">
                  {pickup
                    ? <><Store className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" /> Tự lấy tại quán</>
                    : <><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" /> {o.deliveryAddress || '—'}</>}
                </p>
                <p className="text-xs text-gray-500 truncate">{itemsSummary(o)}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-gray-400">{new Date(o.time).toLocaleString('vi-VN')}</span>
                  <span className="font-black text-gray-900">{((o.total || 0) + (o.shipFee || 0)).toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
