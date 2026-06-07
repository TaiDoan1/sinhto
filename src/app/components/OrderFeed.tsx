import { Clock, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useOrders } from '../contexts/OrderContext';

const sourceColors = {
  counter: 'bg-green-500',
  mobile: 'bg-emerald-600',
  web: 'bg-emerald-500'
};

const sourceLabels = {
  counter: 'Quầy',
  mobile: 'Mobile',
  web: 'Web'
};

export function OrderFeed() {
  const { orders } = useOrders();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedMinutes = (orderTime: Date) => {
    return Math.floor((currentTime.getTime() - orderTime.getTime()) / 60000);
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-20 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Đơn Hàng</h1>
        <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {orders.length} đơn
        </div>
      </div>

      <div className="space-y-3">
        {orders.map(order => {
          const elapsed = getElapsedMinutes(order.time);
          const isOverdue = elapsed > 5;

          return (
            <div key={order.id} className={`bg-white rounded-xl shadow-md p-4 border-2 ${
              isOverdue ? 'border-red-400' : 'border-gray-200'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold text-emerald-700">#{order.orderNumber}</div>
                  <div>
                    <div className={`${sourceColors[order.source]} text-white px-2 py-1 rounded text-xs font-bold`}>
                      {sourceLabels[order.source]}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{order.id}</div>
                  </div>
                </div>

                <div className={`flex items-center gap-1 px-2 py-1 rounded font-bold ${
                  isOverdue ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{elapsed}p</span>
                </div>
              </div>

              <div className="mb-3 bg-gray-50 rounded-lg p-3">
                <div className="space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-700">
                      • {item}
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 text-right">
                  <span className="text-lg font-bold text-emerald-700">
                    {order.total.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Trạng thái:</span>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                  order.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' :
                  order.status === 'ready' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {order.status === 'preparing' ? '🔥 Đang làm' :
                   order.status === 'ready' ? '✅ Sẵn sàng' :
                   'Hoàn thành'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Package className="w-16 h-16 mx-auto mb-3 opacity-50" />
          <p>Không có đơn hàng</p>
        </div>
      )}
    </div>
  );
}
