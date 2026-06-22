import { useState, useEffect } from 'react';
import { useCombos, ComboSubscription } from '../../contexts/ComboContext';
import { useInventory } from '../../contexts/InventoryContext';
import { Calendar, CheckCircle2, Phone, ShoppingBag, Truck } from 'lucide-react';

interface Props {
  branchId: string;
}

export function BranchComboDeliveries({ branchId }: Props) {
  const { combos, updateCombo } = useCombos();
  const { deductStockForOrder, formatShortageMessage, checkCartStock } = useInventory();
  const [todayDeliveries, setTodayDeliveries] = useState<ComboSubscription[]>([]);
  const [deliveredIds, setDeliveredIds] = useState<string[]>([]);

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const todayDayOfWeek = new Date().getDay();

  useEffect(() => {
    // Filter combos for this branch, status active, and scheduled for today
    const filtered = combos.filter(c => {
      if (c.branchId !== branchId) return false;
      if (c.status !== 'active') return false;
      
      // Check if deliveryDays includes today
      return c.deliveryDays.includes(todayDayOfWeek);
    });

    setTodayDeliveries(filtered);
  }, [combos, branchId, todayDayOfWeek]);

  const handleDeliver = (combo: ComboSubscription) => {
    const todayItem = combo.items[0];
    const productName = todayItem?.product?.name || todayItem?.productName || '';
    const productId = todayItem?.product?.id || todayItem?.productId;
    const line = { productId, productName, size: '360ml', protein: 40, quantity: 1 };

    const check = checkCartStock([line]);
    if (!check.ok) {
      alert(`⚠️ Không đủ nguyên liệu:\n${formatShortageMessage(check.shortages)}`);
      return;
    }

    const success = deductStockForOrder(combo.id, [line], `Chi nhánh ${branchId}`);
    if (!success) {
      alert('⚠️ Trừ kho thất bại. Kiểm tra tồn kho chi nhánh.');
      return;
    }
    const calculateNextDeliveryDate = (currentNext: Date, deliveryDays: number[]) => {
      const date = new Date(currentNext);
      // Find next delivery day
      for (let i = 1; i <= 7; i++) {
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + i);
        if (deliveryDays.includes(nextDate.getDay())) {
          return nextDate;
        }
      }
      return date;
    };

    const nextDate = calculateNextDeliveryDate(combo.nextDelivery, combo.deliveryDays);
    updateCombo(combo.id, {
      nextDelivery: nextDate,
    });

    setDeliveredIds(prev => [...prev, combo.id]);
    alert(`🎉 Đã xác nhận giao combo thành công cho khách hàng ${combo.customerName}.`);
  };

  const dayOfWeekNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
          <Truck className="w-5 h-5 text-emerald-700" />
          Lịch Giao Combo Hôm Nay ({dayOfWeekNames[todayDayOfWeek]})
        </h3>
        <span className="text-xs bg-emerald-105 text-emerald-800 px-3 py-1 rounded-full font-bold border border-emerald-200">
          {todayDeliveries.filter(c => !deliveredIds.includes(c.id)).length} đơn cần chuẩn bị
        </span>
      </div>

      {todayDeliveries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md border p-12 text-center text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-bold">Không có lịch giao combo nào trong hôm nay</p>
          <p className="text-xs mt-1">Các gói combo sẽ xuất hiện vào đúng thứ giao hàng khách đăng ký</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {todayDeliveries.map(combo => {
            const isDelivered = deliveredIds.includes(combo.id);
            const todayProduct = combo.items[0]?.product?.name || combo.items[0]?.productName || 'Strawberry Blast';
            const ingredients = getRecipeIngredients(todayProduct);

            return (
              <div 
                key={combo.id} 
                className={`bg-white rounded-xl shadow-md border p-5 transition-all relative ${
                  isDelivered ? 'opacity-60 border-emerald-300 bg-emerald-50/20' : 'hover:shadow-lg'
                }`}
              >
                {isDelivered && (
                  <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-800 border border-emerald-250 px-2 py-0.5 rounded-lg text-xs font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã Giao
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {combo.comboType === 'weekly' ? 'Combo Tuần' : 'Combo Tháng'}
                    </span>
                    <h4 className="font-extrabold text-gray-900 text-base mt-2">{combo.customerName}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      {combo.customerPhone}
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-gray-50 rounded-xl p-3.5 border border-gray-150 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                    <span>Món chuẩn bị:</span>
                    <span className="text-emerald-800 font-extrabold text-sm">{todayProduct}</span>
                  </div>
                  {ingredients.length > 0 && (
                    <div className="text-[11px] text-gray-500 border-t pt-2 space-y-1">
                      <span className="font-semibold block mb-1">Công thức (Khấu hao kho):</span>
                      {ingredients.map(ing => (
                        <div key={ing.itemId} className="flex justify-between">
                          <span>• {ing.itemName}</span>
                          <span>{ing.quantity} {ing.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!isDelivered && (
                  <button
                    onClick={() => handleDeliver(combo)}
                    className="w-full mt-4 bg-emerald-750 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    Xác nhận giao & Trừ kho
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
