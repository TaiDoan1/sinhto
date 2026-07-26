import { useEffect, useState } from 'react';
import { useSSE } from '../contexts/SSEContext';
import * as api from '../utils/api';

const SETTING_KEY = 'posOrderNotificationText';
const AUDIO_SETTING_KEY = 'posOrderNotificationAudioUrl';
export const DEFAULT_ORDER_NOTIFICATION_TEXT = 'Ê ê Ê ê ê ê Ê ê Ê ê ê ê Có đơn hàng online, bạn xử lý nhé';

/** Nội dung câu thông báo giọng nói khi CSKH đưa đơn xuống POS — chỉnh ở Admin, POS nhận
 * ngay không cần tải lại trang (qua SETTING_UPDATED, giống các setting dùng chung khác). */
export function usePosOrderNotificationText() {
  const { subscribe } = useSSE();
  const [text, setText] = useState(DEFAULT_ORDER_NOTIFICATION_TEXT);

  useEffect(() => {
    api
      .fetchSetting(SETTING_KEY)
      .then((v) => setText(typeof v === 'string' && v.trim() ? v : DEFAULT_ORDER_NOTIFICATION_TEXT))
      .catch(() => {});

    const unsub = subscribe('SETTING_UPDATED', (data: { key: string; value: unknown }) => {
      if (data?.key === SETTING_KEY) {
        setText(typeof data.value === 'string' && data.value.trim() ? data.value : DEFAULT_ORDER_NOTIFICATION_TEXT);
      }
    });
    return unsub;
  }, [subscribe]);

  return text;
}

export async function saveOrderNotificationText(text: string): Promise<void> {
  await api.saveSetting(SETTING_KEY, text);
}

/** URL file ghi âm giọng thật (ưu tiên hơn giọng đọc máy — đáng tin cậy hơn nhiều vì máy nào
 * cũng phát <audio> được, không phụ thuộc máy có cài giọng đọc tiếng Việt hay không). */
export function usePosOrderNotificationAudioUrl() {
  const { subscribe } = useSSE();
  const [url, setUrl] = useState('');

  useEffect(() => {
    api
      .fetchSetting(AUDIO_SETTING_KEY)
      .then((v) => setUrl(typeof v === 'string' ? v : ''))
      .catch(() => {});

    const unsub = subscribe('SETTING_UPDATED', (data: { key: string; value: unknown }) => {
      if (data?.key === AUDIO_SETTING_KEY) {
        setUrl(typeof data.value === 'string' ? data.value : '');
      }
    });
    return unsub;
  }, [subscribe]);

  return url;
}

export async function saveOrderNotificationAudioUrl(url: string): Promise<void> {
  await api.saveSetting(AUDIO_SETTING_KEY, url);
}

export type OrderNotificationMode = 'tts' | 'recording';
const MODE_SETTING_KEY = 'posOrderNotificationMode';

/** Chọn POS đọc bằng giọng máy (theo chữ) hay phát bản ghi âm — cho phép giữ cả 2 và chuyển
 * qua lại mà không cần xóa cái đang không dùng. Mặc định 'tts' theo chữ nhập. */
export function usePosOrderNotificationMode(): OrderNotificationMode {
  const { subscribe } = useSSE();
  const [mode, setMode] = useState<OrderNotificationMode>('tts');

  useEffect(() => {
    api
      .fetchSetting(MODE_SETTING_KEY)
      .then((v) => setMode(v === 'recording' ? 'recording' : 'tts'))
      .catch(() => {});

    const unsub = subscribe('SETTING_UPDATED', (data: { key: string; value: unknown }) => {
      if (data?.key === MODE_SETTING_KEY) {
        setMode(data.value === 'recording' ? 'recording' : 'tts');
      }
    });
    return unsub;
  }, [subscribe]);

  return mode;
}

export async function saveOrderNotificationMode(mode: OrderNotificationMode): Promise<void> {
  await api.saveSetting(MODE_SETTING_KEY, mode);
}
