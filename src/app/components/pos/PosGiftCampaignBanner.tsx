import { useState, useEffect } from 'react';
import { Gift, Loader2, X, ArrowRight, Check } from 'lucide-react';
import * as api from '../../utils/api';
import type { GiftCampaign } from '../../utils/api';
import { useMenu } from '../../contexts/MenuContext';
import { useMenuPricing } from '../../hooks/useMenuPricing';
import { DEFAULT_TOPPINGS, DEFAULT_COMBO_TOPPINGS, formatToppingPrice, type MenuComboTopping } from '../../config/menuToppings';
import type { CartItem } from './ModifierModal';

interface Props {
  branchId: string;
  /** SĐT đã biết sẵn (VD khách đã tìm ở mục Tích Điểm) — chỉ để điền sẵn, khách vẫn có thể sửa. */
  initialPhone?: string;
  staffId?: string;
  staffName?: string;
  /** true nếu giỏ hàng đã có 1 ly quà tặng — ẩn gợi ý để tránh tặng trùng trong cùng đơn. */
  alreadyGifted: boolean;
  onGiftAdded: (item: CartItem) => void;
}

/** Gợi ý tặng quà theo chương trình khuyến mãi đang chạy tại đúng chi nhánh — luôn hiện thẻ
 * quảng cáo cho mọi khách, chỉ hỏi SĐT khi bấm vào (không cần đã tìm khách hàng thành viên
 * trước). Chỉ ẩn khi chương trình hết hạn mức hoặc đã tặng trong đơn hiện tại. */
