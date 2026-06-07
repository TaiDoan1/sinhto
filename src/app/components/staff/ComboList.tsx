import { Calendar, Phone, User, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useCombos } from '../../contexts/ComboContext';

const weekDayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function ComboCard({ combo }: any) {
  const [showDetail, setShowDetail] = useState(false);

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
    <div className="rounded-xl bg-white shadow-md border-2 border-gray-200">
      {/* Compact Header */}
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="w-full p-4 text-left active:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
              {combo.customerName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-800 text-base">
                {combo.customerName}
              </div>
              <div className="text-xs text-gray-600 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {combo.customerPhone}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className={`text-xs font-semibold ${isToday ? 'text-emerald-700' : 'text-gray-600'}`}>
                {isToday ? 'Hôm nay!' : `${daysUntil} ngày`}
              </div>
            </div>
            {showDetail ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {!showDetail && (
          <div className="flex items-center gap-3 mt-2">
            <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
              combo.comboType === 'weekly'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {combo.comboType === 'weekly' ? 'Combo Tuần' : 'Combo Tháng'}
            </div>
            <div className="text-sm font-bold text-emerald-700">
              {combo.totalPrice.toLocaleString('vi-VN')}đ
            </div>
          </div>
        )}
      </button>

      {/* Detail - Show when expanded */}
      {showDetail && (
        <div className="px-4 pb-4 border-t pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
              combo.comboType === 'weekly'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {combo.comboType === 'weekly' ? 'Combo Tuần' : 'Combo Tháng'}
            </div>
            <div className="text-sm font-bold text-emerald-700">
              {combo.totalPrice.toLocaleString('vi-VN')}đ
            </div>
          </div>

          {/* Lịch giao hàng */}
          <div className="mb-3">
            <div className="text-xs font-bold text-gray-700 mb-2">Lịch giao:</div>
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
          <div className="bg-emerald-50 border border-purple-200 rounded-lg p-3 mb-3">
            <div className="text-xs font-bold text-gray-700 mb-2">Sản phẩm:</div>
            <div className="space-y-1">
              {combo.items.map((item: any, idx: number) => (
                <div key={idx} className="text-sm text-gray-700 flex justify-between">
                  <span>• {item.product?.name || item.productName || 'Sản phẩm'}</span>
                  <span className="text-[10px] text-gray-400 font-bold">{item.size} • {item.protein}g</span>
                </div>
              ))}
            </div>
          </div>

          {/* Thông tin khác */}
          <div className="bg-emerald-50 border border-blue-200 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-gray-600 mb-1">Ngày đăng ký:</div>
                <div className="font-bold text-gray-800">
                  {new Date(combo.startDate).toLocaleDateString('vi-VN')}
                </div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Phụ trách:</div>
                <div className="font-bold text-gray-800">{combo.staff}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ComboList() {
  const { combos } = useCombos();
  const activeCombos = combos.filter(c => c.status === 'active');

  const getDaysUntilDelivery = (nextDelivery: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(nextDelivery);
    delivery.setHours(0, 0, 0, 0);
    const diff = delivery.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 pb-20">
        <div className="mb-4 text-sm text-gray-600">
          {activeCombos.length} combo đang hoạt động
        </div>

        {activeCombos.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-lg">Chưa có combo nào</p>
            <p className="text-sm mt-2">Đăng ký combo cho khách hàng</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCombos.map(combo => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
