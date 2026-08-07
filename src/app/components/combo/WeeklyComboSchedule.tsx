import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Clock, MapPin, Package, User, CalendarDays } from 'lucide-react';
import * as api from '../../utils/api';

type Variant = 'shipper' | 'cskh' | 'pos';

interface Props {
  branchId?: string;       // lọc theo chi nhánh (shipper/pos)
  careStaffId?: string;    // lọc theo CSKH (chỉ combo của mình)
  variant: Variant;
  branchLabel?: (id: string) => string;
}

const DOW_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayOf(base: Date) {
  const d = new Date(base);
  const day = d.getDay(); // 0=CN
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  delivered: { label: 'Đã giao', cls: 'bg-emerald-100 text-emerald-700' },
  postponed: { label: 'Đã hoãn', cls: 'bg-orange-100 text-orange-700' },
  pending: { label: 'Chờ', cls: 'bg-gray-200 text-gray-600' },
};

export function WeeklyComboSchedule({ branchId, careStaffId, variant, branchLabel }: Props) {
  const [offset, setOffset] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
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
  const from = ymd(days[0]);
  const to = ymd(days[6]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params: any = { from, to };
    if (branchId) params.branchId = branchId;
    if (careStaffId) params.careStaffId = careStaffId;
    api
      .fetchDeliveryLogs(params)
      .then((rows: any[]) => {
        if (cancelled) return;
        let list = rows.filter((r) => r.status !== 'cancelled');
        // Shipper chỉ quan tâm đơn mình đi giao (giao tận nơi, shipper của mình)
        if (variant === 'shipper') {
          list = list.filter((r) => (r.deliveryType || 'delivery') === 'delivery' && (r.shipMethod || 'own') !== 'external');
        }
        setLogs(list);
      })
      .catch(() => { if (!cancelled) setLogs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, branchId, careStaffId, variant]);

  const byDay = useMemo(() => {
    const m: Record<string, any[]> = {};
    logs.forEach((l) => {
      const k = (l.deliveryDate || '').split('T')[0];
      (m[k] ||= []).push(l);
    });
    Object.values(m).forEach((arr) => arr.sort((a, b) => (a.deliveryTime || '').localeCompare(b.deliveryTime || '')));
    return m;
  }, [logs]);

  const weekLabel = `${days[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – ${days[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
  const total = logs.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
        <button onClick={() => setOffset((o) => o - 1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center font-bold text-gray-800 text-sm">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            {offset === 0 ? 'Tuần này' : offset === 1 ? 'Tuần sau' : offset === -1 ? 'Tuần trước' : `Tuần ${weekLabel}`}
          </div>
          <div className="text-[11px] text-gray-500">{weekLabel} · {total} buổi giao</div>
        </div>
        <button onClick={() => setOffset((o) => o + 1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {offset !== 0 && (
        <button onClick={() => setOffset(0)} className="w-full text-xs font-semibold text-emerald-700 hover:text-emerald-800">↩︎ Về tuần này</button>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="space-y-2.5">
          {days.map((d) => {
            const key = ymd(d);
            const items = byDay[key] || [];
            const isToday = key === todayStr;
            return (
              <div key={key} className={`rounded-2xl border overflow-hidden ${isToday ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-100'} bg-white shadow-sm`}>
                <div className={`flex items-center justify-between px-3 py-2 ${isToday ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-black ${isToday ? 'text-emerald-700' : 'text-gray-700'}`}>{DOW_LABEL[d.getDay()]}</span>
                    <span className="text-xs text-gray-500">{d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                    {isToday && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">Hôm nay</span>}
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{items.length ? `${items.length} buổi` : '—'}</span>
                </div>
                {items.length > 0 && (
                  <div className="divide-y divide-gray-50">
                    {items.map((l) => {
                      const badge = STATUS_BADGE[l.status] || STATUS_BADGE.pending;
                      const pickup = (l.deliveryType || 'delivery') === 'pickup';
                      const addr = l.deliveryAddress || l.comboAddress || '';
                      return (
                        <div key={l.id} className="px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="font-bold text-gray-800">{l.deliveryTime || '08:00'}</span>
                              <User className="w-3.5 h-3.5 text-gray-400 ml-1 shrink-0" />
                              <span className="font-semibold text-gray-700 truncate">{l.customerName || 'Khách'}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.cls}`}>{badge.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <Package className="w-3 h-3 shrink-0" />
                            {l.productName || l.planName || 'Combo'}{l.size ? ` · ${l.size}` : ''}
                          </div>
                          {pickup ? (
                            <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">🏪 Khách tự lấy{branchLabel && l.branchId ? ` · ${branchLabel(l.branchId)}` : ''}</div>
                          ) : (
                            <div className="flex items-start gap-1 text-[11px] text-gray-500 mt-0.5">
                              <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-red-400" />
                              <span>
                                {addr || '(chưa có địa chỉ)'}
                                {(l.shipMethod || 'own') === 'external' && <span className="ml-1 font-bold text-amber-700">· Bookship{l.shipProvider ? ` ${l.shipProvider}` : ''}</span>}
                                {variant !== 'shipper' && branchLabel && l.branchId && <span className="ml-1 text-gray-400">· {branchLabel(l.branchId)}</span>}
                              </span>
                            </div>
                          )}
                          {variant === 'pos' && l.careStaffName && (
                            <div className="text-[10px] text-gray-400 mt-0.5">CSKH: {l.careStaffName}</div>
                          )}
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
