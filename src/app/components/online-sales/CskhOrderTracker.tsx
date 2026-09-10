import { useMemo, useState } from 'react';
import { Package, Clock, CheckCircle2, ChefHat, Bike, Phone, MapPin, Store, RefreshCw, Search, Repeat, ChevronDown, ChevronRight, Loader2, PackageCheck } from 'lucide-react';
import type { Order } from '../../contexts/OrderContext';
import type { ComboSubscription } from '../../contexts/ComboContext';
import type { DeliveryLogRecord } from '../../types/combo';
import * as api from '../../utils/api';

// 4 trạng thái CSKH theo dõi ĐƠN LẺ (khớp yêu cầu chủ quán):
//   chờ nhận đơn → đã nhận đơn → đã xong đơn → ship đã lấy
// Ánh xạ từ status thật của đơn:
//   pending → Chờ nhận đơn · preparing → Đã nhận đơn · ready → Đã xong đơn · delivering/completed → Ship đã lấy
export const CSKH_STEPS = [
  { key: 'wait', label: 'Chờ nhận đơn', icon: Clock },
  { key: 'accepted', label: 'Đã nhận đơn', icon: ChefHat },
  { key: 'done', label: 'Đã xong đơn', icon: CheckCircle2 },
  { key: 'picked', label: 'Ship đã lấy', icon: Bike },
  { key: 'received', label: 'Khách đã nhận', icon: PackageCheck },
] as const;

function isReceived(o: Order): boolean {
  return !!(o as any).customerReceived;
}
// "Cửa hàng đã xong khâu giao" = shipper đã lấy / đã hoàn tất giao nhận ở POS.
function isHandedOff(status: Order['status']): boolean {
  return status === 'delivering' || status === 'completed';
}

export function cskhStepIndex(o: Order): number {
  if (isReceived(o)) return 4;
  switch (o.status) {
    case 'pending': return 0;
    case 'preparing': return 1;
    case 'ready': return 2;
    case 'delivering': return 3;
    case 'completed': return 3;
    default: return 0;
  }
}

