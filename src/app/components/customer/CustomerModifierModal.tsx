'use client';
import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import * as api from '../../utils/api';

interface Props {
  product: { id: string; name: string; basePrice: number; image: string; description?: string };
  onClose: () => void;
  onAdd: (item: any) => void;
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

const defaultPriceTable: Record<string, Record<number, number>> = {
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
  const [dynamicPriceTable, setDynamicPriceTable] = useState<any>(defaultPriceTable);
  const [dynamicToppings, setDynamicToppings] = useState<any[]>(defaultToppings);
  const [comboList, setComboList] = useState<any[]>(COMBO_TOPPINGS);
  const [toppingTab, setToppingTab] = useState<'single' | 'combo'>('single');

  useEffect(() => {
    // 1. Fetch Price Table
    api.fetchSetting('menuPriceTable')
      .then(data => setDynamicPriceTable(data))
      .catch(() => {
        const savedPrices = localStorage.getItem('menuPriceTable');
        if (savedPrices) setDynamicPriceTable(JSON.parse(savedPrices));
      });

    // 2. Fetch Toppings
    api.fetchProducts()
      .then(products => {
        const toppingItems = products.filter((p: any) => p.category === 'toppings');
        if (toppingItems.length > 0) {
          setDynamicToppings(toppingItems.map((p: any) => ({ name: p.name, price: p.basePrice })));
        }
      })
      .catch(() => {
        const savedProducts = localStorage.getItem('menuProducts');
        if (savedProducts) {
          const allProducts = JSON.parse(savedProducts);
          const toppingItems = allProducts.filter((p: any) => p.category === 'toppings');
          if (toppingItems.length > 0) {
            setDynamicToppings(toppingItems.map((p: any) => ({ name: p.name, price: p.basePrice })));
          }
        }
      });

    // 3. Fetch Combo Toppings list
    api.fetchSetting('menuComboToppings')
      .then(data => setComboList(data))
      .catch(() => {
        const savedCombos = localStorage.getItem('menuComboToppings');
        if (savedCombos) setComboList(JSON.parse(savedCombos));
      });
  }, []);

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
    const tablePrice = dynamicPriceTable[size]?.[protein] || product.basePrice;
    
    const toppingsExtra = selectedToppings.reduce((sum, name) => {
      const topping = dynamicToppings.find(t => t.name === name);
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
    const available = proteinLevelsBySize[newSize] || [20, 40];
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
              {Object.keys(proteinLevelsBySize).map(s => (
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
              {proteinLevelsBySize[size]?.map(l => (
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
                  {dynamicToppings.map(t => {
                    const isSelected = selectedToppings.includes(t.name);
                    return (
                      <button key={t.name} onClick={() => toggleTopping(t.name)}
                        className={`p-3 rounded-2xl text-left border-2 flex flex-col justify-between transition-all active:scale-95 ${
                          isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                        style={{ height: '76px' }}>
                        <span className="text-[10px] font-black text-emerald-700">+{t.price.toLocaleString()}đ</span>
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
