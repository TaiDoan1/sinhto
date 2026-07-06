import { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle, Clock, MapPin, Phone } from 'lucide-react';
import * as api from '../../utils/api';

interface DeliveryAlert {
  id: string;
  comboOrderId: string;
  customerName: string;
  customerPhone: string;
  deliveryTime: string;
  scheduledAlertTime: string;
  status: 'pending' | 'sent';
  alertMethod: string;
  sentAt?: string;
  createdAt: string;
}

interface DeliveryAlertsProps {
  cskhId: string;
}

export function DeliveryAlerts({ cskhId }: DeliveryAlertsProps) {
  const [alerts, setAlerts] = useState<DeliveryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('pending');

  useEffect(() => {
    loadAlerts();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, [cskhId]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/delivery-alerts/pending');
      setAlerts(response || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSent = async (alert: DeliveryAlert) => {
    try {
      await api.patch(`/api/delivery-alerts/${alert.id}`, {
        sentTo: alert.alertMethod,
      });
      loadAlerts();
    } catch (error) {
      console.error('Failed to mark alert as sent:', error);
      alert('Cập nhật thất bại');
    }
  };

  const getTimeUntilDelivery = (deliveryTime: string) => {
    const now = new Date();
    const delivery = new Date(deliveryTime);
    const diff = delivery.getTime() - now.getTime();

    if (diff <= 0) return 'Đã quá hạn';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getUrgency = (deliveryTime: string): 'critical' | 'warning' | 'normal' => {
    const now = new Date();
    const delivery = new Date(deliveryTime);
    const diff = delivery.getTime() - now.getTime();
    const minutes = diff / (1000 * 60);

    if (minutes <= 30) return 'critical';
    if (minutes <= 60) return 'warning';
    return 'normal';
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'pending') return alert.status === 'pending';
    if (filter === 'sent') return alert.status === 'sent';
    return true;
  });

  const pendingCount = alerts.filter((a) => a.status === 'pending').length;
  const criticalCount = alerts.filter(
    (a) => a.status === 'pending' && getUrgency(a.deliveryTime) === 'critical'
  ).length;

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Alerts Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Cảnh báo sắp quá hạn</p>
              <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Đợi xử lý</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Đã gửi cảnh báo</p>
              <p className="text-3xl font-bold text-green-600">
                {alerts.filter((a) => a.status === 'sent').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex gap-2">
          {(['pending', 'sent', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === tab
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab === 'pending' ? 'Đợi xử lý' : tab === 'sent' ? 'Đã gửi' : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Không có cảnh báo nào</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const urgency = getUrgency(alert.deliveryTime);
            const timeLeft = getTimeUntilDelivery(alert.deliveryTime);

            const bgColor =
              urgency === 'critical'
                ? 'bg-red-50 border-red-200'
                : urgency === 'warning'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200';

            const badgeColor =
              urgency === 'critical'
                ? 'bg-red-600'
                : urgency === 'warning'
                ? 'bg-yellow-600'
                : 'bg-green-600';

            return (
              <div
                key={alert.id}
                className={`border-2 rounded-xl p-6 ${bgColor}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 ${badgeColor} rounded-lg flex items-center justify-center shrink-0`}>
                      <Bell className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {alert.customerName}
                      </h3>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>{alert.customerPhone}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>
                            {new Date(alert.deliveryTime).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="font-semibold">{timeLeft}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${
                        urgency === 'critical'
                          ? 'bg-red-600'
                          : urgency === 'warning'
                          ? 'bg-yellow-600'
                          : 'bg-green-600'
                      }`}
                    >
                      {urgency === 'critical'
                        ? '🚨 Khẩn cấp'
                        : urgency === 'warning'
                        ? '⚠️ Cân nhắc'
                        : '✓ Bình thường'}
                    </span>

                    <p className="text-xs text-gray-600 mt-2">
                      {alert.status === 'sent' ? 'Đã gửi' : 'Chưa gửi'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {alert.status === 'pending' && (
                    <button
                      onClick={() => handleMarkAsSent(alert)}
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm"
                    >
                      ✓ Gửi cảnh báo (Email + Zalo)
                    </button>
                  )}
                  {alert.status === 'sent' && (
                    <div className="flex-1 bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Đã gửi lúc {alert.sentAt ? new Date(alert.sentAt).toLocaleTimeString('vi-VN') : '—'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
