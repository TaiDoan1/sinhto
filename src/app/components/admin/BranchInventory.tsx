import { useEffect, useMemo, useState } from 'react';
import { Plus, Truck, X, Coffee, Layers3, Search, Trash2, PackageCheck, Clock } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import { useSSE } from '../../contexts/SSEContext';
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

interface ReceiptLine {
  productId: string;
  productName: string;
  type: 'smoothie' | 'topping';
  variantKey: string | null;
  quantity: string;
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

const PRODUCT_VOLUMES = ['360ml', '500ml', '700ml'];
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

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([]);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [purchaseNote, setPurchaseNote] = useState('');
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<CreatedStockReceipt | null>(null);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productInventory, setProductInventory] = useState<ProductInventoryState>(EMPTY_PRODUCT_INVENTORY);

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

  const totalSmoothieStock = (productId: string) => {
    const variants = productInventory.smoothies[productId] || {};
    return Object.values(variants).reduce((sum, v) => sum + (Number(v) || 0), 0);
  };

  const openPurchase = () => {
    setReceiptLines([]);
    setReceiptSearch('');
    setPurchaseNote('');
    setCreatedReceipt(null);
    setShowPurchaseModal(true);
  };

  const addReceiptLine = (product: MenuProduct) => {
    const type: ReceiptLine['type'] = product.category === 'toppings' ? 'topping' : 'smoothie';
    setReceiptLines((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        type,
        variantKey: type === 'smoothie' ? `${PRODUCT_VOLUMES[0]}-${PRODUCT_SIZES[0]}` : null,
        quantity: '',
      },
    ]);
  };

  const removeReceiptLine = (index: number) => {
    setReceiptLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateReceiptLine = (index: number, patch: Partial<ReceiptLine>) => {
    setReceiptLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const receiptPickerProducts = useMemo(() => {
    const term = receiptSearch.trim().toLowerCase();
    return products.filter(
      (p) => !term || p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)
    );
  }, [products, receiptSearch]);
  const receiptPickerSmoothies = useMemo(
    () => receiptPickerProducts.filter((p) => p.category === 'smoothies'),
    [receiptPickerProducts]
  );
  const receiptPickerToppings = useMemo(
    () => receiptPickerProducts.filter((p) => p.category === 'toppings'),
    [receiptPickerProducts]
  );
  const receiptSmoothieLines = useMemo(
    () => receiptLines.map((l, i) => ({ ...l, index: i })).filter((l) => l.type === 'smoothie'),
    [receiptLines]
  );
  const receiptToppingLines = useMemo(
    () => receiptLines.map((l, i) => ({ ...l, index: i })).filter((l) => l.type === 'topping'),
    [receiptLines]
  );

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = receiptLines
      .filter((l) => Number(l.quantity) > 0)
      .map((l) => ({
        productId: l.productId,
        productName: l.productName,
        type: l.type,
        variantKey: l.variantKey,
        quantity: Number(l.quantity),
      }));
    if (validLines.length === 0) return alert('Chọn ít nhất một sản phẩm và số lượng nhập');
    setPurchaseSaving(true);
    try {
      const receipt = await api.createStockReceipt({
        branchId,
        createdBy: 'Admin',
        note: purchaseNote,
        lines: validLines,
      });
      setCreatedReceipt(receipt);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Tạo phiếu thất bại');
    } finally {
      setPurchaseSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tồn Kho — {branchId}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Chỉ xem — muốn thêm tồn kho, bấm "Nhập Kho" để tạo phiếu chờ admin duyệt
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openPurchase()}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
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

        <div className="bg-white rounded-lg shadow-md p-5">
          <div className="flex items-center gap-2 mb-4">
            <Coffee className="w-5 h-5 text-emerald-700" />
            <h3 className="text-lg font-bold text-gray-800">Kho Vị</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {smoothies.map((product) => {
              const total = totalSmoothieStock(product.id);
              return (
                <div
                  key={product.id}
                  className="text-left border rounded-xl p-4 bg-gray-50"
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
                  <div className="space-y-1 border-t border-gray-200 pt-2">
                    {PRODUCT_VOLUMES.map((volume) => {
                      const values = PRODUCT_SIZES.map(
                        (size) => productInventory.smoothies[product.id]?.[`${volume}-${size}`] ?? 0
                      );
                      return (
                        <div key={volume} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-500 w-12 shrink-0">{volume}</span>
                          <span className="flex gap-2.5">
                            {PRODUCT_SIZES.map((size, i) => (
                              <span
                                key={size}
                                className={`font-black ${values[i] <= 0 ? 'text-gray-300' : 'text-emerald-700'}`}
                              >
                                {size}:{values[i]}
                              </span>
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {smoothies.length === 0 && (
              <div className="col-span-full text-sm text-gray-500">Không có vị nào khớp tìm kiếm.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers3 className="w-5 h-5 text-violet-700" />
            <h3 className="text-lg font-bold text-gray-800">Kho Topping</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {toppings.map((product) => {
              const qty = productInventory.toppings[product.id] ?? 0;
              return (
                <div
                  key={product.id}
                  className="text-left border rounded-xl p-4 bg-gray-50"
                >
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

      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-700 to-teal-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center z-10">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Truck className="w-5 h-5" /> Phiếu Nhập Kho — {branchId}
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Chọn sản phẩm từ kho tổng · phiếu sẽ chờ admin duyệt trước khi cộng kho
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdReceipt ? (
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
                    Chi nhánh: <span className="font-semibold text-gray-800">{createdReceipt.branchId}</span>
                  </div>
                  <div className="text-gray-500">
                    Người tạo: <span className="font-semibold text-gray-800">{createdReceipt.createdBy}</span>
                  </div>
                  {createdReceipt.note && (
                    <div className="text-gray-500">
                      Ghi chú: <span className="font-semibold text-gray-800">{createdReceipt.note}</span>
                    </div>
                  )}
                </div>
                {createdReceipt.lines.some((l) => l.type === 'smoothie') && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1.5">
                      <Coffee className="w-3.5 h-3.5" /> Vị
                    </div>
                    <div className="border border-emerald-100 rounded-xl divide-y divide-emerald-100">
                      {createdReceipt.lines.filter((l) => l.type === 'smoothie').map((line, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="font-medium text-gray-800">
                            {line.productName}
                            {line.variantKey && <span className="text-gray-400 ml-1.5 text-xs">{line.variantKey}</span>}
                          </span>
                          <span className="font-bold text-emerald-700">+{line.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {createdReceipt.lines.some((l) => l.type === 'topping') && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 mb-1.5">
                      <Layers3 className="w-3.5 h-3.5" /> Topping
                    </div>
                    <div className="border border-violet-100 rounded-xl divide-y divide-violet-100">
                      {createdReceipt.lines.filter((l) => l.type === 'topping').map((line, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="font-medium text-gray-800">{line.productName}</span>
                          <span className="font-bold text-emerald-700">+{line.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handlePurchaseSubmit} className="p-6 space-y-5">
                {/* Tìm & chọn sản phẩm */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">1. Tìm sản phẩm cần nhập</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={receiptSearch}
                      onChange={(e) => setReceiptSearch(e.target.value)}
                      placeholder="Gõ tên vị hoặc topping..."
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div className="mt-3 space-y-3 max-h-48 overflow-y-auto">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1.5">
                        <Coffee className="w-3.5 h-3.5" /> Vị
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {receiptPickerSmoothies.map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => addReceiptLine(p)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400 text-xs font-semibold transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            {p.name}
                          </button>
                        ))}
                        {receiptPickerSmoothies.length === 0 && (
                          <span className="text-xs text-gray-400 py-1">Không có vị nào khớp.</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 mb-1.5">
                        <Layers3 className="w-3.5 h-3.5" /> Topping
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {receiptPickerToppings.map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => addReceiptLine(p)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-400 text-xs font-semibold transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            {p.name}
                          </button>
                        ))}
                        {receiptPickerToppings.length === 0 && (
                          <span className="text-xs text-gray-400 py-1">Không có topping nào khớp.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Các dòng đã chọn */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    2. Sản phẩm trong phiếu ({receiptLines.length})
                  </label>
                  {receiptLines.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center text-sm text-gray-400">
                      Bấm vào sản phẩm phía trên để thêm vào phiếu
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {receiptSmoothieLines.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1.5">
                            <Coffee className="w-3.5 h-3.5" /> Vị ({receiptSmoothieLines.length})
                          </div>
                          <div className="space-y-2">
                            {receiptSmoothieLines.map((line) => (
                              <div
                                key={`${line.productId}-${line.index}`}
                                className="flex items-center gap-2 bg-emerald-50/60 border border-emerald-100 rounded-xl px-3 py-2"
                              >
                                <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{line.productName}</span>
                                <select
                                  value={line.variantKey || ''}
                                  onChange={(e) => updateReceiptLine(line.index, { variantKey: e.target.value })}
                                  className="border rounded-lg px-2 py-1.5 text-xs bg-white"
                                >
                                  {PRODUCT_VOLUMES.map((vol) =>
                                    PRODUCT_SIZES.map((size) => (
                                      <option key={`${vol}-${size}`} value={`${vol}-${size}`}>
                                        {vol} · {size}
                                      </option>
                                    ))
                                  )}
                                </select>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={line.quantity}
                                  onChange={(e) => updateReceiptLine(line.index, { quantity: e.target.value })}
                                  placeholder="SL"
                                  className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center bg-white"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => removeReceiptLine(line.index)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {receiptToppingLines.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 mb-1.5">
                            <Layers3 className="w-3.5 h-3.5" /> Topping ({receiptToppingLines.length})
                          </div>
                          <div className="space-y-2">
                            {receiptToppingLines.map((line) => (
                              <div
                                key={`${line.productId}-${line.index}`}
                                className="flex items-center gap-2 bg-violet-50/60 border border-violet-100 rounded-xl px-3 py-2"
                              >
                                <span className="shrink-0 w-2 h-2 rounded-full bg-violet-500" />
                                <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{line.productName}</span>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={line.quantity}
                                  onChange={(e) => updateReceiptLine(line.index, { quantity: e.target.value })}
                                  placeholder="SL"
                                  className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center bg-white"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => removeReceiptLine(line.index)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">3. Ghi chú (tùy chọn)</label>
                  <input
                    type="text"
                    value={purchaseNote}
                    onChange={(e) => setPurchaseNote(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none"
                    placeholder="VD: Nhập bổ sung cuối tuần..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={purchaseSaving || receiptLines.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 transition-colors"
                >
                  <PackageCheck className="w-5 h-5" />
                  {purchaseSaving ? 'Đang gửi phiếu...' : 'Gửi phiếu chờ duyệt'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
