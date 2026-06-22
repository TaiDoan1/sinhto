import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, Loader2, RefreshCw } from 'lucide-react';

interface AttendanceCameraProps {
  label: string;
  onCapture: (file: File) => Promise<void>;
  onCancel: () => void;
}

export function AttendanceCamera({ label, onCapture, onCancel }: AttendanceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    setReady(false);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch {
      setError('Không mở được camera. Vui lòng cấp quyền truy cập camera.');
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    setCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas error');
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.85)
      );
      if (!blob) throw new Error('Capture failed');
      const file = new File([blob], `attendance-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      await onCapture(file);
    } catch {
      setError('Chụp ảnh thất bại. Vui lòng thử lại.');
      setCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-md overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-gray-800">{label}</h3>
          <button
            type="button"
            onClick={() => { stopCamera(); onCancel(); }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="relative bg-gray-900 rounded-xl aspect-[3/4] overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${ready ? '' : 'opacity-0'}`}
            />
            {!ready && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
                <Camera className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-300">{error}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center gap-2 text-sm text-emerald-400 font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Thử lại
                </button>
              </div>
            )}
            {ready && (
              <div className="absolute inset-4 border-2 border-emerald-400 rounded-lg pointer-events-none opacity-60" />
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            Đưa khuôn mặt vào khung hình rồi chụp ảnh để xác nhận
          </p>

          <button
            type="button"
            onClick={handleCapture}
            disabled={!ready || capturing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {capturing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...</>
            ) : (
              <><Camera className="w-5 h-5" /> Chụp ảnh &amp; Xác nhận</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
