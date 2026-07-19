import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import * as api from '../utils/api';
import { useSSE } from './SSEContext';
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

interface ProductInventoryState {
  smoothies: Record<string, Record<string, number>>;
  toppings: Record<string, number>;
}

interface MenuProductLite {
  id: string;
  name: string;
  category: 'smoothies' | 'toppings' | 'combo';
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
  receiptId?: string;
}

export interface StockReceiptLine {
  itemId: string;
  itemName: string;
  quantity: number;
  cost: number;
}

export interface StockReceipt {
  receiptId: string;
  timestamp: Date;
  branchId: string;
  performedBy: string;
  reason: string;
  lines: StockReceiptLine[];
  totalCost: number;
}

interface InventoryContextType {
  inventory: InventoryItem[];
  recipes: typeof FITBLEND_RECIPES;
  movements: StockMovement[];
  activeBranchId: string | null;
  productInventory: ProductInventoryState;
  isWarehouseReady: boolean;
  loadForBranch: (branchId: string) => void;
  getLowStockItems: () => InventoryItem[];
  getOutOfStockItems: () => InventoryItem[];
  checkCartStock: (lines: CartStockLine[]) => { ok: boolean; shortages: StockShortage[] };
  purchaseStock: (itemId: string, quantity: number, staff: string, note: string, supplier?: string) => Promise<boolean>;
  purchaseStockBatch: (
    lines: { itemId: string; quantity: number }[],
    staff: string,
    note: string,
    supplier?: string
  ) => Promise<StockReceipt | null>;
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
  const { subscribe } = useSSE();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [productInventory, setProductInventory] = useState<ProductInventoryState>({ smoothies: {}, toppings: {} });
  const [menuProducts, setMenuProducts] = useState<MenuProductLite[]>([]);
  const branchRef = useRef<string | null>(null);

