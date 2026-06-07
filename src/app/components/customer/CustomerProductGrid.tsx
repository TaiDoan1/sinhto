'use client';
import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';

// Inline product data based on FitBlend menu
const defaultProducts: CustomerProduct[] = [
  { id: 'SM-01', name: 'Dâu hạt chia', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Chia' },
  { id: 'SM-02', name: 'Dâu chuối', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Banana' },
  { id: 'SM-03', name: 'Mãng cầu dâu', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Soursop Strawberry' },
  { id: 'SM-04', name: 'Dâu cam', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Orange' },
  { id: 'SM-05', name: 'Dâu tằm hạt chia', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Mulberry Chia' },
  { id: 'SM-06', name: 'Phúc bồn tử hạt chia', category: 'smoothies' as const, basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Raspberry Chia' },
  { id: 'SM-07', name: 'Chuối hạt chia', category: 'smoothies' as const, basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Banana Chia' },
  { id: 'SM-08', name: 'Chanh dây chuối', category: 'smoothies' as const, basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Passionfruit Banana' },
  { id: 'SM-09', name: 'Xoài thơm', category: 'smoothies' as const, basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Mango Pineapple' },
  { id: 'SM-10', name: 'Xoài cam', category: 'smoothies' as const, basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Mango Orange' },
  { id: 'SM-11', name: 'Cacao yến mạch', category: 'smoothies' as const, basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Cacao Oat' },
  { id: 'SM-12', name: 'Cà phê chuối', category: 'smoothies' as const, basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Coffee Banana' },
  { id: 'SM-13', name: 'Bơ', category: 'smoothies' as const, basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Avocado' },
  { id: 'SM-14', name: 'Bơ chuối', category: 'smoothies' as const, basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Avocado Banana' },
  { id: 'SM-15', name: 'Matcha', category: 'smoothies' as const, basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Matcha' },

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
  onProductClick: (product: CustomerProduct) => void;
  onComboClick: () => void;
}

const categoryConfig: Record<string, { label: string; emoji: string }> = {
  all: { label: 'Tất cả', emoji: '✨' },
  smoothies: { label: 'Smoothies', emoji: '🥤' },
  toppings: { label: 'Toppings', emoji: '🍯' },
  combo: { label: 'Combo', emoji: '📦' },
};

export function CustomerProductGrid({ onProductClick, onComboClick }: Props) {
  const [products, setProducts] = useState<CustomerProduct[]>(defaultProducts);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = () => {
      // Force update if data contains old emojis
      try {
        const saved = localStorage.getItem('menuProducts');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Check if data is old (contains emojis instead of image paths)
          const isOldData = parsed.some((p: any) => p.image && !p.image.startsWith('/') && p.category === 'smoothies');
          if (isOldData) {
            localStorage.setItem('menuProducts', JSON.stringify(defaultProducts));
            setProducts(defaultProducts);
            return;
          }
          setProducts(parsed);
        } else {
          setProducts(defaultProducts);
        }
      } catch {
        setProducts(defaultProducts);
      }
    };

    loadData();
    window.addEventListener('menuUpdated', loadData);
    return () => window.removeEventListener('menuUpdated', loadData);
  }, []);



  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm món yêu thích..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar">
        {Object.entries(categoryConfig).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
              activeCategory === key
                ? 'bg-gray-900 text-white shadow-lg'
                : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <span>{val.emoji}</span> {val.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => item.category === 'combo' ? onComboClick() : onProductClick(item)}
              className="group bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-50 hover:border-emerald-100 text-left flex flex-col active:scale-95"
            >
              <div className="aspect-square bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl mb-3 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                {item.image.startsWith('/') ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl sm:text-6xl">{item.image}</span>
                )}
              </div>

              <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">{item.name}</h3>
              {item.description && (
                <p className="text-xs text-gray-400 mb-2 line-clamp-1">{item.description}</p>
              )}
              <div className="mt-auto flex items-center justify-between pt-1">
                <span className="font-extrabold text-emerald-700 text-sm">{item.basePrice.toLocaleString('vi-VN')}đ</span>
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-emerald-200">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
