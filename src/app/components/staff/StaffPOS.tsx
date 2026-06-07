import { Search, Plus, ShoppingCart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { StaffModifierModal } from './StaffModifierModal';
import { ComboSubscriptionModal } from './ComboSubscriptionModal';
import type { CartItem } from './StaffModifierModal';

interface Product {
  id: string;
  name: string;
  category: 'smoothie' | 'combo' | 'topping';
  basePrice: number;
  image: string;
}

const products: Product[] = [
  { id: 'SM-001', name: 'Strawberry Blast', category: 'smoothie', basePrice: 45000, image: '🍓' },
  { id: 'SM-002', name: 'Mango Tango', category: 'smoothie', basePrice: 48000, image: '🥭' },
  { id: 'SM-003', name: 'Green Power', category: 'smoothie', basePrice: 52000, image: '🥬' },
  { id: 'SM-004', name: 'Berry Mix', category: 'smoothie', basePrice: 55000, image: '🫐' },
  { id: 'SM-005', name: 'Tropical Paradise', category: 'smoothie', basePrice: 50000, image: '🍍' },
  { id: 'SM-006', name: 'Avocado Dream', category: 'smoothie', basePrice: 58000, image: '🥑' },
  { id: 'SM-007', name: 'Protein Shake', category: 'smoothie', basePrice: 65000, image: '💪' },
  { id: 'SM-008', name: 'Banana Blast', category: 'smoothie', basePrice: 42000, image: '🍌' },
  { id: 'CB-001', name: 'Combo Tuần', category: 'combo', basePrice: 280000, image: '📦' },
  { id: 'CB-002', name: 'Combo Tháng', category: 'combo', basePrice: 950000, image: '📦' },
  { id: 'TP-001', name: 'Hạt Chia', category: 'topping', basePrice: 10000, image: '🌾' },
  { id: 'TP-002', name: 'Granola', category: 'topping', basePrice: 12000, image: '🥜' },
  { id: 'TP-003', name: 'Dừa Nạo', category: 'topping', basePrice: 8000, image: '🥥' },
  { id: 'TP-004', name: 'Mật Ong', category: 'topping', basePrice: 15000, image: '🍯' },
];

interface StaffPOSProps {
  onCheckout: (cart: CartItem[]) => void;
  clearCartTrigger: number;
}

export function StaffPOS({ onCheckout, clearCartTrigger }: StaffPOSProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'smoothie' | 'combo' | 'topping'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<{ type: 'weekly' | 'monthly', price: number } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Clear cart when checkout completes
  useEffect(() => {
    if (clearCartTrigger > 0) {
      setCart([]);
    }
  }, [clearCartTrigger]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (item: CartItem) => {
    setCart([...cart, item]);
    setSelectedProduct(null);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-4 pb-3 shadow-lg">
        <h1 className="text-xl font-bold mb-3">Bán Hàng</h1>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm món..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white focus:outline-none text-gray-800 shadow-md"
          />
        </div>

        {/* Tabs ở trong header */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'all', label: 'Tất Cả', icon: '🍹' },
            { id: 'smoothie', label: 'Smoothie', icon: '🥤' },
            { id: 'combo', label: 'Combo', icon: '📦' },
            { id: 'topping', label: 'Topping', icon: '✨' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl font-bold text-xs transition-all ${
                activeCategory === cat.id
                  ? 'bg-white text-emerald-700 shadow-lg scale-105'
                  : 'bg-white/20 text-white active:bg-white/30'
              }`}
            >
              <span className="text-2xl mb-1">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Khoảng cách giữa tabs và danh sách */}
      <div className="h-4 bg-gray-50"></div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => {
                if (product.category === 'combo') {
                  setSelectedCombo({
                    type: product.id === 'CB-001' ? 'weekly' : 'monthly',
                    price: product.basePrice
                  });
                } else {
                  setSelectedProduct(product);
                }
              }}
              className="bg-white rounded-2xl shadow-md hover:shadow-lg p-5 active:scale-95 transition-all border-2 border-gray-100"
            >
              <div className="text-6xl mb-4 text-center">{product.image}</div>
              <div className="text-base font-bold text-gray-800 mb-2 text-center line-clamp-2 min-h-[48px]">
                {product.name}
              </div>
              <div className="text-xl font-bold text-emerald-700 text-center mb-4">
                {product.basePrice.toLocaleString('vi-VN')}đ
              </div>
              <div className="bg-emerald-700 text-white rounded-xl py-3 text-base font-bold flex items-center justify-center gap-2 active:bg-emerald-800 shadow-lg">
                <Plus className="w-5 h-5" />
                {product.category === 'combo' ? 'Đăng Ký' : 'Thêm'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-4 z-20">
          <button
            onClick={() => onCheckout(cart)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-2xl flex items-center justify-between px-6 active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span>{cart.length} món</span>
            </div>
            <span className="text-sm opacity-90">Thanh Toán</span>
            <span className="font-bold">{totalAmount.toLocaleString('vi-VN')}đ</span>
          </button>
        </div>
      )}

      {selectedProduct && (
        <StaffModifierModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {selectedCombo && (
        <ComboSubscriptionModal
          comboType={selectedCombo.type}
          comboPrice={selectedCombo.price}
          onClose={() => setSelectedCombo(null)}
          onComplete={() => setSelectedCombo(null)}
        />
      )}
    </div>
  );
}
