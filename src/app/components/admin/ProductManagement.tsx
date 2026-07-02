'use client';
import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, X, Settings, List, Coffee, Globe, Upload, CheckCircle2, Clock, QrCode } from 'lucide-react';
import * as api from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';
import {
  PRODUCT_IMAGE_PICKER_OPTIONS,
  isUploadedImage,
  normalizeImageUrl,
} from '../../config/images';
import { DEFAULT_MENU_PRICE_TABLE } from '../../config/menuPricing';

interface Product {
  id: string;
  name: string;
  category: 'smoothies' | 'toppings' | 'combo';
  basePrice: number;
  image: string;
  description?: string;
}

const defaultPriceTable = DEFAULT_MENU_PRICE_TABLE;

const availableImages = PRODUCT_IMAGE_PICKER_OPTIONS;

export function ProductManagement() {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'prices' | 'toppings' | 'payment' | 'sync'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [priceTable, setPriceTable] = useState<any>(defaultPriceTable);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    category: 'smoothies',
    image: '🍓',
    basePrice: 0
  });
  const [comboToppings, setComboToppings] = useState<any[]>([]);
  const [paymentQrImageUrl, setPaymentQrImageUrl] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success'>('idle');
  const [quickEntryText, setQuickEntryText] = useState('');

  const { subscribe } = useSSE();

  useEffect(() => {
    api.fetchProducts()
      .then(data => setProducts(data))
      .catch(err => console.error('Failed to load products:', err));

    api.fetchSetting('menuPriceTable')
      .then((data) => { if (data) setPriceTable(data); })
      .catch(() => {});

    api.fetchSetting('menuComboToppings')
      .then((data) => { if (Array.isArray(data)) setComboToppings(data); })
      .catch(() => {});

    api.fetchSetting('paymentQrImageUrl')
      .then((data) => { if (typeof data === 'string') setPaymentQrImageUrl(data); })
      .catch(() => {});

    const unsubCreate = subscribe('PRODUCT_CREATED', (data) => {
      setProducts(prev => {
        if (prev.some(p => p.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    const unsubUpdate = subscribe('PRODUCT_UPDATED', (data) => {
      setProducts(prev => prev.map(p => p.id === data.id ? data : p));
    });

    const unsubDelete = subscribe('PRODUCT_DELETED', (data) => {
      setProducts(prev => prev.filter(p => p.id !== data.id));
    });

    const unsubSetting = subscribe('SETTING_UPDATED', (data: { key: string; value: unknown }) => {
      if (data?.key === 'paymentQrImageUrl') {
        setPaymentQrImageUrl(typeof data.value === 'string' ? data.value : '');
      }
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
      unsubSetting();
    };
  }, [subscribe]);

  const saveComboToppings = (updated: any[]) => {
    setComboToppings(updated);
  };

  const savePrices = (updated: any) => {
    setPriceTable(updated);
  };

  const handleUpdatePrice = (size: string, protein: number, price: number) => {
    const newTable = { ...priceTable };
    newTable[size][protein] = price;
    savePrices(newTable);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name) return alert('Vui lòng nhập tên món!');
    const product: Product = {
      id: `${newProduct.category === 'toppings' ? 'TP' : 'SM'}-${Date.now()}`,
      name: newProduct.name,
      category: newProduct.category as any,
      basePrice: newProduct.category === 'smoothies' ? 0 : Number(newProduct.basePrice || 0),
      image: newProduct.image || '🥤',
      description: newProduct.description || ''
    };
    try {
      await api.saveProduct(product);
      setShowAddModal(false);
      setNewProduct({ category: 'smoothies', image: '🍓', basePrice: 0 });
    } catch (err) {
      console.error('Failed to add product:', err);
      alert('Lỗi lưu sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    const payload = editingProduct.category === 'smoothies'
      ? { ...editingProduct, basePrice: 0 }
      : editingProduct;
    try {
      await api.saveProduct(payload);
      setEditingProduct(null);
    } catch (err) {
      console.error('Failed to update product:', err);
      alert('Lỗi cập nhật sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Xóa món này?')) return;
    try {
      await api.deleteProduct(id);
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Lỗi xóa sản phẩm.');
    }
  };

  const handlePublishMenu = async () => {
    try {
      await Promise.all([
        api.saveSetting('menuPriceTable', priceTable),
        api.saveSetting('menuComboToppings', comboToppings),
      ]);
      const now = new Date().toISOString();
      setLastSyncTime(now);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      alert('Đồng bộ thất bại. Kiểm tra backend đang chạy.');
    }
  };

  const handleQuickEntry = async () => {
    if (!quickEntryText.trim()) return;
    const lines = quickEntryText.trim().split('\n').filter(l => l.trim());
    const newItems: Product[] = [];
    lines.forEach(line => {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const price = parseInt(parts[1].replace(/[^0-9]/g, ''), 10) || 0;
        const catRaw = (parts[2] || 'smoothies').toLowerCase();
        const category: Product['category'] =
          catRaw.includes('topping') ? 'toppings' :
          catRaw.includes('combo') ? 'combo' : 'smoothies';
        newItems.push({
          id: `QE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name, category, basePrice: price, image: '🥤',
        });
      }
    });
    if (newItems.length === 0) return alert('Định dạng không đúng. Vui lòng dùng: Tên | Giá | Loại (smoothies/toppings/combo)');
    try {
      for (const item of newItems) {
        await api.saveProduct(item);
      }
      setQuickEntryText('');
      await handlePublishMenu();
      alert(`Đã thêm ${newItems.length} sản phẩm và đồng bộ menu.`);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi thêm sản phẩm nhanh.');
    }
  };

  const handleUploadPaymentQr = async (file: File) => {
    try {
      const imageUrl = normalizeImageUrl(await api.uploadImage(file));
      setPaymentQrImageUrl(imageUrl);
      await api.saveSetting('paymentQrImageUrl', imageUrl);
      alert('✅ Đã cập nhật QR thanh toán!');
    } catch (err) {
      console.error(err);
      alert('Lỗi upload QR. Vui lòng thử lại.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header & Tabs */}
      <div className="border-b pb-4 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Quản lý Sản phẩm & Thực đơn</h2>
            <p className="text-sm text-gray-500">Thiết lập món, giá các size và combo toppings cho POS & Khách hàng</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-md"
          >
            <Plus className="w-5 h-5" /> Thêm sản phẩm mới
          </button>
        </div>

        <div className="flex gap-4">
          {[
            { id: 'products', label: 'Sinh tố & Món chính', icon: <Coffee className="w-4 h-4" /> },
            { id: 'toppings', label: 'Combo Topping', icon: <List className="w-4 h-4" /> },
            { id: 'prices', label: 'Bảng giá Size (ml)', icon: <Settings className="w-4 h-4" /> },
            { id: 'payment', label: 'Thanh toán (QR)', icon: <QrCode className="w-4 h-4" /> },
            { id: 'sync', label: 'Đồng bộ Cửa hàng', icon: <Globe className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 px-1 font-bold text-sm transition-all border-b-2 ${
                activeSubTab === tab.id
                  ? tab.id === 'sync'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-emerald-700 text-emerald-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main product view tab */}
      {activeSubTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.filter(p => p.category !== 'toppings').map(product => (
            <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-150 flex gap-4 group hover:shadow-lg transition-all relative">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0 border">
                {product.image && typeof product.image === 'string' && (product.image.startsWith('/') || product.image.startsWith('data:')) ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{product.image}</span>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">{product.category}</span>
                  <h3 className="font-extrabold text-gray-800 truncate mt-1 text-sm">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{product.description || 'Chưa có mô tả'}</p>
                </div>
                <p className="text-emerald-750 font-black text-sm">
                  {product.category === 'smoothies'
                    ? 'Miễn phí (giá theo size)'
                    : `${product.basePrice.toLocaleString('vi-VN')}đ`}
                </p>
              </div>

              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingProduct(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Combos management tab */}
      {activeSubTab === 'toppings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Single Toppings */}
          <div className="space-y-4">
            <h3 className="font-black text-gray-800 border-b pb-2 text-base">Topping Lẻ</h3>
            <div className="grid grid-cols-1 gap-2">
              {products.filter(p => p.category === 'toppings').map(topping => (
                <div key={topping.id} className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-sm font-bold text-gray-800">{topping.name}</span>
                    <span className="text-xs text-gray-500 block mt-0.5">Mã: {topping.id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-emerald-700">
                      {topping.basePrice <= 0 ? 'Miễn phí' : `${topping.basePrice.toLocaleString()}đ`}
                    </span>
                    <button onClick={() => handleDeleteProduct(topping.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 className="w-4.5 h-4.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Combo Toppings */}
          <div className="space-y-4">
            <h3 className="font-black text-gray-800 border-b pb-2 text-base">Combo Toppings</h3>
            <div className="grid grid-cols-1 gap-3">
              {comboToppings.map(combo => (
                <div key={combo.id} className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm">{combo.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{combo.items}</p>
                    {combo.save && (
                      <span className="inline-block mt-2 bg-red-150 text-red-700 text-[9px] font-black px-2 py-0.5 rounded-full">Tiết kiệm {combo.save.toLocaleString()}đ</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-emerald-800 block">{combo.price.toLocaleString()}đ</span>
                    {combo.originalPrice && (
                      <span className="text-xs text-gray-400 line-through block mt-0.5">{combo.originalPrice.toLocaleString()}đ</span>
                    )}
                    <button onClick={() => {
                      if (confirm('Xóa combo này?')) {
                        const newList = comboToppings.filter(c => c.id !== combo.id);
                        saveComboToppings(newList);
                      }
                    }} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg mt-2 inline-block"><Trash2 className="w-4.5 h-4.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prices tab */}
      {activeSubTab === 'prices' && (
        <div className="bg-gray-50 p-6 rounded-xl border">
          <div className="space-y-6">
            {Object.keys(priceTable).map(size => (
              <div key={size} className="bg-white p-5 rounded-xl border">
                <h3 className="font-black text-gray-800 mb-4 border-b pb-2 uppercase tracking-wider text-xs">Size {size}</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.keys(priceTable[size]).map(protein => (
                    <div key={protein} className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-400">{protein}g Protein</label>
                      <input
                        type="number"
                        value={priceTable[size][protein]}
                        onChange={e => handleUpdatePrice(size, Number(protein), Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-xl font-bold text-sm text-emerald-800 focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'payment' && (
        <div className="bg-gray-50 p-6 rounded-xl border">
          <h3 className="text-lg font-black text-gray-800 mb-2">QR thanh toán</h3>
          <p className="text-sm text-gray-500 mb-4">
            Admin upload QR (ảnh) để POS hiển thị ở bước thanh toán QR.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="bg-white p-4 rounded-xl border">
              <div className="text-xs font-bold text-gray-400 mb-2">Preview</div>
              <div className="aspect-square bg-gray-50 border rounded-xl overflow-hidden flex items-center justify-center">
                {paymentQrImageUrl ? (
                  <img
                    src={paymentQrImageUrl}
                    alt="QR thanh toán"
                    className="w-full h-full object-contain bg-white"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <QrCode className="w-16 h-16 mx-auto" />
                    <div className="text-sm font-bold mt-2">Chưa có QR</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border space-y-3">
              <div>
                <div className="text-xs font-bold text-gray-400 mb-1">QR hiện tại</div>
                <div className="text-sm font-mono break-all text-gray-700">
                  {paymentQrImageUrl || '(trống)'}
                </div>
              </div>

              <label className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload QR mới</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleUploadPaymentQr(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Xóa QR thanh toán?')) return;
                  setPaymentQrImageUrl('');
                  try {
                    await api.saveSetting('paymentQrImageUrl', '');
                  } catch {}
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-bold"
              >
                Xóa QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-650"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Thêm sản phẩm mới</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Tên món</label>
                <input type="text" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-3.5 py-2 border rounded-xl focus:outline-none" placeholder="Tên sinh tố, hoặc topping..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Phân loại</label>
                  <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})} className="w-full px-3.5 py-2 border rounded-xl focus:outline-none">
                    <option value="smoothies">Sinh tố</option>
                    <option value="toppings">Topping lẻ</option>
                    <option value="combo">Combo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Giá bán cơ bản (đ)</label>
                  {newProduct.category === 'smoothies' ? (
                    <p className="w-full px-3.5 py-2 border rounded-xl bg-gray-50 text-sm font-bold text-emerald-700">
                      Miễn phí — giá tính theo bảng Size & Protein
                    </p>
                  ) : (
                    <input type="number" value={newProduct.basePrice || ''} onChange={e => setNewProduct({...newProduct, basePrice: Number(e.target.value)})} className="w-full px-3.5 py-2 border rounded-xl focus:outline-none font-bold" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400">Hình ảnh / Biểu tượng đại diện</label>
                <div className="flex gap-2">
                  <select value={isUploadedImage(newProduct.image || '') ? 'custom' : newProduct.image} onChange={e => {
                    if (e.target.value !== 'custom') {
                      setNewProduct({...newProduct, image: e.target.value});
                    }
                  }} className="flex-1 px-3.5 py-2 border rounded-xl focus:outline-none">
                    {availableImages.map(img => <option key={img.path} value={img.path}>{img.label} {img.path.length <= 4 ? `(${img.path})` : ''}</option>)}
                    {isUploadedImage(newProduct.image || '') && <option value="custom">Ảnh tự upload (Đang dùng)</option>}
                  </select>
                  <label className="bg-gray-100 hover:bg-gray-200 border cursor-pointer px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                    <Upload className="w-4 h-4 text-gray-650" />
                    <span>Tải ảnh</span>
                    <input type="file" accept="image/*" onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const imageUrl = normalizeImageUrl(await api.uploadImage(file));
                          setNewProduct({...newProduct, image: imageUrl});
                        } catch (err) {
                          console.error(err);
                          alert('Lỗi upload ảnh lên server!');
                        }
                      }
                    }} className="hidden" />
                  </label>
                </div>
                {newProduct.image && (newProduct.image.startsWith('/') || newProduct.image.startsWith('data:')) && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={newProduct.image} alt="Preview" className="w-12 h-12 rounded-lg object-cover border" />
                    <span className="text-xs text-gray-400">Ảnh xem trước</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Mô tả món</label>
                <textarea value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full px-3.5 py-2 border rounded-xl focus:outline-none resize-none" rows={3} placeholder="Mô tả công dụng hoặc hương vị..." />
              </div>
              <button onClick={handleAddProduct} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95">Xác nhận Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-650"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Chỉnh sửa sản phẩm</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Tên món</label>
                <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full px-3.5 py-2 border rounded-xl focus:outline-none font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Phân loại</label>
                  <select value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})} className="w-full px-3.5 py-2 border rounded-xl focus:outline-none" disabled>
                    <option value="smoothies">Sinh tố</option>
                    <option value="toppings">Topping lẻ</option>
                    <option value="combo">Combo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Giá bán cơ bản (đ)</label>
                  {editingProduct.category === 'smoothies' ? (
                    <p className="w-full px-3.5 py-2 border rounded-xl bg-gray-50 text-sm font-bold text-emerald-700">
                      Miễn phí — giá tính theo bảng Size & Protein
                    </p>
                  ) : (
                    <input type="number" value={editingProduct.basePrice} onChange={e => setEditingProduct({...editingProduct, basePrice: Number(e.target.value)})} className="w-full px-3.5 py-2 border rounded-xl focus:outline-none font-bold text-emerald-800" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400">Hình ảnh / Biểu tượng đại diện</label>
                <div className="flex gap-2">
                  <select value={isUploadedImage(editingProduct.image || '') ? 'custom' : editingProduct.image} onChange={e => {
                    if (e.target.value !== 'custom') {
                      setEditingProduct({...editingProduct, image: e.target.value});
                    }
                  }} className="flex-1 px-3.5 py-2 border rounded-xl focus:outline-none">
                    {availableImages.map(img => <option key={img.path} value={img.path}>{img.label} {img.path.length <= 4 ? `(${img.path})` : ''}</option>)}
                    {isUploadedImage(editingProduct.image || '') && <option value="custom">Ảnh tự upload (Đang dùng)</option>}
                  </select>
                  <label className="bg-gray-100 hover:bg-gray-200 border cursor-pointer px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                    <Upload className="w-4 h-4 text-gray-650" />
                    <span>Tải ảnh</span>
                    <input type="file" accept="image/*" onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const imageUrl = normalizeImageUrl(await api.uploadImage(file));
                          setEditingProduct({...editingProduct, image: imageUrl});
                        } catch (err) {
                          console.error(err);
                          alert('Lỗi upload ảnh lên server!');
                        }
                      }
                    }} className="hidden" />
                  </label>
                </div>
                {editingProduct.image && (editingProduct.image.startsWith('/') || editingProduct.image.startsWith('data:')) && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={editingProduct.image} alt="Preview" className="w-12 h-12 rounded-lg object-cover border" />
                    <span className="text-xs text-gray-400">Ảnh xem trước</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Mô tả món</label>
                <textarea value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full px-3.5 py-2 border rounded-xl focus:outline-none resize-none" rows={3} />
              </div>
              <button onClick={handleSaveEdit} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95">Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {/* Store Sync tab */}
      {activeSubTab === 'sync' && (
        <div className="space-y-6">

          {/* Status Banner */}
          <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
            syncStatus === 'success'
              ? 'bg-emerald-50 border-emerald-400'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-3">
              {syncStatus === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <Globe className="w-6 h-6 text-blue-600" />
              )}
              <div>
                <div className="font-extrabold text-gray-800 text-sm">
                  {syncStatus === 'success' ? '✅ Đã đồng bộ thành công!' : 'Đồng bộ Menu Cửa hàng'}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {lastSyncTime
                    ? `Lần cuối: ${new Date(lastSyncTime).toLocaleString('vi-VN')}`
                    : 'Chưa đồng bộ lần nào'}
                </div>
              </div>
            </div>
            <button
              onClick={handlePublishMenu}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-transform text-sm"
            >
              <Upload className="w-4 h-4" />
              Xuất bản Menu
            </button>
          </div>

          {/* Quick Entry */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-black text-gray-800 text-sm mb-1">⚡ Nhập sản phẩm nhanh</h3>
            <p className="text-xs text-gray-400 mb-3">
              Nhập mỗi dòng 1 sản phẩm theo định dạng: <code className="bg-gray-100 px-1 rounded">Tên | Giá | Loại</code><br />
              Ví dụ: <code className="bg-gray-100 px-1 rounded">Sinh tố Bơ | 55000 | smoothies</code>
            </p>
            <textarea
              value={quickEntryText}
              onChange={e => setQuickEntryText(e.target.value)}
              rows={6}
              placeholder={`Strawberry Blast | 45000 | smoothies
Mango Tango | 48000 | smoothies
Hạt Chia | 10000 | toppings
Combo Tuần | 280000 | combo`}
              className="w-full px-3.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 font-mono text-sm resize-none bg-gray-50"
            />
            <button
              onClick={handleQuickEntry}
              disabled={!quickEntryText.trim()}
              className="mt-3 w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Thêm & Xuất bản ngay
            </button>
          </div>

          {/* Current product summary */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-black text-gray-800 text-sm mb-3">📋 Menu hiện tại ({products.length} sản phẩm)</h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {products.map(p => (
                <div key={p.id} className="flex justify-between items-center text-sm py-1.5 px-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.image.startsWith('/') ? '🖼️' : p.image}</span>
                    <span className="font-semibold text-gray-700">{p.name}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{p.category}</span>
                  </div>
                  <span className="font-bold text-emerald-700">{p.basePrice.toLocaleString()}đ</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-bold mb-1">💡 Lưu ý đồng bộ</p>
            <ul className="space-y-1 text-xs text-amber-700 list-disc ml-4">
              <li>Sau khi <strong>Xuất bản Menu</strong>, tất cả thiết bị POS, Nhân viên và Khách hàng sẽ tự động nhận menu mới.</li>
              <li>Sử dụng <strong>Nhập sản phẩm nhanh</strong> để nhập nhiều món cùng lúc từ bảng Excel/Google Sheet.</li>
              <li>Giá size sẽ áp dụng theo bảng giá trong tab <strong>Bảng giá Size</strong>.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
