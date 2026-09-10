import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, ArrowLeft, Check, ShoppingCart } from 'lucide-react';
import { useMenu } from '../../contexts/MenuContext';
import { useMenuPricing } from '../../hooks/useMenuPricing';
import { DEFAULT_MENU_PRICE_TABLE, resolveCupPrice, PROTEIN_LEVELS_BY_SIZE } from '../../config/menuPricing';
import { DEFAULT_COMBO_TOPPINGS, DEFAULT_TOPPINGS } from '../../config/menuToppings';
import type { CartItem } from '../pos/ModifierModal';
import type { Product } from '../pos/ProductGrid';

const SIZES = [
  { id: '360ml', label: '360ml', hint: 'Ly vừa' },
  { id: '500ml', label: '500ml', hint: 'Ly lớn' },
  { id: '700ml', label: '700ml', hint: 'Siêu ly' },
];
const SIZE_TO_BAG: Record<string, 'S' | 'M' | 'L'> = { '360ml': 'S', '500ml': 'M', '700ml': 'L' };
const PROTEIN_DESC: Record<number, string> = { 20: 'Nhẹ', 40: 'Cân bằng', 60: 'Tăng cơ', 90: 'VĐV' };

function ProductThumb({ image, name, className }: { image?: string; name: string; className?: string }) {
  const isImg = typeof image === 'string' && (image.startsWith('/') || image.startsWith('data:') || image.startsWith('http'));
  return isImg ? (
    <img src={image} alt={name} className={className} loading="lazy" decoding="async" />
  ) : (
    <div className={`flex items-center justify-center text-2xl ${className}`}>{image || '🥤'}</div>
  );
}

