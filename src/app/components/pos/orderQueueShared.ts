import { Play, CheckCircle } from 'lucide-react';
import type { Order } from '../../contexts/OrderContext';

export const sourceColors: Record<string, string> = {
  counter: 'bg-green-500',
  mobile: 'bg-sky-600',
  web: 'bg-sky-600',
  online_sales: 'bg-sky-600',
  grab: 'bg-emerald-600',
};

export const sourceLabels: Record<string, string> = {
  counter: 'Tại Quầy',
  mobile: 'Đặt Online',
  web: 'Web',
  online_sales: 'CSKH Chốt Đơn',
  grab: '🛵 Grab',
};

// Nhóm nguồn đơn: "off" (bán trực tiếp tại quầy) vs "online" (mobile/web/CSKH chốt đơn) —
// dùng để tách tab và tô màu thẻ đơn cho dễ phân biệt nhanh trong hàng đợi.
export function isOnlineSource(source: string): boolean {
  return source !== 'counter';
}

export const orderCardColors = {
  counter: { border: 'border-green-300 hover:border-green-400', bg: 'bg-green-50/60' },
  online: { border: 'border-sky-300 hover:border-sky-400', bg: 'bg-sky-50/60' },
};

export const statusBadgeColors: Record<Order['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-emerald-100 text-emerald-800',
  ready: 'bg-emerald-100 text-emerald-700',
  delivering: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-700',
};

export const statusLabels: Record<Order['status'], string> = {
  pending: '🔔 CHỜ XÁC NHẬN',
  preparing: '🔥 ĐANG LÀM MÓN',
  ready: '📦 CHỜ SHIPPER LẤY',
  delivering: '🏍️ ĐANG GIAO HÀNG',
  completed: 'HOÀN THÀNH',
};

export const statusShortLabels: Record<Order['status'], string> = {
  pending: 'Chờ xác nhận',
  preparing: 'Đang làm',
  ready: 'Chờ lấy',
  delivering: 'Đang giao',
  completed: 'Xong',
};

export function getPrimaryAction(order: Order): { label: string; icon: typeof Play; next: Order['status'] } | null {
  if (order.status === 'pending') {
    return { label: 'Nhận Đơn & Làm Món', icon: Play, next: 'preparing' };
  }
  if (order.status === 'preparing') {
    return {
      label: order.source === 'mobile' ? 'Xong - Chờ Shipper' : 'Xong - Giao Khách',
      icon: CheckCircle,
      next: 'ready',
    };
  }
  if (order.status === 'ready' && order.source !== 'mobile') {
    return { label: 'Hoàn Tất Giao Nhận', icon: CheckCircle, next: 'completed' };
  }
  return null;
}
