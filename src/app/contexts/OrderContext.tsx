import { createContext, useContext, useState, ReactNode } from 'react';
import { useInventory } from './InventoryContext';

export interface Order {
  id: string;
  branchId: string;
  source: 'counter' | 'mobile' | 'web';
  items: any[];
  time: Date;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'completed';
  total: number;
  staff: string;
  paidAt?: Date; // Thời điểm thanh toán
  readyAt?: Date; // Thời điểm sẵn sàng
  completedAt?: Date; // Thời điểm đã giao
  orderNumber?: number; // Số thứ tự để gọi khách
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  shipperName?: string;
  shipperId?: string;
  paymentMethod?: 'cash' | 'transfer';
  stockDeducted?: boolean; // Cờ đánh dấu đã trừ tồn kho chưa
}

interface OrderContextType {
  orders: Order[];
  history: Order[];
  addOrder: (order: Omit<Order, 'id' | 'time' | 'orderNumber'>) => void;
  updateOrderStatus: (orderId: string, status: Order['status'], extra?: Partial<Order>) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const { deductStock } = useInventory();
  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [orderCounter, setOrderCounter] = useState(1);

  const addOrder = (orderData: Omit<Order, 'id' | 'time' | 'orderNumber'>) => {
    const now = new Date();
    const newOrder: Order = {
      ...orderData,
      id: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
      time: now,
      paidAt: orderData.paidAt || now,
      orderNumber: orderCounter,
    };

    // Deduct stock immediately if paid (POS scenario or Online QR)
    if (newOrder.paidAt) {
      const success = deductStock(newOrder.id, newOrder.items.map(item => typeof item === 'string' ? item : item.name), newOrder.staff);
      if (success) {
        newOrder.stockDeducted = true;
      } else {
        alert('Cảnh báo: Không đủ nguyên liệu trong kho! (Tồn kho vẫn được cập nhật âm)');
        newOrder.stockDeducted = true; // Vẫn đánh dấu để không trừ lại lần nữa
      }
    }

    setOrders([newOrder, ...orders]);
    setOrderCounter(prev => prev + 1);
  };

  const updateOrderStatus = (orderId: string, status: Order['status'], extra?: Partial<Order>) => {
    const now = new Date();

    setOrders(prevOrders => {
      const order = prevOrders.find(o => o.id === orderId);

      // Trừ tồn kho khi đơn hàng hoàn thành (Thanh toán COD) nếu chưa trừ
      if (order && status === 'completed' && !order.stockDeducted) {
        deductStock(orderId, order.items.map(item => typeof item === 'string' ? item : item.name), order.staff || 'Hệ thống');
        extra = { ...extra, stockDeducted: true };
      }

      const updatedOrders = prevOrders.map(o => {
        if (o.id !== orderId) return o;

        const updates: Partial<Order> = { status, ...extra };

        // Ghi nhận timestamp
        if (status === 'ready') updates.readyAt = now;
        if (status === 'completed') updates.completedAt = now;

        return { ...o, ...updates };
      });

      // Tách đơn hoàn thành vào lịch sử
      const completedOrders = updatedOrders.filter(o => o.status === 'completed');
      const activeOrders = updatedOrders.filter(o => o.status !== 'completed');

      if (completedOrders.length > 0) {
        setHistory(prev => [...completedOrders, ...prev]);
      }

      return activeOrders;
    });
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    setHistory(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
  };

  return (
    <OrderContext.Provider value={{ orders, history, addOrder, updateOrderStatus, updateOrder }}>
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