function statusBadge(o: Order, pickup: boolean) {
  if (isReceived(o)) return { label: pickup ? '✓ Khách đã lấy' : '✓ Khách đã nhận đơn', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  switch (o.status) {
    case 'preparing':
      return { label: '👨‍🍳 Cửa hàng đã nhận đơn', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'ready':
      return { label: '📦 Đã xong đơn', cls: 'bg-violet-100 text-violet-700 border-violet-200' };
    case 'delivering':
      return { label: pickup ? '🏪 Chờ khách lấy' : '🛵 Ship đã lấy', cls: 'bg-teal-100 text-teal-700 border-teal-200' };
    case 'completed':
      return { label: pickup ? '🏪 Chờ khách lấy' : '🛵 Ship đã lấy', cls: 'bg-teal-100 text-teal-700 border-teal-200' };
    default:
      return { label: '🔔 Chờ cửa hàng nhận', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
}

// Thanh 5 bước — khách tự lấy thì đổi nhãn bước ship/nhận.
function StepBar({ order, pickup }: { order: Order; pickup: boolean }) {
  const cur = cskhStepIndex(order);
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {CSKH_STEPS.map((s, i) => {
        const done = i <= cur;
        const Icon = s.icon;
        const label = pickup
          ? (s.key === 'picked' ? 'Chờ khách' : s.key === 'received' ? 'Khách đã lấy' : s.label)
          : s.label;
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

// ── Trạng thái combo (KHÁC đơn lẻ: combo là gói giao nhiều buổi, không theo 4 bước POS) ──
function comboBadge(status: ComboSubscription['status']) {
  switch (status) {
    case 'active': return { label: '🚚 Đang giao', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'paused': return { label: '⏸️ Tạm dừng', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'completed': return { label: '✓ Hoàn thành', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
    default: return { label: '🔔 Chờ chốt', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
  }
}

// Trạng thái từng BUỔI giao của combo (delivery_logs).
function buoiBadge(status: string) {
  switch (status) {
    case 'delivered': return { label: '✓ Đã giao', cls: 'bg-emerald-100 text-emerald-700', dot: '#10b981' };
    case 'shipping': return { label: '🛵 Đang giao', cls: 'bg-blue-100 text-blue-700', dot: '#3b82f6' };
    case 'postponed': return { label: '⏸️ Hoãn', cls: 'bg-amber-100 text-amber-700', dot: '#f59e0b' };
    default: return { label: '🕒 Chờ giao', cls: 'bg-gray-100 text-gray-500', dot: '#9ca3af' };
  }
}

type ViewType = 'retail' | 'combo';
type Filter = 'active' | 'all' | 'done';

export function CskhOrderTracker({
  orders,
  combos = [],
  loading,
  onRefresh,
  onOpen,
  onCompleteOrder,
}: {
  orders: Order[];
  combos?: ComboSubscription[];
  loading?: boolean;
  onRefresh: () => void;
  onOpen?: (order: Order) => void;
  /** CSKH bấm "Hoàn thành đơn" (khách đã nhận) → đẩy sang Đã lấy/xong. */
  onCompleteOrder?: (order: Order) => void;
}) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [viewType, setViewType] = useState<ViewType>('retail');
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');

  // Chi tiết từng buổi của combo — tải lười (chỉ khi mở), cache theo comboId.
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);
  const [comboLogs, setComboLogs] = useState<Record<string, DeliveryLogRecord[]>>({});
  const [logsLoading, setLogsLoading] = useState<string | null>(null);

  const toggleComboDetail = async (comboId: string) => {
    if (expandedCombo === comboId) { setExpandedCombo(null); return; }
    setExpandedCombo(comboId);
    if (!comboLogs[comboId]) {
      setLogsLoading(comboId);
      try {
        const logs = await api.fetchDeliveryLogs({ comboOrderId: comboId });
        const sorted = (logs as DeliveryLogRecord[]).slice().sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));
        setComboLogs((prev) => ({ ...prev, [comboId]: sorted }));
      } catch {
        setComboLogs((prev) => ({ ...prev, [comboId]: [] }));
      } finally {
        setLogsLoading(null);
      }
    }
  };

  // ── ĐƠN LẺ ──
  const retailSorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
    [orders]
  );
  const retailCounts = useMemo(() => {
    let active = 0, done = 0;
    for (const o of orders) {
      if (isReceived(o)) done++;
      else active++;
    }
    return { active, done, all: orders.length };
  }, [orders]);

  // ── COMBO ── (đang xử lý = pending/active/paused; xong = completed)
  const comboSorted = useMemo(
    () => [...combos].sort((a, b) => new Date(b.startDate as any).getTime() - new Date(a.startDate as any).getTime()),
    [combos]
  );
  const comboCounts = useMemo(() => {
    let active = 0, done = 0;
    for (const c of combos) {
      if (c.status === 'completed') done++;
      else active++;
    }
    return { active, done, all: combos.length };
  }, [combos]);

  const matchSearch = (hay: string) => {
    const q = search.trim().toLowerCase();
    return !q || hay.toLowerCase().includes(q);
  };

  const filteredRetail = useMemo(() => retailSorted.filter((o) => {
    if (filter === 'active' && isReceived(o)) return false;
    if (filter === 'done' && !isReceived(o)) return false;
    return matchSearch(`${o.customerName || ''} ${o.customerPhone || ''} ${o.deliveryAddress || ''}`);
  }), [retailSorted, filter, search]);

  const filteredCombo = useMemo(() => comboSorted.filter((c) => {
    if (filter === 'active' && c.status === 'completed') return false;
    if (filter === 'done' && c.status !== 'completed') return false;
    return matchSearch(`${c.customerName || ''} ${c.customerPhone || ''} ${c.planName || ''} ${c.deliveryAddress || ''}`);
  }), [comboSorted, filter, search]);

  const counts = viewType === 'retail' ? retailCounts : comboCounts;
  const tabs: { key: Filter; label: string; badge: number }[] = [
    { key: 'active', label: 'Đang xử lý', badge: counts.active },
    { key: 'done', label: viewType === 'retail' ? 'Đã lấy/xong' : 'Hoàn thành', badge: counts.done },
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

      {/* Tách riêng ĐƠN LẺ và COMBO — không gộp chung */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { key: 'retail', label: 'Đơn lẻ', icon: Package, badge: retailCounts.active },
          { key: 'combo', label: 'Combo', icon: Repeat, badge: comboCounts.active },
        ] as const).map((seg) => (
          <button
            key={seg.key}
            type="button"
            onClick={() => { setViewType(seg.key); setFilter('active'); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
              viewType === seg.key ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            <seg.icon className="w-4 h-4" />
            {seg.label}
            {seg.badge > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${viewType === seg.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{seg.badge}</span>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 -mt-0.5">
        {viewType === 'retail'
          ? <>Đơn mới ở <b className="text-amber-600">Chờ nhận đơn</b> — khi máy POS bấm <b>Nhận đơn</b>, trạng thái tự đổi sang <b className="text-blue-600">Đã nhận đơn</b>.</>
          : <>Gói combo bạn đã chốt và tiến độ giao (số buổi đã giao / tổng số buổi).</>}
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

      {/* ── DANH SÁCH ĐƠN LẺ ── */}
      {viewType === 'retail' && (
        filteredRetail.length === 0 ? (
          <EmptyBox text="Đơn lẻ bạn chốt sẽ hiện ở đây kèm trạng thái cửa hàng." />
        ) : (
          filteredRetail.map((o) => {
            const pickup = o.deliveryType === 'pickup';
            const badge = statusBadge(o, pickup);
            const canComplete = isHandedOff(o.status) && !isReceived(o);
            const received = isReceived(o);
            return (
              <div
                key={o.id}
                className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden"
              >
                <div role="button" tabIndex={0} onClick={() => onOpen?.(o)} className="text-left cursor-pointer hover:bg-gray-50/60">
                  <div className="px-4 pt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{o.customerName || 'Khách hàng'}</p>
                      {o.customerPhone && (
                        <p className="text-sm text-indigo-700 flex items-center gap-1 mt-0.5"><Phone className="w-3.5 h-3.5" /> {o.customerPhone}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
                  </div>

                  <div className="px-3"><StepBar order={o} pickup={pickup} /></div>

                  <div className="px-4 pb-3 space-y-1">
                    <p className="text-sm text-gray-700 flex items-start gap-1.5">
                      {pickup
                        ? <><Store className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" /> Tự lấy tại quán</>
                        : <><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" /> {o.deliveryAddress || '—'}</>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{itemsSummary(o)}</p>
                    {(o as any).shipTrackingCode && (
                      <p className="text-xs text-sky-700 font-semibold flex items-center gap-1">
                        <Bike className="w-3.5 h-3.5" /> Mã ship: {(o as any).shipTrackingCode}{(o as any).shipProvider ? ` · ${(o as any).shipProvider}` : ''}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-gray-400">{new Date(o.time).toLocaleString('vi-VN')}</span>
                      <span className="font-black text-gray-900">{((o.total || 0) + (o.shipFee || 0)).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>

                {/* Nút Hoàn thành đơn — tắt cho tới khi cửa hàng đã giao (Ship đã lấy), bấm = khách đã nhận */}
                {!received && (
                  <div className="px-4 pb-3">
                    <button
                      type="button"
                      disabled={!canComplete || completing === o.id}
                      onClick={() => { if (canComplete && onCompleteOrder) { setCompleting(o.id); onCompleteOrder(o); } }}
                      title={canComplete ? 'Xác nhận khách đã nhận đơn' : 'Chờ cửa hàng giao xong (Ship đã lấy) mới hoàn thành được'}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                        canComplete
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <PackageCheck className="w-4 h-4" />
                      {completing === o.id ? 'Đang lưu...' : 'Hoàn thành đơn (khách đã nhận)'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )
      )}

      {/* ── DANH SÁCH COMBO ── */}
      {viewType === 'combo' && (
        filteredCombo.length === 0 ? (
          <EmptyBox text="Gói combo bạn chốt sẽ hiện ở đây kèm tiến độ giao." />
        ) : (
          filteredCombo.map((c) => {
            const pickup = c.deliveryType === 'pickup';
            const badge = comboBadge(c.status);
            const total = c.totalCups || 0;
            const delivered = c.deliveredCups || 0;
            const pct = total > 0 ? Math.min(100, Math.round((delivered / total) * 100)) : 0;
            return (
              <div key={c.id} className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 pt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{c.customerName || 'Khách hàng'}</p>
                    {c.customerPhone && (
                      <p className="text-sm text-indigo-700 flex items-center gap-1 mt-0.5"><Phone className="w-3.5 h-3.5" /> {c.customerPhone}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
                </div>

                <div className="px-4 pt-2">
                  <p className="text-sm font-semibold text-indigo-900 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-indigo-500" /> {c.planName || (c.comboType === 'weekly' ? 'Combo tuần' : 'Combo tháng')}
                  </p>
                  {/* Tiến độ giao */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mb-1">
                      <span>Đã giao {delivered}/{total} buổi</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 space-y-1">
                  <p className="text-sm text-gray-700 flex items-start gap-1.5">
                    {pickup
                      ? <><Store className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" /> Tự lấy tại quán</>
                      : <><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" /> {c.deliveryAddress || '—'}</>}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Buổi tới: {c.nextDelivery ? new Date(c.nextDelivery as any).toLocaleDateString('vi-VN') : '—'}{c.deliveryTime ? ` · ${c.deliveryTime}` : ''}
                    </span>
                    <span className="font-black text-gray-900">{(c.totalPrice || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                {/* Chi tiết từng buổi giao (tải lười khi mở) */}
                <button
                  type="button"
                  onClick={() => toggleComboDetail(c.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border-t border-gray-100 transition-colors"
                >
                  {expandedCombo === c.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {expandedCombo === c.id ? 'Ẩn chi tiết từng buổi' : 'Xem chi tiết từng buổi'}
                </button>

                {expandedCombo === c.id && (
                  <div className="px-4 pb-3 bg-gray-50/60 border-t border-gray-100">
                    {logsLoading === c.id ? (
                      <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /></div>
                    ) : (comboLogs[c.id] || []).length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-400">Chưa có lịch buổi giao nào.</p>
                    ) : (
                      <div className="pt-2 space-y-1.5">
                        {(comboLogs[c.id] || []).map((log, i) => {
                          const b = buoiBadge(log.status);
                          return (
                            <div key={log.id || i} className="flex items-center gap-2.5 bg-white rounded-lg border border-gray-100 px-3 py-2">
                              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-800">
                                  {log.deliveryDate ? new Date(log.deliveryDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—'}
                                </p>
                                <p className="text-[11px] text-gray-500 truncate">
                                  {log.productName || 'Món'}{log.size ? ` · ${log.size}` : ''}{log.protein ? ` · ${log.protein}g` : ''}
                                </p>
                              </div>
                              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )
      )}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="text-center py-14 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
      <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
      <p className="font-semibold text-gray-500">Chưa có đơn nào ở mục này</p>
      <p className="text-sm mt-1">{text}</p>
    </div>
  );
}
