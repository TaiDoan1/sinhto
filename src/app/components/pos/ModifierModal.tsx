import { X, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ModifierModalProps {
  product: {
    id: string;
    name: string;
    basePrice: number;
    image: string;
  };
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export interface CartItem {
  productId: string;
  productName: string;
  size: string;
  protein: number;
  toppings: string[];
  price: number;
  quantity: number;
  name?: string; // For special names like Combo Week
  isCustomCombo?: boolean;
  rawComboData?: any;
}

const sizes = [
  { id: '250ml', label: '250ml' },
  { id: '360ml', label: '360ml' },
  { id: '500ml', label: '500ml' },
  { id: '700ml', label: '700ml' },
];

const priceTable: Record<string, Record<number, number>> = {
  '250ml': { 20: 39000, 40: 59000 },
  '360ml': { 20: 59000, 40: 79000, 60: 99000 },
  '500ml': { 20: 79000, 40: 99000, 60: 119000 },
  '700ml': { 60: 139000, 90: 159000 },
};

const proteinLevelsBySize: Record<string, number[]> = {
  '250ml': [20, 40],
  '360ml': [20, 40, 60],
  '500ml': [20, 40, 60],
  '700ml': [60, 90],
};

const toppings = [
  { name: 'Sữa hạt 100%', price: 15000 },
  { name: 'Sữa A2', price: 20000 },
  { name: 'Bột đậu hà lan', price: 20000 },
  { name: 'Whey Gold Standard', price: 39000 },
  { name: 'Collagen', price: 49000 },
  { name: 'Yến mạch', price: 10000 },
  { name: 'Hạt chia', price: 10000 },
  { name: 'Dừa sấy giòn', price: 10000 },
  { name: 'Cỏ ngọt', price: 10000 },
  { name: 'Mật ong', price: 15000 },
  { name: 'Mật mía', price: 3000 },
  { name: 'Chà là', price: 5000 },
  { name: 'Bơ hạnh nhân', price: 10000 },
  { name: 'Bơ đậu phộng', price: 20000 },
  { name: 'Bơ hạt điều', price: 15000 }
];


export function ModifierModal({ product, onClose, onAddToCart }: ModifierModalProps) {
  const [selectedSize, setSelectedSize] = useState('360ml');
  const [selectedProtein, setSelectedProtein] = useState(40);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [dynamicPriceTable, setDynamicPriceTable] = useState<any>(priceTable);
  const [dynamicToppings, setDynamicToppings] = useState<any[]>(toppings);

  useEffect(() => {
    const savedPrices = localStorage.getItem('menuPriceTable');
    if (savedPrices) setDynamicPriceTable(JSON.parse(savedPrices));

    const savedProducts = localStorage.getItem('menuProducts');
    if (savedProducts) {
      const allProducts = JSON.parse(savedProducts);
      const toppingItems = allProducts.filter((p: any) => p.category === 'toppings');
      if (toppingItems.length > 0) {
        setDynamicToppings(toppingItems.map((p: any) => ({ name: p.name, price: p.basePrice })));
      }
    }
  }, []);


  const toggleTopping = (topping: string) => {
    setSelectedToppings(prev =>
      prev.includes(topping)
        ? prev.filter(t => t !== topping)
        : [...prev, topping]
    );
  };

  const calculatePrice = () => {
    const tablePrice = dynamicPriceTable[selectedSize]?.[selectedProtein] || product.basePrice;
    const toppingsExtra = selectedToppings.reduce((sum, name) => {
      const topping = dynamicToppings.find(t => t.name === name);
      return sum + (topping?.price || 0);
    }, 0);
    return tablePrice + toppingsExtra;
  };



  const handleAddToCart = () => {
    onAddToCart({
      productId: product.id,
      productName: product.name,
      size: selectedSize,
      protein: selectedProtein,
      toppings: selectedToppings,
      price: calculatePrice(),
      quantity: 1
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-white/20 bg-emerald-100 flex items-center justify-center">
              {product.image.startsWith('/') ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">{product.image}</span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{product.name}</h2>

              <p className="text-sm opacity-90">Tùy chỉnh sản phẩm của bạn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Kích Thước</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sizes.map(size => (
                <button
                  key={size.id}
                  onClick={() => {
                    setSelectedSize(size.id);
                    const available = proteinLevelsBySize[size.id];
                    if (!available.includes(selectedProtein)) {
                      setSelectedProtein(available[0]);
                    }
                  }}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    selectedSize === size.id
                      ? 'bg-emerald-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {size.label}
                </button>

              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Mức Protein (g)</h3>
            <div className="flex flex-wrap gap-2">
              {proteinLevelsBySize[selectedSize]?.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedProtein(level)}
                  className={`py-2.5 px-6 rounded-xl font-bold transition-all text-sm ${
                    selectedProtein === level
                      ? 'bg-emerald-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {level}g
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3 italic">
              * Mức Protein khả dụng cho size {selectedSize} theo thực đơn FitBlend
            </p>
          </div>


          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              Toppings ({selectedToppings.length} đã chọn)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {dynamicToppings.map(topping => (
                <button
                  key={topping.name}
                  onClick={() => toggleTopping(topping.name)}
                  className={`py-2 px-3 rounded-lg font-medium transition-all text-sm relative ${
                    selectedToppings.includes(topping.name)
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectedToppings.includes(topping.name) && (
                    <Check className="w-4 h-4 absolute top-1 right-1" />
                  )}
                  <div className="text-[10px] leading-tight mb-1 opacity-70">+{topping.price.toLocaleString()}đ</div>
                  {topping.name}
                </button>
              ))}
            </div>


          </div>
        </div>

        <div className="bg-gray-50 p-6 flex justify-between items-center border-t">
          <div>
            <div className="text-sm text-gray-600">Tổng tiền</div>
            <div className="text-3xl font-bold text-emerald-700">
              {calculatePrice().toLocaleString('vi-VN')}đ
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all"
          >
            Thêm Vào Giỏ
          </button>
        </div>
      </div>
    </div>
  );
}
