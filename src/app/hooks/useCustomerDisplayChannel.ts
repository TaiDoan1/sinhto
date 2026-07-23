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

export interface OpenCustomerDisplayResult {
  win: Window | null;
  /** true = đã tự đặt đúng sang màn hình thứ 2; false = rơi về mở cửa sổ thường, cần báo lý do. */
  positioned: boolean;
  /** Lý do không tự đặt được — hiện cho người dùng biết chính xác cần sửa gì, vì máy POS cảm
   * ứng không có chuột để tự kéo cửa sổ sang màn hình phụ như cách khắc phục thủ công. */
  error?: string;
}

/**
 * Mở cửa sổ màn hình khách — máy POS là màn hình cảm ứng, không có chuột để kéo cửa sổ
 * sang monitor phụ, nên dùng Window Management API (Chrome) để tự đặt đúng vị trí + kích
 * thước màn hình thứ 2 nếu trình duyệt hỗ trợ và người dùng đã cấp quyền. Nếu không tự đặt
 * được, vẫn mở cửa sổ (để không rơi vào im lặng) nhưng trả về lý do cụ thể cho caller hiện
 * alert — vì im lặng rơi về cửa sổ cùng màn hình sẽ kẹt cứng trên máy không có chuột.
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
    if (!screenDetails.screens || screenDetails.screens.length < 2) {
      const win = window.open(CUSTOMER_DISPLAY_PATH, CUSTOMER_DISPLAY_WINDOW_NAME, 'noopener');
      return {
        win,
        positioned: false,
        error:
          'Chỉ phát hiện 1 màn hình. Kiểm tra ở Windows: Cài đặt > Hệ thống > Màn hình phải để "Mở rộng các màn hình này" (Extend), không phải "Nhân bản" (Duplicate).',
      };
    }
    const target =
      screenDetails.screens.find((s: any) => s !== screenDetails.currentScreen) ||
      screenDetails.currentScreen;
    const win = window.open(
      CUSTOMER_DISPLAY_PATH,
      CUSTOMER_DISPLAY_WINDOW_NAME,
      `left=${target.availLeft},top=${target.availTop},width=${target.availWidth},height=${target.availHeight}`
    );
    return { win, positioned: true };
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
