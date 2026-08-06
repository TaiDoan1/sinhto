import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, Loader2, RefreshCw, Check, SwitchCamera } from 'lucide-react';
import imageCompression from 'browser-image-compression';

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
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    setError('');
    setReady(false);
    setPreview(null);
    setPreviewFile(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 720 }, height: { ideal: 960 } },
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
  }, [stopCamera, facingMode]);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

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

      let file = new File([blob], `attendance-${Date.now()}.jpg`, { type: 'image/jpeg' });

      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true
        };
        const compressedBlob = await imageCompression(blob, options);
        file = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      } catch (compressErr) {
        console.warn('Image compression failed, using original:', compressErr);
      }

      setPreviewFile(file);
      setPreview(URL.createObjectURL(blob));
      setReady(false);
    } catch {
      setError('Chụp ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setCapturing(false);
    }
  };

  const handleRetake = async () => {
    setPreview(null);
    setPreviewFile(null);
    await startCamera();
  };

  const handleConfirmUpload = async () => {
    if (!previewFile) return;
    setUploading(true);
    try {
      await onCapture(previewFile);
    } finally {
      setUploading(false);
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
            {!preview ? (
              <>
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
                      onClick={() => startCamera()}
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
                {ready && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-full transition-colors"
                    aria-label="Đổi camera"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </button>
                )}
              </>
            ) : (
              <>
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Đã chụp
                </div>
              </>
            )}
          </div>

          {!preview && (
            <p className="text-xs text-gray-500 text-center">
              Đưa khuôn mặt vào khung hình rồi chụp ảnh để xác nhận
            </p>
          )}

          {preview && previewFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700">
              <p className="mb-1"><span className="font-semibold">Kích thước ảnh:</span> {(previewFile.size / 1024).toFixed(1)} KB</p>
              <p><span className="font-semibold">Thời gian:</span> {new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
            </div>
          )}

          <div className="flex gap-2">
            {preview ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Chụp lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={uploading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  {uploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Đang tải...</>
                  ) : (
                    <><Check className="w-5 h-5" /> Xác nhận</>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCapture}
                disabled={!ready || capturing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {capturing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...</>
                ) : (
                  <><Camera className="w-5 h-5" /> Chụp ảnh</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
