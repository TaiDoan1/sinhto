import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import * as api from '../utils/api';
import {
  FITBLEND_RECIPES,
  checkStockAvailability,
  aggregateIngredients,
  type CartStockLine,
  type StockShortage,
} from '../utils/inventoryRecipes';

export interface InventoryItem {
  id: string;
  name: string;
  unit: 'kg' | 'lít' | 'gói' | 'cái';
  currentStock: number;
  minStock: number;
  cost: number;
  category: 'fruit' | 'dairy' | 'protein' | 'topping' | 'other';
}

export interface StockMovement {
  id: string;
  timestamp: Date;
  type: 'sale' | 'void_return' | 'waste' | 'refund' | 'purchase' | 'adjustment';
  orderId?: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason: string;
  performedBy: string;
  cost: number;
  branchId?: string;
}

interface InventoryContextType {
  inventory: InventoryItem[];
  recipes: typeof FITBLEND_RECIPES;
  movements: StockMovement[];
  activeBranchId: string | null;
  isWarehouseReady: boolean;
  loadForBranch: (branchId: string) => void;
  getLowStockItems: () => InventoryItem[];
  getOutOfStockItems: () => InventoryItem[];
  checkCartStock: (lines: CartStockLine[]) => { ok: boolean; shortages: StockShortage[] };
  purchaseStock: (itemId: string, quantity: number, staff: string, note: string, supplier?: string) => Promise<boolean>;
  deductStockForOrder: (orderId: string, lines: CartStockLine[], staff: string) => boolean;
  deductStock: (orderId: string, orderItems: string[], staff: string) => boolean;
  returnStock: (orderId: string, orderItems: CartStockLine[] | string[], reason: string, staff: string) => void;
  recordWaste: (orderId: string, orderItems: CartStockLine[] | string[], reason: string, staff: string) => void;
  getTodayStats: () => {
    totalUsed: number;
    totalWaste: number;
    totalRefund: number;
    totalPurchased: number;
    wastePercentage: number;
  };
  updateInventoryStock: (itemId: string, newStock: number, staff: string, reason: string) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<boolean>;
  formatShortageMessage: (shortages: StockShortage[]) => string;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

function toCartLines(items: CartStockLine[] | string[]): CartStockLine[] {
  if (!items?.length) return [];
  if (typeof items[0] === 'string') {
    return (items as string[]).map((name) => ({ productName: name, quantity: 1 }));
  }
  return items as CartStockLine[];
}

function applyInventoryPatch(
  inventory: InventoryItem[],
  ingredients: { itemId: string; quantity: number }[],
  sign: 1 | -1
): InventoryItem[] {
  const next = inventory.map((i) => ({ ...i }));
  for (const ing of ingredients) {
    const row = next.find((i) => i.id === ing.itemId);
    if (row) row.currentStock = Math.max(0, row.currentStock + sign * ing.quantity);
  }
  return next;
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const branchRef = useRef<string | null>(null);

  const isWarehouseReady = movements.some((m) => m.type === 'purchase');

  const loadMovements = useCallback((branchId: string) => {
    api
      .fetchMovements(branchId)
      .then((data: any[]) =>
        setMovements(data.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })))
      )
      .catch((err) => console.error('Error fetching movements', err));
  }, []);

  const loadForBranch = useCallback(
    (branchId: string) => {
      if (!branchId) return;
      branchRef.current = branchId;
      setActiveBranchId(branchId);
      api
        .fetchInventory(branchId)
        .then((data) => setInventory(data))
        .catch((err) => console.error('Error fetching inventory', err));
      loadMovements(branchId);
    },
    [loadMovements]
  );

  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'INVENTORY_UPDATED') {
          const payload = data?.branchId ? data : { branchId: null, inventory: data };
          if (payload.branchId && payload.branchId === branchRef.current) {
            setInventory(payload.inventory || []);
            loadMovements(payload.branchId);
          }
        }
      } catch {
        /* ignore */
      }
    };
    return () => eventSource.close();
  }, [loadMovements]);

  const syncInventory = (
    newInventory: InventoryItem[],
    newMovements: StockMovement[]
  ) => {
    const branchId = branchRef.current;
    if (!branchId) {
      console.error('Chưa chọn chi nhánh — không thể cập nhật kho');
      return;
    }
    setInventory(newInventory);
    setMovements((prev) => [...newMovements, ...prev]);
    api
      .updateInventory(
        newInventory.map((item) => ({ id: item.id, currentStock: item.currentStock })),
        newMovements,
        branchId
      )
      .catch((err) => console.error('Failed to sync inventory:', err));
  };

  const getLowStockItems = () =>
    inventory.filter((item) => item.currentStock <= item.minStock && item.currentStock > 0);

  const getOutOfStockItems = () => inventory.filter((item) => item.currentStock <= 0);

  const checkCartStock = (lines: CartStockLine[]) => {
    if (!branchRef.current) {
      return {
        ok: false,
        shortages: [
          { itemId: '_warehouse', itemName: 'Kho hang', need: 1, have: 0, unit: 'lan' },
        ],
      };
    }
    if (!isWarehouseReady) {
      return {
        ok: false,
        shortages: [
          {
            itemId: '_warehouse',
            itemName: 'Kho hang',
            need: 1,
            have: 0,
            unit: 'lan',
          },
        ],
      };
    }
    return checkStockAvailability(lines, inventory);
  };

  const formatShortageMessage = (shortages: StockShortage[]) => {
    if (shortages.some((s) => s.itemId === '_warehouse')) {
      return 'Chưa có phiếu nhập kho tại chi nhánh này. Admin cần nhập kho trong Chi nhánh → Tồn Kho trước khi bán.';
    }
    return shortages
      .map(
        (s) =>
          `${s.itemName}: cần ${s.need.toFixed(2)} ${s.unit}, còn ${s.have.toFixed(2)} ${s.unit}`
      )
      .join('\n');
  };

  const purchaseStock = async (
    itemId: string,
    quantity: number,
    staff: string,
    note: string,
    supplier?: string
  ) => {
    if (quantity <= 0) return false;
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return false;

    const newStock = item.currentStock + quantity;
    const movement: StockMovement = {
      id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
      type: 'purchase',
      itemId: item.id,
      itemName: item.name,
      quantity,
      reason: supplier ? `${note} (NCC: ${supplier})` : note || 'Nhap kho',
      performedBy: staff,
      cost: quantity * item.cost,
      branchId: branchRef.current || undefined,
    };

    const newInventory = inventory.map((it) =>
      it.id === itemId ? { ...it, currentStock: newStock } : it
    );
    syncInventory(newInventory, [movement]);
    return true;
  };

  const deductStockForOrder = (orderId: string, lines: CartStockLine[], staff: string): boolean => {
    const check = checkCartStock(lines);
    if (!check.ok) return false;

    const needed = aggregateIngredients(lines);
    if (needed.length === 0) return true;

    const newInventory = applyInventoryPatch(inventory, needed, -1);
    const newMovements: StockMovement[] = needed.map((ing) => {
      const inv = inventory.find((i) => i.id === ing.itemId);
      return {
        id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date(),
        type: 'sale',
        orderId,
        itemId: ing.itemId,
        itemName: inv?.name || ing.itemName,
        quantity: -ing.quantity,
        reason: `Ban hang - ${orderId}`,
        performedBy: staff,
        cost: ing.quantity * (inv?.cost || 0),
        branchId: branchRef.current || undefined,
      };
    });

    syncInventory(newInventory, newMovements);
    return true;
  };

  const deductStock = (orderId: string, orderItems: string[], staff: string) =>
    deductStockForOrder(orderId, toCartLines(orderItems), staff);

  const returnStock = (orderId: string, orderItems: CartStockLine[] | string[], reason: string, staff: string) => {
    const lines = toCartLines(orderItems);
    const needed = aggregateIngredients(lines);
    if (!needed.length) return;

    const newInventory = applyInventoryPatch(inventory, needed, 1);
    const newMovements: StockMovement[] = needed.map((ing) => {
      const inv = inventory.find((i) => i.id === ing.itemId);
      return {
        id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date(),
        type: 'void_return',
        orderId,
        itemId: ing.itemId,
        itemName: inv?.name || ing.itemName,
        quantity: ing.quantity,
        reason: `Hoan kho - ${reason}`,
        performedBy: staff,
        cost: -(ing.quantity * (inv?.cost || 0)),
        branchId: branchRef.current || undefined,
      };
    });
    syncInventory(newInventory, newMovements);
  };

  const recordWaste = (orderId: string, orderItems: CartStockLine[] | string[], reason: string, staff: string) => {
    const lines = toCartLines(orderItems);
    const needed = aggregateIngredients(lines);
    if (!needed.length) return;

    const newInventory = applyInventoryPatch(inventory, needed, -1);
    const newMovements: StockMovement[] = needed.map((ing) => {
      const inv = inventory.find((i) => i.id === ing.itemId);
      return {
        id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date(),
        type: 'waste',
        orderId,
        itemId: ing.itemId,
        itemName: inv?.name || ing.itemName,
        quantity: -ing.quantity,
        reason: `Lang phi - ${reason}`,
        performedBy: staff,
        cost: ing.quantity * (inv?.cost || 0),
        branchId: branchRef.current || undefined,
      };
    });
    syncInventory(newInventory, newMovements);
  };

  const getTodayStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMovements = movements.filter((m) => {
      const d = new Date(m.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    const totalUsed = todayMovements.filter((m) => m.type === 'sale').reduce((s, m) => s + m.cost, 0);
    const totalWaste = todayMovements.filter((m) => m.type === 'waste').reduce((s, m) => s + m.cost, 0);
    const totalRefund = todayMovements.filter((m) => m.type === 'refund').reduce((s, m) => s + m.cost, 0);
    const totalPurchased = todayMovements.filter((m) => m.type === 'purchase').reduce((s, m) => s + m.cost, 0);
    return {
      totalUsed,
      totalWaste,
      totalRefund,
      totalPurchased,
      wastePercentage: totalUsed > 0 ? (totalWaste / totalUsed) * 100 : 0,
    };
  };

  const updateInventoryStock = (itemId: string, newStock: number, staff: string, reason: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    const difference = newStock - item.currentStock;
    const movement: StockMovement = {
      id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
      type: 'adjustment',
      itemId: item.id,
      itemName: item.name,
      quantity: difference,
      reason: `Kiem kho: ${reason}`,
      performedBy: staff,
      cost: difference * item.cost,
      branchId: branchRef.current || undefined,
    };
    const newInventory = inventory.map((it) =>
      it.id === itemId ? { ...it, currentStock: newStock } : it
    );
    syncInventory(newInventory, [movement]);
  };

  const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
    try {
      const created = await api.createInventoryItem(itemData);
      if (branchRef.current) {
        loadForBranch(branchRef.current);
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        recipes: FITBLEND_RECIPES,
        movements,
        activeBranchId,
        isWarehouseReady,
        loadForBranch,
        getLowStockItems,
        getOutOfStockItems,
        checkCartStock,
        purchaseStock,
        deductStockForOrder,
        deductStock,
        returnStock,
        recordWaste,
        getTodayStats,
        updateInventoryStock,
        addInventoryItem,
        formatShortageMessage,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
