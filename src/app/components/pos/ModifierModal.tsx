import { X, Check, ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMenu } from '../../contexts/MenuContext';
import { useMenuPricing } from '../../hooks/useMenuPricing';
import { DEFAULT_MENU_PRICE_TABLE, resolveCupPrice } from '../../config/menuPricing';
import { DEFAULT_COMBO_TOPPINGS, DEFAULT_TOPPINGS, formatToppingPrice } from '../../config/menuToppings';
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
  theme?: 'emerald' | 'purple';
  skipStockCheck?: boolean;
}

const MODIFIER_THEMES = {
  emerald: {
    header: 'from-emerald-700 to-emerald-600',
    comboSection: 'from-emerald-50 to-teal-50 border-emerald-100',
    comboTitle: 'text-emerald-800',
    comboSubtitle: 'text-emerald-600',
    comboBadge: 'bg-emerald-600',
    comboCardSelected: 'border-emerald-600 bg-white shadow-lg',
    comboNameSelected: 'text-emerald-700',
    comboCheckBg: 'bg-emerald-600',
    comboPrice: 'text-emerald-700',
    toppingSelected: 'bg-emerald-600 border-emerald-600 text-white shadow-md font-bold',
    toppingPrice: 'text-emerald-700',
    footer: 'from-emerald-600 to-emerald-500',
  },
  purple: {
    header: 'from-purple-700 to-purple-600',
    comboSection: 'from-purple-50 to-violet-50 border-purple-100',
    comboTitle: 'text-purple-800',
    comboSubtitle: 'text-purple-600',
    comboBadge: 'bg-purple-600',
    comboCardSelected: 'border-purple-600 bg-white shadow-lg',
    comboNameSelected: 'text-purple-700',
    comboCheckBg: 'bg-purple-600',
    comboPrice: 'text-purple-700',
    toppingSelected: 'bg-purple-600 border-purple-600 text-white shadow-md font-bold',
    toppingPrice: 'text-purple-700',
    footer: 'from-purple-600 to-purple-500',
  },
} as const;

export interface CartItem {
  productId: string;
  productName: string;
  productCategory?: string;
  size: string;
  bagSize?: 'S' | 'M' | 'L';
  protein: number;
  toppings: string[];
  price: number;
  quantity: number;
  name?: string;
  isCustomCombo?: boolean;
  rawComboData?: any;
}

const COMBO_TOPPINGS = DEFAULT_COMBO_TOPPINGS;

const defaultToppings = DEFAULT_TOPPINGS;

const priceTable: Record<string, Record<number, number>> = DEFAULT_MENU_PRICE_TABLE;

