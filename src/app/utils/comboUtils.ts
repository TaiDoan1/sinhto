import type { ComboItem, ComboDeliveryLogEntry, ComboSubscriptionLike } from '../types/combo';
import { lineToIngredients, type RecipeIngredient } from './inventoryRecipes';

const DAY_MAP = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const PLAN_SPECS: Record<string, { size: string; protein: number }> = {
  'fat-loss': { size: '360ml', protein: 40 },
  'muscle-build': { size: '500ml', protein: 60 },
  'elite-mass': { size: '700ml', protein: 90 },
};

function planSpecs(planId?: string) {
  return PLAN_SPECS[planId || 'fat-loss'] || PLAN_SPECS['fat-loss'];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function parseDeliveryLog(raw: unknown): ComboDeliveryLogEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ComboDeliveryLogEntry[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Chuẩn hóa items từ mọi nguồn tạo combo */
export function normalizeComboItems(items: unknown): ComboItem[] {
  if (!items) return [];

  if (Array.isArray(items)) {
    return items.map((item, idx) => {
      if (typeof item !== 'object' || !item) return null;
      const row = item as Record<string, unknown>;
      const productName =
        (row.product as { name?: string })?.name ||
        (row.productName as string) ||
        (row.name as string) ||
        '';
      if (!productName) return null;
      return {
        assignedDay: (row.assignedDay as number) ?? DAY_MAP[idx % 7],
        dayLabel: (row.dayLabel as string) || DAY_LABELS[idx % 7],
        productName,
        productId: (row.product as { id?: string })?.id || (row.productId as string),
        size: (row.size as string) || '360ml',
        protein: (row.protein as number) ?? 40,
        toppings: (row.toppings as string[]) || [],
        product: row.product as ComboItem['product'],
      };
    }).filter(Boolean) as ComboItem[];
  }

  if (typeof items === 'object') {
    const raw = items as Record<string, unknown>;
    const specs = planSpecs(raw.planId as string);
    const globalToppings: string[] = [];
    if (Array.isArray(raw.selectedSingleToppings)) {
      globalToppings.push(...(raw.selectedSingleToppings as string[]));
    }
    if (Array.isArray(raw.selectedFlavors)) {
      return raw.selectedFlavors
        .map((flavor, idx) => {
          if (!flavor) return null;
          return {
            assignedDay: DAY_MAP[idx],
            dayLabel: DAY_LABELS[idx],
            productName: String(flavor),
            size: specs.size,
            protein: specs.protein,
            toppings: [...globalToppings],
          };
        })
        .filter(Boolean) as ComboItem[];
    }
  }

  return [];
}

export function deriveDeliveryDays(items: ComboItem[], fallback?: number[]): number[] {
  if (fallback?.length) return fallback;
  const days = [...new Set(items.map((i) => i.assignedDay))].sort((a, b) => a - b);
  return days.length ? days : [1, 2, 3, 4, 5];
}

export function getComboItemForToday(combo: ComboSubscriptionLike): ComboItem | null {
  const today = new Date().getDay();
  const items = normalizeComboItems(combo.items);
  return items.find((i) => i.assignedDay === today) || items[0] || null;
}

export function isComboPausedToday(combo: ComboSubscriptionLike): boolean {
  if (combo.status === 'paused') return true;
  if (!combo.pauseStartDate || !combo.pauseEndDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(combo.pauseStartDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(combo.pauseEndDate);
  end.setHours(23, 59, 59, 999);
  return today >= start && today <= end;
}

export function wasDeliveredToday(combo: ComboSubscriptionLike): boolean {
  const log = parseDeliveryLog(combo.deliveryLog);
  return log.some((e) => e.date === todayStr());
}

/** Combo cần giao hôm nay */
export function isComboDueToday(combo: ComboSubscriptionLike, branchId?: string): boolean {
  if (combo.status !== 'active') return false;
  if (branchId && combo.branchId !== branchId) return false;
  if (isComboPausedToday(combo)) return false;
  if (wasDeliveredToday(combo)) return false;

  const items = normalizeComboItems(combo.items);
  const deliveryDays = deriveDeliveryDays(items, combo.deliveryDays);
  const today = new Date().getDay();
  if (!deliveryDays.includes(today)) return false;

  const next = new Date(combo.nextDelivery);
  next.setHours(0, 0, 0, 0);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  return next.getTime() <= todayDate.getTime();
}

export function getCombosDueToday(combos: ComboSubscriptionLike[], branchId?: string): ComboSubscriptionLike[] {
  return combos.filter((c) => isComboDueToday(c, branchId));
}

export function calculateNextDeliveryDate(from: Date, deliveryDays: number[]): Date {
  const date = new Date(from);
  for (let i = 1; i <= 7; i++) {
    const next = new Date(date);
    next.setDate(date.getDate() + i);
    if (deliveryDays.includes(next.getDay())) return next;
  }
  return date;
}

export function getRecipeIngredientsForComboItem(item: ComboItem | null): RecipeIngredient[] {
  if (!item) return [];
  return lineToIngredients({
    productId: item.productId || item.product?.id,
    productName: item.productName,
    size: item.size || '360ml',
    protein: item.protein ?? 40,
    toppings: item.toppings,
    quantity: 1,
  });
}

export function calculateTotalCups(raw: Record<string, unknown>): number {
  const flavors = (raw.selectedFlavors as string[])?.filter(Boolean) || [];
  const perWeek = flavors.length || 7;
  const qty = Number(raw.quantity) || 1;
  const duration = (raw.duration as string) || 'weekly';
  const weeks = duration === 'weekly' ? 1 : duration === 'monthly' ? 4 : duration === 'quarterly' ? 12 : 1;
  return perWeek * qty * weeks;
}

export function getComboProgress(combo: ComboSubscriptionLike): {
  delivered: number;
  total: number;
  remaining: number;
  label: string;
  isComplete: boolean;
} {
  const delivered = parseDeliveryLog(combo.deliveryLog).length;
  const normalized = normalizeComboItems(combo.items);
  const total = combo.totalCups || normalized.length || 7;
  const remaining = Math.max(0, total - delivered);
  return {
    delivered,
    total,
    remaining,
    label: `${delivered}/${total} ly`,
    isComplete: delivered >= total,
  };
}

/** Tin nhắn gửi nhóm Zalo SHIP COMBO */
export function formatZaloShipMessage(combo: ComboSubscriptionLike, shipNote?: string): string {
  const item = getComboItemForToday(combo);
  const progress = getComboProgress(combo);
  const size = item?.size || '360ml';
  const protein = item?.protein ?? 40;
  const flavor = item?.productName || combo.planName || 'FitBlend';
  const toppings = item?.toppings?.length ? ` - ${item.toppings.join(' - ')}` : '';
  const now = new Date();
  const timeStr = `${now.getHours()}h ${now.toLocaleDateString('vi-VN')}`;

  const lines = [
    `📋 Đơn combo - đã thanh toán`,
    `🥤 1 ly ${size} ${protein}gr protein - ${flavor}${toppings}`,
    shipNote ? `📝 ${shipNote}` : '',
    combo.deliveryAddress ? `📍 ${combo.deliveryAddress}` : '',
    combo.customerPhone ? `📞 tel:${combo.customerPhone}` : '',
    combo.customerName ? `👤 ${combo.customerName}` : '',
    `🕐 Giao: ${timeStr}`,
    `✅ Done: ${progress.delivered}/${progress.total} ly`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function buildComboPayloadFromRaw(raw: Record<string, unknown>, extras: {
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  branchId: string;
  staff: string;
  status?: string;
  planName?: string;
  deliveryAddress?: string;
  orderId?: string;
}) {
  const items = normalizeComboItems(raw);
  const deliveryDays = deriveDeliveryDays(items);
  const startIso = raw.startDate ? new Date(raw.startDate as string).toISOString() : new Date().toISOString();
  const toppingNote = Array.isArray(raw.selectedSingleToppings)
    ? (raw.selectedSingleToppings as string[]).join(', ')
    : '';

  return {
    orderId: extras.orderId,
    customerName: extras.customerName,
    customerPhone: extras.customerPhone,
    deliveryAddress: extras.deliveryAddress || '',
    planName: extras.planName || (raw.name as string) || 'Combo FitBlend',
    comboType: (raw.duration === 'weekly' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
    comboDuration: (raw.duration as string) || 'weekly',
    startDate: new Date(startIso),
    nextDelivery: new Date(startIso),
    deliveryDays,
    items,
    totalCups: calculateTotalCups(raw),
    totalPrice: extras.totalPrice,
    status: extras.status || 'pending',
    branchId: extras.branchId,
    staff: extras.staff,
    notes: toppingNote,
  };
}
