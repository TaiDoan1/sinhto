import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

interface Props {
  /** "solid" (mặc định) cho nền trắng/xám như trong app; "onDark" cho nền màu đậm như màn đăng nhập */
  variant?: 'solid' | 'onDark';
}

/** Gợi ý cài app lên màn hình chính — Android bấm 1 nút là cài xong (dùng beforeinstallprompt),
 * iOS không có API này nên chỉ hướng dẫn thao tác thủ công qua nút Chia sẻ. Ẩn hẳn nếu đã cài rồi. */
export function InstallAppBanner({ variant = 'solid' }: Props) {
  const { isStandalone, isIOS, canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (isStandalone || dismissed) return null;
  if (!canInstall && !isIOS) return null;

  const onDark = variant === 'onDark';

  return (
    <div
      className={`rounded-2xl p-3.5 shadow-sm flex items-center gap-3 mb-4 ${
        onDark ? 'bg-white/15 backdrop-blur-sm text-white' : 'bg-emerald-600 text-white'
      }`}
    >
      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
        <Download className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm">Cài app lên màn hình chính</p>
        {canInstall ? (
          <p className="text-xs text-white/80">Mở nhanh hơn, không cần gõ lại link mỗi lần</p>
        ) : (
          <p className="text-xs text-white/80 flex items-center gap-1 flex-wrap">
            Bấm <Share className="w-3.5 h-3.5 inline" /> Chia sẻ rồi chọn "Thêm vào Màn hình chính"
          </p>
        )}
      </div>
      {canInstall && (
        <button
          type="button"
          onClick={promptInstall}
          className={`shrink-0 text-xs font-bold px-3 py-2 rounded-xl ${
            onDark ? 'bg-white text-emerald-800 hover:bg-emerald-50' : 'bg-white text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          Cài đặt
        </button>
      )}
      <button type="button" onClick={() => setDismissed(true)} className="shrink-0 text-white/70 hover:text-white p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
