import { Plus, Search, Droplets, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as api from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';
import { useMenuPricing } from '../../hooks/useMenuPricing';

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
  const { priceTable } = useMenuPricing();

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
    const prot = protein !== null ? protein : (proteinLevelsBySize[size]?.[0] || 20);
    const price = priceTable[size]?.[prot];
    if (price) return price;

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
    <div className="pos-product-grid flex flex-col h-full bg-gray-50 rounded-lg text-gray-800 min-h-0">
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
              className={`pos-cat-btn flex flex-col items-center justify-center rounded-lg font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              <div className="mb-0.5">{cat.icon}</div>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pos-search-input w-full pl-10 pr-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Khoảng cách */}
      <div className="h-2"></div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {activeCategory === 'smoothies' && !selectedSize ? (
          <div className="pos-step-wrap space-y-2">
            <div className="text-center">
              <h3 className="pos-step-title font-black text-gray-700">Chọn dung tích ly (ml)</h3>
              <p className="pos-step-desc text-gray-500 mt-0.5">Chọn kích cỡ để xem menu và giá</p>
            </div>
            <div className="pos-size-grid">
              {sizes.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSize(s.id)}
                  className="pos-size-card bg-white hover:bg-emerald-50/50 border-2 border-gray-200 hover:border-emerald-500 shadow-sm transition-all text-left flex flex-col group active:scale-95 cursor-pointer"
                >
                  <div className="pos-size-icon rounded-lg bg-emerald-100 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white flex items-center justify-center font-black transition-colors">
                    {s.id.replace('ml', '')}
                    <span className="text-[9px] ml-0.5 font-bold">ml</span>
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800">{s.label}</h4>
                    <p className="text-gray-500">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : activeCategory === 'smoothies' && selectedSize && selectedProtein === null ? (
          <div className="pos-step-wrap space-y-2">
            <div className="text-center">
              <h3 className="pos-step-title font-black text-gray-700">Chọn mức Protein (g)</h3>
              <p className="pos-step-desc text-gray-500 mt-0.5">Chọn hàm lượng protein</p>
            </div>
            <div className="pos-size-grid">
              {(proteinLevelsBySize[selectedSize] || [20, 40]).map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedProtein(level)}
                  className="pos-size-card bg-white hover:bg-emerald-50/50 border-2 border-gray-200 hover:border-emerald-500 shadow-sm transition-all text-left flex flex-col group active:scale-95 cursor-pointer"
                >
                  <div className="pos-size-icon rounded-lg bg-emerald-100 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white flex items-center justify-center font-black transition-colors">
                    {level}g
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800">{level}g Protein</h4>
                    <p className="text-gray-500">{proteinDesc[level] || 'Cân bằng dinh dưỡng'}</p>
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
          <div className="space-y-2">
            {activeCategory === 'smoothies' && selectedSize && (
              <div className="pos-filter-bar flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">{selectedSize}</span>
                  <span className="text-emerald-700 font-bold">{selectedProtein}g</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedProtein(null)}
                    className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-300 px-2 py-0.5 rounded"
                  >
                    Đổi Protein
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSize('');
                      setSelectedProtein(null);
                    }}
                    className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-300 px-2 py-0.5 rounded"
                  >
                    Đổi ly
                  </button>
                </div>
              </div>
            )}

            <div className="pos-flavor-grid">
              {filteredProducts.map(product => {
                const displayPrice = activeCategory === 'smoothies' && selectedSize
                  ? getProductPriceForSizeAndProtein(product, selectedSize, selectedProtein)
                  : product.basePrice;

                return (
                  <button
                    key={product.id}
                    type="button"
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
                    className="pos-flavor-card bg-white rounded-lg shadow hover:shadow-md transition-all flex flex-col items-center border border-gray-100 active:scale-95"
                  >
                    <div className="pos-flavor-img w-full aspect-square overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center">
                      {product.image && typeof product.image === 'string' && (product.image.startsWith('/') || product.image.startsWith('data:')) ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{product.image}</span>
                      )}
                    </div>
                    <div className="pos-flavor-name font-bold text-gray-800 text-center line-clamp-2 w-full">
                      {product.name}
                    </div>
                    <div className="pos-flavor-price font-bold text-emerald-700">
                      {displayPrice.toLocaleString('vi-VN')}đ
                    </div>
                    <div className="pos-flavor-add bg-emerald-700 text-white rounded-full p-1.5">
                      <Plus className="w-4 h-4" />
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

