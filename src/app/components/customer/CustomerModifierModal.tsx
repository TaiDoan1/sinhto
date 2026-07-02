'use client';
import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useMenu } from '../../contexts/MenuContext';
import { useMenuPricing } from '../../hooks/useMenuPricing';
import { DEFAULT_MENU_PRICE_TABLE, PROTEIN_LEVELS_BY_SIZE, proteinLevelsFromPriceTable, resolveCupPrice } from '../../config/menuPricing';
import { DEFAULT_COMBO_TOPPINGS, DEFAULT_TOPPINGS, formatToppingPrice } from '../../config/menuToppings';

interface Props {
  product: { id: string; name: string; basePrice: number; image: string; description?: string };
  onClose: () => void;
  onAdd: (item: any) => void;
}

const COMBO_TOPPINGS = DEFAULT_COMBO_TOPPINGS;

const defaultToppings = DEFAULT_TOPPINGS;

const defaultPriceTable: Record<string, Record<number, number>> = DEFAULT_MENU_PRICE_TABLE;

const proteinLevelsBySize: Record<string, number[]> = PROTEIN_LEVELS_BY_SIZE;

const sizeLabels: Record<string, string> = {
  '250ml': 'Nhỏ',
  '360ml': 'Vừa',
  '500ml': 'Lớn',
  '700ml': 'Siêu',
};

export function CustomerModifierModal({ product, onClose, onAdd }: Props) {
  const [size, setSize] = useState('360ml');
  const [protein, setProtein] = useState(40);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);
  const [toppingTab, setToppingTab] = useState<'single' | 'combo'>('single');
  const { products } = useMenu();
  const { priceTable: dynamicPriceTable, comboToppings: comboListFromApi } = useMenuPricing();
  const dynamicToppings = products
    .filter((p) => p.category === 'toppings')
    .map((p) => ({ name: p.name, price: p.basePrice }));
  const toppings = dynamicToppings.length > 0 ? dynamicToppings : defaultToppings;
  const comboList = (comboListFromApi as typeof COMBO_TOPPINGS).length > 0
    ? (comboListFromApi as typeof COMBO_TOPPINGS)
    : COMBO_TOPPINGS;
  const proteinLevels = proteinLevelsFromPriceTable(dynamicPriceTable);

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

  const calcPrice = () => {
    const tablePrice = resolveCupPrice(size, protein, dynamicPriceTable);
    
    const toppingsExtra = selectedToppings.reduce((sum, name) => {
      const topping = toppings.find(t => t.name === name);
      return sum + (topping?.price || 0);
    }, 0);

    const comboExtra = selectedCombos.reduce((sum, comboId) => {
      const combo = comboList.find(c => c.id === comboId);
      return sum + (combo?.price || 0);
    }, 0);

    return tablePrice + toppingsExtra + comboExtra;
  };

  const handleSizeChange = (newSize: string) => {
    setSize(newSize);
    const available = proteinLevels[newSize] || proteinLevelsBySize[newSize] || [20];
    if (!available.includes(protein)) {
      setProtein(available[0]);
    }
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

    onAdd({
      ...product,
      size,
      protein,
      toppings: finalToppingsList,
      price: calcPrice(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Product Hero */}
        <div className="relative h-48 bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
          {product.image && typeof product.image === 'string' && (product.image.startsWith('/') || product.image.startsWith('data:')) ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl">{product.image}</span>
          )}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg hover:bg-white"><X className="w-5 h-5 text-gray-800" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{product.name}</h2>
            {product.description && <p className="text-gray-500 mt-1 text-sm">{product.description}</p>}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kích cỡ</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.keys(proteinLevels).map(s => (
                <button key={s} onClick={() => handleSizeChange(s)}
                  className={`py-3 rounded-2xl font-bold text-sm transition-all ${size === s ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {sizeLabels[s] || s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mức Protein</label>
            <div className="flex flex-wrap gap-2">
              {(proteinLevels[size] || proteinLevelsBySize[size] || [20]).map(l => (
                <button key={l} onClick={() => setProtein(l)}
                  className={`py-2.5 px-6 rounded-xl font-bold text-sm transition-all ${protein === l ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {l}g
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pb-4">
            {/* Tab switcher — same pattern as ml/protein selectors */}
            <div className="flex gap-2 mb-3 bg-gray-100 p-1 rounded-2xl">
              <button
                onClick={() => setToppingTab('single')}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all uppercase tracking-wide ${
                  toppingTab === 'single'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Topping Lẻ
              </button>
              <button
                onClick={() => setToppingTab('combo')}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all uppercase tracking-wide ${
                  toppingTab === 'combo'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Combo Topping
              </button>
            </div>

            {/* Fixed-min-height container so tab switch never resizes the modal */}
            <div className="min-h-[260px]">
              {toppingTab === 'single' ? (
                <div className="grid grid-cols-3 gap-2">
                  {toppings.map(t => {
                    const isSelected = selectedToppings.includes(t.name);
                    return (
                      <button key={t.name} onClick={() => toggleTopping(t.name)}
                        className={`p-3 rounded-2xl text-left border-2 flex flex-col justify-between transition-all active:scale-95 ${
                          isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                        style={{ height: '76px' }}>
                        <span className="text-[10px] font-black text-emerald-700">{formatToppingPrice(t.price)}</span>
                        <span className="text-xs font-bold text-gray-800 leading-tight">{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {comboList.map(combo => {
                    const isSelected = selectedCombos.includes(combo.id);
                    return (
                      <button key={combo.id} onClick={() => toggleCombo(combo.id)}
                        className={`p-4 rounded-2xl text-left border-2 flex flex-col justify-between transition-all active:scale-95 ${
                          isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                        style={{ height: '110px' }}>
                        <div>
                          <span className="text-xs font-black text-gray-900 leading-tight block">{combo.name}</span>
                          <span className="text-[9px] text-gray-400 font-semibold block mt-1 line-clamp-2 leading-tight">{combo.items}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-700">+{combo.price.toLocaleString()}đ</span>
                          {combo.save && (
                            <span className="text-[9px] font-bold text-red-400 line-through">{combo.originalPrice?.toLocaleString()}đ</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 shrink-0">
          <button onClick={handleAddToCart}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-200 transition-all active:scale-95">
            Thêm vào giỏ • {calcPrice().toLocaleString('vi-VN')}đ
          </button>
        </div>
      </div>
    </div>
  );
}
