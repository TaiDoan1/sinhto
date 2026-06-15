import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../utils/api';

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
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<boolean>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recipes] = useState<Recipe[]>(initialRecipes);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Load inventory from database on mount
  useEffect(() => {
    const loadData = () => {
      api.fetchInventory()
        .then(data => setInventory(data))
        .catch(err => console.error("Error fetching inventory", err));

      api.fetchMovements()
        .then((data: any[]) => setMovements(data.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))))
        .catch(err => console.error("Error fetching movements", err));
    };

    loadData();

    // Listen to real-time inventory updates via SSE
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'INVENTORY_UPDATED') {
          setInventory(data);
          // Refetch movements to get logs synced
          api.fetchMovements()
            .then((movs: any[]) => setMovements(movs.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))))
            .catch(err => console.error("Error syncing movements", err));
        }
      } catch (err) {
        console.error("SSE parse error in inventory", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getLowStockItems = () => {
    return inventory.filter(item => item.currentStock <= item.minStock && item.currentStock > 0);
  };

  const getOutOfStockItems = () => {
    return inventory.filter(item => item.currentStock <= 0);
  };

  const extractProductIds = (productIds: any[]): string[] => {
    if (!Array.isArray(productIds)) return [];
    return productIds.map(item => {
      const nameStr = typeof item === 'string' ? item : (item?.name || item?.productName || '');
      if (!nameStr) return '';
      const productName = nameStr.split('(')[0].trim();
      const recipe = recipes.find(r => r.productName === productName);
      return recipe?.productId || '';
    }).filter(id => id !== '');
  };

  const deductStock = (orderId: string, orderItems: string[], staff: string): boolean => {
    const productIds = extractProductIds(orderItems);
    const newMovements: StockMovement[] = [];
    const newInventory = [...inventory];

    // Check availability
    for (const productId of productIds) {
      const recipe = recipes.find(r => r.productId === productId);
      if (!recipe) continue;

      for (const ingredient of recipe.ingredients) {
        const invItem = newInventory.find(i => i.id === ingredient.itemId);
        if (!invItem) continue;

        if (invItem.currentStock < ingredient.quantity) {
          return false;
        }
      }
    }

    // Perform deduction
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

    // Push changes to server
    api.updateInventory(
      newInventory.map(item => ({ id: item.id, currentStock: item.currentStock })),
      newMovements
    ).catch(err => console.error("Failed to sync inventory deduction to server:", err));

    return true;
  };

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

    api.updateInventory(
      newInventory.map(item => ({ id: item.id, currentStock: item.currentStock })),
      newMovements
    ).catch(err => console.error("Failed to sync inventory return to server:", err));
  };

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

    api.updateInventory(
      inventory.map(item => ({ id: item.id, currentStock: item.currentStock })),
      newMovements
    ).catch(err => console.error("Failed to sync inventory waste to server:", err));
  };

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
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const difference = newStock - item.currentStock;
    const movement = {
      id: `MOV-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type: 'adjustment',
      itemId: item.id,
      itemName: item.name,
      quantity: difference,
      reason: `Stock Check: ${reason}`,
      performedBy: staff,
      cost: difference * item.cost
    };

    const newInventory = inventory.map(it => it.id === itemId ? { ...it, currentStock: newStock } : it);

    api.updateInventory(
      newInventory.map(it => ({ id: it.id, currentStock: it.currentStock })),
      [movement]
    ).catch(err => console.error("Failed to sync inventory stock update to server:", err));
  };

  const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
    try {
      const created = await api.createInventoryItem(itemData);
      setInventory(prev => [...prev, created]);
      return true;
    } catch (err) {
      console.error("Failed to add inventory item:", err);
      return false;
    }
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
      updateInventoryStock,
      addInventoryItem
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