  const isWarehouseReady =
    movements.some((m) => m.type === 'purchase') ||
    inventory.some((item) => item.currentStock > 0) ||
    Object.values(productInventory.smoothies || {}).some((variants) =>
      Object.values(variants || {}).some((qty) => qty > 0)
    ) ||
    Object.values(productInventory.toppings || {}).some((qty) => qty > 0);

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
      api
        .fetchProducts()
        .then((data) => setMenuProducts((data || []).map((p: any) => ({ id: p.id, name: p.name, category: p.category }))))
        .catch(() => setMenuProducts([]));
      api
        .fetchSetting(`branchProductInventory_${branchId}`)
        .then((data) =>
          setProductInventory({
            smoothies: data?.smoothies || {},
            toppings: data?.toppings || {},
          })
        )
        .catch(() => setProductInventory({ smoothies: {}, toppings: {} }));
      loadMovements(branchId);
    },
    [loadMovements]
  );

  useEffect(() => {
    return subscribe('INVENTORY_UPDATED', (data) => {
      const payload = data?.branchId ? data : { branchId: null, inventory: data };
      if (payload.branchId && payload.branchId === branchRef.current) {
        setInventory(payload.inventory || []);
        loadMovements(payload.branchId);
      }
    });
  }, [subscribe, loadMovements]);

  // Tồn kho theo ml (smoothies/toppings, cái checkCartStock dùng để chặn bán khi thiếu hàng)
  // được lưu qua saveSetting — trước đây chỉ tải 1 lần lúc loadForBranch nên máy POS đang mở
  // sẵn không thấy ngay khi admin/máy khác vừa nhập kho, dẫn đến báo sai "không đủ tồn kho"
  // dù kho thực tế đã đủ. Nghe SETTING_UPDATED để luôn khớp với dữ liệu mới nhất.
  useEffect(() => {
    return subscribe('SETTING_UPDATED', (payload: { key: string; value: any }) => {
      if (branchRef.current && payload?.key === `branchProductInventory_${branchRef.current}`) {
        setProductInventory({
          smoothies: payload.value?.smoothies || {},
          toppings: payload.value?.toppings || {},
        });
      }
    });
  }, [subscribe]);

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
          { itemId: '_warehouse', itemName: 'Chi nhanh', need: 1, have: 0, unit: 'lan' },
        ],
      };
    }
    return checkProductStock(lines);
  };

  const formatShortageMessage = (shortages: StockShortage[]) => {
    if (shortages.some((s) => s.itemId === '_warehouse')) {
      return 'Chưa chọn chi nhánh. Vui lòng đăng nhập lại máy POS.';
    }
    return shortages
      .map(
        (s) =>
          `${s.itemName}: cần ${s.need.toFixed(2)} ${s.unit}, còn ${s.have.toFixed(2)} ${s.unit}`
      )
      .join('\n');
  };

  const checkProductStock = (lines: CartStockLine[]) => {
    const shortages: StockShortage[] = [];
    const toppingMap = new Map(
      menuProducts.filter((p) => p.category === 'toppings').map((p) => [p.name, p.id])
    );

    for (const rawLine of lines as any[]) {
      const quantity = rawLine.quantity ?? 1;
      if (!rawLine.isCustomCombo && rawLine.productCategory === 'smoothies') {
        const bagSize = rawLine.bagSize || 'S';
        const variantKey = `${rawLine.size}-${bagSize}`;
        const available = productInventory.smoothies?.[rawLine.productId]?.[variantKey] ?? 0;
        if (available < quantity) {
          shortages.push({
            itemId: `${rawLine.productId}-${variantKey}`,
            itemName: `${rawLine.productName} (${rawLine.size} · Túi ${bagSize})`,
            need: quantity,
            have: available,
            unit: 'tui',
          });
        }

        for (const toppingName of rawLine.toppings || []) {
          if (String(toppingName).startsWith('Combo Topping:')) continue;
          const toppingId = toppingMap.get(toppingName);
          if (!toppingId) continue;
          const availableTopping = productInventory.toppings?.[toppingId] ?? 0;
          if (availableTopping < quantity) {
            shortages.push({
              itemId: toppingId,
              itemName: `${toppingName} (topping)`,
              need: quantity,
              have: availableTopping,
              unit: 'phan',
            });
          }
        }
      }

      if (rawLine.productCategory === 'toppings') {
        const available = productInventory.toppings?.[rawLine.productId] ?? 0;
        if (available < quantity) {
          shortages.push({
            itemId: rawLine.productId,
            itemName: rawLine.productName,
            need: quantity,
            have: available,
            unit: 'phan',
          });
        }
      }
    }

    return { ok: shortages.length === 0, shortages };
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

  const purchaseStockBatch = async (
    lines: { itemId: string; quantity: number }[],
    staff: string,
    note: string,
    supplier?: string
  ): Promise<StockReceipt | null> => {
    const validLines = lines.filter((l) => l.itemId && l.quantity > 0);
    if (validLines.length === 0 || !branchRef.current) return null;

    const receiptId = `RCPT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date();
    const reason = supplier ? `${note} (NCC: ${supplier})` : note || 'Nhap kho';

    const receiptLines: StockReceiptLine[] = [];
    const newMovements: StockMovement[] = [];
    let newInventory = inventory;

    for (const line of validLines) {
      const item = newInventory.find((i) => i.id === line.itemId);
      if (!item) continue;
      const newStock = item.currentStock + line.quantity;
      newInventory = newInventory.map((it) => (it.id === line.itemId ? { ...it, currentStock: newStock } : it));
      newMovements.push({
        id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp,
        type: 'purchase',
        itemId: item.id,
        itemName: item.name,
        quantity: line.quantity,
        reason,
        performedBy: staff,
        cost: line.quantity * item.cost,
        branchId: branchRef.current,
        receiptId,
      });
      receiptLines.push({
        itemId: item.id,
        itemName: item.name,
        quantity: line.quantity,
        cost: line.quantity * item.cost,
      });
    }

    if (newMovements.length === 0) return null;

    syncInventory(newInventory, newMovements);

    return {
      receiptId,
      timestamp,
      branchId: branchRef.current,
      performedBy: staff,
      reason,
      lines: receiptLines,
      totalCost: receiptLines.reduce((s, l) => s + l.cost, 0),
    };
  };

  const deductStockForOrder = (orderId: string, lines: CartStockLine[], staff: string): boolean => {
    // Kho theo dung tich (checkProductStock, via checkCartStock) la nguon su that
    // de chan ban hang. Tru kho nguyen lieu ben duoi la ghi nhan song song,
    // khong lam that bai don hang neu nguyen lieu thieu/chua nhap.
    const check = checkCartStock(lines);
    if (!check.ok) return false;

    const needed = aggregateIngredients(lines);
    if (needed.length > 0) {
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
    }

    const nextProductInventory: ProductInventoryState = JSON.parse(JSON.stringify(productInventory));
    const toppingMap = new Map(
      menuProducts.filter((p) => p.category === 'toppings').map((p) => [p.name, p.id])
    );
    for (const rawLine of lines as any[]) {
      const quantity = rawLine.quantity ?? 1;
      if (!rawLine.isCustomCombo && rawLine.productCategory === 'smoothies') {
        const bagSize = rawLine.bagSize || 'S';
        const variantKey = `${rawLine.size}-${bagSize}`;
        nextProductInventory.smoothies[rawLine.productId] = nextProductInventory.smoothies[rawLine.productId] || {};
        nextProductInventory.smoothies[rawLine.productId][variantKey] = Math.max(
          0,
          (nextProductInventory.smoothies[rawLine.productId][variantKey] || 0) - quantity
        );
        for (const toppingName of rawLine.toppings || []) {
          if (String(toppingName).startsWith('Combo Topping:')) continue;
          const toppingId = toppingMap.get(toppingName);
          if (!toppingId) continue;
          nextProductInventory.toppings[toppingId] = Math.max(
            0,
            (nextProductInventory.toppings[toppingId] || 0) - quantity
          );
        }
      }
      if (rawLine.productCategory === 'toppings') {
        nextProductInventory.toppings[rawLine.productId] = Math.max(
          0,
          (nextProductInventory.toppings[rawLine.productId] || 0) - quantity
        );
      }
    }
    setProductInventory(nextProductInventory);
    if (branchRef.current) {
      api.saveSetting(`branchProductInventory_${branchRef.current}`, nextProductInventory).catch((err) =>
        console.error('Failed to sync product inventory:', err)
      );
    }
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
        productInventory,
        recipes: FITBLEND_RECIPES,
        movements,
        activeBranchId,
        isWarehouseReady,
        loadForBranch,
        getLowStockItems,
        getOutOfStockItems,
        checkCartStock,
        purchaseStock,
        purchaseStockBatch,
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
