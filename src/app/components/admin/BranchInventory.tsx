import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Package, Plus, TrendingDown, Truck, X, Coffee, Layers3, Save, Search } from 'lucide-react';
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

const PRODUCT_VOLUMES = ['360ml', '500ml', '700ml'];
const PRODUCT_SIZES = ['S', 'M', 'L'];

const EMPTY_PRODUCT_INVENTORY: ProductInventoryState = {
  smoothies: {},
  toppings: {},
};

function stockStatus(current: number, min: number): 'critical' | 'warning' | 'ok' {
  if (current <= 0) return 'critical';
  if (current <= min) return 'warning';
  return 'ok';
}

export function BranchInventory({ branchId }: BranchInventoryProps) {
  const {
    inventory,
    loadForBranch,
    purchaseStock,
    isWarehouseReady,
    getLowStockItems,
    getOutOfStockItems,
  } = useInventory();

  const [activeTab, setActiveTab] = useState<'ingredients' | 'products'>('ingredients');
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

  const criticalItems = getOutOfStockItems();
  const warningItems = getLowStockItems();
  const okItems = inventory.filter(
    (item) => stockStatus(item.currentStock, item.minStock) === 'ok'
  );
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
      alert('Đã lưu kho sản phẩm theo chi nhánh.');
    } catch (err) {
      console.error(err);
      alert('Lưu kho sản phẩm thất bại.');
    } finally {
      setProductSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tồn Kho — {branchId}</h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý riêng kho nguyên liệu và kho sản phẩm bán ra</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg shadow-sm border p-1 flex">
            <button
              type="button"
              onClick={() => setActiveTab('ingredients')}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'ingredients' ? 'bg-emerald-700 text-white' : 'text-gray-600'
              }`}
            >
              <Package className="w-4 h-4" />
              Nguyên liệu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'products' ? 'bg-emerald-700 text-white' : 'text-gray-600'
              }`}
            >
              <Layers3 className="w-4 h-4" />
              Kho sản phẩm
            </button>
          </div>

          {activeTab === 'ingredients' ? (
            <button
              type="button"
              onClick={() => openPurchase()}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nhập Kho
            </button>
          ) : (
            <button
              type="button"
              onClick={saveProductInventory}
              disabled={productSaving}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-60"
            >
              <Save className="w-5 h-5" />
              {productSaving ? 'Đang lưu...' : 'Lưu kho sản phẩm'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'ingredients' ? (
        <>
          {!isWarehouseReady && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-amber-800">
              <p className="font-bold">Chưa có phiếu nhập kho tại chi nhánh này</p>
              <p className="text-sm mt-1">POS {branchId} không thể bán cho đến khi nhập kho lần đầu.</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6" />
                <div className="text-sm opacity-90">Hết hàng</div>
              </div>
              <div className="text-3xl font-bold">{criticalItems.length}</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-6 h-6" />
                <div className="text-sm opacity-90">Sắp hết</div>
              </div>
              <div className="text-3xl font-bold">{warningItems.length}</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6" />
                <div className="text-sm opacity-90">Đủ dùng</div>
              </div>
              <div className="text-3xl font-bold">{okItems.length}</div>
            </div>
          </div>

          {inventory.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 text-lg">Chưa có danh mục nguyên liệu</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mã</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nguyên Liệu</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Tồn Kho</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Mức Tối Thiểu</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Trạng Thái</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventory.map((item) => {
                    const status = stockStatus(item.currentStock, item.minStock);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-600">{item.id}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{item.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`font-bold ${
                              status === 'critical'
                                ? 'text-red-600'
                                : status === 'warning'
                                  ? 'text-emerald-700'
                                  : 'text-green-600'
                            }`}
                          >
                            {item.currentStock} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {item.minStock} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {status === 'critical' && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              Hết hàng
                            </span>
                          )}
                          {status === 'warning' && (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                              Sắp hết
                            </span>
                          )}
                          {status === 'ok' && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              Đủ dùng
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => openPurchase(item.id)}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-sm font-semibold transition-colors"
                          >
                            Nhập kho
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900">
            <p className="font-bold">Kho sản phẩm theo luồng bán hàng</p>
            <p className="text-sm mt-1">
              Tách riêng theo <strong>Vị</strong> và <strong>Topping</strong>. Mỗi vị có 3 dung tích
              <strong> 360 / 500 / 700</strong>, trong mỗi dung tích có 3 size túi
              <strong> S / M / L</strong>.
            </p>
          </div>

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
            <div className="space-y-3">
              {smoothies.map((product) => (
                <div key={product.id} className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-gray-400 font-semibold">{product.id}</div>
                      <div className="font-bold text-gray-900">{product.name}</div>
                    </div>
                    <div className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full font-semibold">
                      Vị
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
                                  type="number"
                                  min="0"
                                  value={productInventory.smoothies[product.id]?.[variantKey] ?? 0}
                                  onChange={(e) =>
                                    setSmoothieVariantStock(
                                      product.id,
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
                </div>
              ))}
              {smoothies.length === 0 && (
                <div className="text-sm text-gray-500">Không có vị nào khớp tìm kiếm.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers3 className="w-5 h-5 text-emerald-700" />
              <h3 className="text-lg font-bold text-gray-800">Kho Topping</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {toppings.map((product) => (
                <div key={product.id} className="border rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs text-gray-400 font-semibold">{product.id}</div>
                      <div className="font-bold text-gray-900">{product.name}</div>
                    </div>
                    <span className="text-xs text-violet-700 bg-violet-50 px-2 py-1 rounded-full font-semibold">
                      Topping
                    </span>
                  </div>
                  <label className="block">
                    <div className="text-xs text-gray-500 font-semibold mb-1">Số lượng khả dụng</div>
                    <input
                      type="number"
                      min="0"
                      value={productInventory.toppings[product.id] ?? 0}
                      onChange={(e) => setToppingStock(product.id, Number(e.target.value || 0))}
                      className="w-full border rounded-lg px-3 py-2 font-bold text-gray-800 bg-white"
                    />
                  </label>
                </div>
              ))}
              {toppings.length === 0 && (
                <div className="text-sm text-gray-500">Không có topping nào khớp tìm kiếm.</div>
              )}
            </div>
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
