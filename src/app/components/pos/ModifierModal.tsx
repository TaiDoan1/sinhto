import { X, Check, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useMenu } from '../../contexts/MenuContext';
import { useMenuPricing } from '../../hooks/useMenuPricing';
import { useInventory } from '../../contexts/InventoryContext';

interface ModifierModalProps {
  product: {
    id: string;
    name: string;
    basePrice: number;
    image: string;
    category?: string;
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
  name?: string;
  isCustomCombo?: boolean;
  rawComboData?: any;
}

const COMBO_TOPPINGS = [
  { id: 'healthy-boost', name: 'Healthy Boost', items: 'Yến mạch + Hạt chia + Cỏ ngọt', price: 25000, originalPrice: 30000, save: 5000 },
  { id: 'protein-plus', name: 'Protein Plus', items: 'Whey Gold + Sữa A2', price: 49000, originalPrice: 59000, save: 10000 },
  { id: 'beauty-blend', name: 'Beauty Blend', items: 'Collagen + Sữa hạt + Mật ong', price: 65000, originalPrice: 79000, save: 14000 },
  { id: 'nutty-crunch', name: 'Nutty Crunch', items: 'Bơ đậu phộng + Dừa sấy + Chà là', price: 29000, originalPrice: 35000, save: 6000 },
];

const defaultToppings = [
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
  { name: 'Bơ hạt điều', price: 15000 },
];

const priceTable: Record<string, Record<number, number>> = {
  '250ml': { 20: 39000, 40: 59000 },
  '360ml': { 20: 59000, 40: 79000, 60: 99000 },
  '500ml': { 20: 79000, 40: 99000, 60: 119000 },
  '700ml': { 60: 139000, 90: 159000 },
};

export function ModifierModal({ product, onClose, onAddToCart }: ModifierModalProps) {
  const initialSize = (product as any).initialSize || '360ml';
  const initialProtein = (product as any).initialProtein !== undefined && (product as any).initialProtein !== null
    ? (product as any).initialProtein
    : 20;

  const [selectedSize] = useState(initialSize);
  const [selectedProtein] = useState<number>(initialProtein);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);
  const { products } = useMenu();
  const { priceTable: dynamicPriceTable, comboToppings: comboListFromApi } = useMenuPricing();
  const dynamicToppings = products
    .filter((p) => p.category === 'toppings')
    .map((p) => ({ name: p.name, price: p.basePrice }));
  const comboList = (comboListFromApi as typeof COMBO_TOPPINGS).length > 0
    ? (comboListFromApi as typeof COMBO_TOPPINGS)
    : COMBO_TOPPINGS;
  const toppingsList = dynamicToppings.length > 0 ? dynamicToppings : defaultToppings;
  const priceLookup = Object.keys(dynamicPriceTable).length > 0 ? dynamicPriceTable : priceTable;
  const { checkCartStock, formatShortageMessage, isWarehouseReady } = useInventory();

  const toggleTopping = (topping: string) => {
    setSelectedToppings(prev =>
      prev.includes(topping) ? prev.filter(t => t !== topping) : [...prev, topping]
    );
  };

  const toggleCombo = (comboId: string) => {
    setSelectedCombos(prev =>
      prev.includes(comboId) ? prev.filter(c => c !== comboId) : [...prev, comboId]
    );
  };

  const calculatePrice = () => {
    const tablePrice = priceLookup[selectedSize]?.[selectedProtein] || product.basePrice;
    
    // Topping lẻ
    const toppingsExtra = selectedToppings.reduce((sum, name) => {
      const topping = toppingsList.find(t => t.name === name);
      return sum + (topping?.price || 0);
    }, 0);

    // Combo toppings
    const comboExtra = selectedCombos.reduce((sum, comboId) => {
      const combo = comboList.find(c => c.id === comboId);
      return sum + (combo?.price || 0);
    }, 0);

    return tablePrice + toppingsExtra + comboExtra;
  };

