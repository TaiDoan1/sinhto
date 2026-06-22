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
  notes?: string;
}
