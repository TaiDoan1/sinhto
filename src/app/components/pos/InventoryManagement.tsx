import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Search,
  Save,
  AlertTriangle,
  CheckCircle2,
  History as HistoryIcon,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Coffee,
  Layers3,
  Truck,
  Plus,
  X,
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

const PRODUCT_VOLUMES = ['360ml', '500ml', '700ml'];
const PRODUCT_SIZES = ['S', 'M', 'L'];

const EMPTY_PRODUCT_INVENTORY: ProductInventoryState = {
  smoothies: {},
  toppings: {},
};

export function InventoryManagement({ branchId }: InventoryManagementProps) {
  const { inventory, movements, updateInventoryStock, purchaseStock, isWarehouseReady } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'check' | 'products' | 'history'>('check');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState<string>('');
  const [note, setNote] = useState<string>('');

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

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const flavorItems = filteredInventory.filter(item => item.category !== 'topping');
  const toppingItems = filteredInventory.filter(item => item.category === 'topping');

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

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setNewValue(item.currentStock.toString());
    setNote('');
  };

  const handleSave = (itemId: string) => {
    const val = parseFloat(newValue);
    if (isNaN(val)) return alert('Vui lòng nhập số hợp lệ');

    // In a real app, we'd get the current staff name
    updateInventoryStock(itemId, val, 'Nhân viên POS', note || 'Kiểm kho định kỳ');
    setEditingId(null);
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
    if (!branchId) return;
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

  const renderItemCard = (item: typeof inventory[number]) => (
    <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border-2 transition-all ${
      item.currentStock <= item.minStock ? 'border-amber-200' : 'border-transparent'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.id}</div>
          <h3 className="text-lg font-black text-gray-900">{item.name}</h3>
        </div>
        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
          item.category === 'fruit' ? 'bg-orange-100 text-orange-600' :
          item.category === 'dairy' ? 'bg-blue-100 text-blue-600' :
          item.category === 'protein' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
        }`}>
          {item.category}
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-500 font-bold">Tồn kho hiện tại</div>
          <div className={`text-3xl font-black ${
            item.currentStock <= item.minStock ? 'text-amber-600' : 'text-emerald-700'
          }`}>
            {item.currentStock} <span className="text-sm font-bold text-gray-400">{item.unit}</span>
          </div>
        </div>
        {item.currentStock <= item.minStock && (
          <div className="flex flex-col items-center text-amber-600">
            <AlertTriangle className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-black uppercase">Sắp hết</span>
          </div>
        )}
      </div>

      {editingId === item.id ? (
        <div className="space-y-3 animate-in slide-in-from-top-2">
          <div className="flex gap-2">
            <input
              autoFocus
              type="number"
              step="0.01"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              placeholder="Số lượng thực tế..."
            />
            <button
              onClick={() => handleSave(item.id)}
              className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
            >
              <Save className="w-5 h-5" />
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="p-3 bg-gray-100 text-gray-400 rounded-xl hover:bg-gray-200"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs"
            placeholder="Ghi chú (tùy chọn)..."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleStartEdit(item)}
            className="py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Box className="w-4 h-4" /> Kiểm kho
          </button>
          <button
            onClick={() => openPurchase(item.id)}
            className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" /> Nhập kho
          </button>
        </div>
      )}
    </div>
  );

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
            onClick={() => setActiveSubTab('products')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
              activeSubTab === 'products' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Layers3 className="w-4 h-4" />
            Kho Sản Phẩm
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

        <div className="flex items-center gap-2">
          {activeSubTab === 'check' && (
            <>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm nguyên liệu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={() => openPurchase()}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nhập Kho
              </button>
            </>
          )}
          {activeSubTab === 'products' && (
            <button
              type="button"
              onClick={saveProductInventory}
              disabled={productSaving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {productSaving ? 'Đang lưu...' : 'Lưu kho sản phẩm'}
            </button>
          )}
        </div>
      </div>

      {!isWarehouseReady && activeSubTab !== 'history' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-sm font-bold">
          ⚠️ Chưa có phiếu nhập kho tại chi nhánh này — bấm "Nhập Kho" ở tab Kiểm Kho để mở khóa bán hàng.
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSubTab === 'check' ? (
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Coffee className="w-5 h-5 text-emerald-700" />
                <h3 className="text-lg font-black text-gray-800">Nguyên Liệu Vị</h3>
                <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full font-black">
                  {flavorItems.length}
                </span>
              </div>
              {flavorItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400">
                  Không có nguyên liệu vị nào khớp tìm kiếm.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {flavorItems.map(item => renderItemCard(item))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers3 className="w-5 h-5 text-violet-700" />
                <h3 className="text-lg font-black text-gray-800">Nguyên Liệu Topping</h3>
                <span className="text-xs text-violet-700 bg-violet-100 px-2 py-1 rounded-full font-black">
                  {toppingItems.length}
                </span>
              </div>
              {toppingItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400">
                  Không có nguyên liệu topping nào khớp tìm kiếm.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {toppingItems.map(item => renderItemCard(item))}
                </div>
              )}
            </div>
          </div>
        ) : activeSubTab === 'products' ? (
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
                {smoothieProducts.map((product) => (
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
                {smoothieProducts.length === 0 && (
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
                {toppingProducts.map((product) => (
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
                {toppingProducts.length === 0 && (
                  <div className="text-sm text-gray-500">Không có topping nào khớp tìm kiếm.</div>
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
                  <optgroup label="Vị">
                    {inventory
                      .filter((item) => item.category !== 'topping')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} (còn {item.currentStock} {item.unit})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Topping">
                    {inventory
                      .filter((item) => item.category === 'topping')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} (còn {item.currentStock} {item.unit})
                        </option>
                      ))}
                  </optgroup>
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
