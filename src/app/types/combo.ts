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
  performedBy: string;
  branchId: string;
}

export interface ComboSubscriptionLike {
  id?: string;
  status: string;
  branchId: string;
  items: unknown;
  deliveryDays: number[];
  nextDelivery: Date | string;
  pauseStartDate?: string;
  pauseEndDate?: string;
  deliveryLog?: unknown;
  lastDeliveredAt?: string;
}
