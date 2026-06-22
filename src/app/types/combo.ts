export interface ComboItem {
  assignedDay: number;
  dayLabel?: string;
  productName: string;
  productId?: string;
  size?: string;
  protein?: number;
  toppings?: string[];
  product?: { id?: string; name?: string };
}

export interface ComboDeliveryLogEntry {
  date: string;
  productName: string;
  size?: string;
  protein?: number;
  toppings?: string[];
  address?: string;
  performedBy: string;
  branchId: string;
  note?: string;
  deliveryLogId?: string;
}

/** Bản ghi lịch giao chuẩn hóa (delivery_logs table) */
export interface DeliveryLogRecord {
  id: string;
  comboOrderId: string;
  branchId: string;
  deliveryDate: string;
  productName?: string;
  productId?: string;
  size?: string;
  protein?: number;
  toppings?: string[];
  flavorNote?: string;
  status: 'pending' | 'shipping' | 'delivered' | 'postponed';
  performedBy?: string;
  performedAt?: string;
  customerName?: string;
  customerPhone?: string;
  planName?: string;
  deliveryAddress?: string;
  careStaffId?: string;
  totalCups?: number;
  deliveredCups?: number;
  comboStatus?: string;
}

export interface ComboSubscriptionLike {
  id?: string;
  status: string;
  branchId: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  planName?: string;
  items: unknown;
  deliveryDays: number[];
  nextDelivery: Date | string;
  pauseStartDate?: string;
  pauseEndDate?: string;
  deliveryLog?: unknown;
  lastDeliveredAt?: string;
  totalCups?: number;
  deliveredCups?: number;
  commissionAmount?: number;
  commissionStatus?: string;
  notes?: string;
}
