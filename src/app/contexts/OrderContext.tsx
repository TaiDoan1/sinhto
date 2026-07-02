import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useInventory } from './InventoryContext';
import { useSSE } from './SSEContext';
import * as api from '../utils/api';
import { withSalesRef } from '../utils/salesRef';

export interface Order {
  id: string;
  branchId: string;
  source: 'counter' | 'mobile' | 'web' | 'online_sales';
  items: any[];
  time: Date;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'completed';
  total: number;
  staff: string;
  paidAt?: Date;
  readyAt?: Date;
  completedAt?: Date;
  orderNumber?: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  shipperName?: string;
  shipperId?: string;
  paymentMethod?: 'cash' | 'transfer';
  salesStaffId?: string;
  salesStaffName?: string;
  stockDeducted?: boolean;
}

interface OrderContextType {
  orders: Order[];
  history: Order[];
  offlineQueueLength: number;
  addOrder: (order: Omit<Order, 'id' | 'time' | 'orderNumber'>) => boolean;
  updateOrderStatus: (orderId: string, status: Order['status'], extra?: Partial<Order>) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

function normalizeOrder(raw: any): Order {
  const source = ['counter', 'mobile', 'web', 'online_sales'].includes(raw.source) ? raw.source : 'counter';
  let items = raw.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  if (!Array.isArray(items)) items = [];

  return {
    ...raw,
    source,
    items,
    time: raw.time ? new Date(raw.time) : new Date(),
    paidAt: raw.paidAt ? new Date(raw.paidAt) : undefined,
    readyAt: raw.readyAt ? new Date(raw.readyAt) : undefined,
    completedAt: raw.completedAt ? new Date(raw.completedAt) : undefined,
    total: Number(raw.total) || 0,
    stockDeducted: !!raw.stockDeducted,
  };
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const { deductStockForOrder } = useInventory();
  const { subscribe } = useSSE();
  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // Load orders and offline queue on mount
  useEffect(() => {
    // 1. Fetch from server
    api.fetchOrders()
      .then((data: any[]) => {
        const normalized = data.map(normalizeOrder);
        const active = normalized.filter(o => o.status !== 'completed');
        const completed = normalized.filter(o => o.status === 'completed');
        setOrders(active);
        setHistory(completed);
      })
      .catch(err => {
        console.error("Lỗi khi load orders từ backend, load từ local tạm thời:", err);
        const localCached = localStorage.getItem('cached_active_orders');
        if (localCached) {
          try {
            setOrders(JSON.parse(localCached).map(normalizeOrder));
          } catch { /* ignore */ }
        }
      });

    // 2. Load offline queue from localStorage
    const savedQueue = localStorage.getItem('offline_orders_queue');
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    // 3. Subscribe to real-time events via global SSEContext
    const unsubCreate = subscribe('ORDER_CREATED', (data) => {
      const newOrder = normalizeOrder(data);
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev;
        const updated = [newOrder, ...prev];
        localStorage.setItem('cached_active_orders', JSON.stringify(updated));
        return updated;
      });
    });

    const unsubUpdate = subscribe('ORDER_UPDATED', (data) => {
      const updatedOrder = normalizeOrder(data);

      setOrders(prev => {
        const isCompleted = updatedOrder.status === 'completed';
        let updated;
        if (isCompleted) {
          setHistory(h => {
            if (h.some(o => o.id === updatedOrder.id)) {
              return h.map(o => o.id === updatedOrder.id ? updatedOrder : o);
            }
            return [updatedOrder, ...h];
          });
          updated = prev.filter(o => o.id !== updatedOrder.id);
        } else {
          if (prev.some(o => o.id === updatedOrder.id)) {
            updated = prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
          } else {
            updated = [updatedOrder, ...prev];
          }
        }
        localStorage.setItem('cached_active_orders', JSON.stringify(updated));
        return updated;
      });
    });

    return () => {
      unsubCreate();
      unsubUpdate();
    };
  }, [subscribe]);

  // Background Auto-sync loop every 10 seconds
  useEffect(() => {
    if (offlineQueue.length === 0) return;

    const interval = setInterval(async () => {
      console.log('🔄 Đang kiểm tra để tự động đồng bộ hóa các đơn hàng ngoại tuyến...');
      const queueCopy = [...offlineQueue];
      let successCount = 0;

      for (let i = 0; i < queueCopy.length; i++) {
        const item = queueCopy[i];
        try {
          if (item.action === 'CREATE') {
            await api.createOrder(withSalesRef(item.data));
          } else if (item.action === 'UPDATE_STATUS') {
            await api.updateOrderStatus(item.orderId, item.status, item.extra);
          }
          successCount++;
        } catch (err) {
          console.warn(`Đồng bộ thất bại cho đơn ${item.orderId || 'NEW'}. Có thể vẫn offline.`);
          break; // Mạng vẫn lỗi, dừng luồng đồng bộ
        }
      }

      if (successCount > 0) {
        const remainingQueue = queueCopy.slice(successCount);
        setOfflineQueue(remainingQueue);
        localStorage.setItem('offline_orders_queue', JSON.stringify(remainingQueue));
        console.log(`✅ Đã đồng bộ thành công ${successCount} tác vụ đơn hàng ngoại tuyến.`);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [offlineQueue]);

  const addOrder = (orderData: Omit<Order, 'id' | 'time' | 'orderNumber'>): boolean => {
    const now = new Date();
    const tempId = `ORD-${Date.now()}`;
    const stockLines = (orderData.items || []).map((item) =>
      typeof item === 'string'
        ? { productName: item, quantity: 1 }
        : {
            productId: item.productId,
            productName: item.productName || item.name,
            productCategory: item.productCategory,
            size: item.size,
            bagSize: item.bagSize,
            protein: item.protein,
            toppings: item.toppings,
            quantity: item.quantity ?? 1,
            isCustomCombo: item.isCustomCombo,
          }
    );
    const retailLines = stockLines.filter((l) => !l.isCustomCombo);

    const newOrder: Partial<Order> = {
      ...orderData,
      id: tempId,
      time: now,
      paidAt: orderData.paidAt || now,
      status: orderData.status || 'pending',
      stockDeducted: false,
    };

    if (newOrder.paidAt && retailLines.length > 0) {
      const success = deductStockForOrder(tempId, retailLines, newOrder.staff || 'System');
      if (!success) return false;
      newOrder.stockDeducted = true;
    } else if (retailLines.length === 0) {
      newOrder.stockDeducted = true;
    }

    setOrders((prev) => [newOrder as Order, ...prev]);

    api.createOrder(withSalesRef(newOrder)).catch((err) => {
      console.warn('Mất kết nối máy chủ backend. Đang xếp đơn hàng vào hàng đợi đồng bộ offline.', err);
      const updatedQueue = [...offlineQueue, { action: 'CREATE', orderId: tempId, data: newOrder }];
      setOfflineQueue(updatedQueue);
      localStorage.setItem('offline_orders_queue', JSON.stringify(updatedQueue));
    });

    return true;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], extra?: Partial<Order>) => {
    const now = new Date();
    const updates: Partial<Order> = { ...extra, status };

    if (status === 'ready') updates.readyAt = now;
    if (status === 'completed') updates.completedAt = now;

    // Local stock deduction
    const activeOrder = orders.find(o => o.id === orderId);
    if (activeOrder && status === 'completed' && !activeOrder.stockDeducted) {
      const lines = activeOrder.items.map((item) =>
        typeof item === 'string'
          ? { productName: item, quantity: 1 }
          : {
              productId: item.productId,
              productName: item.productName || item.name,
              productCategory: item.productCategory,
              size: item.size,
              bagSize: item.bagSize,
              protein: item.protein,
              toppings: item.toppings,
              quantity: item.quantity ?? 1,
              isCustomCombo: item.isCustomCombo,
            }
      );
      const retailLines = lines.filter((l) => !l.isCustomCombo);
      if (retailLines.length > 0) {
        const ok = deductStockForOrder(orderId, retailLines, activeOrder.staff || 'Hệ thống');
        if (ok) updates.stockDeducted = true;
      } else {
        updates.stockDeducted = true;
      }
    }

    // Update locally immediately
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));

    try {
      await api.updateOrderStatus(orderId, status, updates);
    } catch (err) {
      console.warn(`Lỗi cập nhật trạng thái đơn ${orderId} lên backend. Đang đưa vào hàng đợi offline.`, err);
      const updatedQueue = [...offlineQueue, { action: 'UPDATE_STATUS', orderId, status, extra: updates }];
      setOfflineQueue(updatedQueue);
      localStorage.setItem('offline_orders_queue', JSON.stringify(updatedQueue));
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    updateOrderStatus(orderId, updates.status || 'pending', updates);
  };

  return (
    <OrderContext.Provider value={{ orders, history, offlineQueueLength: offlineQueue.length, addOrder, updateOrderStatus, updateOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
}
