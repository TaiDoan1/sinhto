import { useState, useEffect } from 'react';
import { Gift, Loader2, X } from 'lucide-react';
import * as api from '../../utils/api';
import type { GiftCampaign } from '../../utils/api';
import { useMenu } from '../../contexts/MenuContext';
import type { CartItem } from './ModifierModal';

interface Props {
  branchId: string;
  customerPhone: string;
  staffId?: string;
  staffName?: string;
  /** true nếu giỏ hàng đã có 1 ly quà tặng — ẩn gợi ý để tránh tặng trùng trong cùng đơn. */
  alreadyGifted: boolean;
  onGiftAdded: (item: CartItem) => void;
}

/** Gợi ý tặng quà theo chương trình khuyến mãi đang chạy tại đúng chi nhánh — hiện ngay khi
 * đã biết SĐT khách (thu qua ô tìm/đăng ký ở LoyaltyCustomerSection phía trên), không cần
 * khách có điểm/tài khoản. Chỉ dừng gợi ý khi chương trình hết hạn mức hoặc đã tặng trong đơn. */
export function PosGiftCampaignBanner({ branchId, customerPhone, staffId, staffName, alreadyGifted, onGiftAdded }: Props) {
  const { products } = useMenu();
  const [campaign, setCampaign] = useState<GiftCampaign | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

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

  if (!campaign || !customerPhone.trim() || alreadyGifted) return null;

  const remaining = Math.max(0, campaign.totalLimit - campaign.redeemedCount);
  const smoothieProducts = products.filter((p) => p.category === 'smoothies');

  const handlePickFlavor = async (productName: string) => {
    setRedeeming(true);
    try {
      const { campaign: updated } = await api.redeemGiftCampaign(campaign.id, {
        customerPhone: customerPhone.trim(),
        productName,
        staffId,
        staffName,
      });
      setCampaign(updated);
      setShowPicker(false);
      onGiftAdded({
        productId: `gift-${campaign.id}-${Date.now()}`,
        productName,
        name: `${productName} (Quà tặng KM)`,
        size: campaign.giftSize,
        protein: campaign.giftProtein,
        toppings: [],
        price: 0,
        quantity: 1,
        isGift: true,
        giftCampaignId: campaign.id,
      });
    } catch (e: any) {
      alert(e.message || 'Không áp dụng được quà tặng — có thể chương trình vừa hết hạn mức.');
      setShowPicker(false);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl p-3.5 shadow-lg flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm">{campaign.name}</p>
          <p className="text-xs text-white/80">Khách đủ điều kiện nhận 1 ly tặng — còn {remaining.toLocaleString('vi-VN')} ly</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="shrink-0 bg-white text-rose-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-rose-50"
        >
          Chọn vị tặng
        </button>
      </div>

      {showPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-rose-600 text-white">
              <div className="font-bold flex items-center gap-2">
                <Gift className="w-4 h-4" /> Chọn vị ly tặng ({campaign.giftSize}, {campaign.giftProtein}g)
              </div>
              <button type="button" onClick={() => setShowPicker(false)} disabled={redeeming}>
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
    </>
  );
}
