'use client';
import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface Props {
  product: { id: string; name: string; basePrice: number; image: string; description?: string };
  onClose: () => void;
  onAdd: (item: any) => void;
}

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

export function CustomerModifierModal({ product, onClose, onAdd }: Props) {
  const [size, setSize] = useState('360ml');
  const [protein, setProtein] = useState(40);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [dynamicPriceTable, setDynamicPriceTable] = useState<any>(defaultPriceTable);
  const [dynamicToppings, setDynamicToppings] = useState<any[]>([]);

  useEffect(() => {
    // Load prices and products from shared localStorage
    const savedPrices = localStorage.getItem('menuPriceTable');
    if (savedPrices) setDynamicPriceTable(JSON.parse(savedPrices));

    const savedProducts = localStorage.getItem('menuProducts');
    if (savedProducts) {
      const allProducts = JSON.parse(savedProducts);
      const toppingItems = allProducts.filter((p: any) => p.category === 'toppings');
      setDynamicToppings(toppingItems);
    }
  }, []);

  const toggle = (t: string) => setSelectedToppings(prev => prev.includes(t) ? prev.filter(i => i !== t) : [...prev, t]);

  const calcPrice = () => {
    const tablePrice = dynamicPriceTable[size]?.[protein] || product.basePrice;
    const toppingsExtra = selectedToppings.reduce((sum, name) => {
      const topping = dynamicToppings.find(t => t.name === name);
      return sum + (topping?.basePrice || 0);
    }, 0);
    return tablePrice + toppingsExtra;
  };

  const handleSizeChange = (newSize: string) => {
    setSize(newSize);
    const available = proteinLevelsBySize[newSize] || [20, 40];
    if (!available.includes(protein)) {
      setProtein(available[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Product Hero */}
        <div className="relative h-48 bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
          {product.image.startsWith('/') ? (
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
                  {s}
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
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Toppings ({selectedToppings.length})</label>
            <div className="flex flex-wrap gap-2">
              {dynamicToppings.map(t => (
                <button key={t.id} onClick={() => toggle(t.name)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all border-2 ${selectedToppings.includes(t.name) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                  {selectedToppings.includes(t.name) && <Check className="w-3 h-3 inline mr-1" />}{t.name}
                  <span className="ml-1 opacity-60">+{t.basePrice.toLocaleString()}đ</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 shrink-0">
          <button onClick={() => onAdd({ ...product, size, protein, toppings: selectedToppings, price: calcPrice() })}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-200 transition-all active:scale-95">
            Thêm vào giỏ • {calcPrice().toLocaleString('vi-VN')}đ
          </button>
        </div>
      </div>
    </div>
  );
}

