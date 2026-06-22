import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { ComboItem, ComboDeliveryLogEntry } from '../types/combo';
import { getCombosDueToday, calculateNextDeliveryDate, deriveDeliveryDays, normalizeComboItems, parseDeliveryLog, getComboItemForToday, getComboProgress } from '../utils/comboUtils';
import { useSSE } from './SSEContext';
import * as api from '../utils/api';
import { withSalesRef } from '../utils/salesRef';
import type { ComboSubscriptionStatus } from '../types/customerCare';

export type { ComboItem };

export interface ComboSubscription {
  id: string;
  customerName: string;
  customerPhone: string;
  comboType: 'weekly' | 'monthly';
  comboDuration?: 'weekly' | 'monthly' | 'quarterly';
  startDate: Date;
  nextDelivery: Date;
  deliveryDays: number[];
  items: ComboItem[] | Record<string, unknown>;
  totalPrice: number;
  status: ComboSubscriptionStatus;
  staff: string;
  branchId: string;
  updatedAt?: Date;
  pauseStartDate?: string;
  pauseEndDate?: string;
  orderId?: string;
  planName?: string;
  deliveryAddress?: string;
  careStaffId?: string;
  careStaffName?: string;
  closedByStaffId?: string;
  closedByStaffName?: string;
  closedAt?: Date;
  assignedAt?: Date;
  notes?: string;
  lastDeliveredAt?: string;
  deliveryLog?: ComboDeliveryLogEntry[];
  totalCups?: number;
}

export interface ComboNotification {
  id: string;
  comboId: string;
  customerName: string;
  type: 'update' | 'pause' | 'resume' | 'claim' | 'deliver';
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface ComboContextType {
  combos: ComboSubscription[];
  isLoading: boolean;
  notifications: ComboNotification[];
  addCombo: (combo: Omit<ComboSubscription, 'id'>) => Promise<void>;
  updateCombo: (comboId: string, updates: Partial<ComboSubscription>) => Promise<void>;
  updateComboStatus: (comboId: string, status: ComboSubscription['status'], extra?: Partial<ComboSubscription>) => Promise<void>;
  claimCombo: (comboId: string, employeeId: string, employeeName: string) => Promise<void>;
  confirmDelivery: (comboId: string, performedBy: string, branchId: string, shipNote?: string) => Promise<boolean>;
  refreshCombos: () => Promise<void>;
  getTodayDeliveries: (branchId?: string) => ComboSubscription[];
  markNotificationAsRead: (notificationId: string) => void;
  addNotification: (notification: Omit<ComboNotification, 'id' | 'timestamp' | 'isRead'>) => void;
}

const ComboContext = createContext<ComboContextType | undefined>(undefined);

function normalizeCombo(raw: Record<string, unknown>): ComboSubscription {
  let items = raw.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  let deliveryDays = raw.deliveryDays;
  if (typeof deliveryDays === 'string') {
    try { deliveryDays = JSON.parse(deliveryDays); } catch { deliveryDays = [1, 2, 3, 4, 5]; }
  }
  const normalizedItems = normalizeComboItems(items);
  return {
    ...(raw as ComboSubscription),
    items: normalizedItems.length ? normalizedItems : (items || []) as ComboSubscription['items'],
    deliveryDays: (deliveryDays || deriveDeliveryDays(normalizedItems)) as number[],
    deliveryLog: parseDeliveryLog(raw.deliveryLog),
    lastDeliveredAt: (raw.lastDeliveredAt as string) || undefined,
    totalCups: raw.totalCups != null ? Number(raw.totalCups) : undefined,
    startDate: raw.startDate ? new Date(raw.startDate as string) : new Date(),
    nextDelivery: raw.nextDelivery ? new Date(raw.nextDelivery as string) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt as string) : undefined,
    closedAt: raw.closedAt ? new Date(raw.closedAt as string) : undefined,
    assignedAt: raw.assignedAt ? new Date(raw.assignedAt as string) : undefined,
    status: (raw.status as ComboSubscriptionStatus) || 'pending',
    staff: (raw.staff as string) || '',
  };
}

function toApiPayload(combo: Partial<ComboSubscription>) {
  return {
    ...combo,
    startDate: combo.startDate instanceof Date ? combo.startDate.toISOString() : combo.startDate,
    nextDelivery: combo.nextDelivery instanceof Date ? combo.nextDelivery.toISOString() : combo.nextDelivery,
    closedAt: combo.closedAt instanceof Date ? combo.closedAt.toISOString() : combo.closedAt,
    assignedAt: combo.assignedAt instanceof Date ? combo.assignedAt.toISOString() : combo.assignedAt,
  };
}

