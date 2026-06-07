import { useState } from 'react';
import { Package, MapPin, Phone, User, Navigation, CheckCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import type { Order } from '../../contexts/OrderContext';

export function ShipperApp() {
  const { orders, history, updateOrderStatus } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shipperName] = useState('Nguyễn Văn Shipper');
  const [filter, setFilter] = useState<'available' | 'my-orders' | 'completed'>('available');

  const acceptOrder = (order: Order) => {
    updateOrderStatus(order.id, 'delivering', { shipperName });
    setSelectedOrder({ ...order, status: 'delivering', shipperName });
  };

  const handleUpdateStatus = (orderId: string, status: Order['status']) => {
    updateOrderStatus(orderId, status);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status });
    }
  };

  const availableOrders = orders.filter(o =>
    o.status === 'ready' && o.source === 'mobile'
  );

  const myOrders = orders.filter(o =>
    o.shipperName === shipperName && o.status === 'delivering'
  );

  const completedOrders = history.filter(o =>
    o.shipperName === shipperName && o.status === 'completed'
  );

  const getFilteredOrders = () => {
    switch (filter) {
      case 'available': return availableOrders;
      case 'my-orders': return myOrders;
      case 'completed': return completedOrders;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'preparing': return 'bg-emerald-100 text-emerald-700 border-purple-300';
      case 'ready': return 'bg-emerald-100 text-emerald-800 border-blue-300';
      case 'delivering': return 'bg-emerald-100 text-emerald-700 border-orange-300';
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ Quán Xác Nhận';
      case 'preparing': return 'Quán Đang Làm';
      case 'ready': return 'Chờ Lấy Hàng';
      case 'delivering': return 'Đang Giao';
      case 'completed': return 'Đã Giao';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="w-5 h-5" />;
      case 'preparing': return <Clock className="w-5 h-5" />;
      case 'ready': return <Package className="w-5 h-5" />;
      case 'delivering': return <Navigation className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sub Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold">🏍️ Shipper Dashboard</h1>
              <p className="text-sm opacity-90">Xin chào, {shipperName}</p>
            </div>
            <Package className="w-10 h-10" />
          </div>

          <div className="flex gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar pb-1">
            <button
              onClick={() => { setFilter('available'); setSelectedOrder(null); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'available' ? 'bg-white text-green-600' : 'bg-green-500 text-white'
              }`}
            >
              Đơn Mới ({availableOrders.length})
            </button>
            <button
              onClick={() => { setFilter('my-orders'); setSelectedOrder(null); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'my-orders' ? 'bg-white text-green-600' : 'bg-green-500 text-white'
              }`}
            >
              Đang Giao ({myOrders.length})
            </button>
            <button
              onClick={() => { setFilter('completed'); setSelectedOrder(null); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'completed' ? 'bg-white text-green-600' : 'bg-green-500 text-white'
              }`}
            >
              Hoàn Thành ({completedOrders.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Orders List */}
          <div className={`space-y-4 ${selectedOrder ? 'hidden lg:block' : 'block'}`}>
            <h2 className="text-xl font-bold text-gray-800">
              {filter === 'available' && 'Đơn Hàng Sẵn Sàng (Quán Đã Làm Xong)'}
              {filter === 'my-orders' && 'Đơn Đang Giao'}
              {filter === 'completed' && 'Đơn Đã Hoàn Thành'}
            </h2>

            {getFilteredOrders().length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Không có đơn hàng nào</p>
              </div>
            ) : (
              getFilteredOrders().map(order => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedOrder?.id === order.id ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-800">#{order.id}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <User className="w-4 h-4" />
                        <span>{order.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">{order.deliveryAddress}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {order.total.toLocaleString('vi-VN')}đ
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.time).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-sm text-gray-600">
                      {order.items.length} món
                    </div>
                    {filter === 'available' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptOrder(order);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                      >
                        Nhận Đi Giao
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Order Detail */}
          <div className={`lg:sticky lg:top-24 lg:h-fit ${selectedOrder ? 'block' : 'hidden lg:block'}`}>
            {selectedOrder ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setSelectedOrder(null)} className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className={`p-3 rounded-lg ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusIcon(selectedOrder.status)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">#{selectedOrder.id}</h2>
                    <p className="text-sm text-gray-600">
                      {new Date(selectedOrder.time).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-gray-800 mb-3">Thông Tin Khách Hàng</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-900">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-600" />
                      <a href={`tel:${selectedOrder.customerPhone}`} className="text-emerald-700 hover:underline">
                        {selectedOrder.customerPhone}
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-600 mt-1" />
                      <span className="text-gray-900">{selectedOrder.deliveryAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 mb-3">Chi Tiết Đơn Hàng</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{item.image}</div>
                          <div>
                            <div className="font-semibold text-gray-800">{item.name}</div>
                            <div className="text-sm text-gray-600">x{item.quantity}</div>
                          </div>
                        </div>
                        <div className="font-semibold text-gray-900">
                          {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">Tổng Tiền:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {selectedOrder.total.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-green-200 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Hình thức:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedOrder.paymentMethod === 'transfer' ? 'bg-emerald-100 text-emerald-800 border border-blue-200' : 'bg-emerald-100 text-emerald-700 border border-orange-200'}`}>
                      {selectedOrder.paymentMethod === 'transfer' ? '📱 Đã Chuyển Khoản' : '💵 Thu Tiền Mặt (COD)'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {selectedOrder.shipperName === shipperName && (
                  <div className="space-y-3">
                    {selectedOrder.status === 'delivering' && (
                      <div className="space-y-3">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.deliveryAddress || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <MapPin className="w-5 h-5" />
                          Mở Google Maps
                        </a>
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Đã Giao Hàng Thành Công
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Chọn đơn hàng để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
