import { useEffect, useMemo, useState } from 'react';
import { Plus, Truck, X, Coffee, Layers3, Save, Search } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
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

type EditingProduct = { product: MenuProduct; type: 'smoothie' | 'topping' } | null;

const PRODUCT_VOLUMES = ['360ml', '500ml', '700ml'];
const PRODUCT_SIZES = ['S', 'M', 'L'];

const EMPTY_PRODUCT_INVENTORY: ProductInventoryState = {
  smoothies: {},
  toppings: {},
};

export function BranchInventory({ branchId }: BranchInventoryProps) {
  const { inventory, loadForBranch, purchaseStock, isWarehouseReady } = useInventory();

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
    loadForBranch(branchId);
  }, [branchId, loadForBranch]);

  useEffect(() => {
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
        'Admin',
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
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tồn Kho — {branchId}</h2>
          <p className="text-sm text-gray-500 mt-1">Bấm vào Vị hoặc Topping để thêm/sửa tồn kho</p>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {smoothies.map((product) => {
              const total = totalSmoothieStock(product.id);
              return (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => setEditingProduct({ product, type: 'smoothie' })}
                  className="text-left border rounded-xl p-4 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-400 font-semibold">{product.id}</div>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                      Vị
                    </span>
                  </div>
                  <div className="font-bold text-gray-900 mb-2">{product.name}</div>
                  <div className={`text-2xl font-black ${total <= 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                    {total} <span className="text-xs font-bold text-gray-400">túi</span>
                  </div>
                </button>
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
                <button
                  type="button"
                  key={product.id}
                  onClick={() => setEditingProduct({ product, type: 'topping' })}
                  className="text-left border rounded-xl p-4 bg-gray-50 hover:bg-violet-50 hover:border-violet-300 transition-colors"
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
                </button>
              );
            })}
            {toppings.length === 0 && (
              <div className="col-span-full text-sm text-gray-500">Không có topping nào khớp tìm kiếm.</div>
            )}
          </div>
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {editingProduct.type === 'smoothie' ? (
                  <Coffee className="w-6 h-6 text-emerald-600" />
                ) : (
                  <Layers3 className="w-6 h-6 text-violet-600" />
                )}
                {editingProduct.product.name}
              </h3>
              <button type="button" onClick={() => setEditingProduct(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {editingProduct.type === 'smoothie' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {PRODUCT_VOLUMES.map((volume) => (
                  <div key={volume} className="border rounded-lg p-3 bg-gray-50">
                    <div className="text-sm font-bold text-emerald-800 mb-3">{volume}</div>
                    <div className="grid grid-cols-3 gap-2">
                      {PRODUCT_SIZES.map((size) => {
                        const variantKey = `${volume}-${size}`;
                        return (
                          <label key={variantKey} className="block">
                            <div className="text-xs text-gray-500 font-semibold mb-1">Size {size}</div>
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
                              className="w-full border rounded-lg px-2 py-2 font-bold text-gray-800 bg-white"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số lượng khả dụng</label>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  value={productInventory.toppings[editingProduct.product.id] ?? 0}
                  onChange={(e) => setToppingStock(editingProduct.product.id, Number(e.target.value || 0))}
                  className="w-full border rounded-lg px-3 py-2 font-bold text-gray-800 bg-white"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveEditingProduct}
              disabled={productSaving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-lg font-bold disabled:opacity-50"
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
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-lg font-bold disabled:opacity-50"
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