export function PosGiftCampaignBanner({ branchId, initialPhone, staffId, staffName, alreadyGifted, onGiftAdded }: Props) {
  const { products } = useMenu();
  const { comboToppings: comboListFromApi } = useMenuPricing();
  const [campaign, setCampaign] = useState<GiftCampaign | null>(null);
  const [step, setStep] = useState<'closed' | 'phone' | 'flavor' | 'topping'>('closed');
  const [phone, setPhone] = useState('');
  const [pickedFlavor, setPickedFlavor] = useState('');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);
  const [redeeming, setRedeeming] = useState(false);

  const dynamicToppings = products
    .filter((p) => p.category === 'toppings')
    .map((p) => ({ name: p.name, price: p.basePrice }));
  const toppingsList = dynamicToppings.length > 0 ? dynamicToppings : DEFAULT_TOPPINGS;
  const comboList = (comboListFromApi as MenuComboTopping[]).length > 0
    ? (comboListFromApi as MenuComboTopping[])
    : DEFAULT_COMBO_TOPPINGS;
  const toppingsExtra = selectedToppings.reduce((sum, name) => {
    const topping = toppingsList.find((t) => t.name === name);
    return sum + (topping?.price || 0);
  }, 0);
  const comboExtra = selectedCombos.reduce((sum, comboId) => {
    const combo = comboList.find((c) => c.id === comboId);
    return sum + (combo?.price || 0);
  }, 0);
  const surchargeTotal = toppingsExtra + comboExtra;

  useEffect(() => {
    if (!branchId) return;
    api
      .fetchGiftCampaigns({ branchId, active: true })
      .then((list) => {
        const eligible = list.find((c) => c.redeemedCount < c.totalLimit);
        setCampaign(eligible || null);
      })
      .catch(() => setCampaign(null));
  }, [branchId]);

  if (!campaign || alreadyGifted) return null;

  const remaining = Math.max(0, campaign.totalLimit - campaign.redeemedCount);
  const smoothieProducts = products.filter((p) => p.category === 'smoothies');

  const openFlow = () => {
    setPhone(initialPhone?.trim() || '');
    setStep('phone');
  };

  const handleContinuePhone = () => {
    if (!phone.trim()) {
      alert('Vui lòng nhập số điện thoại khách hàng.');
      return;
    }
    setStep('flavor');
  };

  const handlePickFlavor = (productName: string) => {
    setPickedFlavor(productName);
    setSelectedToppings([]);
    setSelectedCombos([]);
    setStep('topping');
  };

  const toggleTopping = (name: string) => {
    setSelectedToppings((prev) => (prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]));
  };

  const toggleCombo = (comboId: string) => {
    setSelectedCombos((prev) => (prev.includes(comboId) ? prev.filter((c) => c !== comboId) : [...prev, comboId]));
  };

  // Ly nền (vị + size) luôn miễn phí theo hạn mức khuyến mãi — chỉ tính thêm tiền nếu khách
  // chọn thêm topping/combo topping, phần đó khách vẫn trả như đơn thường.
  const handleConfirmToppings = async () => {
    setRedeeming(true);
    try {
      const { campaign: updated } = await api.redeemGiftCampaign(campaign.id, {
        customerPhone: phone.trim(),
        productName: pickedFlavor,
        staffId,
        staffName,
      });
      setCampaign(updated);
      setStep('closed');
      const finalToppings = [
        ...selectedCombos.map((comboId) => {
          const combo = comboList.find((c) => c.id === comboId);
          return `Combo Topping: ${combo?.name || comboId}`;
        }),
        ...selectedToppings,
      ];
      onGiftAdded({
        productId: `gift-${campaign.id}-${Date.now()}`,
        productName: pickedFlavor,
        name: `${pickedFlavor} (Quà tặng KM)`,
        size: campaign.giftSize,
        protein: campaign.giftProtein,
        toppings: finalToppings,
        price: surchargeTotal,
        quantity: 1,
        isGift: true,
        giftCampaignId: campaign.id,
      });
    } catch (e: any) {
      alert(e.message || 'Không áp dụng được quà tặng — có thể chương trình vừa hết hạn mức.');
      setStep('closed');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openFlow}
        className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl p-3.5 shadow-lg flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm">{campaign.name}</p>
          <p className="text-xs text-white/80">Nhấn để tặng khách 1 ly — còn {remaining.toLocaleString('vi-VN')} ly</p>
        </div>
        <ArrowRight className="w-4 h-4 shrink-0" />
      </button>

      {step === 'phone' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-rose-600 text-white">
              <div className="font-bold flex items-center gap-2">
                <Gift className="w-4 h-4" /> Nhập SĐT khách để tặng quà
              </div>
              <button type="button" onClick={() => setStep('closed')}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="tel"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleContinuePhone()}
                placeholder="Số điện thoại khách hàng..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={handleContinuePhone}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-sm"
              >
                Tiếp tục — Chọn vị tặng
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'flavor' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-rose-600 text-white">
              <div className="font-bold flex items-center gap-2">
                <Gift className="w-4 h-4" /> Chọn vị ly tặng ({campaign.giftSize}, {campaign.giftProtein}g)
              </div>
              <button type="button" onClick={() => setStep('closed')} disabled={redeeming}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {smoothieProducts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Chưa có sản phẩm nào trong menu.</p>
              )}
              {smoothieProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={redeeming}
                  onClick={() => handlePickFlavor(p.name)}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-rose-400 hover:bg-rose-50 font-semibold text-sm text-gray-800 disabled:opacity-50"
                >
                  {p.name}
                </button>
              ))}
            </div>
            {redeeming && (
              <div className="p-3 border-t flex items-center justify-center gap-2 text-sm text-rose-600 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang áp dụng...
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'topping' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-rose-600 text-white">
              <div className="font-bold flex items-center gap-2">
                <Gift className="w-4 h-4" /> Thêm topping cho {pickedFlavor}
              </div>
              <button type="button" onClick={() => setStep('closed')} disabled={redeeming}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-4 pt-3 text-xs text-gray-500">Ly nền miễn phí — topping/combo topping chọn thêm khách vẫn trả tiền như bình thường.</p>
            <div className="overflow-y-auto p-3 space-y-3">
              {comboList.length > 0 && (
                <div>
                  <p className="text-xs font-black text-rose-700 uppercase tracking-wider mb-1.5">🌟 Combo Topping (siêu tiết kiệm)</p>
                  <div className="space-y-2">
                    {comboList.map((combo) => {
                      const isSelected = selectedCombos.includes(combo.id);
                      return (
                        <button
                          key={combo.id}
                          type="button"
                          disabled={redeeming}
                          onClick={() => toggleCombo(combo.id)}
                          className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 text-left disabled:opacity-50 ${
                            isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'border-gray-200 text-gray-800 hover:border-rose-400 hover:bg-rose-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-black text-sm truncate flex items-center gap-1.5">
                              {isSelected && <Check className="w-4 h-4 shrink-0" />}
                              {combo.name}
                            </p>
                            <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{combo.items}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-sm">{combo.price.toLocaleString('vi-VN')}đ</p>
                            <p className={`text-xs line-through ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>{combo.originalPrice.toLocaleString('vi-VN')}đ</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-black text-rose-700 uppercase tracking-wider mb-1.5">🍬 Topping lẻ</p>
              {toppingsList.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Chưa có topping nào trong menu.</p>
              )}
              <div className="space-y-2">
              {toppingsList.map((topping) => {
                const isSelected = selectedToppings.includes(topping.name);
                return (
                  <button
                    key={topping.name}
                    type="button"
                    disabled={redeeming}
                    onClick={() => toggleTopping(topping.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 font-semibold text-sm disabled:opacity-50 ${
                      isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'border-gray-200 text-gray-800 hover:border-rose-400 hover:bg-rose-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4" />}
                      {topping.name}
                    </span>
                    <span className={isSelected ? 'text-white/90' : 'text-rose-700'}>{formatToppingPrice(topping.price)}</span>
                  </button>
                );
              })}
              </div>
              </div>
            </div>
            <div className="p-3 border-t space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-gray-700 px-1">
                <span>Phụ thu topping + combo</span>
                <span>{surchargeTotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <button
                type="button"
                disabled={redeeming}
                onClick={handleConfirmToppings}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                {redeeming ? 'Đang áp dụng...' : 'Xác nhận tặng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
