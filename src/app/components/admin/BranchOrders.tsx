import { Clock, Package, CheckCircle, Phone, Zap, Turtle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { useLoyalty } from '../../contexts/LoyaltyContext';
import { normalizePhoneVN } from '../../utils/phone';
import { usePagination, Pager } from '../common/Pagination';

const FAST_THRESHOLD_MIN = 15;

function formatTime(d?: Date) {
  if (!d) return '—';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const sourceColors: Record<string, string> = {
  counter: 'bg-green-500',
  web: 'bg-emerald-600',
  mobile: 'bg-emerald-500',
  online_sales: 'bg-pink-500',
};

const sourceLabels: Record<string, string> = {
  counter: 'Tại Quầy',
  web: 'Đặt Web',
  mobile: 'Mobile',
  online_sales: 'Bán Online',
};

const statusLabels: Record<string, string> = {
  pending: 'Chờ Xử Lý',
  preparing: 'Pha Chế',
  ready: 'Hoàn Thành',
  delivering: 'Đang Giao',
  completed: 'Đã Giao',
};

interface BranchOrdersProps {
  branchId: string;
}

function isToday(d: Date) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function BranchOrders({ branchId }: BranchOrdersProps) {
  const { orders: allOrders, history } = useOrders();
  const { customers } = useLoyalty();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Filter orders by branch + hôm nay (bao gồm cả đơn đã hoàn thành nằm trong history)
  const orders = [...allOrders, ...history].filter(
    order => order.branchId === branchId && isToday(order.time)
  );

  const loyaltyPhones = useMemo(
    () => new Set(customers.filter(c => c.points > 0).map(c => normalizePhoneVN(c.phone))),
    [customers]
  );

  const getLoyaltyPhone = (phone?: string) => {
    if (!phone) return null;
    const normalized = normalizePhoneVN(phone);
    return loyaltyPhones.has(normalized) ? phone : null;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedMinutes = (orderTime: Date) => {
    return Math.floor((currentTime.getTime() - orderTime.getTime()) / 60000);
  };

  const SpeedTag = ({ minutes }: { minutes: number }) => {
    const isFast = minutes <= FAST_THRESHOLD_MIN;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
        isFast ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}>
        {isFast ? <Zap className="w-3 h-3" /> : <Turtle className="w-3 h-3" />}
        {isFast ? 'Nhanh' : 'Chậm'} ({minutes}p)
      </span>
    );
  };

  const activeOrders = orders.filter(o => o.status !== 'completed');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const { pageItems: pagedCompleted, ...completedPager } = usePagination(completedOrders, 20);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Đơn Hàng Hôm Nay</h2>
          <p className="text-gray-600 mt-1">
            {activeOrders.length} đang xử lý • {completedOrders.length} đã hoàn thành
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">Chưa có đơn hàng nào hôm nay</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-700" />
                Đang Xử Lý ({activeOrders.length})
              </h3>
              <div className="space-y-3">
                {activeOrders.map(order => {
                  const elapsed = getElapsedMinutes(order.time);
                  const isOverdue = elapsed > FAST_THRESHOLD_MIN;
                  const loyaltyPhone = getLoyaltyPhone(order.customerPhone);

                  return (
                    <div key={order.id} className="bg-white rounded-lg shadow-md p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className={`${sourceColors[order.source]} text-white px-3 py-1 rounded text-sm font-semibold`}>
                            {sourceLabels[order.source]}
                          </div>
                          <span className="font-bold text-gray-800">{order.id}</span>
                          <span className="text-sm text-gray-600">• {order.staff}</span>
                          {loyaltyPhone && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-semibold">
                              <Phone className="w-3 h-3" />
                              {loyaltyPhone}
                            </span>
                          )}
                        </div>

                        <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-semibold">{elapsed}m</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                        <span>Đặt lúc: {formatTime(order.time)}</span>
                        <SpeedTag minutes={elapsed} />
                      </div>

                      <div className="mb-3">
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-sm text-gray-700 ml-2">
                            • {typeof item === 'string' ? item : `${item.quantity || 1}x ${item.productName || item.name}`}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t">
                        <div className="text-lg font-bold text-emerald-700">
                          {order.total.toLocaleString('vi-VN')}đ
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-3 py-1 rounded text-sm font-semibold ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'preparing' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {statusLabels[order.status]}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {completedOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Đã Hoàn Thành ({completedOrders.length})
              </h3>
              <div className="space-y-3">
                {pagedCompleted.map(order => {
                  const loyaltyPhone = getLoyaltyPhone(order.customerPhone);
                  const durationMin = order.completedAt
                    ? Math.max(0, Math.round((order.completedAt.getTime() - order.time.getTime()) / 60000))
                    : null;

                  return (
                    <div key={order.id} className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <div className={`${sourceColors[order.source]} text-white px-3 py-1 rounded text-sm font-semibold`}>
                              {sourceLabels[order.source]}
                            </div>
                            <span className="font-bold text-gray-800">{order.id}</span>
                            <span className="text-sm text-gray-600">• {order.staff}</span>
                            {loyaltyPhone && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-semibold">
                                <Phone className="w-3 h-3" />
                                {loyaltyPhone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 ml-2">
                            <span>Đặt lúc: {formatTime(order.time)}</span>
                            <span>Xong lúc: {formatTime(order.completedAt)}</span>
                            {durationMin !== null && <SpeedTag minutes={durationMin} />}
                          </div>
                          <div className="text-sm text-gray-600 ml-2">
                            {order.items
                              .map((item: any) =>
                                typeof item === 'string' ? item : `${item.quantity || 1}x ${item.productName || item.name}`
                              )
                              .join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">
                            {order.total.toLocaleString('vi-VN')}đ
                          </div>
                          <span className="text-xs text-green-600 font-semibold">✓ Đã giao</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pager {...completedPager} onPage={completedPager.setPage} unit="đơn" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