export function ComboProvider({ children }: { children: ReactNode }) {
  const { subscribe } = useSSE();
  const [combos, setCombos] = useState<ComboSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<ComboNotification[]>([]);

  const refreshCombos = useCallback(async () => {
    try {
      const data = await api.fetchComboSubscriptions();
      setCombos(data.map(normalizeCombo));
    } catch (err) {
      console.error('Failed to load combos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCombos();
  }, [refreshCombos]);

  useEffect(() => {
    const unsubCreate = subscribe('COMBO_SUBSCRIPTION_CREATED', (data) => {
      setCombos((prev) => {
        const normalized = normalizeCombo(data);
        if (prev.some((c) => c.id === normalized.id)) return prev;
        return [normalized, ...prev];
      });
    });
    const unsubUpdate = subscribe('COMBO_SUBSCRIPTION_UPDATED', (data) => {
      const normalized = normalizeCombo(data);
      setCombos((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));
    });
    return () => {
      unsubCreate();
      unsubUpdate();
    };
  }, [subscribe]);

  const addCombo = async (comboData: Omit<ComboSubscription, 'id'>) => {
    const items = normalizeComboItems(comboData.items);
    const created = await api.createComboSubscription(withSalesRef({
      ...toApiPayload({
        ...comboData,
        items: items.length ? items : comboData.items,
        deliveryDays: comboData.deliveryDays?.length ? comboData.deliveryDays : deriveDeliveryDays(items),
      }),
      status: comboData.status || 'pending',
    }));
    const normalized = normalizeCombo(created);
    setCombos((prev) => [normalized, ...prev.filter((c) => c.id !== normalized.id)]);
  };

  const updateCombo = async (comboId: string, updates: Partial<ComboSubscription>) => {
    const payload = { ...toApiPayload(updates) };
    if (updates.items) {
      const items = normalizeComboItems(updates.items);
      payload.items = items.length ? items : updates.items;
    }
    const updated = await api.updateComboSubscription(comboId, payload);
    const normalized = normalizeCombo(updated);
    setCombos((prev) => prev.map((c) => (c.id === comboId ? normalized : c)));
  };

  const updateComboStatus = async (
    comboId: string,
    status: ComboSubscription['status'],
    extra?: Partial<ComboSubscription>
  ) => {
    const today = new Date().toISOString().split('T')[0];
    if (status === 'paused') {
      await updateCombo(comboId, {
        status: 'paused',
        pauseStartDate: today,
        pauseEndDate: extra?.pauseEndDate,
        ...extra,
      });
      return;
    }
    if (status === 'active') {
      await updateCombo(comboId, {
        status: 'active',
        pauseStartDate: '',
        pauseEndDate: '',
        ...extra,
      });
      return;
    }
    await updateCombo(comboId, { status, ...extra });
  };

  const claimCombo = async (comboId: string, employeeId: string, employeeName: string) => {
    const updated = await api.claimComboSubscription(comboId, employeeId, employeeName);
    const normalized = normalizeCombo(updated);
    setCombos((prev) => prev.map((c) => (c.id === comboId ? normalized : c)));
    addNotification({
      comboId,
      customerName: normalized.customerName,
      type: 'claim',
      message: `Đã chốt combo cho ${normalized.customerName}`,
    });
  };

  const confirmDelivery = async (comboId: string, performedBy: string, branchId: string, shipNote?: string) => {
    const combo = combos.find((c) => c.id === comboId);
    if (!combo) return false;

    const today = new Date().toISOString().split('T')[0];
    const todayItem = getComboItemForToday(combo);
    const productName = todayItem?.productName || combo.planName || 'FitBlend';

    const log = [...(combo.deliveryLog || [])];
    log.push({
      date: today,
      productName,
      size: todayItem?.size,
      protein: todayItem?.protein,
      toppings: todayItem?.toppings,
      address: combo.deliveryAddress,
      performedBy,
      branchId,
      note: shipNote,
    });

    const progress = getComboProgress({ ...combo, deliveryLog: log });
    const nextDelivery = calculateNextDeliveryDate(new Date(), combo.deliveryDays);

    await updateCombo(comboId, {
      lastDeliveredAt: new Date().toISOString(),
      deliveryLog: log,
      nextDelivery,
      status: progress.isComplete ? 'completed' : combo.status,
    });

    addNotification({
      comboId,
      customerName: combo.customerName,
      type: 'deliver',
      message: `Đã giao ${productName} cho ${combo.customerName} (${progress.delivered}/${progress.total})`,
    });
    return true;
  };

  const addNotification = (notif: Omit<ComboNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotif: ComboNotification = {
      ...notif,
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date(),
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (notifId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
  };

  const getTodayDeliveries = (branchId?: string) =>
    getCombosDueToday(combos, branchId) as ComboSubscription[];

  return (
    <ComboContext.Provider
      value={{
        combos,
        isLoading,
        notifications,
        addCombo,
        updateCombo,
        updateComboStatus,
        claimCombo,
        confirmDelivery,
        refreshCombos,
        getTodayDeliveries,
        markNotificationAsRead,
        addNotification,
      }}
    >
      {children}
    </ComboContext.Provider>
  );
}

export function useCombos() {
  const context = useContext(ComboContext);
  if (!context) {
    throw new Error('useCombos must be used within ComboProvider');
  }
  return context;
}
