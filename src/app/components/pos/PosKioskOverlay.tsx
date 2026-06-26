import { Maximize2, Smartphone } from 'lucide-react';
import { usePosKioskContext } from '../../hooks/usePosKiosk';

export function PosKioskOverlay({ children }: { children: React.ReactNode }) {
  const { needsFullscreenTap, isStandalone, fullscreenFailed, enterFullscreen } = usePosKioskContext();

  return (
    <>
      {children}

      {needsFullscreenTap && (
        <button
          type="button"
          onClick={() => void enterFullscreen()}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-emerald-900/95 text-white p-6 text-center touch-manipulation"
          aria-label="Vào chế độ toàn màn hình POS"
        >
          <Maximize2 className="w-14 h-14 mb-4 opacity-90" />
          <p className="text-xl font-bold mb-2">Chạm để ẩn thanh Chrome (https)</p>
          <p className="text-base opacity-90 max-w-md leading-relaxed px-4">
            Trên Chrome Android, bấm vào đây để vào toàn màn hình.
          </p>
          <span className="mt-6 px-8 py-3.5 bg-white text-emerald-800 rounded-2xl text-lg font-bold shadow-lg">
            Chạm màn hình
          </span>

          <div className="mt-8 pt-6 border-t border-white/20 max-w-md px-4">
            <p className="flex items-center justify-center gap-2 text-sm font-bold mb-2">
              <Smartphone className="w-4 h-4" />
              Cách ẩn https vĩnh viễn trên Chrome
            </p>
            <ol className="text-sm opacity-90 text-left space-y-1.5 list-decimal list-inside">
              <li>Mở menu Chrome góc phải <strong>(⋮)</strong></li>
              <li>Chọn <strong>Thêm vào Màn hình chính</strong> hoặc <strong>Cài đặt ứng dụng</strong></li>
              <li>Mở app từ icon <strong>FitBlend POS</strong> — không mở qua thanh địa chỉ</li>
            </ol>
          </div>
        </button>
      )}

      {fullscreenFailed && !isStandalone && (
        <div className="fixed bottom-3 left-3 right-3 z-[95] bg-amber-50 border-2 border-amber-300 text-amber-950 rounded-xl p-3 shadow-lg text-sm">
          <p className="font-bold mb-1">Chrome không cho ẩn thanh https khi mở bằng tab</p>
          <p className="text-xs leading-relaxed">
            Vui lòng: Menu ⋮ → <strong>Thêm vào Màn hình chính</strong> → mở từ icon app.
          </p>
        </div>
      )}
    </>
  );
}

/** Nút ghim trên header POS — luôn bấm được khi chưa fullscreen */
export function PosFullscreenButton() {
  const { showFullscreenButton, enterFullscreen } = usePosKioskContext();
  if (!showFullscreenButton) return null;

  return (
    <button
      type="button"
      onClick={() => void enterFullscreen()}
      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold active:bg-emerald-800"
      title="Ẩn thanh địa chỉ Chrome"
    >
      <Maximize2 className="w-4 h-4" />
      <span className="hidden min-[1100px]:inline">Ẩn https</span>
    </button>
  );
}
