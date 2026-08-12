import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
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
  paymentMethod?: 'cash' | 'transfer' | 'qr' | 'momo' | 'zalopay';
  salesStaffId?: string;
  salesStaffName?: string;
  stockDeducted?: boolean;
  staffId?: string;
  sessionStaffId?: string;
  shiftId?: string;
  shipFee?: number;
  note?: string;
  /** Giờ hẹn giao cho đơn online (ISO). Đơn CSKH luôn có giờ giao; sửa được khi khách đổi giờ. */
  deliveryTime?: string;
  /** Giao hàng: 'pickup' (khách tự lấy tại quầy) | 'delivery' (giao tận nơi). */
  deliveryType?: 'pickup' | 'delivery';
  /** Khi giao: 'own' (shipper của mình) | 'external' (bookship đơn vị ngoài). */
  shipMethod?: 'own' | 'external' | '';
  /** Bookship ngoài: tên đơn vị ship (Grab/Ahamove...) + mã vận đơn. */
  shipProvider?: string;
  shipTrackingCode?: string;
  /** Kỵ vị & dị ứng của khách (cảnh báo pha chế). */
  allergyNote?: string;
}

interface OrderContextType {
  orders: Order[];
  history: Order[];
  offlineQueueLength: number;
  /** Danh sách các đơn đang kẹt chưa gửi lên máy chủ (để xem/đối chiếu tại quán). */
  offlineQueueItems: any[];
  /** Chủ động gửi lại ngay các đơn đang kẹt (nút "Gửi lại ngay"). */
  retryOfflineQueue: () => void;
  addOrder: (order: Omit<Order, 'id' | 'time' | 'orderNumber'>, options?: { skipStockCheck?: boolean }) => boolean;
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
    shipFee: Number(raw.shipFee) || 0,
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
    const loadOrders = () => {
      if (!api.isAuthed()) return; // chế độ khách (chưa đăng nhập) không tải danh sách đơn toàn hệ thống
      // Chỉ tải đơn đang hoạt động + đơn hoàn tất trong 30 ngày gần nhất cho nhẹ & nhanh khi mở
      // app. Lịch sử cũ hơn tra qua trang riêng (báo cáo, chi tiết ca theo shiftId) khi cần.
      api.fetchOrders({ recentDays: 30 })
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
    };
    loadOrders();

    // Kết nối SSE bị đứt rồi tự nối lại (proxy timeout, mất mạng...) — tải lại đơn hàng để
    // không bỏ lỡ đơn nào phát sinh trong lúc gián đoạn (broadcast không có cơ chế phát lại).
    const unsubReconnect = subscribe('SSE_RECONNECTED', loadOrders);

