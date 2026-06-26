import { Maximize2, Smartphone } from 'lucide-react';
import { usePosKiosk } from '../../hooks/usePosKiosk';

export function PosKioskOverlay({ children }: { children: React.ReactNode }) {
  const { needsFullscreenTap, isStandalone, enterFullscreen } = usePosKiosk();

  return (
    <>
      {children}

      {needsFullscreenTap && (
        <button
          type="button"
          onClick={() => void enterFullscreen()}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-emerald-900/95 text-white p-8 text-center touch-manipulation"
          aria-label="Vào chế độ toàn màn hình POS"
        >
          <Maximize2 className="w-16 h-16 mb-6 opacity-90" />
          <p className="text-2xl font-bold mb-3">Chạm để ẩn thanh trình duyệt</p>
          <p className="text-lg opacity-90 max-w-md leading-relaxed">
            Bấm vào đây để vào chế độ toàn màn hình — thanh địa chỉ (https) sẽ được ẩn.
          </p>
          <span className="mt-8 px-8 py-4 bg-white text-emerald-800 rounded-2xl text-xl font-bold shadow-lg">
            Chạm màn hình
          </span>

          <div className="mt-10 pt-8 border-t border-white/20 max-w-lg">
            <p className="flex items-center justify-center gap-2 text-sm opacity-80 mb-2">
              <Smartphone className="w-4 h-4" />
              Cài đặt lâu dài (khuyên dùng)
            </p>
            <p className="text-sm opacity-75 leading-relaxed">
              Menu trình duyệt (⋮) → <strong>Thêm vào Màn hình chính</strong> → mở app từ icon
              FitBlend POS. Khi đó thanh https sẽ không hiện nữa.
            </p>
          </div>
        </button>
      )}

      {!needsFullscreenTap && !isStandalone && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[90] pointer-events-none">
          <p className="text-[10px] text-gray-400 bg-white/80 px-2 py-0.5 rounded-full shadow">
            Tip: Thêm vào Màn hình chính để ẩn thanh https vĩnh viễn
          </p>
        </div>
      )}
    </>
  );
}
