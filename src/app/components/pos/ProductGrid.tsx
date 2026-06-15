import { Plus, Search, Droplets, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as api from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';

export interface Product {
  id: string;
  name: string;
  category: 'smoothies' | 'toppings' | 'combo';
  basePrice: number;
  image: string;
  description?: string;
}

interface ProductGridProps {
  onProductClick: (product: Product) => void;
}

export const getMenuProducts = (): Promise<Product[]> => {
  return api.fetchProducts();
};

const categories = [
  { id: 'smoothies', label: 'Smoothies', icon: <Droplets className="w-5 h-5" /> },
  { id: 'toppings', label: 'Toppings', icon: <Plus className="w-5 h-5" /> },
  { id: 'combo', label: 'Combo', icon: <Package className="w-5 h-5" /> },
];


export function ProductGrid({ onProductClick }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState<'smoothies' | 'toppings' | 'combo'>('smoothies');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedProtein, setSelectedProtein] = useState<number | null>(null);

  const sizes = [
    { id: '250ml', label: '250ml', desc: 'Ly nhỏ — buổi sáng nhẹ' },
    { id: '360ml', label: '360ml', desc: 'Ly vừa — phổ biến nhất' },
    { id: '500ml', label: '500ml', desc: 'Ly lớn — đầy đủ dinh dưỡng' },
    { id: '700ml', label: '700ml', desc: 'Ly siêu — tập luyện cường độ cao' },
  ];

  const proteinLevelsBySize: Record<string, number[]> = {
    '250ml': [20, 40],
    '360ml': [20, 40, 60],
    '500ml': [20, 40, 60],
    '700ml': [60, 90],
  };

  const proteinDesc: Record<number, string> = {
    20: 'Nhẹ nhàng, dễ tiêu hóa',
    40: 'Cân bằng dinh dưỡng',
    60: 'Tăng cường cơ bắp',
    90: 'Tối ưu cho vận động viên',
  };

  const getProductPriceForSizeAndProtein = (product: Product, size: string, protein: number | null) => {
    // Try to load custom price table from localStorage
    try {
      const savedPrices = localStorage.getItem('menuPriceTable');
      if (savedPrices) {
        const dynamicPriceTable = JSON.parse(savedPrices);
        const prot = protein !== null ? protein : (proteinLevelsBySize[size]?.[0] || 20);
        const price = dynamicPriceTable[size]?.[prot];
        if (price) return price;
      }
    } catch (e) {}

    // Fallback static pricing logic
    const prices = {
      '250ml': 39000,
      '360ml': 59000,
      '500ml': 79000,
      '700ml': 119000,
    };
    const base = prices[size as keyof typeof prices] || 59000;
    const diff = product.basePrice - 59000;
    return base + (diff > 0 ? diff : 0);
  };

  const { subscribe } = useSSE();

  useEffect(() => {
    // Load products from backend API
    api.fetchProducts()
      .then(data => setProducts(data))
      .catch(err => console.error('Failed to load products from backend:', err));

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

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
    };
  }, [subscribe]);

  const filteredProducts = products.filter(p => {
    const matchesCategory = p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg text-gray-800">
      <div className="bg-white p-1 rounded-t-lg shadow-sm flex-shrink-0 space-y-1.5">
        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id as any);
                if (cat.id !== 'smoothies') {
                  setSelectedSize('');
                  setSelectedProtein(null);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-emerald-700 text-white shadow-sm font-bold'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              <div className="mb-1 text-emerald-600">{cat.icon}</div>
              <span className="text-xs leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Khoảng cách */}
      <div className="h-2"></div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 lg:pb-4">
        {activeCategory === 'smoothies' && !selectedSize ? (
          /* Size selection screen first */
          <div className="space-y-4 py-6">
            <div className="text-center">
              <h3 className="text-lg font-black text-gray-700">Chọn dung tích ly trước (ml)</h3>
              <p className="text-xs text-gray-500 mt-1">Chọn kích cỡ ly bên dưới để xem menu và giá của các vị smoothies</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
              {sizes.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSize(s.id)}
                  className="bg-white hover:bg-emerald-50/50 p-6 rounded-2xl border-2 border-gray-200 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-95 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white flex items-center justify-center font-black text-sm mb-4 transition-colors">
                    {s.id.replace('ml', '')}
                    <span className="text-[10px] ml-0.5 font-bold">ml</span>
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 text-base">{s.label}</h4>
                    <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : activeCategory === 'smoothies' && selectedSize && selectedProtein === null ? (
          /* Step 2: Protein selection screen */
          <div className="space-y-4 py-6">
            <div className="text-center">
              <h3 className="text-lg font-black text-gray-700">Chọn mức Protein (g)</h3>
              <p className="text-xs text-gray-500 mt-1">Chọn hàm lượng protein để tiếp tục chọn vị sinh tố</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
              {(proteinLevelsBySize[selectedSize] || [20, 40]).map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedProtein(level)}
                  className="bg-white hover:bg-emerald-50/50 p-6 rounded-2xl border-2 border-gray-200 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-95 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white flex items-center justify-center font-black text-sm mb-4 transition-colors">
                    {level}g
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 text-base">{level}g Protein</h4>
                    <p className="text-xs text-gray-500 mt-1">{proteinDesc[level] || 'Cân bằng dinh dưỡng'}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="text-center mt-4">
              <button
                onClick={() => setSelectedSize('')}
                className="text-xs font-bold text-gray-500 hover:text-emerald-700 underline"
              >
                Quay lại bước chọn dung tích (ml)
              </button>
            </div>
          </div>
        ) : (
          /* Products Grid list (Flavors) */
          <div className="space-y-4">
            {activeCategory === 'smoothies' && selectedSize && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="text-emerald-700 font-extrabold text-sm">Size: {selectedSize}</span>
                  <span className="text-emerald-700 font-extrabold text-sm">Protein: {selectedProtein}g</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedProtein(null);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline bg-white border border-emerald-300 px-3 py-1 rounded-lg transition-colors active:scale-95 cursor-pointer"
                  >
                    Đổi Protein
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSize('');
                      setSelectedProtein(null);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline bg-white border border-emerald-300 px-3 py-1 rounded-lg transition-colors active:scale-95 cursor-pointer"
                  >
                    Đổi dung tích (ml)
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              {filteredProducts.map(product => {
                const displayPrice = activeCategory === 'smoothies' && selectedSize
                  ? getProductPriceForSizeAndProtein(product, selectedSize, selectedProtein)
                  : product.basePrice;

                return (
                  <button
                    key={product.id}
                    onClick={() => {
                      if (activeCategory === 'smoothies') {
                        onProductClick({ 
                          ...product, 
                          initialSize: selectedSize, 
                          initialProtein: selectedProtein 
                        } as any);
                      } else {
                        onProductClick(product);
                      }
                    }}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-5 flex flex-col items-center group hover:scale-105 border-2 border-gray-100"
                  >
                    <div className="w-full aspect-square mb-4 overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center">
                      {product.image && typeof product.image === 'string' && (product.image.startsWith('/') || product.image.startsWith('data:')) ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <span className="text-7xl">{product.image}</span>
                      )}
                    </div>
                    <div className="text-base font-bold text-gray-800 text-center mb-3 min-h-[48px] flex items-center line-clamp-2">
                      {product.name}
                    </div>
                    <div className="text-xl font-bold text-emerald-700 mb-3">
                      {displayPrice.toLocaleString('vi-VN')}đ
                    </div>
                    <div className="bg-emerald-700 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Plus className="w-6 h-6" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

