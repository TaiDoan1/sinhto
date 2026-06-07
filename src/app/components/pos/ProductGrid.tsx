import { Plus, Search, Droplets, Package } from 'lucide-react';
import { useState, useEffect } from 'react';

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

const defaultProducts: Product[] = [
  { id: 'SM-01', name: 'Dâu hạt chia', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Chia' },
  { id: 'SM-02', name: 'Dâu chuối', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Banana' },
  { id: 'SM-03', name: 'Mãng cầu dâu', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Soursop Strawberry' },
  { id: 'SM-04', name: 'Dâu cam', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Orange' },
  { id: 'SM-05', name: 'Dâu tằm hạt chia', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Mulberry Chia' },
  { id: 'SM-06', name: 'Phúc bồn tử hạt chia', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Raspberry Chia' },
  { id: 'SM-07', name: 'Chuối hạt chia', category: 'smoothies', basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Banana Chia' },
  { id: 'SM-08', name: 'Chanh dây chuối', category: 'smoothies', basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Passionfruit Banana' },
  { id: 'SM-09', name: 'Xoài thơm', category: 'smoothies', basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Mango Pineapple' },
  { id: 'SM-10', name: 'Xoài cam', category: 'smoothies', basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Mango Orange' },
  { id: 'SM-11', name: 'Cacao yến mạch', category: 'smoothies', basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Cacao Oat' },
  { id: 'SM-12', name: 'Cà phê chuối', category: 'smoothies', basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Coffee Banana' },
  { id: 'SM-13', name: 'Bơ', category: 'smoothies', basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Avocado' },
  { id: 'SM-14', name: 'Bơ chuối', category: 'smoothies', basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Avocado Banana' },
  { id: 'SM-15', name: 'Matcha', category: 'smoothies', basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Matcha' },

  { id: 'TP-01', name: 'Sữa hạt 100%', category: 'toppings', basePrice: 15000, image: '🥛' },
  { id: 'TP-02', name: 'Sữa A2', category: 'toppings', basePrice: 20000, image: '🥛' },
  { id: 'TP-03', name: 'Bột đậu hà lan', category: 'toppings', basePrice: 20000, image: '🫛' },
  { id: 'TP-04', name: 'Whey Gold Standard', category: 'toppings', basePrice: 39000, image: '💪' },
  { id: 'TP-05', name: 'Collagen', category: 'toppings', basePrice: 49000, image: '✨' },
  { id: 'TP-06', name: 'Yến mạch', category: 'toppings', basePrice: 10000, image: '🌾' },
  { id: 'TP-07', name: 'Hạt chia', category: 'toppings', basePrice: 10000, image: '🌾' },
  { id: 'TP-08', name: 'Dừa sấy giòn', category: 'toppings', basePrice: 10000, image: '🥥' },
  { id: 'TP-09', name: 'Cỏ ngọt', category: 'toppings', basePrice: 10000, image: '🌿' },
  { id: 'TP-10', name: 'Mật ong', category: 'toppings', basePrice: 15000, image: '🍯' },
  { id: 'TP-11', name: 'Mật mía', category: 'toppings', basePrice: 3000, image: '🍯' },
  { id: 'TP-12', name: 'Chà là', category: 'toppings', basePrice: 5000, image: '🌴' },
  { id: 'TP-13', name: 'Bơ hạnh nhân', category: 'toppings', basePrice: 10000, image: '🥜' },
  { id: 'TP-14', name: 'Bơ đậu phộng', category: 'toppings', basePrice: 20000, image: '🥜' },
  { id: 'TP-15', name: 'Bơ hạt điều', category: 'toppings', basePrice: 15000, image: '🥜' },

  { id: 'CB-01', name: 'Fat Loss Plan', category: 'combo', basePrice: 449000, image: '📦', description: 'Giảm mỡ 7 ngày' },
  { id: 'CB-02', name: 'Muscle Build Plan', category: 'combo', basePrice: 669000, image: '📦', description: 'Tăng cơ 7 ngày' },
  { id: 'CB-03', name: 'Elite Mass Plan', category: 'combo', basePrice: 899000, image: '📦', description: 'Tăng cân 7 ngày' },
];

// Initialize products in localStorage if not exists or if data is old (emojis)
const initializeProducts = () => {
  const existing = localStorage.getItem('menuProducts');
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      // Check if data is old (contains emojis instead of image paths)
      const isOldData = parsed.some((p: any) => p.image && !p.image.startsWith('/') && p.category === 'smoothies');
      if (isOldData) {
        localStorage.setItem('menuProducts', JSON.stringify(defaultProducts));
        return;
      }
    } catch (e) {}
  } else {
    localStorage.setItem('menuProducts', JSON.stringify(defaultProducts));
  }
};


export const getMenuProducts = (): Product[] => {
  const saved = localStorage.getItem('menuProducts');
  return saved ? JSON.parse(saved) : defaultProducts;
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

  useEffect(() => {
    const loadData = () => {
      initializeProducts();
      // Force update if data contains old emojis
      try {
        const saved = localStorage.getItem('menuProducts');
        if (saved) {
          const parsed = JSON.parse(saved);
          const isOldData = parsed.some((p: any) => p.image && !p.image.startsWith('/') && p.category === 'smoothies');
          if (isOldData) {
            setProducts(defaultProducts);
          } else {
            setProducts(parsed);
          }
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



  const filteredProducts = products.filter(p => {
    const matchesCategory = p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg">
      <div className="bg-white p-1 rounded-t-lg shadow-sm flex-shrink-0 space-y-1.5">
        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-emerald-700 text-white shadow-sm'
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
        <div className="grid grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => onProductClick(product)}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-5 flex flex-col items-center group hover:scale-105 border-2 border-gray-100"
            >
              <div className="w-full aspect-square mb-4 overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center">
                {product.image.startsWith('/') ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <span className="text-7xl">{product.image}</span>
                )}
              </div>
              <div className="text-base font-bold text-gray-800 text-center mb-3 min-h-[48px] flex items-center line-clamp-2">
                {product.name}
              </div>
              <div className="text-xl font-bold text-emerald-700 mb-3">
                {product.basePrice.toLocaleString('vi-VN')}đ
              </div>
              <div className="bg-emerald-700 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <Plus className="w-6 h-6" />
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
