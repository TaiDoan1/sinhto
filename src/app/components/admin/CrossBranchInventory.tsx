import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowRight, AlertTriangle, History, Truck, Warehouse, Coffee, Layers3, Save, Search, X,
  ArrowDownToLine, ArrowUpFromLine, ChevronDown, ChevronRight, Clock, FileText, CheckCircle2, XCircle,
} from 'lucide-react';
import { useBranches } from '../../contexts/BranchContext';
import { useSSE } from '../../contexts/SSEContext';
import { useToast } from '../../contexts/ToastContext';
import { BranchInventory as BranchStockDetail } from './BranchInventory';
import * as api from '../../utils/api';

export interface InventoryItem {
  id: string;
  name: string;
  unit: 'kg' | 'lít' | 'gói' | 'cái';
  category: 'fruit' | 'dairy' | 'protein' | 'topping' | 'other';
  minStock: number;
  cost: number;
}

interface BranchInventory extends InventoryItem {
  currentStock: number;
  branchId: string;
  status: 'low' | 'ok' | 'none';
}

interface Movement {
  id: string;
  timestamp: string;
  type: 'sale' | 'void_return' | 'waste' | 'refund' | 'purchase' | 'adjustment';
  itemId: string;
  itemName: string;
  quantity: number;
  reason?: string;
  performedBy?: string;
  branchId?: string;
  receiptId?: string;
  cost?: number;
}

interface MenuProduct {
  id: string;
  name: string;
  category: 'smoothies' | 'toppings' | 'combo';
}

interface ProductInventoryState {
  smoothies: Record<string, Record<string, number>>;
  toppings: Record<string, number>;
}

interface StockReceiptLine {
  productId: string;
  productName: string;
  type: 'smoothie' | 'topping';
  variantKey: string | null;
  quantity: number;
}

interface StockReceipt {
  id: string;
  createdAt: string;
  branchId: string;
  createdBy: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  lines: StockReceiptLine[];
  approvedAt?: string;
  approvedBy?: string;
}

const MOVEMENT_LABELS: Record<Movement['type'], { label: string; className: string }> = {
  purchase: { label: 'Nhập kho', className: 'text-emerald-700 bg-emerald-50' },
  sale: { label: 'Xuất bán', className: 'text-blue-700 bg-blue-50' },
  waste: { label: 'Hủy hàng', className: 'text-red-700 bg-red-50' },
  void_return: { label: 'Trả hàng', className: 'text-amber-700 bg-amber-50' },
  refund: { label: 'Hoàn trả', className: 'text-amber-700 bg-amber-50' },
  adjustment: { label: 'Điều chỉnh', className: 'text-violet-700 bg-violet-50' },
};

const PRODUCT_VOLUMES = ['360ml', '500ml', '700ml'];
const PRODUCT_SIZES = ['S', 'M', 'L'];
const CENTRAL_KEY = 'centralProductInventory';
const EMPTY_PRODUCT_INVENTORY: ProductInventoryState = { smoothies: {}, toppings: {} };

function parseProductInventory(data: unknown): ProductInventoryState {
  if (data && typeof data === 'object') {
    return {
      smoothies: (data as ProductInventoryState).smoothies || {},
      toppings: (data as ProductInventoryState).toppings || {},
    };
  }
  return { smoothies: {}, toppings: {} };
}

function fullDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function CrossBranchInventory() {
  const { activeBranches } = useBranches();
  const { subscribe } = useSSE();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'central' | 'overview' | 'pending' | 'history'>('central');

  // --- Kho nguyên liệu (ingredient) theo chi nhánh ---
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branchInventories, setBranchInventories] = useState<Map<string, BranchInventory[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBranchDetail, setSelectedBranchDetail] = useState<string | null>(null);
  const [branchProductStats, setBranchProductStats] = useState<Record<string, { bags: number; portions: number }>>({});
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [moveModal, setMoveModal] = useState<{
    fromBranch: string;
    toBranch: string;
    itemId: string;
    itemName: string;
    quantity: number;
  } | null>(null);

  // --- Kho tổng (sản phẩm) ---
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [centralInv, setCentralInv] = useState<ProductInventoryState>(EMPTY_PRODUCT_INVENTORY);
  const [centralSearch, setCentralSearch] = useState('');
  const [editingCentral, setEditingCentral] = useState<{ product: MenuProduct; type: 'smoothie' | 'topping' } | null>(null);
  const [centralSaving, setCentralSaving] = useState(false);

  // --- Phiếu nhập kho ---
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [subReceiptDetail, setSubReceiptDetail] = useState<{ receipt: StockReceipt; kind: 'out' | 'in' } | null>(null);

  const loadReceipts = useCallback(() => {
    setReceiptsLoading(true);
    api.fetchStockReceipts()
      .then((data) => setReceipts(data || []))
      .catch((err) => console.error('Failed to load stock receipts:', err))
      .finally(() => setReceiptsLoading(false));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const inventories = new Map<string, BranchInventory[]>();

        for (const branch of activeBranches) {
          const branchData = (await api.fetchInventory(branch.id)) as any;
          const itemsList = Array.isArray(branchData) ? branchData : branchData?.items || [];
          const withStatus = itemsList.map((inv: any) => ({
            id: inv.id,
            name: inv.name,
            unit: inv.unit,
            category: inv.category || 'other',
            minStock: inv.minStock || 0,
            cost: inv.cost || 0,
            currentStock: inv.currentStock || 0,
            branchId: branch.id,
            status: (inv.currentStock || 0) === 0 ? 'none' : (inv.currentStock || 0) < (inv.minStock || 0) ? 'low' : 'ok',
          }));
          inventories.set(branch.id, withStatus);

          setItems(prev => {
            const existing = new Map<string, InventoryItem>();
            prev.forEach(item => existing.set(item.id, item));
            itemsList.forEach((inv: any) => {
              if (!existing.has(inv.id)) {
                existing.set(inv.id, {
                  id: inv.id,
                  name: inv.name,
                  unit: inv.unit,
                  category: inv.category || 'other',
                  minStock: inv.minStock || 0,
                  cost: inv.cost || 0,
                });
              }
            });
            return Array.from(existing.values());
          });
        }

        setBranchInventories(inventories);
      } catch (err) {
        console.error('Failed to load cross-branch inventory:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [activeBranches]);

  useEffect(() => {
    const loadMovements = async () => {
      try {
        setMovementsLoading(true);
        const data = (await api.fetchMovements()) as Movement[];
        setMovements((data || []).slice(0, 300));
      } catch (err) {
        console.error('Failed to load inventory movements:', err);
      } finally {
        setMovementsLoading(false);
      }
    };
    loadMovements();
  }, []);

  useEffect(() => {
    api.fetchProducts()
      .then((data) => setProducts((data || []).filter((p: MenuProduct) => p.category !== 'combo')))
      .catch(() => setProducts([]));
    api.fetchSetting(CENTRAL_KEY)
      .then((data) => setCentralInv(parseProductInventory(data)))
      .catch(() => setCentralInv(EMPTY_PRODUCT_INVENTORY));
    loadReceipts();
  }, [loadReceipts]);

  const loadBranchStats = useCallback(async () => {
    const stats: Record<string, { bags: number; portions: number }> = {};
    for (const branch of activeBranches) {
      try {
        const inv = parseProductInventory(await api.fetchSetting(`branchProductInventory_${branch.id}`));
        const bags = Object.values(inv.smoothies).reduce(
          (sum, variants) => sum + Object.values(variants).reduce((s, v) => s + (Number(v) || 0), 0),
          0
        );
        const portions = Object.values(inv.toppings).reduce((s, v) => s + (Number(v) || 0), 0);
        stats[branch.id] = { bags, portions };
      } catch {
        stats[branch.id] = { bags: 0, portions: 0 };
      }
    }
    setBranchProductStats(stats);
  }, [activeBranches]);

  useEffect(() => {
    loadBranchStats();
  }, [loadBranchStats]);

  useEffect(() => {
    const unsub1 = subscribe('STOCK_RECEIPT_CREATED', () => loadReceipts());
    const unsub2 = subscribe('STOCK_RECEIPT_UPDATED', () => { loadReceipts(); loadBranchStats(); });
    const unsub3 = subscribe('SETTING_UPDATED', (payload: { key: string; value: unknown }) => {
      if (payload?.key === CENTRAL_KEY) setCentralInv(parseProductInventory(payload.value));
      if (payload?.key?.startsWith('branchProductInventory_')) loadBranchStats();
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [subscribe, loadReceipts, loadBranchStats]);

  const handleMoveStock = async () => {
    if (!moveModal || !moveModal.fromBranch || !moveModal.toBranch) return;
    try {
      const fromBranchRaw = (await api.fetchInventory(moveModal.fromBranch)) as any;
      const toBranchRaw = (await api.fetchInventory(moveModal.toBranch)) as any;
      const fromItems = Array.isArray(fromBranchRaw) ? fromBranchRaw : fromBranchRaw?.items || [];
      const toItems = Array.isArray(toBranchRaw) ? toBranchRaw : toBranchRaw?.items || [];

      const fromItem = fromItems.find((i: any) => i.id === moveModal.itemId);

      if (!fromItem || (fromItem.currentStock || 0) < moveModal.quantity) {
        showError('Kho không đủ hàng để chuyển.');
        return;
      }

      const updatedFromItems = fromItems.map((i: any) =>
        i.id === moveModal.itemId ? { ...i, currentStock: (i.currentStock || 0) - moveModal.quantity } : i
      );
      const updatedToItems = toItems.map((i: any) =>
        i.id === moveModal.itemId ? { ...i, currentStock: (i.currentStock || 0) + moveModal.quantity } : i
      );

      // Dấu số lượng khớp chiều tăng/giảm thực tế của từng chi nhánh
      const outMovement = {
        id: `move-out-${Date.now()}`,
        timestamp: new Date(),
        type: 'adjustment' as const,
        itemId: moveModal.itemId,
        itemName: moveModal.itemName,
        quantity: -moveModal.quantity,
        reason: `Chuyển kho sang ${moveModal.toBranch}`,
        performedBy: 'store_manager',
        cost: 0,
        branchId: moveModal.fromBranch,
      };
      const inMovement = {
        id: `move-in-${Date.now()}`,
        timestamp: new Date(),
        type: 'adjustment' as const,
        itemId: moveModal.itemId,
        itemName: moveModal.itemName,
        quantity: moveModal.quantity,
        reason: `Chuyển kho từ ${moveModal.fromBranch}`,
        performedBy: 'store_manager',
        cost: 0,
        branchId: moveModal.toBranch,
      };

      await api.updateInventory(updatedFromItems, [outMovement], moveModal.fromBranch);
      await api.updateInventory(updatedToItems, [inMovement], moveModal.toBranch);

      showSuccess('Chuyển kho thành công!');
      setMoveModal(null);
      window.location.reload();
    } catch (err) {
      console.error('Failed to move stock:', err);
      showError('Lỗi chuyển kho. Vui lòng thử lại.');
    }
  };

  // --- Kho tổng handlers ---
  const centralSmoothies = useMemo(
    () => products.filter((p) => p.category === 'smoothies' &&
      (p.name.toLowerCase().includes(centralSearch.toLowerCase()) || p.id.toLowerCase().includes(centralSearch.toLowerCase()))),
    [products, centralSearch]
  );
  const centralToppings = useMemo(
    () => products.filter((p) => p.category === 'toppings' &&
      (p.name.toLowerCase().includes(centralSearch.toLowerCase()) || p.id.toLowerCase().includes(centralSearch.toLowerCase()))),
    [products, centralSearch]
  );

  const centralSmoothieTotal = (productId: string) => {
    const variants = centralInv.smoothies[productId] || {};
    return Object.values(variants).reduce((sum, v) => sum + (Number(v) || 0), 0);
  };

  const setCentralSmoothieVariant = (productId: string, variantKey: string, value: number) => {
    setCentralInv((prev) => ({
      ...prev,
      smoothies: {
        ...prev.smoothies,
        [productId]: { ...(prev.smoothies[productId] || {}), [variantKey]: Math.max(0, value) },
      },
    }));
  };

  const setCentralTopping = (productId: string, value: number) => {
    setCentralInv((prev) => ({
      ...prev,
      toppings: { ...prev.toppings, [productId]: Math.max(0, value) },
    }));
  };

  const handleSaveCentral = async () => {
    if (!editingCentral) return;
    setCentralSaving(true);
    try {
      // Merge với bản mới nhất trên server để không ghi đè phần vừa bị phiếu duyệt trừ đi
      let latest = EMPTY_PRODUCT_INVENTORY;
      try {
        latest = parseProductInventory(await api.fetchSetting(CENTRAL_KEY));
      } catch { /* chưa có kho tổng — bắt đầu từ rỗng */ }

      const merged: ProductInventoryState = {
        smoothies: { ...latest.smoothies },
        toppings: { ...latest.toppings },
      };
      if (editingCentral.type === 'smoothie') {
        merged.smoothies[editingCentral.product.id] = { ...(centralInv.smoothies[editingCentral.product.id] || {}) };
      } else {
        merged.toppings[editingCentral.product.id] = centralInv.toppings[editingCentral.product.id] ?? 0;
      }

      await api.saveSetting(CENTRAL_KEY, merged);
      setCentralInv(merged);
      setEditingCentral(null);
      showSuccess('Đã cập nhật kho tổng');
    } catch (err) {
      console.error(err);
      showError('Lưu kho tổng thất bại');
    } finally {
      setCentralSaving(false);
    }
  };

  // --- Duyệt phiếu ---
  const handleApprove = async (receipt: StockReceipt) => {
    setProcessingId(receipt.id);
    try {
      await api.approveStockReceipt(receipt.id, 'Admin');
      showSuccess(`Đã duyệt phiếu ${receipt.id} — đã cập nhật kho tổng và kho ${receipt.branchId}`);
      loadReceipts();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Duyệt phiếu thất bại');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (receipt: StockReceipt) => {
    if (!confirm(`Từ chối phiếu ${receipt.id}?`)) return;
    setProcessingId(receipt.id);
    try {
      await api.rejectStockReceipt(receipt.id, 'Admin');
      showSuccess(`Đã từ chối phiếu ${receipt.id}`);
      loadReceipts();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Từ chối phiếu thất bại');
    } finally {
      setProcessingId(null);
    }
  };

  const toggleParent = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const pendingReceipts = receipts.filter((r) => r.status === 'pending');
  const processedReceipts = receipts.filter((r) => r.status !== 'pending');

  const categories = ['all', 'fruit', 'dairy', 'protein', 'topping', 'other'];
  const categoryLabels: Record<string, string> = {
    all: 'Tất cả',
    fruit: 'Trái cây',
    dairy: 'Sản phẩm sữa',
    protein: 'Protein',
    topping: 'Topping',
    other: 'Khác',
  };

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((i) => i.category === selectedCategory);

  const otherMovements = movements.filter((m) => !(m.type === 'purchase' && m.receiptId));

  const tabs = [
    { id: 'central' as const, label: 'Kho Tổng', icon: Warehouse },
    { id: 'overview' as const, label: 'Tồn Kho Chi Nhánh', icon: ArrowRight },
    { id: 'pending' as const, label: 'Phiếu Chờ Duyệt', icon: Clock, badge: pendingReceipts.length },
    { id: 'history' as const, label: 'Lịch Sử Xuất Nhập', icon: History },
  ];

  if (isLoading && receiptsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Đang tải kho...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-3 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Quản Lý Kho</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Kho tổng → phiếu nhập kho chi nhánh → duyệt → lịch sử xuất nhập
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md p-2 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white text-emerald-700' : 'bg-red-500 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============ TAB: KHO TỔNG ============ */}
      {activeTab === 'central' && (
        <>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900">
            <span className="font-bold">Kho tổng</span> — admin nhập số lượng sản phẩm vào đây trước.
            Chi nhánh hết hàng sẽ tạo phiếu nhập kho; khi duyệt phiếu, hàng được trừ khỏi kho tổng và cộng vào kho chi nhánh.
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={centralSearch}
                onChange={(e) => setCentralSearch(e.target.value)}
                placeholder="Tìm vị hoặc topping..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <Coffee className="w-5 h-5 text-emerald-700" />
              <h3 className="text-lg font-bold text-gray-800">Kho Vị (Tổng)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {centralSmoothies.map((product) => {
                const total = centralSmoothieTotal(product.id);
                return (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => setEditingCentral({ product, type: 'smoothie' })}
                    className="text-left border rounded-xl p-4 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-400 font-semibold">{product.id}</div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">Vị</span>
                    </div>
                    <div className="font-bold text-gray-900 mb-3 flex items-center justify-between">
                      <span>{product.name}</span>
                      <span className={`text-sm font-black ${total <= 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                        {total} túi
                      </span>
                    </div>
                    <div className="space-y-1 border-t border-gray-200 pt-2">
                      {PRODUCT_VOLUMES.map((volume) => {
                        const values = PRODUCT_SIZES.map(
                          (size) => centralInv.smoothies[product.id]?.[`${volume}-${size}`] ?? 0
                        );
                        return (
                          <div key={volume} className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-500 w-12 shrink-0">{volume}</span>
                            <span className="flex gap-2.5">
                              {PRODUCT_SIZES.map((size, i) => (
                                <span key={size} className={`font-black ${values[i] <= 0 ? 'text-gray-300' : 'text-emerald-700'}`}>
                                  {size}:{values[i]}
                                </span>
                              ))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
              {centralSmoothies.length === 0 && (
                <div className="col-span-full text-sm text-gray-500">Không có vị nào khớp tìm kiếm.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers3 className="w-5 h-5 text-violet-700" />
              <h3 className="text-lg font-bold text-gray-800">Kho Topping (Tổng)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {centralToppings.map((product) => {
                const qty = centralInv.toppings[product.id] ?? 0;
                return (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => setEditingCentral({ product, type: 'topping' })}
                    className="text-left border rounded-xl p-4 bg-gray-50 hover:bg-violet-50 hover:border-violet-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-400 font-semibold">{product.id}</div>
                      <span className="text-[10px] text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full font-semibold">Topping</span>
                    </div>
                    <div className="font-bold text-gray-900 mb-2">{product.name}</div>
                    <div className={`text-2xl font-black ${qty <= 0 ? 'text-red-500' : 'text-violet-700'}`}>
                      {qty} <span className="text-xs font-bold text-gray-400">phần</span>
                    </div>
                  </button>
                );
              })}
              {centralToppings.length === 0 && (
                <div className="col-span-full text-sm text-gray-500">Không có topping nào khớp tìm kiếm.</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ============ TAB: TỒN KHO CHI NHÁNH (nguyên liệu) ============ */}
      {activeTab === 'overview' && selectedBranchDetail && (
        <>
          {/* Thanh điều hướng chi nhánh đang xem */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedBranchDetail(null)}
              className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-900"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Danh sách chi nhánh
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <span className="text-sm text-gray-500">Đang xem:</span>
            <select
              value={selectedBranchDetail}
              onChange={(e) => setSelectedBranchDetail(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm font-bold text-gray-800"
            >
              {activeBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.id} — {b.name}</option>
              ))}
            </select>
          </div>

          {/* Tồn kho sản phẩm của chi nhánh + nút tạo phiếu nhập kho */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-5">
            <BranchStockDetail key={selectedBranchDetail} branchId={selectedBranchDetail} />
          </div>
        </>
      )}

      {activeTab === 'overview' && !selectedBranchDetail && (
        <>
          {/* Chọn chi nhánh để xem tồn kho chi tiết */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBranches.map((branch) => {
              const stats = branchProductStats[branch.id];
              return (
                <button
                  type="button"
                  key={branch.id}
                  onClick={() => setSelectedBranchDetail(branch.id)}
                  className="text-left bg-white rounded-xl shadow-md p-5 border-2 border-transparent hover:border-emerald-400 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      {branch.id}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div className="font-bold text-gray-900 mb-3">{branch.name}</div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className={`font-black ${(stats?.bags ?? 0) <= 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                        {stats?.bags ?? '…'}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">túi vị</span>
                    </div>
                    <div>
                      <span className={`font-black ${(stats?.portions ?? 0) <= 0 ? 'text-red-500' : 'text-violet-700'}`}>
                        {stats?.portions ?? '…'}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">phần topping</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    Xem chi tiết & nhập kho →
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedCategory === cat ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold text-gray-700">Tên</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold text-gray-700">Đơn vị</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold text-gray-700">Min</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center font-semibold text-gray-700 bg-emerald-50">Tổng</th>
                    {activeBranches.map((branch) => (
                      <th key={branch.id} className="px-2 sm:px-6 py-2 sm:py-3 text-center font-semibold text-gray-700">
                        {branch.id}
                      </th>
                    ))}
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-6 py-2 sm:py-4 font-medium text-gray-900">{item.name}</td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-gray-600">{item.unit}</td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-gray-600">{item.minStock}</td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-center font-black text-emerald-800 bg-emerald-50/60">
                        {Math.round(
                          activeBranches.reduce(
                            (sum, branch) => sum + (branchInventories.get(branch.id)?.find((i) => i.id === item.id)?.currentStock ?? 0),
                            0
                          ) * 100
                        ) / 100}
                      </td>
                      {activeBranches.map((branch) => {
                        const inv = branchInventories.get(branch.id)?.find((i) => i.id === item.id);
                        const stock = inv?.currentStock ?? 0;
                        const isLow = stock < item.minStock;
                        const isEmpty = stock === 0;
                        return (
                          <td
                            key={branch.id}
                            className={`px-2 sm:px-6 py-2 sm:py-4 text-center font-semibold ${
                              isEmpty ? 'text-red-700 bg-red-50' : isLow ? 'text-orange-700 bg-orange-50' : 'text-green-700 bg-green-50'
                            }`}
                          >
                            {stock} {isEmpty && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                          </td>
                        );
                      })}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">
                        <button
                          onClick={() => setMoveModal({ fromBranch: '', toBranch: '', itemId: item.id, itemName: item.name, quantity: 0 })}
                          className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs sm:text-sm whitespace-nowrap"
                        >
                          <ArrowRight className="inline w-3 sm:w-4 h-3 sm:h-4" /> Chuyển
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============ TAB: PHIẾU CHỜ DUYỆT ============ */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {receiptsLoading ? (
            <div className="bg-white rounded-xl shadow-md px-6 py-8 text-center text-gray-400">Đang tải phiếu...</div>
          ) : pendingReceipts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md px-6 py-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
              <p className="text-gray-500 font-semibold">Không có phiếu nào chờ duyệt</p>
            </div>
          ) : (
            pendingReceipts.map((r) => (
              <div key={r.id} className="bg-white rounded-xl shadow-md border-l-4 border-amber-400 overflow-hidden">
                <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span className="font-black text-gray-800">{r.id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Chờ duyệt</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {fullDateTime(r.createdAt)} · Chi nhánh <span className="font-bold text-gray-700">{r.branchId}</span> · {r.createdBy}
                      {r.note ? ` · ${r.note}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(r)}
                      disabled={processingId === r.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Từ chối
                    </button>
                    <button
                      onClick={() => handleApprove(r)}
                      disabled={processingId === r.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {processingId === r.id ? 'Đang duyệt...' : 'Duyệt phiếu'}
                    </button>
                  </div>
                </div>
                <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/60">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1 font-semibold">Sản phẩm</th>
                        <th className="py-1 font-semibold text-center">Loại</th>
                        <th className="py-1 font-semibold text-center">Kho tổng còn</th>
                        <th className="py-1 font-semibold text-right">Thay đổi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.lines.map((line, i) => {
                        const have = line.type === 'topping'
                          ? centralInv.toppings[line.productId] ?? 0
                          : centralInv.smoothies[line.productId]?.[line.variantKey || ''] ?? 0;
                        const enough = have >= line.quantity;
                        return (
                          <tr key={i}>
                            <td className="py-1.5 font-medium text-gray-800">
                              {line.productName}
                              {line.variantKey && <span className="text-gray-400 ml-1.5 text-xs">{line.variantKey}</span>}
                            </td>
                            <td className="py-1.5 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                line.type === 'topping' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {line.type === 'topping' ? 'Topping' : 'Vị'}
                              </span>
                            </td>
                            <td className={`py-1.5 text-center font-bold ${enough ? 'text-gray-600' : 'text-red-600'}`}>
                              {have} {!enough && <AlertTriangle className="inline w-3 h-3 ml-0.5" />}
                            </td>
                            <td className={`py-1.5 text-right font-black ${line.quantity > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                              {line.quantity > 0 ? `+${line.quantity}` : line.quantity}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ============ TAB: LỊCH SỬ XUẤT NHẬP ============ */}
      {activeTab === 'history' && (
        <>
          {/* Tờ phiếu điều chuyển: 1 phiếu cha = 2 phiếu con (xuất kho tổng + nhập chi nhánh) */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <Truck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-gray-800">Phiếu nhập kho chi nhánh</h3>
            </div>
            {receiptsLoading ? (
              <div className="px-6 py-6 text-center text-gray-400 text-sm">Đang tải...</div>
            ) : processedReceipts.length === 0 ? (
              <div className="px-6 py-6 text-center text-gray-400 text-sm">Chưa có phiếu nào được xử lý.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {processedReceipts.map((r) => {
                  const isOpen = expandedParents.has(r.id);
                  const isApproved = r.status === 'approved';
                  return (
                    <div key={r.id}>
                      {/* Tờ phiếu cha */}
                      <button
                        type="button"
                        onClick={() => toggleParent(r.id)}
                        className="w-full flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          <FileText className={`w-5 h-5 ${isApproved ? 'text-emerald-600' : 'text-red-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-gray-800">{r.id}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                              }`}>
                                {isApproved ? 'Đã duyệt' : 'Từ chối'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {fullDateTime(r.approvedAt || r.createdAt)} · Kho Tổng → <span className="font-bold">{r.branchId}</span> · {r.lines.length} sản phẩm
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          Người duyệt: <span className="font-semibold text-gray-600">{r.approvedBy || '—'}</span>
                        </div>
                      </button>

                      {/* 2 phiếu con: xuất & nhập — chỉ hiện tóm tắt, bấm để xem chi tiết trong popup */}
                      {isOpen && isApproved && (
                        <div className="px-4 sm:px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Phiếu xuất — Kho Tổng */}
                          <button
                            type="button"
                            onClick={() => setSubReceiptDetail({ receipt: r, kind: 'out' })}
                            className="text-left border border-red-200 rounded-xl overflow-hidden hover:border-red-400 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between px-4 py-3 bg-red-50">
                              <span className="flex items-center gap-2 text-sm font-bold text-red-700">
                                <ArrowUpFromLine className="w-4 h-4" />
                                Phiếu xuất — Kho Tổng
                              </span>
                              <ChevronRight className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="px-4 py-3 text-xs sm:text-sm text-gray-500">
                              {fullDateTime(r.approvedAt)} · {r.lines.length} sản phẩm
                            </div>
                          </button>

                          {/* Phiếu nhập — Chi nhánh */}
                          <button
                            type="button"
                            onClick={() => setSubReceiptDetail({ receipt: r, kind: 'in' })}
                            className="text-left border border-emerald-200 rounded-xl overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
                              <span className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                                <ArrowDownToLine className="w-4 h-4" />
                                Phiếu nhập — {r.branchId}
                              </span>
                              <ChevronRight className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="px-4 py-3 text-xs sm:text-sm text-gray-500">
                              {fullDateTime(r.approvedAt)} · {r.lines.length} sản phẩm
                            </div>
                          </button>
                        </div>
                      )}

                      {/* Phiếu bị từ chối: chỉ hiện chi tiết dòng */}
                      {isOpen && !isApproved && (
                        <div className="px-4 sm:px-6 pb-4">
                          <div className="border border-gray-200 rounded-xl px-4 py-3 text-xs sm:text-sm bg-gray-50/60">
                            <div className="divide-y divide-gray-100">
                              {r.lines.map((line, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5">
                                  <span className="font-medium text-gray-500 line-through">
                                    {line.productName}
                                    {line.variantKey && <span className="ml-1.5 text-xs">{line.variantKey}</span>}
                                  </span>
                                  <span className="font-bold text-gray-400">{line.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Xuất bán / điều chỉnh / hủy hàng (nguyên liệu) */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <History className="w-5 h-5 text-gray-500" />
              <h3 className="font-bold text-gray-800">Xuất bán / điều chỉnh / hủy hàng</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold text-gray-700">Thời gian</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold text-gray-700">Loại</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold text-gray-700">Nguyên liệu</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center font-semibold text-gray-700">Số lượng</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center font-semibold text-gray-700">Chi nhánh</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold text-gray-700">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movementsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-gray-400">Đang tải lịch sử...</td>
                    </tr>
                  ) : otherMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-gray-400">Chưa có lịch sử.</td>
                    </tr>
                  ) : (
                    otherMovements.map((m) => {
                      const meta = MOVEMENT_LABELS[m.type] || { label: m.type, className: 'text-gray-700 bg-gray-100' };
                      const isOutbound = m.quantity < 0;
                      return (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-2 sm:px-6 py-2 sm:py-3 text-gray-600 whitespace-nowrap">
                            {fullDateTime(m.timestamp)}
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${meta.className}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-3 font-medium text-gray-900">{m.itemName}</td>
                          <td className={`px-2 sm:px-6 py-2 sm:py-3 text-center font-semibold ${isOutbound ? 'text-red-600' : 'text-emerald-700'}`}>
                            {isOutbound ? '-' : '+'}{Math.abs(m.quantity)}
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-gray-600">{m.branchId || '—'}</td>
                          <td className="px-2 sm:px-6 py-2 sm:py-3 text-gray-500">{m.reason || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Popup chi tiết phiếu xuất/nhập */}
      {subReceiptDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className={`sticky top-0 px-6 py-4 rounded-t-2xl flex items-center justify-between ${
              subReceiptDetail.kind === 'out' ? 'bg-red-50 border-b border-red-200' : 'bg-emerald-50 border-b border-emerald-200'
            }`}>
              <div>
                <h3 className={`text-lg font-black flex items-center gap-2 ${
                  subReceiptDetail.kind === 'out' ? 'text-red-700' : 'text-emerald-700'
                }`}>
                  {subReceiptDetail.kind === 'out' ? (
                    <ArrowUpFromLine className="w-5 h-5" />
                  ) : (
                    <ArrowDownToLine className="w-5 h-5" />
                  )}
                  {subReceiptDetail.kind === 'out'
                    ? 'Phiếu xuất — Kho Tổng'
                    : `Phiếu nhập — ${subReceiptDetail.receipt.branchId}`}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {subReceiptDetail.receipt.id} · {fullDateTime(subReceiptDetail.receipt.approvedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubReceiptDetail(null)}
                className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs">
                    <th className="pb-2 font-semibold">Sản phẩm</th>
                    <th className="pb-2 font-semibold text-right">Số lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subReceiptDetail.receipt.lines.map((line, i) => {
                    // Phiếu nhập (chi nhánh) hiện đúng dấu của line.quantity; phiếu xuất (kho tổng)
                    // hiện chiều ngược lại vì kho tổng biến động ngược với chi nhánh.
                    const displayQty = subReceiptDetail.kind === 'out' ? -line.quantity : line.quantity;
                    return (
                      <tr key={i}>
                        <td className="py-2 font-medium text-gray-800">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${line.type === 'topping' ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                            {line.productName}
                            {line.variantKey && <span className="text-gray-400 ml-1 text-xs">{line.variantKey}</span>}
                          </span>
                        </td>
                        <td className={`py-2 text-right font-black ${displayQty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {displayQty > 0 ? `+${displayQty}` : displayQty}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal sửa kho tổng */}
      {editingCentral && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                {editingCentral.type === 'smoothie' ? (
                  <Coffee className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <Layers3 className="w-6 h-6 text-violet-600 shrink-0" />
                )}
                {editingCentral.product.name} — Kho Tổng
              </h3>
              <button
                type="button"
                onClick={() => setEditingCentral(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 font-semibold mb-5">{editingCentral.product.id}</p>

            {editingCentral.type === 'smoothie' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {PRODUCT_VOLUMES.map((volume) => (
                    <div key={volume} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="text-sm font-black text-emerald-700 mb-3 text-center uppercase tracking-wide">{volume}</div>
                      <div className="space-y-2.5">
                        {PRODUCT_SIZES.map((size) => {
                          const variantKey = `${volume}-${size}`;
                          return (
                            <div key={variantKey} className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Size {size}</span>
                              <input
                                autoFocus={volume === PRODUCT_VOLUMES[0] && size === PRODUCT_SIZES[0]}
                                type="number"
                                min="0"
                                value={centralInv.smoothies[editingCentral.product.id]?.[variantKey] ?? 0}
                                onChange={(e) =>
                                  setCentralSmoothieVariant(editingCentral.product.id, variantKey, Number(e.target.value || 0))
                                }
                                className="w-20 text-center border border-gray-300 rounded-lg px-2 py-1.5 font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 mb-4">
                  <span className="text-sm font-semibold text-emerald-800">Tổng cộng</span>
                  <span className="text-lg font-black text-emerald-700">
                    {centralSmoothieTotal(editingCentral.product.id)} túi
                  </span>
                </div>
              </>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số lượng trong kho tổng</label>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  value={centralInv.toppings[editingCentral.product.id] ?? 0}
                  onChange={(e) => setCentralTopping(editingCentral.product.id, Number(e.target.value || 0))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveCentral}
              disabled={centralSaving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-lg font-bold disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {centralSaving ? 'Đang lưu...' : 'Lưu kho tổng'}
            </button>
          </div>
        </div>
      )}

      {/* Move stock modal (nguyên liệu giữa chi nhánh) */}
      {moveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Chuyển kho - {moveModal.itemName}</h3>
              <button onClick={() => setMoveModal(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Từ chi nhánh</label>
                <select
                  value={moveModal.fromBranch}
                  onChange={(e) => setMoveModal({ ...moveModal, fromBranch: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Chọn chi nhánh</option>
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.id} — {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Đến chi nhánh</label>
                <select
                  value={moveModal.toBranch}
                  onChange={(e) => setMoveModal({ ...moveModal, toBranch: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Chọn chi nhánh</option>
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id} disabled={branch.id === moveModal.fromBranch}>
                      {branch.id} — {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượng</label>
                <input
                  type="number"
                  min="1"
                  value={moveModal.quantity}
                  onChange={(e) => setMoveModal({ ...moveModal, quantity: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setMoveModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleMoveStock}
                  disabled={!moveModal.fromBranch || !moveModal.toBranch || moveModal.quantity <= 0}
                  className="flex-1 px-4 py-2 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 disabled:bg-gray-300"
                >
                  Chuyển
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