export function CskhProductPicker({ onAdd }: { onAdd: (item: CartItem) => void }) {
  const { products } = useMenu();
  const { priceTable: dynamicPriceTable, comboToppings } = useMenuPricing();
  const priceLookup = Object.keys(dynamicPriceTable || {}).length > 0 ? dynamicPriceTable : DEFAULT_MENU_PRICE_TABLE;

  const smoothies = useMemo(() => products.filter((p: any) => p.category === 'smoothies'), [products]);
  const toppingsList = useMemo(() => {
    const dyn = products.filter((p: any) => p.category === 'toppings').map((p: any) => ({ name: p.name, price: p.basePrice }));
    return dyn.length > 0 ? dyn : DEFAULT_TOPPINGS;
  }, [products]);
  const comboList = ((comboToppings as any[])?.length ? comboToppings : DEFAULT_COMBO_TOPPINGS) as { id: string; name: string; price: number }[];

  const [search, setSearch] = useState('');
  const [toppingSearch, setToppingSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState('360ml');
  const [protein, setProtein] = useState(20);
  const [toppings, setToppings] = useState<string[]>([]);
  const [combos, setCombos] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  const proteinLevels = PROTEIN_LEVELS_BY_SIZE[size] || [20, 40];
  useEffect(() => {
    if (!proteinLevels.includes(protein)) setProtein(proteinLevels[0]);
  }, [size]); // eslint-disable-line react-hooks/exhaustive-deps

  const fromPrice = useMemo(
    () => resolveCupPrice('360ml', (PROTEIN_LEVELS_BY_SIZE['360ml'] || [20])[0], priceLookup),
    [priceLookup]
  );

  const unitPrice = useMemo(() => {
    const base = resolveCupPrice(size, protein, priceLookup);
    const tExtra = toppings.reduce((s, name) => s + (toppingsList.find((t) => t.name === name)?.price || 0), 0);
    const cExtra = combos.reduce((s, id) => s + (comboList.find((c) => c.id === id)?.price || 0), 0);
    return base + tExtra + cExtra;
  }, [size, protein, toppings, combos, priceLookup, toppingsList, comboList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? smoothies.filter((p: any) => p.name.toLowerCase().includes(q)) : smoothies;
  }, [smoothies, search]);

  // Lọc topping theo ô tìm topping (áp cho cả topping lẻ và combo topping).
  const tq = toppingSearch.trim().toLowerCase();
  const shownToppings = tq ? toppingsList.filter((t) => t.name.toLowerCase().includes(tq)) : toppingsList;
  const shownCombos = tq ? comboList.filter((c) => c.name.toLowerCase().includes(tq)) : comboList;

  const openProduct = (p: Product) => {
    setSelected(p);
    setSize('360ml');
    setProtein((PROTEIN_LEVELS_BY_SIZE['360ml'] || [20])[0]);
    setToppings([]);
    setCombos([]);
    setToppingSearch('');
    setQty(1);
  };

  const toggle = (arr: string[], setArr: (v: string[]) => void, key: string) =>
    setArr(arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key]);

  const add = () => {
    if (!selected) return;
    const finalToppings = [
      ...combos.map((id) => `Combo Topping: ${comboList.find((c) => c.id === id)?.name || ''}`),
      ...toppings,
    ];
    onAdd({
      productId: selected.id,
      productName: selected.name,
      productCategory: 'smoothies',
      size,
      bagSize: SIZE_TO_BAG[size],
      protein,
      toppings: finalToppings,
      price: unitPrice,
      quantity: qty,
    });
    setSelected(null);
  };

  // ── Màn CHỌN MÓN ──
  if (!selected) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-purple-50/40 to-white">
        <div className="p-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm vị sinh tố..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2.5 pb-2.5">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-2">
              <ShoppingCart className="w-8 h-8 opacity-40" />
              <p className="text-sm font-semibold">Không tìm thấy vị nào</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openProduct(p)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 hover:border-purple-300 hover:shadow-sm transition-all p-2 text-left"
                >
                  <div className="w-12 h-12 rounded-lg bg-purple-50/60 overflow-hidden shrink-0">
                    <ProductThumb image={p.image} name={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 text-sm leading-tight truncate">{p.name}</p>
                    <p className="text-[11px] text-purple-600 font-bold mt-0.5">từ {fromPrice.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <span className="shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm">
                    <Plus className="w-4 h-4" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Màn CẤU HÌNH MÓN ──
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white px-3 py-2.5 flex items-center gap-2">
        <button type="button" onClick={() => setSelected(null)} className="p-1 hover:bg-white/15 rounded-lg flex items-center gap-1 text-sm font-bold">
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </button>
        <div className="w-px h-6 bg-white/25" />
        <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/15 shrink-0">
          <ProductThumb image={selected.image} name={selected.name} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-base leading-tight truncate">{selected.name}</p>
          <p className="text-xs opacity-90">{size} · {protein}g protein</p>
        </div>
      </div>

      {/* Cấu hình */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Size */}
        <div>
          <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5">Kích cỡ ly</p>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map((s) => {
              const on = size === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSize(s.id)}
                  className={`rounded-xl border-2 py-2 text-center transition-all ${on ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
                >
                  <p className={`font-black text-sm ${on ? 'text-purple-700' : 'text-gray-700'}`}>{s.label}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">{s.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Protein */}
        <div>
          <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5">Mức protein</p>
          <div className="grid grid-cols-2 gap-2">
            {proteinLevels.map((lv) => {
              const on = protein === lv;
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setProtein(lv)}
                  className={`rounded-xl border-2 py-2 px-3 flex items-center justify-between transition-all ${on ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}
                >
                  <span className={`font-black text-sm ${on ? 'text-emerald-700' : 'text-gray-700'}`}>{lv}g</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{PROTEIN_DESC[lv] || ''}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topping — có ô tìm topping cho tiện khi danh sách dài */}
        {(toppingsList.length > 0 || comboList.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Topping thêm</p>
              <div className="relative w-40">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="search"
                  value={toppingSearch}
                  onChange={(e) => setToppingSearch(e.target.value)}
                  placeholder="Tìm topping..."
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {shownToppings.length === 0 && shownCombos.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Không tìm thấy topping nào.</p>
            ) : (
              <div className="space-y-2.5">
                {shownToppings.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {shownToppings.map((tp) => {
                      const on = toppings.includes(tp.name);
                      return (
                        <button
                          key={tp.name}
                          type="button"
                          onClick={() => toggle(toppings, setToppings, tp.name)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all ${on ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}
                        >
                          {on && <Check className="w-3 h-3" />}
                          {tp.name}
                          {tp.price > 0 && <span className={on ? 'text-white/80' : 'text-purple-600'}>+{tp.price.toLocaleString('vi-VN')}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {shownCombos.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Combo topping</p>
                    <div className="flex flex-wrap gap-2">
                      {shownCombos.map((c) => {
                        const on = combos.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggle(combos, setCombos, c.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all ${on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 text-gray-600 hover:border-emerald-300'}`}
                          >
                            {on && <Check className="w-3 h-3" />}
                            {c.name}
                            {c.price > 0 && <span className={on ? 'text-white/80' : 'text-emerald-600'}>+{c.price.toLocaleString('vi-VN')}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Số lượng */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Số lượng</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
            <span className="w-8 text-center font-black text-lg">{qty}</span>
            <button type="button" onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Nút thêm */}
      <div className="shrink-0 p-3 border-t border-gray-100">
        <button
          type="button"
          onClick={add}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow"
        >
          <Plus className="w-4 h-4" />
          Thêm vào giỏ · {(unitPrice * qty).toLocaleString('vi-VN')}đ
        </button>
      </div>
    </div>
  );
}
