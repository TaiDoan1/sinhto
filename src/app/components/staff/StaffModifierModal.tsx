import { X, Plus, Minus, Check } from 'lucide-react';
import { useState } from 'react';

export interface CartItem {
  productId: string;
  productName: string;
  size: string;
  protein: number;
  toppings: string[];
  price: number;
  quantity: number;
}

interface StaffModifierModalProps {
  product: {
    id: string;
    name: string;
    basePrice: number;
    image: string;
  };
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

const sizes = [
  { id: '250ml', label: '250ml', multiplier: 1 },
  { id: '350ml', label: '350ml', multiplier: 1.2 },
  { id: '500ml', label: '500ml', multiplier: 1.5 },
  { id: '700ml', label: '700ml', multiplier: 2 },
];

const proteinLevels = [20, 30, 40, 50, 60, 70, 80, 90];

const toppings = [
  'Hạt Chia', 'Granola', 'Dừa Nạo', 'Mật Ong', 'Hạnh Nhân',
  'Óc Chó', 'Nho Khô', 'Chuối Sấy', 'Dâu Khô', 'Bơ Đậu Phộng',
  'Siro Caramel', 'Siro Chocolate', 'Whipped Cream', 'Socola Chip', 'Trân Châu'
];

export function StaffModifierModal({ product, onClose, onAddToCart }: StaffModifierModalProps) {
  const [selectedSize, setSelectedSize] = useState('350ml');
  const [selectedProtein, setSelectedProtein] = useState(30);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const toggleTopping = (topping: string) => {
    setSelectedToppings(prev =>
      prev.includes(topping)
        ? prev.filter(t => t !== topping)
        : [...prev, topping]
    );
  };

  const calculatePrice = () => {
    const sizeMultiplier = sizes.find(s => s.id === selectedSize)?.multiplier || 1;
    const proteinExtra = (selectedProtein - 20) * 500;
    const toppingsExtra = selectedToppings.length * 10000;
    return Math.round(product.basePrice * sizeMultiplier + proteinExtra + toppingsExtra);
  };

  const handleAddToCart = () => {
    onAddToCart({
      productId: product.id,
      productName: product.name,
      size: selectedSize,
      protein: selectedProtein,
      toppings: selectedToppings,
      price: calculatePrice(),
      quantity: quantity
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-h-[92vh] overflow-hidden">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="text-5xl">{product.image}</div>
              <div>
                <h2 className="text-xl font-bold">{product.name}</h2>
                <p className="text-sm opacity-90">Tùy chỉnh sản phẩm</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(92vh-200px)] bg-gray-50">
          <div className="mb-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-emerald-700 rounded"></span>
              Kích Thước
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {sizes.map(size => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id)}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                    selectedSize === size.id
                      ? 'bg-emerald-700 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 border border-gray-200 active:bg-gray-50'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-green-600 rounded"></span>
              Mức Protein
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {proteinLevels.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedProtein(level)}
                  className={`py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    selectedProtein === level
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border border-gray-200 active:bg-gray-50'
                  }`}
                >
                  {level}g
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 ml-1">
              +{((selectedProtein - 20) * 500).toLocaleString('vi-VN')}đ (mỗi 10g = +5.000đ)
            </p>
          </div>

          <div className="mb-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-emerald-600 rounded"></span>
              Toppings
              {selectedToppings.length > 0 && (
                <span className="text-sm bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  {selectedToppings.length} đã chọn
                </span>
              )}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {toppings.map(topping => (
                <button
                  key={topping}
                  onClick={() => toggleTopping(topping)}
                  className={`py-2.5 px-2 rounded-xl font-medium text-xs transition-all relative ${
                    selectedToppings.includes(topping)
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border border-gray-200 active:bg-gray-50'
                  }`}
                >
                  {selectedToppings.includes(topping) && (
                    <Check className="w-3 h-3 absolute top-1 right-1" />
                  )}
                  {topping}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 ml-1">Mỗi topping: +10.000đ</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-3">Số Lượng</h3>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity === 1}
                className="w-12 h-12 bg-gray-100 disabled:opacity-40 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-3xl font-bold w-16 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 bg-emerald-700 text-white rounded-full flex items-center justify-center active:scale-90 transition-transform"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-5 flex justify-between items-center shadow-lg">
          <div>
            <div className="text-xs text-gray-500 mb-1">Tổng tiền</div>
            <div className="text-2xl font-bold text-emerald-700">
              {(calculatePrice() * quantity).toLocaleString('vi-VN')}đ
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Thêm Vào Giỏ
          </button>
        </div>
      </div>
    </div>
  );
}
