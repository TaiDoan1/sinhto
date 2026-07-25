import { useEffect, useState } from 'react';

/**
 * Đồng bộ màn hình khách (monitor thứ 2 gắn cùng máy POS) với màn hình thu ngân qua
 * BroadcastChannel — chỉ hoạt động giữa các tab/cửa sổ CÙNG trình duyệt trên CÙNG máy,
 * đúng với mô hình 2 màn hình gắn 1 máy POS (không cần server, không độ trễ mạng).
 */
const CHANNEL_NAME = 'fitblend-pos-customer-display';

export type CustomerDisplayStage = 'idle' | 'cart' | 'payment' | 'success';

export interface CustomerDisplayItem {
  productName: string;
  quantity: number;
  price: number;
  size?: string;
  toppings?: string[];
}

export interface CustomerDisplayState {
  stage: CustomerDisplayStage;
  branchId?: string;
  items: CustomerDisplayItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: 'cash' | 'momo' | 'zalopay' | 'qr' | null;
  qrImageUrl?: string | null;
  customerName?: string;
  pointsEarned?: number;
  updatedAt: number;
}

let postChannel: BroadcastChannel | null = null;

function getPostChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!postChannel) postChannel = new BroadcastChannel(CHANNEL_NAME);
  return postChannel;
}

export function postCustomerDisplayState(state: CustomerDisplayState) {
  getPostChannel()?.postMessage(state);
}

/** Dùng ở màn hình khách để nhận state realtime từ màn hình thu ngân. */
export function useCustomerDisplayState(): CustomerDisplayState | null {
  const [state, setState] = useState<CustomerDisplayState | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => setState(event.data as CustomerDisplayState);
    return () => channel.close();
  }, []);

  return state;
}

const CUSTOMER_DISPLAY_WINDOW_NAME = 'fitblend_customer_display';
const CUSTOMER_DISPLAY_PATH = '/pos/customer-display';
const SCREEN_PREF_KEY = 'pos_customer_display_screen_key';

export interface OpenCustomerDisplayResult {
  win: Window | null;
  /** true = đã tự đặt đúng sang màn hình đã chọn; false = rơi về mở cửa sổ thường, cần báo lý do. */
  positioned: boolean;
  /** Lý do không tự đặt được — hiện cho người dùng biết chính xác cần sửa gì, vì máy POS cảm
   * ứng không có chuột để tự kéo cửa sổ sang màn hình phụ như cách khắc phục thủ công. */
  error?: string;
  /** true = có ≥2 màn hình nhưng chưa biết chọn cái nào (chưa lưu lựa chọn trước đó) — caller
   * cần hiện bảng chọn màn hình cho nhân viên, không tự đoán để tránh chọn nhầm màn hình chính. */
  needsScreenPicker?: boolean;
  screens?: DetectedScreen[];
}

