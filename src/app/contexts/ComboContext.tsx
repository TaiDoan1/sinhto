import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ComboItem } from '../components/customer/CustomComboBuilder';
import { useSSE } from './SSEContext';
import * as api from '../utils/api';
import { withSalesRef } from '../utils/salesRef';
import type { ComboSubscriptionStatus } from '../types/customerCare';

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
}

export interface ComboNotification {
  id: string;
  comboId: string;
  customerName: string;
  type: 'update' | 'pause' | 'resume' | 'claim';
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
  updateComboStatus: (comboId: string, status: ComboSubscription['status']) => Promise<void>;
  claimCombo: (comboId: string, employeeId: string, employeeName: string) => Promise<void>;
  refreshCombos: () => Promise<void>;
  getTodayDeliveries: () => ComboSubscription[];
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
  return {
    ...(raw as ComboSubscription),
    items: (items || []) as ComboSubscription['items'],
    deliveryDays: (deliveryDays || [1, 2, 3, 4, 5]) as number[],
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
    const created = await api.createComboSubscription(withSalesRef({
      ...toApiPayload(comboData),
      status: comboData.status || 'pending',
    }));
    const normalized = normalizeCombo(created);
    setCombos((prev) => [normalized, ...prev.filter((c) => c.id !== normalized.id)]);
  };

  const updateCombo = async (comboId: string, updates: Partial<ComboSubscription>) => {
    const updated = await api.updateComboSubscription(comboId, toApiPayload(updates));
    const normalized = normalizeCombo(updated);
    setCombos((prev) => prev.map((c) => (c.id === comboId ? normalized : c)));
  };

  const updateComboStatus = async (comboId: string, status: ComboSubscription['status']) => {
    await updateCombo(comboId, { status });
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

  const getTodayDeliveries = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return combos.filter((combo) => {
      if (combo.status !== 'active') return false;
      if (combo.pauseStartDate && combo.pauseEndDate) {
        const start = new Date(combo.pauseStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(combo.pauseEndDate);
        end.setHours(23, 59, 59, 999);
        if (today >= start && today <= end) return false;
      }
      const nextDelivery = new Date(combo.nextDelivery);
      nextDelivery.setHours(0, 0, 0, 0);
      return nextDelivery.getTime() === today.getTime();
    });
  };

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
