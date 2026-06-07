'use client';
import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Save, X, Image as ImageIcon, Check, Settings, List, Coffee } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: 'smoothies' | 'toppings' | 'combo';
  basePrice: number;
  image: string;
  description?: string;
}

const defaultPriceTable = {
  '250ml': { 20: 39000, 40: 59000 },
  '360ml': { 20: 59000, 40: 79000, 60: 99000 },
  '500ml': { 20: 79000, 40: 99000, 60: 119000 },
  '700ml': { 60: 139000, 90: 159000 },
};

const availableImages = [
  { path: '/images/strawberry_smoothie.png', label: 'Dâu Tây' },
  { path: '/images/mango_smoothie.png', label: 'Xoài/Nhiệt đới' },
  { path: '/images/cacao_oat_smoothie.png', label: 'Cacao/Cà phê' },
  { path: '/images/fitblend_hero_smoothie.png', label: 'Bơ/Matcha' },
  { path: '/images/fitblend_combo_bottles.png', label: 'Combo/Chai' },
];

export function MenuManagement() {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'prices' | 'toppings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [priceTable, setPriceTable] = useState<any>(defaultPriceTable);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    category: 'smoothies',
    image: '/images/strawberry_smoothie.png',
    basePrice: 79000
  });

  useEffect(() => {
    const savedProducts = localStorage.getItem('menuProducts');
    if (savedProducts) setProducts(JSON.parse(savedProducts));

    const savedPrices = localStorage.getItem('menuPriceTable');
    if (savedPrices) setPriceTable(JSON.parse(savedPrices));
  }, []);

  const saveProducts = (updated: Product[]) => {
    localStorage.setItem('menuProducts', JSON.stringify(updated));
    setProducts(updated);
    window.dispatchEvent(new Event('menuUpdated'));
  };

  const savePrices = (updated: any) => {
    localStorage.setItem('menuPriceTable', JSON.stringify(updated));
    setPriceTable(updated);
    window.dispatchEvent(new Event('menuUpdated'));
  };

  const handleUpdatePrice = (size: string, protein: number, price: number) => {
    const newTable = { ...priceTable };
    newTable[size][protein] = price;
    savePrices(newTable);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 rounded-xl overflow-hidden">
      {/* Header & Tabs */}
      <div className="bg-white border-b px-6 pt-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Quản lý Thực đơn</h2>
            <p className="text-sm text-gray-500">Thiết lập món, giá size và toppings cho toàn hệ thống</p>
          </div>
          {activeSubTab === 'products' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg"
            >
              <Plus className="w-5 h-5" /> Thêm món mới
            </button>
          )}
        </div>

        <div className="flex gap-6">
          {[
            { id: 'products', label: 'Danh sách món', icon: <Coffee className="w-4 h-4" /> },
            { id: 'prices', label: 'Bảng giá Size', icon: <Settings className="w-4 h-4" /> },
            { id: 'toppings', label: 'Toppings', icon: <List className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 px-1 font-bold text-sm transition-all border-b-2 ${
                activeSubTab === tab.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeSubTab === 'products' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.filter(p => p.category !== 'toppings').map(product => (
              <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 group hover:shadow-md transition-all">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-emerald-50 flex-shrink-0">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{product.category}</span>
                      <h3 className="font-bold text-gray-800 truncate">{product.name}</h3>
                      <p className="text-emerald-700 font-extrabold">{product.basePrice.toLocaleString('vi-VN')}đ</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingProduct(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => {
                        const newList = products.filter(p => p.id !== product.id);
                        saveProducts(newList);
                      }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeSubTab === 'prices' ? (
          <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-4xl">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Thiết lập bảng giá Size & Protein</h3>
            <div className="space-y-8">
              {Object.entries(priceTable).map(([size, levels]: [string, any]) => (
                <div key={size} className="border-b pb-6 last:border-0">
                  <h4 className="font-extrabold text-emerald-700 text-lg mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    SIZE {size}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(levels).map(([protein, price]: [string, any]) => (
                      <div key={protein} className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">{protein}G Protein</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={price}
                            onChange={(e) => handleUpdatePrice(size, parseInt(protein), parseInt(e.target.value))}
                            className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">đ</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-xl flex gap-3 items-start">
              <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Lưu ý: Thay đổi giá ở đây sẽ cập nhật lập tức cho tất cả các vị Smoothies có trên hệ thống. 
                Đảm bảo mức giá khớp với menu giấy tại cửa hàng.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {products.filter(p => p.category === 'toppings').map(topping => (
              <div key={topping.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-2xl">{topping.image}</div>
                  <div>
                    <h3 className="font-bold text-gray-800">{topping.name}</h3>
                    <input
                      type="number"
                      value={topping.basePrice}
                      onChange={(e) => {
                        const newList = products.map(p => p.id === topping.id ? {...p, basePrice: parseInt(e.target.value)} : p);
                        saveProducts(newList);
                      }}
                      className="w-24 p-1 text-emerald-700 font-extrabold bg-transparent border-b border-transparent focus:border-emerald-500 outline-none"
                    />
                    <span className="text-emerald-700 font-extrabold text-sm">đ</span>
                  </div>
                </div>
                <button onClick={() => {
                  const newList = products.filter(p => p.id !== topping.id);
                  saveProducts(newList);
                }} className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Product Modal (Keep as before, but with image selection) */}
      {(editingProduct || showAddModal) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-emerald-600 text-white">
              <h3 className="text-xl font-bold">{editingProduct ? 'Chỉnh sửa món' : 'Thêm món mới'}</h3>
              <button onClick={() => { setEditingProduct(null); setShowAddModal(false); }}><X /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên món</label>
                <input
                  type="text"
                  value={editingProduct?.name || newProduct.name || ''}
                  onChange={e => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Hình ảnh sản phẩm</label>
                <div className="grid grid-cols-5 gap-2">
                  {availableImages.map(img => (
                    <button
                      key={img.path}
                      onClick={() => editingProduct ? setEditingProduct({...editingProduct, image: img.path}) : setNewProduct({...newProduct, image: img.path})}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        (editingProduct?.image === img.path || newProduct.image === img.path) ? 'border-emerald-500 scale-105' : 'border-transparent'
                      }`}
                    >
                      <img src={img.path} className="w-full h-full object-cover" />
                      {(editingProduct?.image === img.path || newProduct.image === img.path) && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"><Check className="text-white w-6 h-6" /></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button onClick={() => { setEditingProduct(null); setShowAddModal(false); }} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600">Hủy</button>
              <button onClick={() => {
                if (editingProduct) {
                  const newList = products.map(p => p.id === editingProduct.id ? editingProduct : p);
                  saveProducts(newList);
                  setEditingProduct(null);
                } else if (newProduct.name) {
                  const item = { ...newProduct, id: `SM-${Date.now()}` } as Product;
                  saveProducts([...products, item]);
                  setShowAddModal(false);
                }
              }} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

