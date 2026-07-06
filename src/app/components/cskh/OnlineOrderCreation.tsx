import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Clock, DollarSign, Check } from 'lucide-react';
import { ProductSelector } from './ProductSelector';
import * as api from '../../utils/api';

interface OrderItem {
  productId: string;
  productName: string;
  size?: string;
  protein?: number;
  toppings: string[];
  quantity: number;
  price: number;
}

interface OnlineOrderCreationProps {
  cskhId: string;
  cskhName: string;
}

export function OnlineOrderCreation({ cskhId, cskhName }: OnlineOrderCreationProps) {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);

  const totalPrice = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleAddProduct = (product: any) => {
    setOrderItems([...orderItems, product]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
    if (!customerPhone || !customerName || orderItems.length === 0 || !deliveryTime) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/orders/online', {
        customerPhone,
        customerName,
        items: orderItems,
        deliveryTime,
        deliveryAddress,
        branchId: 'CN1',
        cskhId,
        cskhName,
        notes,
        totalPrice,
      });

      // Create delivery alert
      await api.post('/api/delivery-alerts', {
        comboOrderId: 'temp-' + Date.now(),
        customerName,
        customerPhone,
        deliveryTime,
        alertMethod: 'email,zalo',
      });

      setSubmitted(true);
      setTimeout(() => {
        // Reset form
        setCustomerPhone('');
        setCustomerName('');
        setDeliveryTime('');
        setDeliveryAddress('');
        setNotes('');
        setOrderItems([]);
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error('Order creation failed:', error);
      alert('Tạo đơn thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Tạo Đơn Thành Công!</h2>
          <p className="text-gray-600">Đơn hàng của {customerName} đã được tạo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Tạo Đơn Hàng Online</h2>

        {/* Customer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Số điện thoại *
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="0901234567"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tên khách *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Delivery Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Thời gian giao *
            </label>
            <input
              type="datetime-local"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Địa chỉ giao
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="123 Nguyễn Huệ, Q.1, TP.HCM"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Ghi chú
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú đặc biệt..."
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">Sản Phẩm ({orderItems.length})</h3>
          <button
            onClick={() => setShowProductSelector(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm sản phẩm
          </button>
        </div>

        {orderItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Chưa có sản phẩm nào</p>
        ) : (
          <div className="space-y-3">
            {orderItems.map((item, index) => (
              <div key={index} className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{item.productName}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {item.size} • {item.protein}g Protein
                  </div>
                  {item.toppings.length > 0 && (
                    <div className="text-sm text-gray-600 mt-1">
                      Vị: {item.toppings.join(', ')}
                    </div>
                  )}
                  <div className="flex gap-4 mt-2 text-sm">
                    <span>
                      <span className="text-gray-600">SL:</span> <span className="font-semibold">{item.quantity}</span>
                    </span>
                    <span>
                      <span className="text-gray-600">Giá:</span> <span className="font-semibold">{item.price.toLocaleString('vi-VN')} đ</span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="text-red-600 hover:text-red-800 ml-3 shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Số sản phẩm</p>
            <p className="text-2xl font-bold text-gray-800">{orderItems.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tổng số lượng</p>
            <p className="text-2xl font-bold text-gray-800">
              {orderItems.reduce((sum, item) => sum + item.quantity, 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tổng tiền</p>
            <p className="text-2xl font-bold text-emerald-600">
              {totalPrice.toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmitOrder}
        disabled={loading || orderItems.length === 0}
        className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-4 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
      >
        {loading ? 'Đang tạo đơn...' : 'Tạo Đơn'}
      </button>

      {/* Product Selector Modal */}
      {showProductSelector && (
        <ProductSelector
          onAdd={handleAddProduct}
          onClose={() => setShowProductSelector(false)}
        />
      )}
    </div>
  );
}
