import { useEffect, useMemo, useState } from 'react';
import {
  Save,
  History as HistoryIcon,
  ArrowUpRight,
  ArrowDownRight,
  Coffee,
  Layers3,
  Truck,
  Plus,
  X,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import * as api from '../../utils/api';

interface InventoryManagementProps {
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

type EditingProduct = { product: MenuProduct; type: 'smoothie' | 'topping' } | null;

const PRODUCT_VOLUMES = ['360ml', '500ml', '700ml'];
const PRODUCT_SIZES = ['S', 'M', 'L'];

const EMPTY_PRODUCT_INVENTORY: ProductInventoryState = {
  smoothies: {},
  toppings: {},
};

export function InventoryManagement({ branchId }: InventoryManagementProps) {
  const { inventory, movements, purchaseStock, isWarehouseReady } = useInventory();
  const [activeSubTab, setActiveSubTab] = useState<'check' | 'history'>('check');

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseItemId, setPurchaseItemId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseNote, setPurchaseNote] = useState('');
  const [purchaseSaving, setPurchaseSaving] = useState(false);

  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productInventory, setProductInventory] = useState<ProductInventoryState>(EMPTY_PRODUCT_INVENTORY);
  const [productSaving, setProductSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditingProduct>(null);

  useEffect(() => {
    if (!branchId) return;
    const productInventoryKey = `branchProductInventory_${branchId}`;

    api.fetchProducts()
      .then((data) => setProducts((data || []).filter((p: MenuProduct) => p.category !== 'combo')))
      .catch(() => setProducts([]));

    api.fetchSetting(productInventoryKey)
      .then((data) => {
        if (data && typeof data === 'object') {
          setProductInventory({
            smoothies: (data as ProductInventoryState).smoothies || {},
            toppings: (data as ProductInventoryState).toppings || {},
          });
        } else {
          setProductInventory(EMPTY_PRODUCT_INVENTORY);
        }
      })
      .catch(() => setProductInventory(EMPTY_PRODUCT_INVENTORY));
  }, [branchId]);

  const smoothieProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.category === 'smoothies' &&
          (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.id.toLowerCase().includes(productSearch.toLowerCase()))
      ),
    [products, productSearch]
  );
  const toppingProducts = useMemo(
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

  const openPurchase = (itemId?: string) => {
    setPurchaseItemId(itemId || '');
    setPurchaseQty('');
    setPurchaseSupplier('');
    setPurchaseNote('');
    setShowPurchaseModal(true);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(purchaseQty);
    if (!purchaseItemId || !qty || qty <= 0) return alert('Chọn nguyên liệu và số lượng nhập');
    setPurchaseSaving(true);
    try {
      const ok = await purchaseStock(
        purchaseItemId,
        qty,
        'Nhân viên POS',
        purchaseNote || 'Nhap kho',
        purchaseSupplier || undefined
      );
      if (ok) {
        alert('Nhập kho thành công!');
        setShowPurchaseModal(false);
      } else {
        alert('Nhập kho thất bại');
      }
    } finally {
      setPurchaseSaving(false);
    }
  };

  const setSmoothieVariantStock = (productId: string, variantKey: string, value: number) => {
    setProductInventory((prev) => ({
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

  const setToppingStock = (productId: string, value: number) => {
    setProductInventory((prev) => ({
      ...prev,
      toppings: {
        ...prev.toppings,
        [productId]: Math.max(0, value),
      },
    }));
  };

  const saveProductInventory = async () => {
    if (!branchId) return false;
    setProductSaving(true);
    try {
      await api.saveSetting(`branchProductInventory_${branchId}`, productInventory);
      return true;
    } catch (err) {
      console.error(err);
      alert('Lưu kho sản phẩm thất bại.');
      return false;
    } finally {
      setProductSaving(false);
    }
  };

  const handleSaveEditingProduct = async () => {
    const ok = await saveProductInventory();
    if (ok) setEditingProduct(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-white p-4 border-b flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('check')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
              activeSubTab === 'check' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Kiểm Kho
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
              activeSubTab === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            Lịch Sử Nhập/Xuất
          </button>
        </div>

        {activeSubTab === 'check' && (
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm vị hoặc topping..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => openPurchase()}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nhập Kho
            </button>
          </div>
        )}
      </div>

      {!isWarehouseReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-sm font-bold">
          ⚠️ Chưa có phiếu nhập kho tại chi nhánh này — bấm "Nhập Kho" để mở khóa bán hàng.
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSubTab === 'check' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Coffee className="w-5 h-5 text-emerald-700" />
                <h3 className="text-lg font-black text-gray-800">Kho Vị</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {smoothieProducts.map((product) => {
                  const total = totalSmoothieStock(product.id);
                  return (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => setEditingProduct({ product, type: 'smoothie' })}
                      className="text-left border rounded-xl p-4 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-gray-400 font-semibold">{product.id}</div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-black">
                          Vị
                        </span>
                      </div>
                      <div className="font-black text-gray-900 mb-3 flex items-center justify-between">
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
                    </button>
                  );
                })}
                {smoothieProducts.length === 0 && (
                  <div className="col-span-full text-sm text-gray-500">Không có vị nào khớp tìm kiếm.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layers3 className="w-5 h-5 text-violet-700" />
                <h3 className="text-lg font-black text-gray-800">Kho Topping</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {toppingProducts.map((product) => {
                  const qty = productInventory.toppings[product.id] ?? 0;
                  return (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => setEditingProduct({ product, type: 'topping' })}
                      className="text-left border rounded-xl p-4 bg-gray-50 hover:bg-violet-50 hover:border-violet-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-400 font-semibold">{product.id}</div>
                        <span className="text-[10px] text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full font-black">
                          Topping
                        </span>
                      </div>
                      <div className="font-black text-gray-900 mb-2">{product.name}</div>
                      <div className={`text-2xl font-black ${qty <= 0 ? 'text-red-500' : 'text-violet-700'}`}>
                        {qty} <span className="text-xs font-bold text-gray-400">phần</span>
                      </div>
                    </button>
                  );
                })}
                {toppingProducts.length === 0 && (
                  <div className="col-span-full text-sm text-gray-500">Không có topping nào khớp tìm kiếm.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-black text-gray-400 uppercase tracking-widest border-b">
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Nguyên liệu</th>
                  <th className="px-6 py-4">Loại</th>
                  <th className="px-6 py-4 text-right">Số lượng</th>
                  <th className="px-6 py-4">Lý do</th>
                  <th className="px-6 py-4">Người thực hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movements.map(move => (
                  <tr key={move.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                      {new Date(move.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{move.itemName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        move.type === 'adjustment' ? 'bg-amber-100 text-amber-600' :
                        move.type === 'sale' ? 'bg-blue-100 text-blue-600' :
                        move.type === 'waste' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {move.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-black ${
                      move.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      <div className="flex items-center justify-end gap-1">
                        {move.quantity > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(move.quantity)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 italic">{move.reason}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{move.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movements.length === 0 && (
              <div className="py-20 text-center text-gray-300">
                <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">Chưa có lịch sử biến động kho</p>
              </div>
            )}
          </div>
        )}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                {editingProduct.type === 'smoothie' ? (
                  <Coffee className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <Layers3 className="w-6 h-6 text-violet-600 shrink-0" />
                )}
                {editingProduct.product.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 font-semibold mb-5">{editingProduct.product.id}</p>

            {editingProduct.type === 'smoothie' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {PRODUCT_VOLUMES.map((volume) => (
                    <div key={volume} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="text-sm font-black text-emerald-700 mb-3 text-center uppercase tracking-wide">
                        {volume}
                      </div>
                      <div className="space-y-2.5">
                        {PRODUCT_SIZES.map((size) => {
                          const variantKey = `${volume}-${size}`;
                          return (
                            <div key={variantKey} className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
                                Size {size}
                              </span>
                              <input
                                autoFocus={volume === PRODUCT_VOLUMES[0] && size === PRODUCT_SIZES[0]}
                                type="number"
                                min="0"
                                value={productInventory.smoothies[editingProduct.product.id]?.[variantKey] ?? 0}
                                onChange={(e) =>
                                  setSmoothieVariantStock(
                                    editingProduct.product.id,
                                    variantKey,
                                    Number(e.target.value || 0)
                                  )
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
                    {totalSmoothieStock(editingProduct.product.id)} túi
                  </span>
                </div>
              </>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số lượng khả dụng</label>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  value={productInventory.toppings[editingProduct.product.id] ?? 0}
                  onChange={(e) => setToppingStock(editingProduct.product.id, Number(e.target.value || 0))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveEditingProduct}
              disabled={productSaving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {productSaving ? 'Đang lưu...' : 'Lưu tồn kho'}
            </button>
          </div>
        </div>
      )}

      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Truck className="w-6 h-6 text-emerald-600" /> Nhập kho — {branchId}
              </h3>
              <button type="button" onClick={() => setShowPurchaseModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nguyên liệu</label>
                <select
                  value={purchaseItemId}
                  onChange={(e) => setPurchaseItemId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  <option value="">-- Chọn --</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (còn {item.currentStock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số lượng</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nhà cung cấp</label>
                <input
                  type="text"
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Tùy chọn"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={purchaseNote}
                  onChange={(e) => setPurchaseNote(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Phiếu nhập kho..."
                />
              </div>
              <button
                type="submit"
                disabled={purchaseSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold disabled:opacity-50"
              >
                {purchaseSaving ? 'Đang lưu...' : 'Xác nhận nhập kho'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
