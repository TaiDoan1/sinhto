import { createContext, useContext, useState, ReactNode } from 'react';

export interface InventoryItem {
  id: string;
  name: string;
  unit: 'kg' | 'lít' | 'gói' | 'cái';
  currentStock: number;
  minStock: number; // Cảnh báo khi dưới ngưỡng này
  cost: number; // Giá vốn (VNĐ)
  category: 'fruit' | 'dairy' | 'protein' | 'topping' | 'other';
}

export interface Recipe {
  productId: string;
  productName: string;
  ingredients: {
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
  }[];
}

export interface StockMovement {
  id: string;
  timestamp: Date;
  type: 'sale' | 'void_return' | 'waste' | 'refund' | 'purchase' | 'adjustment';
  orderId?: string;
  itemId: string;
  itemName: string;
  quantity: number; // Âm = trừ, Dương = cộng
  reason: string;
  performedBy: string;
  cost: number; // Giá trị tiền
}

interface InventoryContextType {
  inventory: InventoryItem[];
  recipes: Recipe[];
  movements: StockMovement[];
  getLowStockItems: () => InventoryItem[];
  getOutOfStockItems: () => InventoryItem[];
  deductStock: (orderId: string, productIds: string[], staff: string) => boolean;
  returnStock: (orderId: string, productIds: string[], reason: string, staff: string) => void;
  recordWaste: (orderId: string, productIds: string[], reason: string, staff: string) => void;
  getTodayStats: () => {
    totalUsed: number;
    totalWaste: number;
    totalRefund: number;
    wastePercentage: number;
  };
  updateInventoryStock: (itemId: string, newStock: number, staff: string, reason: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Mock data - Nguyên liệu mẫu
const initialInventory: InventoryItem[] = [
  { id: 'INV-001', name: 'Dâu tây', unit: 'kg', currentStock: 15, minStock: 3, cost: 80000, category: 'fruit' },
  { id: 'INV-002', name: 'Xoài', unit: 'kg', currentStock: 12, minStock: 3, cost: 60000, category: 'fruit' },
  { id: 'INV-003', name: 'Chuối', unit: 'kg', currentStock: 20, minStock: 5, cost: 25000, category: 'fruit' },
  { id: 'INV-004', name: 'Bơ', unit: 'kg', currentStock: 8, minStock: 2, cost: 120000, category: 'fruit' },
  { id: 'INV-005', name: 'Dứa', unit: 'kg', currentStock: 10, minStock: 3, cost: 35000, category: 'fruit' },
  { id: 'INV-006', name: 'Việt quất', unit: 'kg', currentStock: 5, minStock: 2, cost: 150000, category: 'fruit' },
  { id: 'INV-007', name: 'Rau bina', unit: 'kg', currentStock: 6, minStock: 2, cost: 40000, category: 'fruit' },
  { id: 'INV-008', name: 'Sữa tươi', unit: 'lít', currentStock: 25, minStock: 5, cost: 28000, category: 'dairy' },
  { id: 'INV-009', name: 'Sữa chua', unit: 'kg', currentStock: 10, minStock: 3, cost: 45000, category: 'dairy' },
  { id: 'INV-010', name: 'Whey Protein', unit: 'gói', currentStock: 50, minStock: 10, cost: 15000, category: 'protein' },
  { id: 'INV-011', name: 'Hạt chia', unit: 'kg', currentStock: 3, minStock: 1, cost: 180000, category: 'topping' },
  { id: 'INV-012', name: 'Granola', unit: 'kg', currentStock: 4, minStock: 1, cost: 120000, category: 'topping' },
  { id: 'INV-013', name: 'Dừa nạo', unit: 'kg', currentStock: 5, minStock: 1, cost: 60000, category: 'topping' },
  { id: 'INV-014', name: 'Mật ong', unit: 'lít', currentStock: 3, minStock: 1, cost: 200000, category: 'topping' },
];

// Mock data - Công thức món
const initialRecipes: Recipe[] = [
  {
    productId: 'SM-001',
    productName: 'Strawberry Blast',
    ingredients: [
      { itemId: 'INV-001', itemName: 'Dâu tây', quantity: 0.15, unit: 'kg' },
      { itemId: 'INV-008', itemName: 'Sữa tươi', quantity: 0.2, unit: 'lít' },
      { itemId: 'INV-010', itemName: 'Whey Protein', quantity: 1, unit: 'gói' },
    ]
  },
  {
    productId: 'SM-002',
    productName: 'Mango Tango',
    ingredients: [
      { itemId: 'INV-002', itemName: 'Xoài', quantity: 0.2, unit: 'kg' },
      { itemId: 'INV-008', itemName: 'Sữa tươi', quantity: 0.15, unit: 'lít' },
      { itemId: 'INV-009', itemName: 'Sữa chua', quantity: 0.1, unit: 'kg' },
    ]
  },
  {
    productId: 'SM-003',
    productName: 'Green Power',
    ingredients: [
      { itemId: 'INV-007', itemName: 'Rau bina', quantity: 0.1, unit: 'kg' },
      { itemId: 'INV-003', itemName: 'Chuối', quantity: 0.15, unit: 'kg' },
      { itemId: 'INV-008', itemName: 'Sữa tươi', quantity: 0.2, unit: 'lít' },
    ]
  },
  {
    productId: 'SM-004',
    productName: 'Berry Mix',
    ingredients: [
      { itemId: 'INV-006', itemName: 'Việt quất', quantity: 0.12, unit: 'kg' },
      { itemId: 'INV-001', itemName: 'Dâu tây', quantity: 0.08, unit: 'kg' },
      { itemId: 'INV-009', itemName: 'Sữa chua', quantity: 0.15, unit: 'kg' },
    ]
  },
  {
    productId: 'SM-005',
    productName: 'Tropical Paradise',
    ingredients: [
      { itemId: 'INV-005', itemName: 'Dứa', quantity: 0.15, unit: 'kg' },
      { itemId: 'INV-002', itemName: 'Xoài', quantity: 0.1, unit: 'kg' },
      { itemId: 'INV-008', itemName: 'Sữa tươi', quantity: 0.2, unit: 'lít' },
    ]
  },
  {
    productId: 'SM-006',
    productName: 'Avocado Dream',
    ingredients: [
      { itemId: 'INV-004', itemName: 'Bơ', quantity: 0.2, unit: 'kg' },
      { itemId: 'INV-008', itemName: 'Sữa tươi', quantity: 0.25, unit: 'lít' },
      { itemId: 'INV-014', itemName: 'Mật ong', quantity: 0.02, unit: 'lít' },
    ]
  },
  {
    productId: 'SM-007',
    productName: 'Protein Shake',
    ingredients: [
      { itemId: 'INV-003', itemName: 'Chuối', quantity: 0.2, unit: 'kg' },
      { itemId: 'INV-008', itemName: 'Sữa tươi', quantity: 0.3, unit: 'lít' },
      { itemId: 'INV-010', itemName: 'Whey Protein', quantity: 2, unit: 'gói' },
    ]
  },
  {
    productId: 'SM-008',
    productName: 'Banana Blast',
    ingredients: [
      { itemId: 'INV-003', itemName: 'Chuối', quantity: 0.25, unit: 'kg' },
      { itemId: 'INV-008', itemName: 'Sữa tươi', quantity: 0.2, unit: 'lít' },
      { itemId: 'INV-009', itemName: 'Sữa chua', quantity: 0.1, unit: 'kg' },
    ]
  },
];

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [recipes] = useState<Recipe[]>(initialRecipes);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const getLowStockItems = () => {
    return inventory.filter(item => item.currentStock <= item.minStock && item.currentStock > 0);
  };

  const getOutOfStockItems = () => {
    return inventory.filter(item => item.currentStock <= 0);
  };

  // Trích xuất productId từ order items
  const extractProductIds = (productIds: string[]): string[] => {
    // productIds có thể là array các item string như:
    // "Strawberry Blast (M, 20g) x1"
    // Cần extract ra product name để match với recipe
    return productIds.map(item => {
      const productName = item.split('(')[0].trim();
      const recipe = recipes.find(r => r.productName === productName);
      return recipe?.productId || '';
    }).filter(id => id !== '');
  };

  // Trừ tồn kho khi bắt đầu làm món
  const deductStock = (orderId: string, orderItems: string[], staff: string): boolean => {
    const productIds = extractProductIds(orderItems);
    const newMovements: StockMovement[] = [];
    const newInventory = [...inventory];

    // Check xem có đủ nguyên liệu không
    for (const productId of productIds) {
      const recipe = recipes.find(r => r.productId === productId);
      if (!recipe) continue;

      for (const ingredient of recipe.ingredients) {
        const invItem = newInventory.find(i => i.id === ingredient.itemId);
        if (!invItem) continue;

        if (invItem.currentStock < ingredient.quantity) {
          // Không đủ nguyên liệu
          return false;
        }
      }
    }

    // Đủ nguyên liệu -> Trừ kho
    for (const productId of productIds) {
      const recipe = recipes.find(r => r.productId === productId);
      if (!recipe) continue;

      for (const ingredient of recipe.ingredients) {
        const invItem = newInventory.find(i => i.id === ingredient.itemId);
        if (!invItem) continue;

        invItem.currentStock -= ingredient.quantity;

        newMovements.push({
          id: `MOV-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          type: 'sale',
          orderId,
          itemId: ingredient.itemId,
          itemName: ingredient.itemName,
          quantity: -ingredient.quantity,
          reason: `Sold - Order ${orderId}`,
          performedBy: staff,
          cost: ingredient.quantity * invItem.cost
        });
      }
    }

    setInventory(newInventory);
    setMovements(prev => [...newMovements, ...prev]);
    return true;
  };

  // Hoàn kho khi hủy đơn chưa làm
  const returnStock = (orderId: string, orderItems: string[], reason: string, staff: string) => {
    const productIds = extractProductIds(orderItems);
    const newMovements: StockMovement[] = [];
    const newInventory = [...inventory];

    for (const productId of productIds) {
      const recipe = recipes.find(r => r.productId === productId);
      if (!recipe) continue;

      for (const ingredient of recipe.ingredients) {
        const invItem = newInventory.find(i => i.id === ingredient.itemId);
        if (!invItem) continue;

        invItem.currentStock += ingredient.quantity;

        newMovements.push({
          id: `MOV-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          type: 'void_return',
          orderId,
          itemId: ingredient.itemId,
          itemName: ingredient.itemName,
          quantity: ingredient.quantity,
          reason: `Void return - ${reason}`,
          performedBy: staff,
          cost: -(ingredient.quantity * invItem.cost)
        });
      }
    }

    setInventory(newInventory);
    setMovements(prev => [...newMovements, ...prev]);
  };

  // Ghi nhận waste khi hủy đơn đã làm
  const recordWaste = (orderId: string, orderItems: string[], reason: string, staff: string) => {
    const productIds = extractProductIds(orderItems);
    const newMovements: StockMovement[] = [];

    for (const productId of productIds) {
      const recipe = recipes.find(r => r.productId === productId);
      if (!recipe) continue;

      for (const ingredient of recipe.ingredients) {
        const invItem = inventory.find(i => i.id === ingredient.itemId);
        if (!invItem) continue;

        newMovements.push({
          id: `MOV-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          type: 'waste',
          orderId,
          itemId: ingredient.itemId,
          itemName: ingredient.itemName,
          quantity: -ingredient.quantity,
          reason: `Waste - ${reason}`,
          performedBy: staff,
          cost: ingredient.quantity * invItem.cost
        });
      }
    }

    setMovements(prev => [...newMovements, ...prev]);
  };

  // Thống kê hôm nay
  const getTodayStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMovements = movements.filter(m => {
      const mDate = new Date(m.timestamp);
      mDate.setHours(0, 0, 0, 0);
      return mDate.getTime() === today.getTime();
    });

    const totalUsed = todayMovements
      .filter(m => m.type === 'sale')
      .reduce((sum, m) => sum + m.cost, 0);

    const totalWaste = todayMovements
      .filter(m => m.type === 'waste')
      .reduce((sum, m) => sum + m.cost, 0);

    const totalRefund = todayMovements
      .filter(m => m.type === 'refund')
      .reduce((sum, m) => sum + m.cost, 0);

    const wastePercentage = totalUsed > 0 ? (totalWaste / totalUsed) * 100 : 0;

    return {
      totalUsed,
      totalWaste,
      totalRefund,
      wastePercentage
    };
  };

  const updateInventoryStock = (itemId: string, newStock: number, staff: string, reason: string) => {
    setInventory(prev => prev.map(item => {
      if (item.id === itemId) {
        const difference = newStock - item.currentStock;
        
        // Record movement
        setMovements(moves => [{
          id: `MOV-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          type: 'adjustment',
          itemId: item.id,
          itemName: item.name,
          quantity: difference,
          reason: `Stock Check: ${reason}`,
          performedBy: staff,
          cost: difference * item.cost
        }, ...moves]);

        return { ...item, currentStock: newStock };
      }
      return item;
    }));
  };

  return (
    <InventoryContext.Provider value={{
      inventory,
      recipes,
      movements,
      getLowStockItems,
      getOutOfStockItems,
      deductStock,
      returnStock,
      recordWaste,
      getTodayStats,
      updateInventoryStock
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
}
