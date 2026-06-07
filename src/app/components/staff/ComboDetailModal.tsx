import { X, Calendar, Phone, User, Package, MapPin } from 'lucide-react';
import type { ComboSubscription } from '../../contexts/ComboContext';

interface ComboDetailModalProps {
  combo: ComboSubscription;
  onClose: () => void;
}

const weekDayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function ComboDetailModal({ combo, onClose }: ComboDetailModalProps) {
  const getDaysUntilDelivery = (nextDelivery: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(nextDelivery);
    delivery.setHours(0, 0, 0, 0);
    const diff = delivery.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysUntil = getDaysUntilDelivery(combo.nextDelivery);
  const isToday = daysUntil === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Chi Tiết Combo</h2>
            <p className="text-sm opacity-90">{combo.id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Thông tin khách hàng */}
          <div className="bg-emerald-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                {combo.customerName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-800 text-lg">{combo.customerName}</div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  {combo.customerPhone}
                </div>
              </div>
            </div>
          </div>

          {/* Loại combo */}
          <div>
            <div className="text-xs font-bold text-gray-600 mb-2">Loại combo:</div>
            <div className={`inline-block px-4 py-2 rounded-lg font-bold ${
              combo.comboType === 'weekly'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {combo.comboType === 'weekly' ? 'Combo Tuần - 280,000đ' : 'Combo Tháng - 950,000đ'}
            </div>
          </div>

          {/* Giao hàng tiếp theo */}
          <div className={`rounded-xl p-4 border-2 ${
            isToday
              ? 'bg-emerald-50 border-emerald-500'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className={`w-5 h-5 ${isToday ? 'text-emerald-700' : 'text-gray-600'}`} />
              <div className="text-sm font-bold text-gray-700">Giao hàng tiếp theo</div>
            </div>
            <div className={`text-lg font-bold ${isToday ? 'text-emerald-700' : 'text-gray-800'}`}>
              {isToday ? 'HÔM NAY!' : new Date(combo.nextDelivery).toLocaleDateString('vi-VN')}
            </div>
            {!isToday && (
              <div className="text-sm text-gray-600 mt-1">
                Còn {daysUntil} ngày
              </div>
            )}
          </div>

          {/* Lịch giao hàng */}
          <div>
            <div className="text-xs font-bold text-gray-600 mb-2">Lịch giao hàng trong tuần:</div>
            <div className="grid grid-cols-7 gap-1">
              {weekDayLabels.map((day, idx) => (
                <div
                  key={idx}
                  className={`text-center py-2 rounded-lg text-xs font-bold ${
                    combo.deliveryDays.includes(idx)
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Sản phẩm */}
          <div className="bg-emerald-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-emerald-600" />
              <div className="text-sm font-bold text-gray-700">Sản phẩm trong combo:</div>
            </div>
            <div className="space-y-2">
              {combo.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 bg-white rounded-lg p-2">
                  <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="flex-1 font-medium">{item.product?.name || item.productName || 'Sản phẩm'}</span>
                  <span className="text-xs text-gray-400">{item.size} • {item.protein}g</span>
                </div>
              ))}
            </div>
          </div>

          {/* Thông tin khác */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div>
              <div className="text-xs text-gray-600 mb-1">Ngày đăng ký</div>
              <div className="text-sm font-bold text-gray-800">
                {new Date(combo.startDate).toLocaleDateString('vi-VN')}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Nhân viên phụ trách</div>
              <div className="text-sm font-bold text-gray-800 flex items-center gap-1">
                <User className="w-4 h-4" />
                {combo.staff}
              </div>
            </div>
          </div>

          {/* Giá trị combo */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4">
            <div className="text-sm opacity-90 mb-1">Tổng giá trị</div>
            <div className="text-3xl font-bold">
              {combo.totalPrice.toLocaleString('vi-VN')}đ
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