    // 2. Load offline queue from localStorage
    const savedQueue = localStorage.getItem('offline_orders_queue');
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    // 3. Subscribe to real-time events via global SSEContext
    const unsubCreate = subscribe('ORDER_CREATED', (data) => {
      const newOrder = normalizeOrder(data);
      // Đơn tạo ra đã ở trạng thái hoàn tất (VD đơn combo gói trả trước tự hoàn thành) → vào thẳng
      // Lịch sử, KHÔNG nằm ở hàng chờ pha chế. Áp cho mọi máy nhận sự kiện.
      if (newOrder.status === 'completed') {
        setHistory(h => h.some(o => o.id === newOrder.id)
          ? h.map(o => o.id === newOrder.id ? newOrder : o)
          : [newOrder, ...h]);
        setOrders(prev => {
          const updated = prev.filter(o => o.id !== newOrder.id);
          localStorage.setItem('cached_active_orders', JSON.stringify(updated));
          return updated;
        });
        return;
      }
      setOrders(prev => {
        // Đơn do chính tab này tạo đã có sẵn 1 bản optimistic (cùng id, tự sinh ở addOrder())
        // nhưng KHÔNG có shiftId/orderNumber vì đó là các trường server tự gán khi lưu. Phải
        // GHI ĐÈ bằng bản chính thức từ server ở đây — nếu chỉ bỏ qua như trước, bản optimistic
        // (shiftId rỗng) tồn tại mãi trên chính máy POS đã bán đơn đó, khiến kết ca ở đúng máy
        // đó bị thiếu doanh thu của các đơn nó tự tạo ra.
        const exists = prev.some(o => o.id === newOrder.id);
        const updated = exists
          ? prev.map(o => (o.id === newOrder.id ? newOrder : o))
          : [newOrder, ...prev];
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
      unsubReconnect();
    };
  }, [subscribe]);

  // Giữ bản mới nhất của hàng đợi trong ref để flushQueue (dùng trong event listener/interval)
  // luôn đọc đúng dữ liệu hiện tại mà không phải đăng ký lại listener mỗi lần queue đổi.
  const queueRef = useRef<any[]>(offlineQueue);
  useEffect(() => { queueRef.current = offlineQueue; }, [offlineQueue]);
  const flushingRef = useRef(false);

  const orderIdOf = (item: any) => (item?.action === 'CREATE' ? (item?.data?.id || item?.orderId) : item?.orderId);

  // Gửi lại toàn bộ hàng đợi offline. Gọi khi: định kỳ, có mạng lại (online), quay lại màn hình,
  // hoặc bấm nút "Gửi lại ngay". Idempotent ở server nên gọi lại nhiều lần vô hại.
  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
    const queueCopy = [...queueRef.current];
    if (queueCopy.length === 0) return;
    flushingRef.current = true;
    let successCount = 0;
    const failed: any[] = [];

    // Thử TẤT CẢ đơn (KHÔNG break) — 1 đơn lỗi không chặn cả loạt.
    for (const item of queueCopy) {
      try {
        if (item.action === 'CREATE') {
          await api.createOrder(withSalesRef(item.data));
        } else if (item.action === 'UPDATE_STATUS') {
          await api.updateOrderStatus(item.orderId, item.status, item.extra);
        }
        successCount++;
      } catch (err: any) {
        // 404 cho lệnh đổi trạng thái = đơn không tồn tại ở server (đã bị dọn/không có).
        // Chỉ BỎ khi không còn lệnh CREATE cho cùng đơn đang chờ — tránh kẹt vĩnh viễn.
        // Nếu CREATE cùng đơn vẫn đang chờ thì GIỮ lại (chờ tạo xong rồi đổi trạng thái).
        if (item.action === 'UPDATE_STATUS' && err?.status === 404) {
          const hasPendingCreate = queueCopy.some((q) => q.action === 'CREATE' && orderIdOf(q) === item.orderId);
          if (!hasPendingCreate) {
            console.warn(`Bỏ lệnh đổi trạng thái mồ côi (404) cho ${item.orderId}.`);
            continue; // không đưa vào failed → loại khỏi hàng đợi
          }
        }
        console.warn(`Đồng bộ thất bại cho đơn ${item.orderId || 'NEW'} — giữ lại thử sau.`);
        failed.push(item);
      }
    }

    flushingRef.current = false;

    if (successCount > 0 || failed.length !== queueCopy.length) {
      // Giữ đơn lỗi + đơn mới phát sinh trong lúc đang gửi (không nằm trong queueCopy).
      setOfflineQueue((prev) => {
        const newSince = prev.filter((p) => !queueCopy.includes(p));
        const merged = [...failed, ...newSince];
        localStorage.setItem('offline_orders_queue', JSON.stringify(merged));
        return merged;
      });
      console.log(`✅ Đồng bộ ${successCount} đơn (còn lại ${failed.length} lỗi).`);
    }
  }, []);

  // Kích hoạt gửi lại: định kỳ 10s + ngay khi có mạng lại + khi quay lại màn hình (mạng yếu POS).
  useEffect(() => {
    const interval = setInterval(() => { flushQueue(); }, 10000);
    const onWake = () => { flushQueue(); };
    window.addEventListener('online', onWake);
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onWake);
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [flushQueue]);

  const addOrder = (orderData: Omit<Order, 'id' | 'time' | 'orderNumber'>, options?: { skipStockCheck?: boolean }): boolean => {
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
    const hasComboLine = stockLines.some((l) => l.isCustomCombo);
    // Đơn CHỈ gồm combo (gói trả trước, không có ly lẻ cần pha) → HOÀN TẤT NGAY, vào thẳng Lịch sử.
    // Nếu để 'preparing' trong hàng chờ, nhân viên không có gì để "pha" nên không bấm hoàn thành,
    // đơn combo sẽ kẹt mãi ở hàng chờ và KHÔNG bao giờ hiện trong Lịch sử (đúng lỗi đang gặp).
    const isPureComboOrder = hasComboLine && retailLines.length === 0;

    const newOrder: Partial<Order> = {
      ...orderData,
      id: tempId,
      time: now,
      paidAt: orderData.paidAt || now,
      status: isPureComboOrder ? 'completed' : (orderData.status || 'pending'),
      stockDeducted: false,
    };
    if (isPureComboOrder) newOrder.completedAt = now;

    if (options?.skipStockCheck) {
      // Chi nhánh nhận đơn sẽ tự trừ kho khi họ hoàn tất đơn (xem updateOrderStatus).
      newOrder.stockDeducted = retailLines.length === 0;
    } else if (newOrder.paidAt && retailLines.length > 0) {
      const success = deductStockForOrder(tempId, retailLines, newOrder.staff || 'System');
      if (!success) return false;
      newOrder.stockDeducted = true;
    } else if (retailLines.length === 0) {
      newOrder.stockDeducted = true;
    }

    if (isPureComboOrder) {
      // Vào thẳng Lịch sử, không nằm ở hàng chờ pha chế.
      setHistory((h) => [newOrder as Order, ...h]);
    } else {
      setOrders((prev) => [newOrder as Order, ...prev]);
    }

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

    // Cập nhật cục bộ NGAY — không chờ SSE server bắn ngược (máy POS mạng yếu SSE hay rớt → đơn
    // hoàn tất không vào Lịch sử tới khi tải lại trang). Đơn 'completed' phải RỜI hàng đợi và VÀO
    // history ngay tại máy vừa thao tác, y như handler ORDER_UPDATED xử lý cho các máy khác.
    if (status === 'completed') {
      const completedOrder = activeOrder ? { ...activeOrder, ...updates } as Order : null;
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (completedOrder) {
        setHistory(h => h.some(o => o.id === orderId)
          ? h.map(o => o.id === orderId ? completedOrder : o)
          : [completedOrder, ...h]);
      }
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    }

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
    <OrderContext.Provider value={{ orders, history, offlineQueueLength: offlineQueue.length, offlineQueueItems: offlineQueue, retryOfflineQueue: flushQueue, addOrder, updateOrderStatus, updateOrder }}>
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
