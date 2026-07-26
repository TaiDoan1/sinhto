import { useEffect, useState } from 'react';
import { useSSE } from '../contexts/SSEContext';
import * as api from '../utils/api';

const SETTING_KEY = 'posOrderNotificationText';
export const DEFAULT_ORDER_NOTIFICATION_TEXT = 'Nguyên ơi, có đơn hàng online nè';

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
