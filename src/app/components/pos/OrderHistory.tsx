import { Clock, User, Search, Calendar, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { RefundOrderModal } from './RefundOrderModal';
import type { Order } from '../../contexts/OrderContext';

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

export function OrderHistory() {
  const { history } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<'today' | 'week' | 'all'>('today');
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null);

  const getElapsedTime = (orderTime: Date, completedTime?: Date) => {
    if (!completedTime) return '0p';
    const diff = new Date(completedTime).getTime() - new Date(orderTime).getTime();
    const minutes = Math.floor(diff / 60000);
    return `${minutes}p`;
  };

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    const d = new Date(date);
    return d.toDateString() === today.toDateString();
  };

  const isThisWeek = (date: Date) => {
    const today = new Date();
    const d = new Date(date);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo && d <= today;
  };

  const filteredHistory = history.filter(order => {
    // Filter by date
    if (filterDate === 'today' && !isToday(order.time)) return false;
    if (filterDate === 'week' && !isThisWeek(order.time)) return false;

    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        order.id.toLowerCase().includes(search) ||
        order.staff.toLowerCase().includes(search) ||
        (order.customerName || '').toLowerCase().includes(search) ||
        order.items.some(item => {
          const itemName = typeof item === 'string' ? item : item.productName || item.name;
          return itemName.toLowerCase().includes(search);
        })
      );
    }

    return true;
  });

  const totalRevenue = filteredHistory.reduce((sum, order) => sum + order.total, 0);

  const handleRefundConfirm = () => {
    // Refund is handled by the modal's inventory tracking
    // We don't remove from history, just log the refund
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg">
      {/* Header */}
      <div className="bg-white p-4 border-b">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Lịch Sử Đơn Hàng</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Tổng đơn</div>
            <div className="text-2xl font-bold text-emerald-700">{filteredHistory.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Doanh thu</div>
            <div className="text-2xl font-bold text-green-600">
              {totalRevenue.toLocaleString('vi-VN')}đ
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterDate('today')}
              className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-colors ${
                filterDate === 'today'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setFilterDate('week')}
              className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-colors ${
                filterDate === 'week'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              7 ngày
            </button>
            <button
              onClick={() => setFilterDate('all')}
              className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-colors ${
                filterDate === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <Calendar className="w-20 h-20 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Không có lịch sử</p>
            <p className="text-sm mt-2">Đơn hàng đã hoàn thành sẽ hiện ở đây</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-3xl font-bold text-green-600">#{order.orderNumber}</div>
                    <div>
                      <div className={`${sourceColors[order.source]} text-white px-2 py-1 rounded text-xs font-bold mb-1`}>
                        {sourceLabels[order.source]}
                      </div>
                      <div className="text-xs text-gray-500">{order.id}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-800">
                      {formatDateTime(order.time)}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-1 justify-end">
                      <User className="w-3 h-3" />
                      {order.staff}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="mb-3 bg-gray-50 rounded-lg p-3">
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">
                          • {typeof item === 'string' ? item : `${item.quantity || 1}x ${item.productName || item.name}`}
                        </div>
                        {typeof item === 'object' && !item.isCustomCombo && (
                          <div className="text-xs text-gray-500 ml-3 mt-0.5 font-medium">
                            {item.size && <span>Size: {item.size}</span>}
                            {item.protein && <span> | Protein: {item.protein}g</span>}
                            {item.toppings && item.toppings.length > 0 && (
                              <span className="block text-emerald-600 mt-0.5 italic">
                                ↳ Toppings: {item.toppings.join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                        {typeof item === 'object' && item.isCustomCombo && (
                          <div className="text-[10px] text-gray-500 ml-3 mt-0.5 space-y-0.5 italic">
                            {item.toppings?.map((t: string, tIdx: number) => (
                              <div key={tIdx}>- {t}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Hoàn thành sau {getElapsedTime(order.time, order.completedAt)}</span>
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {order.total.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                  <button
                    onClick={() => setRefundingOrder(order)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Hoàn Tiền
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {refundingOrder && (
        <RefundOrderModal
          order={refundingOrder}
          onClose={() => setRefundingOrder(null)}
          onConfirm={handleRefundConfirm}
        />
      )}
    </div>
  );
}
