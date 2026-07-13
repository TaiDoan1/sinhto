import { X, Download } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  title: string;
  timestamp?: string;
  onClose: () => void;
}

export function ImageViewer({ src, title, timestamp, onClose }: ImageViewerProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Lỗi tải xuống ảnh');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-800">{title}</h3>
            {timestamp && <p className="text-xs text-gray-600 mt-0.5">{timestamp}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex justify-center bg-black">
          <img src={src} alt={title} className="max-w-full max-h-[60vh] object-contain" />
        </div>

        <div className="flex gap-2 p-4 border-t">
          <button
            onClick={handleDownload}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Tải xuống
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2.5 rounded-lg font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