export interface DetectedScreen {
  key: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

function screenKey(s: any): string {
  return s.id != null ? String(s.id) : `${s.left},${s.top},${s.width}x${s.height}`;
}

// "?fs=1" báo cho PosCustomerDisplay biết cửa sổ này ĐÃ được đặt đúng sang màn hình phụ,
// nên mới được tự động full màn hình. Các nhánh mở cửa sổ dự phòng (không xác định được vị
// trí) KHÔNG được thêm "fs=1" — tránh full màn hình đè lên đúng màn hình đang có máy POS.
function openAt(target: any): Window | null {
  return window.open(
    `${CUSTOMER_DISPLAY_PATH}?fs=1`,
    CUSTOMER_DISPLAY_WINDOW_NAME,
    `left=${target.availLeft},top=${target.availTop},width=${target.availWidth},height=${target.availHeight}`
  );
}

export function getSavedCustomerScreenKey(): string | null {
  return localStorage.getItem(SCREEN_PREF_KEY);
}

export function saveCustomerScreenKey(key: string) {
  localStorage.setItem(SCREEN_PREF_KEY, key);
}

export function clearCustomerScreenKey() {
  localStorage.removeItem(SCREEN_PREF_KEY);
}

/**
 * Mở cửa sổ màn hình khách trên đúng màn hình có `key` đã chọn trước đó (xem
 * `saveCustomerScreenKey`) — dùng khi đã biết chắc màn hình nào, không đoán mò.
 */
export async function openCustomerDisplayOnScreen(key: string): Promise<OpenCustomerDisplayResult> {
  const w = window as any;
  try {
    const screenDetails = await w.getScreenDetails();
    const target = (screenDetails.screens || []).find((s: any) => screenKey(s) === key);
    if (!target) {
      return {
        win: null,
        positioned: false,
        error: 'Không tìm thấy đúng màn hình đã chọn trước đó — có thể cấu hình màn hình vừa thay đổi. Chọn lại màn hình khách.',
      };
    }
    return { win: openAt(target), positioned: true };
  } catch {
    return {
      win: null,
      positioned: false,
      error:
        'Trình duyệt chưa cấp quyền hiển thị 2 màn hình. Bấm vào biểu tượng ổ khóa cạnh địa chỉ web → tìm "Quản lý cửa sổ" (Window management) → chọn Cho phép, rồi bấm lại nút này.',
    };
  }
}

/**
 * Mở cửa sổ màn hình khách — máy POS là màn hình cảm ứng, không có chuột để kéo cửa sổ
 * sang monitor phụ, nên dùng Window Management API (Chrome) để tự đặt vị trí. Trước đây tự
 * đoán "màn hình không phải màn hình hiện tại" là màn hình khách — nhưng đoán sai trên một
 * số máy (phát hiện nhầm màn hình chính là "không phải hiện tại"). Giờ nếu đã có lựa chọn
 * lưu trước đó thì dùng thẳng; nếu chưa, KHÔNG đoán nữa mà báo caller hiện bảng chọn để nhân
 * viên tự xác nhận đúng màn hình 1 lần, các lần sau tự nhớ.
 */
export async function openCustomerDisplayWindow(): Promise<OpenCustomerDisplayResult> {
  const w = window as any;
  if (typeof w.getScreenDetails !== 'function') {
    const win = window.open(CUSTOMER_DISPLAY_PATH, CUSTOMER_DISPLAY_WINDOW_NAME, 'noopener');
    return {
      win,
      positioned: false,
      error: 'Trình duyệt này không hỗ trợ tự chọn màn hình phụ. Dùng Chrome hoặc Edge bản mới nhất.',
    };
  }
  try {
    const screenDetails = await w.getScreenDetails();
    const screens = screenDetails.screens || [];
    if (screens.length < 2) {
      const win = window.open(CUSTOMER_DISPLAY_PATH, CUSTOMER_DISPLAY_WINDOW_NAME, 'noopener');
      return {
        win,
        positioned: false,
        error:
          'Chỉ phát hiện 1 màn hình. Kiểm tra ở Windows: Cài đặt > Hệ thống > Màn hình phải để "Mở rộng các màn hình này" (Extend), không phải "Nhân bản" (Duplicate).',
      };
    }

    const savedKey = getSavedCustomerScreenKey();
    if (savedKey) {
      const target = screens.find((s: any) => screenKey(s) === savedKey);
      if (target) return { win: openAt(target), positioned: true };
      // Lựa chọn cũ không còn khớp màn hình nào hiện có — hỏi lại từ đầu.
    }

    const detected: DetectedScreen[] = screens.map((s: any, idx: number) => ({
      key: screenKey(s),
      label: `Màn hình ${idx + 1} — ${s.width}×${s.height}${s === screenDetails.currentScreen ? ' (đang xem màn hình này)' : ''}`,
      left: s.left,
      top: s.top,
      width: s.width,
      height: s.height,
    }));
    return { win: null, positioned: false, needsScreenPicker: true, screens: detected };
  } catch {
    const win = window.open(CUSTOMER_DISPLAY_PATH, CUSTOMER_DISPLAY_WINDOW_NAME, 'noopener');
    return {
      win,
      positioned: false,
      error:
        'Trình duyệt chưa cấp quyền hiển thị 2 màn hình. Bấm vào biểu tượng ổ khóa cạnh địa chỉ web → tìm "Quản lý cửa sổ" (Window management) → chọn Cho phép, rồi bấm lại nút này.',
    };
  }
}
