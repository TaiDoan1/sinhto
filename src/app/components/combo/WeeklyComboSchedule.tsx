import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Clock, MapPin, Package, User, CalendarDays } from 'lucide-react';
import * as api from '../../utils/api';

type Variant = 'shipper' | 'cskh' | 'pos';
type Mode = 'today' | 'week';

interface Props {
  branchId?: string;       // lọc theo chi nhánh (shipper/pos)
  careStaffId?: string;    // lọc theo CSKH (chỉ đơn của mình)
  variant: Variant;
  branchLabel?: (id: string) => string;
  defaultMode?: Mode;      // 'today' cho shipper/pos, 'week' cho cskh
}

interface SchedItem {
  id: string;
  date: string;
  time: string;
  customerName: string;
  productLabel: string;
  deliveryType: 'pickup' | 'delivery';
  address: string;
  branchId: string;
  shipMethod: string;
  shipProvider?: string;
  status: string;
  kind: 'combo' | 'retail';
  careStaffName?: string;
  allergyNote?: string;
}

const DOW_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayOf(base: Date) {
  const d = new Date(base);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  delivered: { label: 'Đã giao', cls: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Đã giao', cls: 'bg-emerald-100 text-emerald-700' },
  delivering: { label: 'Đang giao', cls: 'bg-sky-100 text-sky-700' },
  ready: { label: 'Chờ lấy', cls: 'bg-violet-100 text-violet-700' },
  preparing: { label: 'Đang làm', cls: 'bg-amber-100 text-amber-700' },
  postponed: { label: 'Đã hoãn', cls: 'bg-orange-100 text-orange-700' },
  pending: { label: 'Chờ', cls: 'bg-gray-200 text-gray-600' },
};

function itemsLabel(items: any[]): string {
  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) return 'Đơn lẻ';
  const first = arr[0];
  const name = typeof first === 'string' ? first : (first.productName || first.name || 'Món');
  return arr.length > 1 ? `${name} +${arr.length - 1}` : name;
}

