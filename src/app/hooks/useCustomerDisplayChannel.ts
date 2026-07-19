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

/**
 * Mở cửa sổ màn hình khách — máy POS là màn hình cảm ứng, không có chuột để kéo cửa sổ
 * sang monitor phụ, nên dùng Window Management API (Chrome) để tự đặt đúng vị trí + kích
 * thước màn hình thứ 2 nếu trình duyệt hỗ trợ và người dùng đã cấp quyền; nếu không, rơi về
 * mở cửa sổ thường (người dùng tự kéo sang màn hình phụ 1 lần).
 */
export async function openCustomerDisplayWindow(): Promise<Window | null> {
  const w = window as any;
  if (typeof w.getScreenDetails === 'function') {
    try {
      const screenDetails = await w.getScreenDetails();
      const target =
        screenDetails.screens.find((s: any) => s !== screenDetails.currentScreen) ||
        screenDetails.currentScreen;
      const win = window.open(
        CUSTOMER_DISPLAY_PATH,
        CUSTOMER_DISPLAY_WINDOW_NAME,
        `left=${target.availLeft},top=${target.availTop},width=${target.availWidth},height=${target.availHeight}`
      );
      return win;
    } catch {
      // Chưa cấp quyền quản lý màn hình hoặc trình duyệt không hỗ trợ — rơi về cách cũ.
    }
  }
  return window.open(CUSTOMER_DISPLAY_PATH, CUSTOMER_DISPLAY_WINDOW_NAME, 'noopener');
}
