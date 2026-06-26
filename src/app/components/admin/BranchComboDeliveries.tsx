import { useState, useEffect } from 'react';
import { useCombos, ComboSubscription } from '../../contexts/ComboContext';
import { useInventory } from '../../contexts/InventoryContext';
import { Calendar, CheckCircle2, Phone, Truck } from 'lucide-react';
import {
  getComboItemForToday,
  getCombosDueToday,
  getRecipeIngredientsForComboItem,
  wasDeliveredToday,
} from '../../utils/comboUtils';

interface Props {
  branchId: string;
}

export function BranchComboDeliveries({ branchId }: Props) {
  const { combos, confirmDelivery } = useCombos();
  const { deductStockForOrder, formatShortageMessage, checkCartStock, loadForBranch } = useInventory();
  const [todayDeliveries, setTodayDeliveries] = useState<ComboSubscription[]>([]);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);

  useEffect(() => {
    loadForBranch(branchId);
  }, [branchId, loadForBranch]);

  useEffect(() => {
    setTodayDeliveries(getCombosDueToday(combos, branchId) as ComboSubscription[]);
  }, [combos, branchId]);

  const handleDeliver = async (combo: ComboSubscription) => {
    const todayItem = getComboItemForToday(combo);
    const productName = todayItem?.productName || 'FitBlend';
    const line = {
      productId: todayItem?.productId || todayItem?.product?.id,
      productName,
      size: todayItem?.size || '360ml',
      protein: todayItem?.protein ?? 40,
      toppings: todayItem?.toppings || [],
      quantity: 1,
    };

    const check = checkCartStock([line]);
    if (!check.ok) {
      alert(`Không đủ nguyên liệu:\n${formatShortageMessage(check.shortages)}`);
      return;
    }

    setDeliveringId(combo.id);
    try {
      const success = deductStockForOrder(combo.id, [line], `Chi nhánh ${branchId}`);
      if (!success) {
        alert('Trừ kho thất bại. Kiểm tra tồn kho chi nhánh.');
        return;
      }
      await confirmDelivery(combo.id, `Chi nhánh ${branchId}`, branchId);
      alert(`Đã xác nhận giao combo cho ${combo.customerName}.`);
    } finally {
      setDeliveringId(null);
    }
  };

  const dayOfWeekNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const todayDayOfWeek = new Date().getDay();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
          <Truck className="w-5 h-5 text-emerald-700" />
          Lịch Giao Combo Hôm Nay ({dayOfWeekNames[todayDayOfWeek]})
        </h3>
        <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold border border-emerald-200">
          {todayDeliveries.length} đơn cần chuẩn bị
        </span>
      </div>

      {todayDeliveries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md border p-12 text-center text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-bold">Không có lịch giao combo nào trong hôm nay</p>
          <p className="text-xs mt-1">Combo active sẽ hiện khi đến ngày giao và chưa giao trong ngày</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {todayDeliveries.map((combo) => {
            const todayItem = getComboItemForToday(combo);
            const todayProduct = todayItem?.productName || combo.planName || 'FitBlend';
            const ingredients = getRecipeIngredientsForComboItem(todayItem);
            const isDelivered = wasDeliveredToday(combo);

            return (
              <div
                key={combo.id}
                className={`bg-white rounded-xl shadow-md border p-5 transition-all relative ${
                  isDelivered ? 'opacity-60 border-emerald-300 bg-emerald-50/20' : 'hover:shadow-lg'
                }`}
              >
                {isDelivered && (
                  <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã Giao
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {combo.planName || (combo.comboType === 'weekly' ? 'Combo Tuần' : 'Combo Tháng')}
                  </span>
                  <h4 className="font-extrabold text-gray-900 text-base mt-2">{combo.customerName}</h4>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3.5 h-3.5" />
                    {combo.customerPhone}
                  </p>
                  {combo.careStaffName && (
                    <p className="text-[11px] text-gray-400 mt-1">CS: {combo.careStaffName}</p>
                  )}
                </div>

                <div className="mt-4 bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                    <span>Món chuẩn bị:</span>
                    <span className="text-emerald-800 font-extrabold text-sm">{todayProduct}</span>
                  </div>
                  {ingredients.length > 0 && (
                    <div className="text-[11px] text-gray-500 border-t pt-2 space-y-1">
                      <span className="font-semibold block mb-1">Công thức (trừ kho):</span>
                      {ingredients.map((ing) => (
                        <div key={ing.itemId} className="flex justify-between">
                          <span>• {ing.itemName}</span>
                          <span>{ing.quantity.toFixed(2)} {ing.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!isDelivered && (
                  <button
                    onClick={() => handleDeliver(combo)}
                    disabled={deliveringId === combo.id}
                    className="w-full mt-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    {deliveringId === combo.id ? 'Đang xử lý...' : 'Xác nhận giao & Trừ kho'}
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
