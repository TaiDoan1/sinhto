import { useState, useEffect, useRef } from 'react';
import { Volume2, Save, Loader2, CheckCircle, PlayCircle, Mic, Square, Trash2 } from 'lucide-react';
import {
  usePosOrderNotificationText,
  saveOrderNotificationText,
  DEFAULT_ORDER_NOTIFICATION_TEXT,
  usePosOrderNotificationAudioUrl,
  saveOrderNotificationAudioUrl,
} from '../../hooks/usePosOrderNotificationText';
import { speakOrderNotification, playCustomOrderAudio } from '../../utils/notificationSound';
import * as api from '../../utils/api';

/** Chỉnh thông báo mà POS phát lên khi CSKH đưa đơn xuống đúng chi nhánh — đổi ở đây, các
 * máy POS đang mở nhận ngay không cần tải lại trang. Ưu tiên phát bản ghi âm giọng thật (đáng
 * tin cậy trên mọi thiết bị) — nếu chưa ghi âm, POS thử đọc bằng giọng máy như phương án tạm. */
export function OrderNotificationSettings() {
  const savedText = usePosOrderNotificationText();
  const savedAudioUrl = usePosOrderNotificationAudioUrl();
  const [text, setText] = useState(savedText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [micError, setMicError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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
    speakOrderNotification(text.trim() || DEFAULT_ORDER_NOTIFICATION_TEXT, savedAudioUrl);
  };

  const handleStartRecording = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        setRecordedPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setMicError('Không truy cập được micro — kiểm tra quyền truy cập micro của trình duyệt.');
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleSaveRecording = async () => {
    if (!recordedBlob) return;
    setUploading(true);
    try {
      const ext = recordedBlob.type.includes('webm') ? 'webm' : recordedBlob.type.includes('mp4') ? 'mp4' : 'ogg';
      const file = new File([recordedBlob], `order-notify-${Date.now()}.${ext}`, { type: recordedBlob.type });
      const url = await api.uploadImage(file);
      await saveOrderNotificationAudioUrl(url);
      setRecordedBlob(null);
      setRecordedPreviewUrl('');
    } catch {
      alert('Lưu bản ghi âm thất bại — thử lại nhé.');
    } finally {
      setUploading(false);
    }
  };

  const handleDiscardRecording = () => {
    setRecordedBlob(null);
    setRecordedPreviewUrl('');
  };

  const handleRemoveSavedAudio = async () => {
    if (!confirm('Xóa bản ghi âm đang dùng? POS sẽ chuyển về đọc bằng giọng máy (kém tin cậy hơn).')) return;
    await saveOrderNotificationAudioUrl('');
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
            <p className="text-sm text-gray-500">Âm thanh POS phát lên khi CSKH đưa đơn xuống đúng chi nhánh</p>
          </div>
        </div>
        {saved && <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Đã lưu</span>}
      </div>

      <div className="space-y-5">
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="font-bold text-sm text-gray-800">Ghi âm giọng thật (khuyến nghị)</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Đáng tin cậy hơn giọng đọc máy nhiều — mọi thiết bị POS đều phát được, không phụ thuộc máy có cài giọng đọc tiếng Việt hay không.
            </p>
          </div>

          {savedAudioUrl && !recordedBlob && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-emerald-700">Đang dùng bản ghi âm đã lưu</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => playCustomOrderAudio(savedAudioUrl)} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1">
                  <PlayCircle className="w-3.5 h-3.5" /> Nghe lại
                </button>
                <button type="button" onClick={handleRemoveSavedAudio} className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Xóa
                </button>
              </div>
            </div>
          )}

          {recordedPreviewUrl ? (
            <div className="space-y-2">
              <audio src={recordedPreviewUrl} controls className="w-full h-10" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDiscardRecording}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold text-sm"
                >
                  Ghi lại
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecording}
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2 rounded-lg font-semibold text-sm"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Dùng bản ghi này
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={recording ? handleStopRecording : handleStartRecording}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm ${
                recording ? 'bg-red-600 hover:bg-red-700 text-white' : 'border border-indigo-200 text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              {recording ? <><Square className="w-4 h-4" /> Dừng ghi âm</> : <><Mic className="w-4 h-4" /> {savedAudioUrl ? 'Ghi âm lại' : 'Bắt đầu ghi âm'}</>}
            </button>
          )}
          {micError && <p className="text-xs text-red-600">{micError}</p>}
        </div>

        <div>
          <label className="text-xs text-gray-500 font-semibold">Nội dung câu (dùng để đọc bằng giọng máy nếu chưa ghi âm)</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={DEFAULT_ORDER_NOTIFICATION_TEXT}
            rows={2}
            className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

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
            Lưu câu chữ
          </button>
        </div>
      </div>
    </div>
  );
}
