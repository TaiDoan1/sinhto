import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Clock, Phone, MapPin, Bell, CheckCircle2 } from 'lucide-react';
import * as api from '../../utils/api';

interface UpcomingDeliveryAlert {
  id: string;
  comboOrderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  planName?: string;
  deliveryDate: string;
  deliveryTime: string;
  scheduledAt: string;
  branchId: string;
}

function getUrgency(scheduledAt: string): 'critical' | 'warning' | 'normal' {
  const diffMs = new Date(scheduledAt).getTime() - Date.now();
  const diffMin = diffMs / 60000;
  if (diffMin <= 30) return 'critical';
  if (diffMin <= 60) return 'warning';
  return 'normal';
}

const URGENCY_STYLE = {
  critical: 'border-red-300 bg-red-50',
  warning: 'border-amber-300 bg-amber-50',
  normal: 'border-gray-200 bg-white',
};

const URGENCY_LABEL = {
  critical: '🔴 Gấp — dưới 30 phút',
  warning: '🟡 Sắp tới — dưới 1 giờ',
  normal: '⚪ Sắp giao',
};

export function DeliveryAlerts() {
  const [alerts, setAlerts] = useState<UpcomingDeliveryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [ackingId, setAckingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.fetchUpcomingDeliveryAlerts({ minutes: 60 });
      setAlerts(data);
    } catch (err) {
      console.error('Không tải được cảnh báo giao hàng:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleAck = async (id: string) => {
    setAckingId(id);
    try {
      await api.markDeliveryLogAlerted(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert('Đánh dấu thất bại. Thử lại nhé.');
    } finally {
      setAckingId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-400">Đang tải cảnh báo...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-gray-900">Cảnh Báo Giao Combo (trong 1 giờ tới)</h2>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-gray-500">Không có đơn combo nào sắp tới giờ giao</p>
        </div>
      ) : (
        alerts.map((a) => {
          const urgency = getUrgency(a.scheduledAt);
          return (
            <div key={a.id} className={`rounded-xl border p-4 ${URGENCY_STYLE[urgency]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold">{URGENCY_LABEL[urgency]}</span>
                  <p className="font-bold text-gray-900 mt-1">{a.customerName || 'Khách hàng'}</p>
                  <p className="text-sm text-indigo-700 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3.5 h-3.5" /> {a.customerPhone}
                  </p>
                  {a.deliveryAddress && (
                    <p className="text-sm text-gray-600 flex items-start gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {a.deliveryAddress}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 flex items-center gap-1 mt-1 font-semibold">
                    <Clock className="w-3.5 h-3.5" /> {a.deliveryDate} lúc {a.deliveryTime} · Chi nhánh {a.branchId}
                  </p>
                  {a.planName && <p className="text-xs text-gray-500 mt-1">{a.planName}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleAck(a.id)}
                  disabled={ackingId === a.id}
                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-60"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {ackingId === a.id ? '...' : 'Đã nhắc khách'}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