export function ModifierModal({ product, onClose, onAddToCart, theme = 'emerald', skipStockCheck = false }: ModifierModalProps) {
  const t = MODIFIER_THEMES[theme];
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
  const { checkCartStock, formatShortageMessage, productInventory } = useInventory();

  // Kho quyết định size túi (S/M/L) theo vị + ml — nhân viên không cần chọn khi bán.
  // Ưu tiên túi còn hàng theo thứ tự S → M → L, mặc định S nếu chưa nhập kho sản phẩm.
  const resolvedBagSize = useMemo<'S' | 'M' | 'L'>(() => {
    const variants = productInventory.smoothies?.[product.id] || {};
    const bagOrder: Array<'S' | 'M' | 'L'> = ['S', 'M', 'L'];
    const withStock = bagOrder.find((bag) => (variants[`${selectedSize}-${bag}`] ?? 0) > 0);
    return withStock || 'S';
  }, [productInventory, product.id, selectedSize]);

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
    const tablePrice = resolveCupPrice(selectedSize, selectedProtein, priceLookup);
    
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
      productCategory: product.category || 'smoothies',
      size: selectedSize,
      bagSize: resolvedBagSize,
      protein: selectedProtein,
      toppings: finalToppingsList,
      quantity: 1,
    };

    if (!skipStockCheck) {
      const check = checkCartStock([line]);
      if (!check.ok) {
        alert(`Không đủ nguyên liệu:\n${formatShortageMessage(check.shortages)}`);
        return;
      }
    }

    onAddToCart({
      productId: product.id,
      productName: product.name,
      productCategory: product.category || 'smoothies',
      size: selectedSize,
      bagSize: resolvedBagSize,
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
      <div className={`pos-modifier-header bg-gradient-to-r ${t.header} text-white px-3 py-2.5 flex justify-between items-center flex-shrink-0`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </button>
          <div className="h-6 w-px bg-white/20" />
          <div>
            <h2 className="text-lg font-black leading-tight">{product.name}</h2>
            <p className="text-sm opacity-90 mt-0.5 font-semibold">
              {selectedSize} · Protein {selectedProtein}g
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-80">Thành tiền</p>
          <p className="pos-modifier-price">{calculatePrice().toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      {/* Main Configurations Grid */}
      <div className="pos-modifier-body flex-1 overflow-y-auto p-2 space-y-2 min-h-0">

        {/* Row 1: Combo Topping */}
        <div className={`pos-modifier-section bg-gradient-to-br rounded-lg border ${t.comboSection}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-black uppercase tracking-wider ${t.comboTitle}`}>🌟 1. Combo Topping (Siêu tiết kiệm)</h3>
              <p className={`text-xs font-medium mt-0.5 ${t.comboSubtitle}`}>Nhấp chọn Combo để áp dụng nhanh bộ topping ưu đãi</p>
            </div>
            <span className={`text-white font-black text-xs px-3 py-1 rounded-full pos-combo-badge ${t.comboBadge}`}>SIÊU RẺ</span>
          </div>
          <div className="pos-combo-list rounded-lg border border-gray-100 overflow-hidden bg-white">
            {comboList.map(combo => {
              const isSelected = selectedCombos.includes(combo.id);
              return (
                <button
                  key={combo.id}
                  onClick={() => toggleCombo(combo.id)}
                  className={`pos-combo-row w-full flex items-center gap-3 text-left ${
                    isSelected ? t.comboCardSelected : 'bg-white'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`pos-combo-name font-black leading-tight truncate ${isSelected ? t.comboNameSelected : 'text-gray-950'}`}>{combo.name}</p>
                    <p className="text-xs text-gray-500 font-bold truncate">{combo.items}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-black ${t.comboPrice}`}>{(combo.price).toLocaleString()}đ</span>
                    <span className="text-xs text-gray-400 line-through">{(combo.originalPrice).toLocaleString()}đ</span>
                    <span className="text-[10px] bg-rose-50 text-rose-600 font-black px-1.5 py-0.5 rounded whitespace-nowrap">
                      -{(combo.save || 0) / 1000}k
                    </span>
                  </div>
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isSelected ? t.comboCheckBg : 'bg-gray-100'}`}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Toppings Lẻ */}
        <div className="pos-modifier-section bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-base font-black text-gray-800 mb-1.5 uppercase tracking-wider">🍬 2. Chọn Topping Lẻ (Tự chọn thêm)</h3>
          <p className="text-sm text-gray-500 mb-3 font-medium">Bấm để thêm hoặc bỏ nhanh các loại topping dưới đây</p>
          <div className="pos-topping-list rounded-lg border border-gray-100 overflow-hidden bg-white">
            {toppingsList.map(topping => {
              const isSelected = selectedToppings.includes(topping.name);
              return (
                <button
                  key={topping.name}
                  onClick={() => toggleTopping(topping.name)}
                  className={`pos-topping-row w-full flex items-center justify-between gap-3 font-medium text-left ${
                    isSelected ? t.toppingSelected : 'bg-white text-gray-850'
                  }`}
                >
                  <span className="pos-topping-name font-black leading-tight truncate">{topping.name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className={`pos-topping-price leading-tight font-extrabold ${isSelected ? 'text-white/90' : t.toppingPrice}`}>
                      {formatToppingPrice(topping.price)}
                    </span>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </span>
                  </span>
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
          className="pos-modifier-footer-btn px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-black"
        >
          HỦY BỎ
        </button>

        <button
          onClick={handleAddToCart}
          className={`pos-modifier-footer-btn flex-1 bg-gradient-to-r ${t.footer} text-white py-3 rounded-lg font-black tracking-wider shadow-md flex items-center justify-center gap-2`}
        >
          XÁC NHẬN & THÊM VÀO GIỎ ({calculatePrice().toLocaleString('vi-VN')}đ)
        </button>
      </div>
    </div>
  );
}
