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
