import { useEffect, useMemo, useState } from 'react';
import { Plus, Truck, X, Coffee, Layers3, Search, PackageCheck, Clock, Pencil, Ban } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import { useSSE } from '../../contexts/SSEContext';
import { useBranches } from '../../contexts/BranchContext';
import { useAdmin } from '../../contexts/AdminContext';
import * as api from '../../utils/api';

interface BranchInventoryProps {
  branchId: string;
}

interface MenuProduct {
  id: string;
  name: string;
  category: 'smoothies' | 'toppings' | 'combo';
  basePrice: number;
  image: string;
  description?: string;
}

type ProductInventoryState = {
  smoothies: Record<string, Record<string, number>>;
  toppings: Record<string, number>;
};

interface DiffLine {
  productId: string;
  productName: string;
  type: 'smoothie' | 'topping';
  variantKey: string | null;
  quantity: number;
}

interface CreatedStockReceipt {
  id: string;
  createdAt: string;
  branchId: string;
  createdBy: string;
  note: string;
  status: string;
  lines: { productId: string; productName: string; type: string; variantKey: string | null; quantity: number }[];
}

type ReceiptStage = 'idle' | 'naming' | 'editing' | 'result';

function formatSigned(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

const PRODUCT_VOLUMES = ['250ml', '360ml', '500ml', '700ml'];
const PRODUCT_SIZES = ['S', 'M', 'L'];

const EMPTY_PRODUCT_INVENTORY: ProductInventoryState = {
  smoothies: {},
  toppings: {},
};

const productInventoryKeyFor = (branchId: string) => `branchProductInventory_${branchId}`;

function parseProductInventory(data: unknown): ProductInventoryState {
  if (data && typeof data === 'object') {
    return {
      smoothies: (data as ProductInventoryState).smoothies || {},
      toppings: (data as ProductInventoryState).toppings || {},
    };
  }
  return { smoothies: {}, toppings: {} };
}

export function BranchInventory({ branchId }: BranchInventoryProps) {
  const { loadForBranch, isWarehouseReady } = useInventory();
  const { subscribe } = useSSE();
  const { activeBranches, branchLabel } = useBranches();
  const { adminUser } = useAdmin();

  const [receiptStage, setReceiptStage] = useState<ReceiptStage>('idle');
  const [receiptName, setReceiptName] = useState('');
  const [baselineInventory, setBaselineInventory] = useState<ProductInventoryState>(EMPTY_PRODUCT_INVENTORY);
  const [draftInventory, setDraftInventory] = useState<ProductInventoryState>(EMPTY_PRODUCT_INVENTORY);
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<CreatedStockReceipt | null>(null);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productInventory, setProductInventory] = useState<ProductInventoryState>(EMPTY_PRODUCT_INVENTORY);

  const branchName = activeBranches.find((b) => b.id === branchId)?.name || branchId;
  const isEditing = receiptStage === 'editing';

  useEffect(() => {
    loadForBranch(branchId);
  }, [branchId, loadForBranch]);

  useEffect(() => {
    api.fetchProducts()
      .then((data) => setProducts((data || []).filter((p: MenuProduct) => p.category !== 'combo')))
      .catch(() => setProducts([]));

    api.fetchSetting(productInventoryKeyFor(branchId))
      .then((data) => setProductInventory(parseProductInventory(data)))
      .catch(() => setProductInventory(EMPTY_PRODUCT_INVENTORY));
  }, [branchId]);

  // Đồng bộ realtime: máy khác (POS/Admin khác) nhập kho xong thì cập nhật ngay, không cần tải lại trang.
  useEffect(() => {
    const key = productInventoryKeyFor(branchId);
    const unsubscribe = subscribe('SETTING_UPDATED', (payload: { key: string; value: unknown }) => {
      if (payload?.key === key) {
        setProductInventory(parseProductInventory(payload.value));
      }
    });
    return unsubscribe;
  }, [branchId, subscribe]);

  const smoothies = useMemo(
    () =>
      products.filter(
        (p) =>
          p.category === 'smoothies' &&
          (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.id.toLowerCase().includes(productSearch.toLowerCase()))
      ),
    [products, productSearch]
  );
  const toppings = useMemo(
    () =>
      products.filter(
        (p) =>
          p.category === 'toppings' &&
          (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.id.toLowerCase().includes(productSearch.toLowerCase()))
      ),
    [products, productSearch]
  );

  const totalSmoothieStock = (productId: string, source: ProductInventoryState) => {
    const variants = source.smoothies[productId] || {};
    return Object.values(variants).reduce((sum, v) => sum + (Number(v) || 0), 0);
  };

  const openNaming = () => {
    setReceiptName('');
    setCreatedReceipt(null);
    setReceiptStage('naming');
  };

  const startEditing = () => {
    const snapshot: ProductInventoryState = {
      smoothies: JSON.parse(JSON.stringify(productInventory.smoothies || {})),
      toppings: { ...(productInventory.toppings || {}) },
    };
    setBaselineInventory(snapshot);
    setDraftInventory(JSON.parse(JSON.stringify(snapshot)));
    setReceiptStage('editing');
  };

  const cancelEditing = () => {
    setReceiptStage('idle');
  };

  const setDraftSmoothieVariant = (productId: string, variantKey: string, value: number) => {
    setDraftInventory((prev) => ({
      ...prev,
      smoothies: {
        ...prev.smoothies,
        [productId]: {
          ...(prev.smoothies[productId] || {}),
          [variantKey]: Math.max(0, value),
        },
      },
    }));
  };

  const setDraftTopping = (productId: string, value: number) => {
    setDraftInventory((prev) => ({
      ...prev,
      toppings: { ...prev.toppings, [productId]: Math.max(0, value) },
    }));
  };

  const diffLines = useMemo<DiffLine[]>(() => {
    const lines: DiffLine[] = [];
    for (const p of products.filter((pr) => pr.category === 'smoothies')) {
      for (const volume of PRODUCT_VOLUMES) {
        for (const size of PRODUCT_SIZES) {
          const variantKey = `${volume}-${size}`;
          const before = baselineInventory.smoothies[p.id]?.[variantKey] ?? 0;
          const after = draftInventory.smoothies[p.id]?.[variantKey] ?? 0;
          const diff = after - before;
          if (diff !== 0) {
            lines.push({ productId: p.id, productName: p.name, type: 'smoothie', variantKey, quantity: diff });
          }
        }
      }
    }
    for (const p of products.filter((pr) => pr.category === 'toppings')) {
      const before = baselineInventory.toppings[p.id] ?? 0;
      const after = draftInventory.toppings[p.id] ?? 0;
      const diff = after - before;
      if (diff !== 0) {
        lines.push({ productId: p.id, productName: p.name, type: 'topping', variantKey: null, quantity: diff });
      }
    }
    return lines;
  }, [products, baselineInventory, draftInventory]);

  const diffSmoothieLines = useMemo(() => diffLines.filter((l) => l.type === 'smoothie'), [diffLines]);
  const diffToppingLines = useMemo(() => diffLines.filter((l) => l.type === 'topping'), [diffLines]);

  const handleSaveReceipt = async () => {
    if (diffLines.length === 0) return alert('Chưa có thay đổi nào để tạo phiếu');
    setPurchaseSaving(true);
    try {
      const receipt = await api.createStockReceipt({
        branchId,
        createdBy: adminUser?.fullName || adminUser?.employeeId || 'Admin',
        note: receiptName.trim() || 'Nhap kho',
        lines: diffLines,
      });
      setCreatedReceipt(receipt);
      setReceiptStage('result');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Tạo phiếu thất bại');
    } finally {
      setPurchaseSaving(false);
    }
  };

  const closeResult = () => {
    setCreatedReceipt(null);
    setReceiptStage('idle');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tồn Kho — {branchLabel(branchId)}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isEditing
              ? 'Đang chỉnh sửa tồn kho trực tiếp — bấm "Lưu phiếu" ở góc phải khi xong'
              : 'Chỉ xem — muốn thêm tồn kho, bấm "Nhập Kho" để tạo phiếu chờ admin duyệt'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openNaming}
            disabled={isEditing}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-40"
          >
            <Plus className="w-5 h-5" />
            Nhập Kho
          </button>
        </div>
      </div>

      {!isWarehouseReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-amber-800">
          <p className="font-bold">Chưa có phiếu nhập kho tại chi nhánh này</p>
          <p className="text-sm mt-1">POS {branchId} không thể bán cho đến khi nhập kho lần đầu (bấm "Nhập Kho").</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Tìm vị hoặc topping..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow-md p-5 ${isEditing ? 'ring-2 ring-emerald-400' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <Coffee className="w-5 h-5 text-emerald-700" />
            <h3 className="text-lg font-bold text-gray-800">Kho Vị</h3>
            {isEditing && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <Pencil className="w-3 h-3" /> Đang sửa
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {smoothies.map((product) => {
              const total = totalSmoothieStock(product.id, isEditing ? draftInventory : productInventory);
              return (
                <div
                  key={product.id}
                  className={`text-left border rounded-xl p-4 ${isEditing ? 'bg-emerald-50/40 border-emerald-200' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-400 font-semibold">{product.id}</div>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                      Vị
                    </span>
                  </div>
                  <div className="font-bold text-gray-900 mb-3 flex items-center justify-between">
                    <span>{product.name}</span>
                    <span className={`text-sm font-black ${total <= 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                      {total} túi
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="border-t border-gray-200 pt-2.5">
                      <div className="grid grid-cols-[32px_repeat(3,1fr)] gap-x-2 gap-y-2">
                        <div />
                        {PRODUCT_SIZES.map((size) => (
                          <div key={size} className="text-center text-[11px] font-bold text-gray-400">
                            {size}
                          </div>
                        ))}
                        {PRODUCT_VOLUMES.map((volume) => (
                          <div key={volume} className="contents">
                            <div className="text-[11px] font-bold text-gray-500 self-center">{volume}</div>
                            {PRODUCT_SIZES.map((size) => {
                              const variantKey = `${volume}-${size}`;
                              const value = draftInventory.smoothies[product.id]?.[variantKey] ?? 0;
                              const before = baselineInventory.smoothies[product.id]?.[variantKey] ?? 0;
                              const diff = value - before;
                              return (
                                <div key={size} className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={value}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setDraftSmoothieVariant(product.id, variantKey, Number(e.target.value || 0))}
                                    className="w-full text-center border-2 border-gray-200 rounded-lg py-1.5 text-sm font-bold text-gray-800 bg-white focus:border-emerald-500 outline-none"
                                  />
                                  <span
                                    className={`text-[10px] font-bold leading-none ${
                                      diff === 0 ? 'invisible' : diff > 0 ? 'text-emerald-600' : 'text-red-600'
                                    }`}
                                  >
                                    {formatSigned(diff)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 border-t border-gray-200 pt-2">
                      {PRODUCT_VOLUMES.map((volume) => (
                        <div key={volume} className="flex items-center justify-between text-xs gap-1">
                          <span className="font-bold text-gray-500 w-12 shrink-0">{volume}</span>
                          <span className="flex gap-2.5">
                            {PRODUCT_SIZES.map((size) => {
                              const value = productInventory.smoothies[product.id]?.[`${volume}-${size}`] ?? 0;
                              return (
                                <span key={size} className={`font-black ${value <= 0 ? 'text-gray-300' : 'text-emerald-700'}`}>
                                  {size}:{value}
                                </span>
                              );
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {smoothies.length === 0 && (
              <div className="col-span-full text-sm text-gray-500">Không có vị nào khớp tìm kiếm.</div>
            )}
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow-md p-5 ${isEditing ? 'ring-2 ring-violet-400' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <Layers3 className="w-5 h-5 text-violet-700" />
            <h3 className="text-lg font-bold text-gray-800">Kho Topping</h3>
            {isEditing && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                <Pencil className="w-3 h-3" /> Đang sửa
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {toppings.map((product) => {
              if (isEditing) {
                const value = draftInventory.toppings[product.id] ?? 0;
                const before = baselineInventory.toppings[product.id] ?? 0;
                const diff = value - before;
                return (
                  <div key={product.id} className="text-left border rounded-xl p-4 bg-violet-50/40 border-violet-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-400 font-semibold">{product.id}</div>
                      <span className="text-[10px] text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full font-semibold">
                        Topping
                      </span>
                    </div>
                    <div className="font-bold text-gray-900 mb-2 truncate">{product.name}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={value}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDraftTopping(product.id, Number(e.target.value || 0))}
                        className="w-20 text-center border-2 border-gray-200 rounded-lg px-2 py-1.5 bg-white font-bold text-gray-800 focus:border-violet-500 outline-none"
                      />
                      {diff !== 0 && (
                        <span className={`text-xs font-bold ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatSigned(diff)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
              const qty = productInventory.toppings[product.id] ?? 0;
              return (
                <div key={product.id} className="text-left border rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-400 font-semibold">{product.id}</div>
                    <span className="text-[10px] text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full font-semibold">
                      Topping
                    </span>
                  </div>
                  <div className="font-bold text-gray-900 mb-2">{product.name}</div>
                  <div className={`text-2xl font-black ${qty <= 0 ? 'text-red-500' : 'text-violet-700'}`}>
                    {qty} <span className="text-xs font-bold text-gray-400">phần</span>
                  </div>
                </div>
              );
            })}
            {toppings.length === 0 && (
              <div className="col-span-full text-sm text-gray-500">Không có topping nào khớp tìm kiếm.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bước 1: đặt tên phiếu trước khi mở khoá sửa trực tiếp */}
      {receiptStage === 'naming' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" /> Tạo Phiếu Nhập Kho
              </h3>
              <button
                type="button"
                onClick={() => setReceiptStage('idle')}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên phiếu</label>
                <input
                  autoFocus
                  type="text"
                  value={receiptName}
                  onChange={(e) => setReceiptName(e.target.value)}
                  placeholder="VD: Nhập bổ sung cuối tuần"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm">
                <span className="text-gray-500">Chi nhánh nhập kho: </span>
                <span className="font-bold text-gray-800">{branchId} — {branchName}</span>
              </div>
              <button
                type="button"
                onClick={startEditing}
                className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold transition-colors"
              >
                <PackageCheck className="w-5 h-5" />
                Tạo phiếu nhập kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bước 2: phiếu thu nhỏ về góc màn hình trong lúc sửa tồn kho trực tiếp phía trên */}
      {isEditing && (
        <div className="fixed bottom-4 right-4 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-emerald-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white px-4 py-3 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span className="text-sm font-black truncate flex-1">{receiptName.trim() || 'Phiếu nhập kho'}</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs text-gray-500">
              Chi nhánh: <span className="font-bold text-gray-800">{branchLabel(branchId)}</span>
            </div>
            <div className="text-xs text-gray-500">
              {diffLines.length === 0 ? (
                <span>Chưa có thay đổi nào</span>
              ) : (
                <span>
                  <span className="font-bold text-gray-800">{diffLines.length} thay đổi</span>
                  {diffSmoothieLines.length > 0 && <span> · {diffSmoothieLines.length} vị</span>}
                  {diffToppingLines.length > 0 && <span> · {diffToppingLines.length} topping</span>}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-bold hover:bg-gray-50"
              >
                <Ban className="w-3.5 h-3.5" /> Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveReceipt}
                disabled={purchaseSaving || diffLines.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                {purchaseSaving ? 'Đang lưu...' : 'Lưu phiếu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bước 3: phiếu hiện lại đầy đủ, hiển thị số nhập/xuất, đã chuyển vào chờ duyệt */}
      {receiptStage === 'result' && createdReceipt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-700 to-teal-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center z-10">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Truck className="w-5 h-5" /> {createdReceipt.note || 'Phiếu Nhập Kho'}
              </h3>
              <button
                type="button"
                onClick={closeResult}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-700 font-bold">
                <Clock className="w-6 h-6" />
                Phiếu đã gửi — đang chờ admin duyệt
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-1">
                <div className="text-gray-500">
                  Mã phiếu: <span className="font-bold text-gray-800">{createdReceipt.id}</span>
                </div>
                <div className="text-gray-500">
                  Thời gian tạo:{' '}
                  <span className="font-semibold text-gray-800">
                    {new Date(createdReceipt.createdAt).toLocaleString('vi-VN', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="text-gray-500">
                  Chi nhánh: <span className="font-semibold text-gray-800">{branchLabel(createdReceipt.branchId)}</span>
                </div>
                <div className="text-gray-500">
                  Người tạo: <span className="font-semibold text-gray-800">{createdReceipt.createdBy}</span>
                </div>
              </div>
              {createdReceipt.lines.some((l) => l.quantity > 0) && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1.5">
                    <PackageCheck className="w-3.5 h-3.5" /> Nhập kho
                  </div>
                  <div className="border border-emerald-100 rounded-xl divide-y divide-emerald-100">
                    {createdReceipt.lines.filter((l) => l.quantity > 0).map((line, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="font-medium text-gray-800">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${line.type === 'topping' ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                          {line.productName}
                          {line.variantKey && <span className="text-gray-400 ml-1.5 text-xs">{line.variantKey}</span>}
                        </span>
                        <span className="font-bold text-emerald-700">{formatSigned(line.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {createdReceipt.lines.some((l) => l.quantity < 0) && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 mb-1.5">
                    <Ban className="w-3.5 h-3.5" /> Xuất kho
                  </div>
                  <div className="border border-red-100 rounded-xl divide-y divide-red-100">
                    {createdReceipt.lines.filter((l) => l.quantity < 0).map((line, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="font-medium text-gray-800">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${line.type === 'topping' ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                          {line.productName}
                          {line.variantKey && <span className="text-gray-400 ml-1.5 text-xs">{line.variantKey}</span>}
                        </span>
                        <span className="font-bold text-red-600">{formatSigned(line.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={closeResult}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
