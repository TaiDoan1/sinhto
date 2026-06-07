import { Clock, Package, CheckCircle } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';

export function HistoryList() {
  const { history } = useOrders();
  const staffName = 'Nguyễn Văn An'; // TODO: Lấy từ user context
  const myHistory = history.filter(order => order.staff === staffName);

  const getElapsedTime = (orderTime: Date, completedTime?: Date) => {
    if (!completedTime) return '0p';
    const diff = new Date(completedTime).getTime() - new Date(orderTime).getTime();
    const minutes = Math.floor(diff / 60000);
    return `${minutes}p`;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 bg-white shadow-sm">
        <p className="text-sm text-gray-600">{myHistory.length} đơn hôm nay</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {myHistory.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-lg">Chưa có lịch sử</p>
            <p className="text-sm mt-2">Đơn hàng đã hoàn thành sẽ hiện ở đây</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myHistory.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-md p-4 border-2 border-gray-200">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-800">#{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">{order.id}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">{formatDate(order.time)}</div>
                    <div className="text-sm font-bold text-gray-800">{formatTime(order.time)}</div>
                  </div>
                </div>

                {/* Items */}
                <div className="mb-3 bg-gray-50 rounded-lg p-3">
                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-700">
                        • {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Hoàn thành sau {getElapsedTime(order.time, order.completedAt)}</span>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {order.total.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
