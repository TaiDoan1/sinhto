import { useState, useEffect } from 'react';
import { Volume2, Save, Loader2, CheckCircle, PlayCircle } from 'lucide-react';
import { usePosOrderNotificationText, saveOrderNotificationText, DEFAULT_ORDER_NOTIFICATION_TEXT } from '../../hooks/usePosOrderNotificationText';
import { speakOrderNotification } from '../../utils/notificationSound';

/** Chỉnh câu thông báo giọng nói mà POS đọc lên khi CSKH đưa đơn xuống đúng chi nhánh —
 * đổi ở đây, các máy POS đang mở nhận ngay không cần tải lại trang. */
export function OrderNotificationSettings() {
  const savedText = usePosOrderNotificationText();
  const [text, setText] = useState(savedText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setText(savedText);
  }, [savedText]);

  const handleSave = async () => {
    if (!text.trim()) {
      alert('Vui lòng nhập nội dung thông báo.');
      return;
    }
    setSaving(true);
    try {
      await saveOrderNotificationText(text.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    speakOrderNotification(text.trim() || DEFAULT_ORDER_NOTIFICATION_TEXT);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Thông Báo Đơn CSKH ở POS</h2>
            <p className="text-sm text-gray-500">Câu POS đọc lên khi CSKH đưa đơn xuống đúng chi nhánh</p>
          </div>
        </div>
        {saved && <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Đã lưu</span>}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 font-semibold">Nội dung thông báo</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={DEFAULT_ORDER_NOTIFICATION_TEXT}
            rows={2}
            className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>
        <p className="text-xs text-gray-400">
          POS dùng giọng đọc có sẵn của trình duyệt để đọc câu này — không cần tạo lại file âm thanh mỗi lần đổi.
        </p>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handlePreview}
            className="flex items-center gap-2 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-4 py-2.5 rounded-xl font-semibold text-sm"
          >
            <PlayCircle className="w-4 h-4" />
            Nghe thử
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl font-semibold text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
