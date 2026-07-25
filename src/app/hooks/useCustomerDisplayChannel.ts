import { useEffect, useState } from 'react';
import { useSSE } from '../contexts/SSEContext';

/**
 * Đồng bộ màn hình khách (Subscreen máy POS, hoặc monitor thứ 2) với màn hình thu ngân qua
 * server (SSE) — không dùng BroadcastChannel vì trên máy POS Android (VD iMin), màn hình
 * khách thường chạy ở tiến trình trình duyệt RIÊNG (khác app/khác process với máy chính),
 * BroadcastChannel chỉ đồng bộ được trong CÙNG 1 tiến trình nên sẽ không hoạt động.
 */
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

export function postCustomerDisplayState(state: CustomerDisplayState) {
  fetch('/api/pos/customer-display', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  }).catch(() => {});
}

/** Dùng ở màn hình khách để nhận state realtime từ màn hình thu ngân, lọc theo chi nhánh. */
export function useCustomerDisplayState(branchId?: string): CustomerDisplayState | null {
  const { subscribe } = useSSE();
  const [state, setState] = useState<CustomerDisplayState | null>(null);

  useEffect(() => {
    const unsub = subscribe(`POS_CUSTOMER_DISPLAY_${branchId || 'default'}`, (data: CustomerDisplayState) => {
      setState(data);
    });
    return unsub;
  }, [subscribe, branchId]);

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

function displayUrl(params: { fs?: boolean; branchId?: string }): string {
  const qs = new URLSearchParams();
  if (params.fs) qs.set('fs', '1');
  if (params.branchId) qs.set('branch', params.branchId);
  const query = qs.toString();
  return query ? `${CUSTOMER_DISPLAY_PATH}?${query}` : CUSTOMER_DISPLAY_PATH;
}

// "fs=1" báo cho PosCustomerDisplay biết cửa sổ này ĐÃ được đặt đúng sang màn hình phụ,
// nên mới được tự động full màn hình. Các nhánh mở cửa sổ dự phòng (không xác định được vị
// trí) KHÔNG được thêm "fs=1" — tránh full màn hình đè lên đúng màn hình đang có máy POS.
function openAt(target: any, branchId?: string): Window | null {
  return window.open(
    displayUrl({ fs: true, branchId }),
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
export async function openCustomerDisplayOnScreen(key: string, branchId?: string): Promise<OpenCustomerDisplayResult> {
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
    return { win: openAt(target, branchId), positioned: true };
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
 * sang monitor phụ, nên dùng Window Management API (Chrome desktop) để tự đặt vị trí. API
 * này CHỈ tồn tại trên trình duyệt máy tính (Chrome/Edge desktop) — máy POS Android (VD iMin)
 * không có API này, nên trên Android sẽ luôn rơi vào nhánh mở cửa sổ dự phòng bên dưới; cần
 * cấu hình màn hình phụ trực tiếp ở hệ điều hành máy đó (xem tài liệu máy Android tương ứng).
 */
export async function openCustomerDisplayWindow(branchId?: string): Promise<OpenCustomerDisplayResult> {
  const w = window as any;
  if (typeof w.getScreenDetails !== 'function') {
    const win = window.open(displayUrl({ branchId }), CUSTOMER_DISPLAY_WINDOW_NAME, 'noopener');
    return {
      win,
      positioned: false,
      error:
        'Trình duyệt/thiết bị này không hỗ trợ tự chọn màn hình phụ (chỉ Chrome/Edge trên máy tính hỗ trợ). Trên máy Android (VD iMin), cần cấu hình màn hình khách (Subscreen) trực tiếp ở máy, không thể tự động qua web.',
    };
  }
  try {
    const screenDetails = await w.getScreenDetails();
    const screens = screenDetails.screens || [];
    if (screens.length < 2) {
      const win = window.open(displayUrl({ branchId }), CUSTOMER_DISPLAY_WINDOW_NAME, 'noopener');
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
      if (target) return { win: openAt(target, branchId), positioned: true };
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
    const win = window.open(displayUrl({ branchId }), CUSTOMER_DISPLAY_WINDOW_NAME, 'noopener');
    return {
      win,
      positioned: false,
      error:
        'Trình duyệt chưa cấp quyền hiển thị 2 màn hình. Bấm vào biểu tượng ổ khóa cạnh địa chỉ web → tìm "Quản lý cửa sổ" (Window management) → chọn Cho phép, rồi bấm lại nút này.',
    };
  }
}