export function WeeklyComboSchedule({ branchId, careStaffId, variant, branchLabel, defaultMode }: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode || 'week');
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<SchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const todayStr = ymd(new Date());

  const weekStart = useMemo(() => {
    const m = mondayOf(new Date());
    m.setDate(m.getDate() + offset * 7);
    return m;
  }, [offset]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart]
  );

  // Phạm vi lấy dữ liệu: 'today' chỉ hôm nay, 'week' cả tuần đang xem
  const from = mode === 'today' ? todayStr : ymd(days[0]);
  const to = mode === 'today' ? todayStr : ymd(days[6]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const logParams: any = { from, to };
    if (branchId) logParams.branchId = branchId;
    if (careStaffId) logParams.careStaffId = careStaffId;

    const orderParams: any = { recentDays: 400 };
    if (branchId) orderParams.branchId = branchId;
    if (careStaffId) orderParams.salesStaffId = careStaffId;

    Promise.all([
      api.fetchDeliveryLogs(logParams).catch(() => []),
      api.fetchOrders(orderParams).catch(() => []),
    ])
      .then(([logs, orders]: [any[], any[]]) => {
        if (cancelled) return;

        let comboItems: SchedItem[] = (logs || [])
          .filter((l) => l.status !== 'cancelled')
          .map((l) => ({
            id: 'C-' + l.id,
            date: (l.deliveryDate || '').split('T')[0],
            time: l.deliveryTime || '08:00',
            customerName: l.customerName || 'Khách',
            productLabel: `${l.productName || l.planName || 'Combo'}${l.size ? ` · ${l.size}` : ''}`,
            deliveryType: (l.deliveryType || 'delivery') as 'pickup' | 'delivery',
            address: l.deliveryAddress || l.comboAddress || '',
            branchId: l.branchId,
            shipMethod: l.shipMethod || 'own',
            shipProvider: l.shipProvider || '',
            status: l.status,
            kind: 'combo',
            careStaffName: l.careStaffName,
            allergyNote: l.allergyNote || '',
          }));
        if (variant === 'shipper') {
          comboItems = comboItems.filter((c) => c.deliveryType === 'delivery' && c.shipMethod !== 'external');
        }

        let retailItems: SchedItem[] = (orders || [])
          .filter((o) => o.deliveryTime && o.status !== 'cancelled')
          .map((o) => {
            const dt = new Date(o.deliveryTime);
            if (isNaN(dt.getTime())) return null;
            const date = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
            const time = dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
            return {
              id: 'R-' + o.id,
              date,
              time,
              customerName: o.customerName || 'Khách',
              productLabel: itemsLabel(o.items),
              deliveryType: (o.deliveryType || 'delivery') as 'pickup' | 'delivery',
              address: o.deliveryAddress || '',
              branchId: o.branchId,
              shipMethod: o.shipMethod || 'own',
              shipProvider: o.shipProvider || '',
              status: o.status,
              kind: 'retail' as const,
              careStaffName: o.salesStaffName,
              allergyNote: o.allergyNote || '',
            } as SchedItem;
          })
          .filter((x): x is SchedItem => !!x && x.date >= from && x.date <= to);
        if (variant === 'shipper') {
          retailItems = retailItems.filter((r) => r.deliveryType === 'delivery' && r.shipMethod !== 'external');
        }

        setItems([...comboItems, ...retailItems]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [from, to, branchId, careStaffId, variant]);

  const byDay = useMemo(() => {
    const m: Record<string, SchedItem[]> = {};
    items.forEach((l) => { (m[l.date] ||= []).push(l); });
    Object.values(m).forEach((arr) => arr.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
    return m;
  }, [items]);

  const renderRow = (l: SchedItem) => {
    const badge = STATUS_BADGE[l.status] || STATUS_BADGE.pending;
    const pickup = l.deliveryType === 'pickup';
    return (
      <div key={l.id} className="px-3 py-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="font-bold text-gray-800">{l.time}</span>
            <span className={`text-[9px] font-black px-1 py-0.5 rounded shrink-0 ${l.kind === 'combo' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {l.kind === 'combo' ? 'COMBO' : 'LẺ'}
            </span>
            <User className="w-3.5 h-3.5 text-gray-400 ml-0.5 shrink-0" />
            <span className="font-semibold text-gray-700 truncate">{l.customerName}</span>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.cls}`}>{badge.label}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
          <Package className="w-3 h-3 shrink-0" />
          {l.productLabel}
        </div>
        {pickup ? (
          <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">🏪 Khách tự lấy{branchLabel && l.branchId ? ` · ${branchLabel(l.branchId)}` : ''}</div>
        ) : (
          <div className="flex items-start gap-1 text-[11px] text-gray-500 mt-0.5">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-red-400" />
            <span>
              {l.address || '(chưa có địa chỉ)'}
              {l.shipMethod === 'external' && <span className="ml-1 font-bold text-amber-700">· Bookship{l.shipProvider ? ` ${l.shipProvider}` : ''}</span>}
              {variant !== 'shipper' && branchLabel && l.branchId && <span className="ml-1 text-gray-400">· {branchLabel(l.branchId)}</span>}
            </span>
          </div>
        )}
        {l.allergyNote && (
          <div className="text-[11px] font-bold text-red-700 mt-0.5">🚫 Kỵ vị/Dị ứng: {l.allergyNote}</div>
        )}
        {variant === 'pos' && l.careStaffName && (
          <div className="text-[10px] text-gray-400 mt-0.5">CSKH: {l.careStaffName}</div>
        )}
      </div>
    );
  };

  const weekLabel = `${days[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – ${days[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
  const todayItems = byDay[todayStr] || [];

  return (
    <div className="space-y-3">
      {/* Chuyển Hôm nay / Cả tuần */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setMode('today')} className={`flex-1 py-1.5 rounded-lg text-sm font-bold ${mode === 'today' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}>Hôm nay</button>
        <button onClick={() => { setMode('week'); setOffset(0); }} className={`flex-1 py-1.5 rounded-lg text-sm font-bold ${mode === 'week' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}>Cả tuần</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : mode === 'today' ? (
        <div className="rounded-2xl border border-emerald-300 ring-1 ring-emerald-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-50">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span className="font-black text-emerald-700">Hôm nay</span>
              <span className="text-xs text-gray-500">{new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
            </div>
            <span className="text-xs font-semibold text-gray-500">{todayItems.length ? `${todayItems.length} lượt` : '—'}</span>
          </div>
          {todayItems.length === 0 ? (
            <div className="px-3 py-10 text-center text-gray-400 text-sm">Hôm nay không có lịch giao.</div>
          ) : (
            <div className="divide-y divide-gray-50">{todayItems.map(renderRow)}</div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
            <button onClick={() => setOffset((o) => o - 1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center font-bold text-gray-800 text-sm">
                <CalendarDays className="w-4 h-4 text-emerald-600" />
                {offset === 0 ? 'Tuần này' : offset === 1 ? 'Tuần sau' : offset === -1 ? 'Tuần trước' : `Tuần ${weekLabel}`}
              </div>
              <div className="text-[11px] text-gray-500">{weekLabel} · {items.length} lượt giao</div>
            </div>
            <button onClick={() => setOffset((o) => o + 1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="w-full text-xs font-semibold text-emerald-700 hover:text-emerald-800">↩︎ Về tuần này</button>
          )}

          <div className="space-y-2.5">
            {days.map((d) => {
              const key = ymd(d);
              const dayItems = byDay[key] || [];
              const isToday = key === todayStr;
              return (
                <div key={key} className={`rounded-2xl border overflow-hidden ${isToday ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-100'} bg-white shadow-sm`}>
                  <div className={`flex items-center justify-between px-3 py-2 ${isToday ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`font-black ${isToday ? 'text-emerald-700' : 'text-gray-700'}`}>{DOW_LABEL[d.getDay()]}</span>
                      <span className="text-xs text-gray-500">{d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                      {isToday && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">Hôm nay</span>}
                    </div>
                    <span className="text-xs font-semibold text-gray-500">{dayItems.length ? `${dayItems.length} lượt` : '—'}</span>
                  </div>
                  {dayItems.length > 0 && <div className="divide-y divide-gray-50">{dayItems.map(renderRow)}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
