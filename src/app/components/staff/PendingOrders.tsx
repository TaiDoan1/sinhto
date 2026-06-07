import { CreditCard, Clock, ChevronRight } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { useState } from 'react';

interface PendingOrdersProps {
  onPayOrder: (orderId: string, total: number) => void;
}

export function PendingOrders({ onPayOrder }: PendingOrdersProps) {
  const { orders } = useOrders();
  const pendingOrders = orders.filter(o => !o.isPaid && o.source === 'mobile');

  const getTimeSince = (orderTime: Date) => {
    const diff = new Date().getTime() - new Date(orderTime).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    return `${minutes}p trước`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-4 shadow-lg">
        <h1 className="text-xl font-bold">Đơn Chưa Thanh Toán</h1>
        <p className="text-sm opacity-90">{pendingOrders.length} đơn đang chờ</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {pendingOrders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">💳</div>
            <p className="text-lg">Không có đơn chờ thanh toán</p>
            <p className="text-sm mt-2">Đơn đã gửi bếp sẽ hiện ở đây</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-md border-2 border-orange-200 overflow-hidden">
                {/* Header */}
                <div className="bg-emerald-50 p-4 border-b border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold text-lg text-gray-800">{order.id}</div>
                      <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {getTimeSince(order.time)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-emerald-700 font-semibold mb-1">Chưa thanh toán</div>
                      <div className="text-xl font-bold text-emerald-700">
                        {order.total.toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>
                  {order.tableNumber && (
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">Bàn:</span> {order.tableNumber}
                    </div>
                  )}
                  {order.note && (
                    <div className="mt-2 bg-yellow-100 border border-yellow-300 rounded-lg p-2 text-sm text-yellow-800">
                      <span className="font-semibold">Ghi chú:</span> {order.note}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="p-4 bg-gray-50">
                  <div className="text-xs font-bold text-gray-700 mb-2">Sản phẩm:</div>
                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-700 bg-white rounded-lg px-3 py-2">
                        • {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Button */}
                <div className="p-4 bg-white border-t">
                  <button
                    onClick={() => onPayOrder(order.id, order.total)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <CreditCard className="w-5 h-5" />
                    Thanh Toán Ngay
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
