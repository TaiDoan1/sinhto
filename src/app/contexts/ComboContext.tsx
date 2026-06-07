import { createContext, useContext, useState, ReactNode } from 'react';
import { ComboItem } from '../components/customer/CustomComboBuilder';

export interface ComboSubscription {
  id: string;
  customerName: string;
  customerPhone: string;
  comboType: 'weekly' | 'monthly';
  startDate: Date;
  nextDelivery: Date;
  deliveryDays: number[]; // 0-6 (Sunday-Saturday)
  items: ComboItem[];
  totalPrice: number;
  status: 'active' | 'paused' | 'completed';
  staff: string;
  branchId: string;
  updatedAt?: Date;
}

export interface ComboNotification {
  id: string;
  comboId: string;
  customerName: string;
  type: 'update' | 'pause' | 'resume';
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface ComboContextType {
  combos: ComboSubscription[];
  notifications: ComboNotification[];
  addCombo: (combo: Omit<ComboSubscription, 'id'>) => void;
  updateCombo: (comboId: string, updates: Partial<ComboSubscription>) => void;
  updateComboStatus: (comboId: string, status: ComboSubscription['status']) => void;
  getTodayDeliveries: () => ComboSubscription[];
  markNotificationAsRead: (notificationId: string) => void;
  addNotification: (notification: Omit<ComboNotification, 'id' | 'timestamp' | 'isRead'>) => void;
}

const ComboContext = createContext<ComboContextType | undefined>(undefined);

// Dữ liệu mẫu
const getNextDeliveryDate = (daysFromNow: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const mockCombos: ComboSubscription[] = [
  {
    id: 'COMBO-001',
    customerName: 'Nguyễn Thị Mai',
    customerPhone: '0912345678',
    comboType: 'weekly',
    startDate: new Date('2025-04-01'),
    nextDelivery: getNextDeliveryDate(0), // Hôm nay
    deliveryDays: [1, 3, 5], // T2, T4, T6
    items: [
      { id: '1', product: { id: 'SM-007', name: 'Strawberry Blast', basePrice: 45000, image: '🍓', category: 'smoothies' }, quantity: 1, size: '500ml', protein: 20, toppings: [], price: 45000, assignedDay: 'all' },
      { id: '2', product: { id: 'SM-008', name: 'Green Power', basePrice: 50000, image: '🥬', category: 'smoothies' }, quantity: 1, size: '500ml', protein: 20, toppings: [], price: 50000, assignedDay: 'all' },
      { id: '3', product: { id: 'SM-003', name: 'Mango Tango', basePrice: 48000, image: '🥭', category: 'smoothies' }, quantity: 1, size: '500ml', protein: 20, toppings: [], price: 48000, assignedDay: 'all' }
    ],
    totalPrice: 280000,
    status: 'active',
    staff: 'Nguyễn Văn An',
    branchId: 'CN1'
  },
  {
    id: 'COMBO-002',
    customerName: 'Trần Văn Hùng',
    customerPhone: '0923456789',
    comboType: 'monthly',
    startDate: new Date('2025-04-01'),
    nextDelivery: getNextDeliveryDate(2), // 2 ngày nữa
    deliveryDays: [1, 2, 3, 4, 5], // T2-T6
    items: [
      { id: '4', product: { id: 'SM-001', name: 'Protein Shake', basePrice: 55000, image: '🥤', category: 'smoothies' }, quantity: 1, size: '500ml', protein: 40, toppings: [], price: 55000, assignedDay: 'all' }
    ],
    totalPrice: 950000,
    status: 'active',
    staff: 'Trần Thị Bình',
    branchId: 'CN1'
  },
];

export function ComboProvider({ children }: { children: ReactNode }) {
  const [combos, setCombos] = useState<ComboSubscription[]>(mockCombos);
  const [notifications, setNotifications] = useState<ComboNotification[]>([]);

  const addCombo = (comboData: Omit<ComboSubscription, 'id'>) => {
    const newCombo: ComboSubscription = {
      ...comboData,
      id: `COMBO-${String(combos.length + 1).padStart(3, '0')}`,
      updatedAt: new Date(),
    };
    setCombos([...combos, newCombo]);
  };

  const updateCombo = (comboId: string, updates: Partial<ComboSubscription>) => {
    setCombos(prev => prev.map(combo => 
      combo.id === comboId ? { ...combo, ...updates, updatedAt: new Date() } : combo
    ));
  };

  const updateComboStatus = (comboId: string, status: ComboSubscription['status']) => {
    setCombos(combos.map(combo =>
      combo.id === comboId ? { ...combo, status, updatedAt: new Date() } : combo
    ));
  };

  const addNotification = (notif: Omit<ComboNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotif: ComboNotification = {
      ...notif,
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date(),
      isRead: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
  };

  const getTodayDeliveries = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return combos.filter(combo => {
      if (combo.status !== 'active') return false;
      const nextDelivery = new Date(combo.nextDelivery);
      nextDelivery.setHours(0, 0, 0, 0);
      return nextDelivery.getTime() === today.getTime();
    });
  };

  return (
    <ComboContext.Provider value={{ 
      combos, 
      notifications, 
      addCombo, 
      updateCombo, 
      updateComboStatus, 
      getTodayDeliveries,
      markNotificationAsRead,
      addNotification
    }}>
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
