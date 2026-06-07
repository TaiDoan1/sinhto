import { useState } from 'react';
import { X, AlertTriangle, Lock } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import type { Order } from '../../contexts/OrderContext';

interface VoidOrderModalProps {
  order: Order;
  onClose: () => void;
  onConfirm: () => void;
}

const VOID_REASONS = [
  'Khách đổi ý',
  'Nhập sai đơn',
  'Khách không đến lấy',
  'Hết nguyên liệu',
  'Lỗi hệ thống',
  'Lý do khác'
];

const MANAGER_PIN = '1234';

export function VoidOrderModal({ order, onClose, onConfirm }: VoidOrderModalProps) {
  const { returnStock, recordWaste } = useInventory();
  const [selectedReason, setSelectedReason] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleVoid = () => {
    // Validate
    if (!selectedReason) {
      setError('Vui lòng chọn lý do hủy đơn');
      return;
    }

    if (pin !== MANAGER_PIN) {
      setError('Mã PIN quản lý không đúng');
      return;
    }

    // Xử lý tồn kho
    const isPreparing = order.status === 'preparing' || order.status === 'ready';

    if (!isPreparing) {
      // Đơn chưa làm -> Hoàn kho
      returnStock(order.id, order.items, selectedReason, order.staff);
    } else {
      // Đơn đã làm -> Ghi nhận waste
      recordWaste(order.id, order.items, selectedReason, order.staff);
    }

    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-red-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Hủy Đơn Hàng</h2>
              <p className="text-sm opacity-90">#{order.orderNumber} - {order.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-red-600 p-1 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Order Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-2">Sản phẩm:</div>
            {order.items.map((item, idx) => (
              <div key={idx} className="text-sm text-gray-800">• {item}</div>
            ))}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tổng tiền:</span>
                <span className="font-bold text-gray-800">{order.total.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Lý do hủy đơn <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                setError('');
              }}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-red-500 focus:outline-none"
            >
              <option value="">-- Chọn lý do --</option>
              {VOID_REASONS.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          {/* Manager PIN */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mã PIN Quản Lý <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="Nhập mã PIN (Demo: 1234)"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                maxLength={4}
              />
            </div>
          </div>

          {/* Impact Info */}
          <div className={`rounded-lg p-3 ${
            order.status === 'preparing' || order.status === 'ready'
              ? 'bg-emerald-50 border border-orange-200'
              : 'bg-emerald-50 border border-blue-200'
          }`}>
            <div className="text-sm font-semibold mb-1">
              {order.status === 'preparing' || order.status === 'ready'
                ? '⚠️ Nguyên liệu đã sử dụng'
                : '✅ Nguyên liệu sẽ được hoàn kho'}
            </div>
            <div className="text-xs text-gray-600">
              {order.status === 'preparing' || order.status === 'ready'
                ? 'Đơn đã làm, nguyên liệu sẽ được ghi nhận là waste (lãng phí)'
                : 'Đơn chưa làm, nguyên liệu sẽ được hoàn trả vào kho'}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={handleVoid}
            className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-red-600 transition-colors"
          >
            Xác Nhận Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