  const handleAddToCart = () => {
    const finalToppingsList: string[] = [];
    
    selectedCombos.forEach(comboId => {
      const combo = comboList.find(c => c.id === comboId);
      if (combo) {
        finalToppingsList.push(`Combo Topping: ${combo.name}`);
      }
    });

    selectedToppings.forEach(tName => {
      finalToppingsList.push(tName);
    });

    const line = {
      productId: product.id,
      productName: product.name,
      size: selectedSize,
      protein: selectedProtein,
      toppings: finalToppingsList,
      quantity: 1,
    };

    if (!isWarehouseReady) {
      alert('Chưa nhập kho. Admin cần nhập nguyên liệu trước khi bán.');
      return;
    }

    const check = checkCartStock([line]);
    if (!check.ok) {
      alert(`Không đủ nguyên liệu:\n${formatShortageMessage(check.shortages)}`);
      return;
    }

    onAddToCart({
      productId: product.id,
      productName: product.name,
      size: selectedSize,
      protein: selectedProtein,
      toppings: finalToppingsList,
      price: calculatePrice(),
      quantity: 1,
    });
    onClose();
  };

  return (
    <div className="pos-modifier flex flex-col h-full bg-white rounded-lg shadow border border-gray-150 overflow-hidden text-gray-800 min-h-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-3 py-2 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <div className="h-6 w-[1px] bg-white/20"></div>
          <div>
            <h2 className="text-base font-black leading-tight">
              {product.name}
            </h2>
            <p className="text-[11px] opacity-90 mt-0.5">
              Dung tích: <span className="font-extrabold">{selectedSize}</span> | Protein: <span className="font-extrabold">{selectedProtein}g</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] opacity-75">Thành tiền</p>
          <p className="text-lg font-black">{calculatePrice().toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      {/* Main Configurations Grid */}
      <div className="pos-modifier-body flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {/* Row 1: Combo Topping */}
        <div className="pos-modifier-section bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-150">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wider">🌟 1. Combo Topping (Siêu tiết kiệm)</h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">Nhấp chọn Combo để áp dụng nhanh bộ topping ưu đãi</p>
            </div>
            <span className="bg-emerald-600 text-white font-black text-xs px-3 py-1 rounded-full animate-pulse">SIÊU RẺ</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {comboList.map(combo => {
              const isSelected = selectedCombos.includes(combo.id);
              return (
                <button
                  key={combo.id}
                  onClick={() => toggleCombo(combo.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-white shadow-lg scale-[1.01]'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md'
                  }`}
                  style={{ height: '120px' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black leading-tight ${isSelected ? 'text-emerald-700' : 'text-gray-950'}`}>{combo.name}</p>
                      <p className="text-xs text-gray-500 font-bold mt-1 leading-snug line-clamp-2">{combo.items}</p>
                    </div>
                    {isSelected && (
                      <span className="bg-emerald-600 text-white p-1 rounded-full flex-shrink-0 ml-2">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <span className="text-sm font-black text-emerald-700">{(combo.price).toLocaleString()}đ</span>
                    <span className="text-xs text-gray-400 line-through">{(combo.originalPrice).toLocaleString()}đ</span>
                    <span className="ml-auto text-[10px] bg-rose-50 text-rose-600 font-black px-1.5 py-0.5 rounded whitespace-nowrap">
                      -{(combo.save || 0) / 1000}k
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Toppings Lẻ */}
        <div className="pos-modifier-section bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-black text-gray-800 mb-1.5 uppercase tracking-wider">🍬 2. Chọn Topping Lẻ (Tự chọn thêm)</h3>
          <p className="text-xs text-gray-400 mb-4 font-medium">Bấm để thêm hoặc bỏ nhanh các loại topping dưới đây</p>
          <div className="grid grid-cols-3 gap-3">
            {dynamicToppings.map(topping => {
              const isSelected = selectedToppings.includes(topping.name);
              return (
                <button
                  key={topping.name}
                  onClick={() => toggleTopping(topping.name)}
                  className={`rounded-xl font-medium transition-all text-left relative border-2 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md font-bold'
                      : 'bg-white border-gray-200 text-gray-850 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                  style={{ height: '80px', padding: '10px 12px' }}
                >
                  <div className={`text-[11px] leading-tight font-extrabold ${isSelected ? 'text-white/90' : 'text-emerald-700'}`}>
                    +{topping.price.toLocaleString()}đ
                  </div>
                  <div className="text-xs font-black leading-tight">{topping.name}</div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 absolute top-2 right-2 text-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center gap-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-black text-xs transition-all"
        >
          HỦY BỎ
        </button>

        <button
          onClick={handleAddToCart}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-2.5 rounded-lg font-black text-xs tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          XÁC NHẬN & THÊM VÀO GIỎ ({calculatePrice().toLocaleString('vi-VN')}đ)
        </button>
      </div>
    </div>
  );
}
