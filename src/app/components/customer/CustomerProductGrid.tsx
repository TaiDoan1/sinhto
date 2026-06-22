'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, X, Zap, Droplets, Package, ChevronRight, ChevronLeft } from 'lucide-react';
import * as api from '../../utils/api';
import { useMenu } from '../../contexts/MenuContext';
import { useMenuPricing } from '../../hooks/useMenuPricing';

// Inline product data based on FitBlend menu
const defaultProducts: CustomerProduct[] = [
  { id: 'SM-01', name: 'Dâu hạt chia', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Chia · Giảm mỡ' },
  { id: 'SM-02', name: 'Dâu chuối', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Banana · Tone dáng' },
  { id: 'SM-03', name: 'Mãng cầu dâu', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Soursop Strawberry · Detox' },
  { id: 'SM-04', name: 'Dâu cam', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Orange · Vitamin C' },
  { id: 'SM-05', name: 'Dâu tằm hạt chia', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Mulberry Chia · Chống oxy hoá' },
  { id: 'SM-06', name: 'Phúc bồn tử hạt chia', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Raspberry Chia · Năng lượng' },
  { id: 'SM-07', name: 'Chuối hạt chia', category: 'smoothies' as const, basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Banana Chia · Tăng cơ' },
  { id: 'SM-08', name: 'Chanh dây chuối', category: 'smoothies' as const, basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Passionfruit Banana · Refresh' },
  { id: 'SM-09', name: 'Xoài thơm', category: 'smoothies' as const, basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Mango Pineapple · Tropical' },
  { id: 'SM-10', name: 'Xoài cam', category: 'smoothies' as const, basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Mango Orange · Vitamin' },
  { id: 'SM-11', name: 'Cacao yến mạch', category: 'smoothies' as const, basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Cacao Oat · Năng lượng bền' },
  { id: 'SM-12', name: 'Cà phê chuối', category: 'smoothies' as const, basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Coffee Banana · Pre-workout' },
  { id: 'SM-13', name: 'Bơ', category: 'smoothies' as const, basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Avocado · Healthy fat' },
  { id: 'SM-14', name: 'Bơ chuối', category: 'smoothies' as const, basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Avocado Banana · Siêu béo tốt' },
  { id: 'SM-15', name: 'Matcha', category: 'smoothies' as const, basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Matcha · Antioxidant' },

  { id: 'TP-01', name: 'Sữa hạt 100%', category: 'toppings' as const, basePrice: 15000, image: '🥛' },
  { id: 'TP-02', name: 'Sữa A2', category: 'toppings' as const, basePrice: 20000, image: '🥛' },
  { id: 'TP-03', name: 'Bột đậu hà lan', category: 'toppings' as const, basePrice: 20000, image: '🫛' },
  { id: 'TP-04', name: 'Whey Gold Standard', category: 'toppings' as const, basePrice: 39000, image: '💪' },
  { id: 'TP-05', name: 'Collagen', category: 'toppings' as const, basePrice: 49000, image: '✨' },
  { id: 'TP-06', name: 'Yến mạch', category: 'toppings' as const, basePrice: 10000, image: '🌾' },
  { id: 'TP-07', name: 'Hạt chia', category: 'toppings' as const, basePrice: 10000, image: '🌾' },
  { id: 'TP-08', name: 'Dừa sấy giòn', category: 'toppings' as const, basePrice: 10000, image: '🥥' },
  { id: 'TP-09', name: 'Cỏ ngọt', category: 'toppings' as const, basePrice: 10000, image: '🌿' },
  { id: 'TP-10', name: 'Mật ong', category: 'toppings' as const, basePrice: 15000, image: '🍯' },
  { id: 'TP-11', name: 'Mật mía', category: 'toppings' as const, basePrice: 3000, image: '🍯' },
  { id: 'TP-12', name: 'Chà là', category: 'toppings' as const, basePrice: 5000, image: '🌴' },
  { id: 'TP-13', name: 'Bơ hạnh nhân', category: 'toppings' as const, basePrice: 10000, image: '🥜' },
  { id: 'TP-14', name: 'Bơ đậu phộng', category: 'toppings' as const, basePrice: 20000, image: '🥜' },
  { id: 'TP-15', name: 'Bơ hạt điều', category: 'toppings' as const, basePrice: 15000, image: '🥜' },

  { id: 'CB-01', name: 'Fat Loss Plan', category: 'combo' as const, basePrice: 449000, image: '📦', description: 'Giảm mỡ 7 ngày' },
  { id: 'CB-02', name: 'Muscle Build Plan', category: 'combo' as const, basePrice: 669000, image: '📦', description: 'Tăng cơ 7 ngày' },
  { id: 'CB-03', name: 'Elite Mass Plan', category: 'combo' as const, basePrice: 899000, image: '📦', description: 'Tăng cân 7 ngày' },
];

export interface CustomerProduct {
  id: string;
  name: string;
  category: 'smoothies' | 'toppings' | 'combo';
  basePrice: number;
  image: string;
  description?: string;
}

interface Props {
  onProductClick: (product: CustomerProduct & { initialSize?: string; initialProtein?: number | null }) => void;
  onComboClick: () => void;
}

const categoryConfig = [
  { key: 'smoothies', label: 'Smoothies', emoji: '🥤', color: '#00b14f' },
  { key: 'toppings',  label: 'Toppings',  emoji: '🍯', color: '#fbbf24' },
  { key: 'combo',     label: 'Combo',     emoji: '📦', color: '#a78bfa' },
];

export function CustomerProductGrid({ onProductClick, onComboClick }: Props) {
  const { products: menuProducts } = useMenu();
  const { priceTable } = useMenuPricing();
  const [products, setProducts] = useState<CustomerProduct[]>(defaultProducts);
  const [activeCategory, setActiveCategory] = useState<'smoothies' | 'toppings' | 'combo'>('smoothies');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Size & Protein flow
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedProtein, setSelectedProtein] = useState<number | null>(null);

  const sizes = [
    { id: '250ml', label: 'Nhỏ (250ml)', desc: 'Cho buổi sáng nhẹ nhàng' },
    { id: '360ml', label: 'Vừa (360ml)', desc: 'Kích cỡ ly phổ biến nhất' },
    { id: '500ml', label: 'Lớn (500ml)', desc: 'Dinh dưỡng dồi dào cả ngày' },
    { id: '700ml', label: 'Siêu (700ml)', desc: 'Cực đại cho tập luyện nặng' },
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
    60: 'Tăng cơ chuyên sâu',
    90: 'Tối ưu cho vận động viên',
  };

  const getProductPriceForSizeAndProtein = (product: CustomerProduct, size: string, protein: number | null) => {
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

  useEffect(() => {
    if (menuProducts.length > 0) {
      setProducts(menuProducts as CustomerProduct[]);
      return;
    }
    api.fetchProducts()
      .then((data) => {
        if (data && data.length > 0) setProducts(data);
      })
      .catch(() => {});
  }, [menuProducts]);

  const filtered = products.filter(p => {
    const matchCat = p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col h-full bg-white text-zinc-900">
      
      {/* Category Tabs */}
      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {categoryConfig.map(cat => (
          <button
            key={cat.key}
            onClick={() => {
              setActiveCategory(cat.key as any);
              if (cat.key !== 'smoothies') {
                setSelectedSize('');
                setSelectedProtein(null);
              }
            }}
            className="flex items-center gap-1.5 px-4.5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            style={activeCategory === cat.key
              ? { background: '#00b14f', color: '#fff', boxShadow: '0 8px 16px rgba(0,177,79,0.2)' }
              : { background: '#f4f4f5', color: '#71717a' }
            }
          >
            <span>{cat.emoji}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Search Bar - only shown if not in size/protein selection phase */}
      {(activeCategory !== 'smoothies' || (selectedSize && selectedProtein !== null)) && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm lẻ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold outline-none transition-all bg-zinc-100 border border-zinc-200/50 focus:border-[#00b14f] focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto px-4 pb-28" style={{ scrollbarWidth: 'none' }}>
        
        {/* Step 1: Size selection screen first */}
        {activeCategory === 'smoothies' && !selectedSize && (
          <div className="py-4 space-y-4 animate-fade-in">
            <div className="text-center py-2">
              <h3 className="text-lg font-black text-zinc-800">Chọn dung tích ly (ml)</h3>
              <p className="text-xs text-zinc-400 mt-1">Chọn kích cỡ ly của bạn để xem menu vị sinh tố tương ứng</p>
            </div>
            <div className="grid gap-3">
              {sizes.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSize(s.id)}
                  className="w-full bg-zinc-50 hover:bg-emerald-50/30 p-5 rounded-[22px] border border-zinc-200/60 hover:border-[#00b14f] transition-all text-left flex items-center justify-between group active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100/50 text-[#00b14f] flex items-center justify-center font-black text-sm group-hover:bg-[#00b14f] group-hover:text-white transition-colors">
                      {s.id.replace('ml', '')}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-zinc-800 text-sm">{s.label}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-450 group-hover:text-[#00b14f] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Protein selection screen */}
        {activeCategory === 'smoothies' && selectedSize && selectedProtein === null && (
          <div className="py-4 space-y-4 animate-fade-in">
            <div className="text-center py-2">
              <h3 className="text-lg font-black text-zinc-800">Chọn mức Protein (g)</h3>
              <p className="text-xs text-zinc-400 mt-1">Hàm lượng đạm thịt gà được tích hợp trực tiếp</p>
            </div>
            <div className="grid gap-3">
              {(proteinLevelsBySize[selectedSize] || [20, 40]).map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedProtein(level)}
                  className="w-full bg-zinc-50 hover:bg-emerald-50/30 p-5 rounded-[22px] border border-zinc-200/60 hover:border-[#00b14f] transition-all text-left flex items-center justify-between group active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100/50 text-[#00b14f] flex items-center justify-center font-black text-sm group-hover:bg-[#00b14f] group-hover:text-white transition-colors">
                      {level}g
                    </div>
                    <div>
                      <h4 className="font-extrabold text-zinc-800 text-sm">{level}g Protein</h4>
                      <p className="text-[11px] text-zinc-450 mt-0.5">{proteinDesc[level] || 'Cân bằng dinh dưỡng'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-450 group-hover:text-[#00b14f] transition-colors" />
                </button>
              ))}
            </div>
            <div className="text-center pt-2">
              <button
                onClick={() => setSelectedSize('')}
                className="text-xs font-bold text-zinc-400 hover:text-[#00b14f] underline"
              >
                Quay lại bước chọn size (ml)
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Product grid list of flavors */}
        {(activeCategory !== 'smoothies' || (selectedSize && selectedProtein !== null)) && (
          <div className="space-y-4 animate-fade-in">
            {activeCategory === 'smoothies' && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-[20px] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-[#00b14f] font-black text-xs bg-white px-2.5 py-1 rounded-lg border border-emerald-100 shadow-sm">{selectedSize}</span>
                  <span className="text-[#00b14f] font-black text-xs bg-white px-2.5 py-1 rounded-lg border border-emerald-100 shadow-sm">{selectedProtein}g Protein</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedSize('');
                    setSelectedProtein(null);
                  }}
                  className="text-xs font-bold text-[#00b14f] hover:underline"
                >
                  Thay đổi
                </button>
              </div>
            )}

            {/* List of Flavors in Full Width Cards */}
            <div className="grid gap-3 animate-fade-in">
              {filtered.map(product => {
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
                        });
                      } else if (product.category === 'combo') {
                        onComboClick();
                      } else {
                        onProductClick(product);
                      }
                    }}
                    className="w-full bg-zinc-50 hover:bg-emerald-50/30 p-5 rounded-[22px] border border-zinc-200/60 hover:border-[#00b14f] transition-all text-left flex items-center justify-between group active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      {/* Image placeholder */}
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-200/50 flex items-center justify-center flex-shrink-0">
                        {product.image && typeof product.image === 'string' && (product.image.startsWith('/') || product.image.startsWith('data:')) ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="text-2xl">{product.image}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-zinc-800 text-sm leading-tight">{product.name}</h4>
                        {product.description && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">{product.description}</p>
                        )}
                        <span className="font-black text-xs text-[#00b14f] block mt-1">
                          {displayPrice.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-450 group-hover:text-[#00b14f] transition-colors" />
                  </button>
                );
              })}

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center text-zinc-400">
                  <span className="text-4xl mb-2">🥤</span>
                  <p className="font-bold text-sm">Chưa có sản phẩm phù hợp</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
      ` }} />
    </div>
  );
}
