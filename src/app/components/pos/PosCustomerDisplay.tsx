import { useEffect, useState } from 'react';
import { Maximize2, QrCode, Wallet, Smartphone, Sparkles } from 'lucide-react';
import { useCustomerDisplayState } from '../../hooks/useCustomerDisplayChannel';
import { useBranches } from '../../contexts/BranchContext';

const PAYMENT_META: Record<string, { label: string; emoji: string; hint?: string; color: string }> = {
  cash: { label: 'Thanh Toán Tiền Mặt', emoji: '💵', color: 'text-green-400' },
  momo: { label: 'Thanh Toán MoMo', emoji: '📱', hint: 'Vui lòng mở MoMo và quét mã để thanh toán', color: 'text-pink-400' },
  zalopay: { label: 'Thanh Toán ZaloPay', emoji: '💳', hint: 'Vui lòng mở ZaloPay và quét mã để thanh toán', color: 'text-blue-400' },
};

function requestFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
}

export function PosCustomerDisplay() {
  const state = useCustomerDisplayState();
  const { branchLabel } = useBranches();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const stage = state?.stage || 'idle';
  const branch = state?.branchId ? branchLabel(state.branchId) : '';

  return (
    <div className="h-dvh w-full bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white flex flex-col items-center justify-center overflow-hidden relative select-none">
      {!isFullscreen && (
        <button
          type="button"
          onClick={requestFullscreen}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 z-10"
          title="Toàn màn hình"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      )}

      {stage === 'idle' && (
        <div className="text-center px-8">
          <div className="text-7xl mb-6">🥤</div>
          <h1 className="text-6xl font-black tracking-tight mb-3">FitBlend</h1>
          <p className="text-2xl text-emerald-200 font-medium">{branch || 'Healthy Protein Smoothie'}</p>
          <p className="text-lg text-emerald-300/70 mt-8">Chào mừng quý khách!</p>
        </div>
      )}

      {stage === 'cart' && state && (
        <div className="w-full max-w-2xl px-8 flex flex-col h-full py-10">
          <h2 className="text-3xl font-bold text-emerald-200 mb-6 text-center">Giỏ Hàng Của Bạn</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {state.items.length === 0 ? (
              <p className="text-center text-emerald-300/60 text-xl mt-10">Đang chọn món...</p>
            ) : (
              state.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/10 rounded-xl px-5 py-3.5">
                  <div>
                    <div className="text-xl font-bold">{item.productName}</div>
                    {item.size && <div className="text-sm text-emerald-200/70">{item.size}</div>}
                    {item.toppings && item.toppings.length > 0 && (
                      <div className="text-sm text-emerald-300/80">+ {item.toppings.join(', ')}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-sm text-emerald-200/70">x{item.quantity}</div>
                    <div className="text-lg font-bold">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-white/20 mt-4 pt-4 flex justify-between items-baseline">
            <span className="text-2xl font-semibold text-emerald-200">TỔNG:</span>
            <span className="text-5xl font-black">{state.total.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>
      )}

      {stage === 'payment' && state && state.paymentMethod === 'qr' && (
        <div className="text-center px-8">
          <h2 className="text-3xl font-bold text-emerald-200 mb-6">Quét Mã Để Thanh Toán</h2>
          <div className="bg-white rounded-3xl p-6 mx-auto w-[340px] h-[340px] flex items-center justify-center shadow-2xl">
            {state.qrImageUrl ? (
              <img src={state.qrImageUrl} alt="QR thanh toán" className="w-full h-full object-contain" />
            ) : (
              <QrCode className="w-56 h-56 text-gray-300" />
            )}
          </div>
          <div className="mt-8">
            <div className="text-lg text-emerald-200">Số tiền</div>
            <div className="text-6xl font-black">{state.total.toLocaleString('vi-VN')}đ</div>
          </div>
        </div>
      )}

      {stage === 'payment' && state && state.paymentMethod && state.paymentMethod !== 'qr' && (
        <div className="text-center px-8">
          {(() => {
            const meta = PAYMENT_META[state.paymentMethod!] || { label: 'Thanh Toán', emoji: '💳', color: 'text-white' };
            return (
              <>
                <h2 className={`text-3xl font-bold mb-6 ${meta.color}`}>{meta.label}</h2>
                <div className="text-8xl mb-6">{meta.emoji}</div>
                <div className="text-lg text-emerald-200">Số tiền cần thanh toán</div>
                <div className={`text-6xl font-black ${meta.color}`}>{state.total.toLocaleString('vi-VN')}đ</div>
                {meta.hint && <p className="text-emerald-200/80 text-lg mt-6 max-w-md mx-auto">{meta.hint}</p>}
              </>
            );
          })()}
        </div>
      )}

      {stage === 'success' && state && (
        <div className="text-center px-8">
          <Sparkles className="w-20 h-20 mx-auto mb-4 text-yellow-300" />
          <h2 className="text-5xl font-black mb-4">Cảm Ơn Quý Khách!</h2>
          <div className="text-lg text-emerald-200">Đã thanh toán</div>
          <div className="text-6xl font-black mb-2">{state.total.toLocaleString('vi-VN')}đ</div>
          {!!state.pointsEarned && state.pointsEarned > 0 && (
            <p className="text-xl text-yellow-200 font-semibold mt-4">+{state.pointsEarned} điểm tích lũy 🎉</p>
          )}
          <p className="text-emerald-300/70 mt-8">Hẹn gặp lại bạn lần sau 💚</p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-emerald-300/40 text-xs">
        <Wallet className="w-3.5 h-3.5" />
        <Smartphone className="w-3.5 h-3.5" />
        Màn hình khách — FitBlend POS
      </div>
    </div>
  );
}
