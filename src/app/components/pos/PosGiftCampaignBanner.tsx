import { useState, useEffect } from 'react';
import { Gift, Loader2, X, ArrowRight } from 'lucide-react';
import * as api from '../../utils/api';
import type { GiftCampaign } from '../../utils/api';
import { useMenu } from '../../contexts/MenuContext';
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
  const [campaign, setCampaign] = useState<GiftCampaign | null>(null);
  const [step, setStep] = useState<'closed' | 'phone' | 'flavor'>('closed');
  const [phone, setPhone] = useState('');
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

  const handlePickFlavor = async (productName: string) => {
    setRedeeming(true);
    try {
      const { campaign: updated } = await api.redeemGiftCampaign(campaign.id, {
        customerPhone: phone.trim(),
        productName,
        staffId,
        staffName,
      });
      setCampaign(updated);
      setStep('closed');
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
    </>
  );
}
