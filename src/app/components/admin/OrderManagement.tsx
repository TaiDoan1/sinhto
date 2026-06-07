import { Clock, AlertCircle, CheckCircle, Package, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useOrders } from '../../contexts/OrderContext';

export function OrderManagement() {
  const { orders } = useOrders();
  const [filter, setFilter] = useState<'all' | 'delayed' | 'waiting'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds
    return () => clearInterval(timer);
  }, []);

  // Calculate how long order has been waiting
  const getWaitTime = (orderTime: Date) => {
    const diff = currentTime.getTime() - new Date(orderTime).getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes;
  };

  // Categorize orders
  const categorizeOrder = (order: any) => {
    const waitTime = getWaitTime(order.time);

    if (order.status === 'completed') {
      return 'completed';
    }

    // Delayed: waiting more than 20 minutes
    if (waitTime > 20) {
      return 'delayed';
    }

    // Waiting: between 10-20 minutes
    if (waitTime > 10) {
      return 'waiting';
    }

    return 'normal';
  };

  const filteredOrders = orders.filter(order => {
    const category = categorizeOrder(order);

    if (filter === 'delayed' && category !== 'delayed') return false;
    if (filter === 'waiting' && category !== 'waiting') return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        order.id.toLowerCase().includes(search) ||
        order.staff.toLowerCase().includes(search) ||
        order.items.some(item => {
          const itemName = typeof item === 'string' ? item : item.productName || item.name;
          return itemName.toLowerCase().includes(search);
        })
      );
    }

    return true;
  });

  const delayedCount = orders.filter(o => categorizeOrder(o) === 'delayed').length;
  const waitingCount = orders.filter(o => categorizeOrder(o) === 'waiting').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'ready': return 'bg-green-100 text-green-700 border-green-300';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'preparing': return 'Đang làm';
      case 'ready': return 'Sẵn sàng';
      case 'completed': return 'Hoàn thành';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Đơn Hàng</h1>
        <p className="text-gray-600 mt-1">Theo dõi tất cả đơn hàng từ các chi nhánh</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Tổng đơn hàng</div>
              <div className="text-3xl font-bold text-gray-800">{orders.length}</div>
            </div>
            <Package className="w-12 h-12 text-emerald-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Hoàn thành</div>
              <div className="text-3xl font-bold text-gray-800">
                {orders.filter(o => o.status === 'completed').length}
              </div>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Đợi lâu (10-20p)</div>
              <div className="text-3xl font-bold text-gray-800">{waitingCount}</div>
            </div>
            <Clock className="w-12 h-12 text-emerald-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Muộn ({'>'}20p)</div>
              <div className="text-3xl font-bold text-gray-800">{delayedCount}</div>
            </div>
            <AlertCircle className="w-12 h-12 text-red-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, nhân viên, sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter('waiting')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                filter === 'waiting'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              Đợi lâu
            </button>
            <button
              onClick={() => setFilter('delayed')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                filter === 'delayed'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Muộn
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Mã ĐH
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Chi nhánh
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nguồn
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nhân viên
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tổng tiền
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p>Không tìm thấy đơn hàng nào</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const category = categorizeOrder(order);
                  const waitTime = getWaitTime(order.time);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-gray-50 ${
                        category === 'delayed' ? 'bg-red-50' :
                        category === 'waiting' ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {category === 'delayed' && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          {category === 'waiting' && (
                            <Clock className="w-4 h-4 text-emerald-600" />
                          )}
                          <span className="font-semibold text-gray-800">{order.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.branchId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          order.source === 'counter' ? 'bg-emerald-100 text-emerald-800' :
                          order.source === 'web' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.source === 'counter' ? 'Quầy' :
                           order.source === 'web' ? 'Web' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="max-w-xs space-y-0.5">
                          {order.items.slice(0, 2).map((item: any, i: number) => (
                            <div key={i} className="truncate">• {typeof item === 'string' ? item : item.productName || item.name}</div>
                          ))}
                          {order.items.length > 2 && <div className="text-[10px] text-gray-400">và {order.items.length - 2} món khác...</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.staff}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-gray-600">
                          {new Date(order.time).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className={`text-xs font-semibold ${
                          category === 'delayed' ? 'text-red-600' :
                          category === 'waiting' ? 'text-emerald-700' :
                          'text-gray-500'
                        }`}>
                          {waitTime}p trước
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                          getStatusColor(order.status)
                        }`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-700">
                        {order.total.toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
