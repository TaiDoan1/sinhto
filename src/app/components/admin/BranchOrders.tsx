import { Clock, Package, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useOrders } from '../../contexts/OrderContext';

const sourceColors = {
  counter: 'bg-green-500',
  web: 'bg-emerald-600',
  offline: 'bg-emerald-500'
};

const sourceLabels = {
  counter: 'Tại Quầy',
  web: 'Đặt Web',
  offline: 'Offline'
};

const statusLabels = {
  confirm: 'Xác Nhận',
  prepare: 'Pha Chế',
  ready: 'Hoàn Thành',
  deliver: 'Đã Giao'
};

interface BranchOrdersProps {
  branchId: string;
}

export function BranchOrders({ branchId }: BranchOrdersProps) {
  const { orders: allOrders } = useOrders();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Filter orders by branch
  const orders = allOrders.filter(order => order.branchId === branchId);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedMinutes = (orderTime: Date) => {
    return Math.floor((currentTime.getTime() - orderTime.getTime()) / 60000);
  };

  const activeOrders = orders.filter(o => o.status !== 'deliver');
  const completedOrders = orders.filter(o => o.status === 'deliver');

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
                  const isOverdue = elapsed > 15;

                  return (
                    <div key={order.id} className="bg-white rounded-lg shadow-md p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`${sourceColors[order.source]} text-white px-3 py-1 rounded text-sm font-semibold`}>
                            {sourceLabels[order.source]}
                          </div>
                          <span className="font-bold text-gray-800">{order.id}</span>
                          <span className="text-sm text-gray-600">• {order.staff}</span>
                        </div>

                        <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-semibold">{elapsed}m</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-sm text-gray-700 ml-2">
                            • {item}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t">
                        <div className="text-lg font-bold text-emerald-700">
                          {order.total.toLocaleString('vi-VN')}đ
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-3 py-1 rounded text-sm font-semibold ${
                            order.status === 'confirm' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'prepare' ? 'bg-emerald-100 text-emerald-800' :
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
                {completedOrders.map(order => (
                  <div key={order.id} className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`${sourceColors[order.source]} text-white px-3 py-1 rounded text-sm font-semibold`}>
                            {sourceLabels[order.source]}
                          </div>
                          <span className="font-bold text-gray-800">{order.id}</span>
                          <span className="text-sm text-gray-600">• {order.staff}</span>
                        </div>
                        <div className="text-sm text-gray-600 ml-2">
                          {order.items.join(', ')}
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
