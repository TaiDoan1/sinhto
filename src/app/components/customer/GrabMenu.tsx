'use client';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import * as api from '../../utils/api';
import { useMenu } from '../../contexts/MenuContext';
import { useMenuPricing } from '../../hooks/useMenuPricing';
import { PROTEIN_LEVELS_BY_SIZE, resolveCupPrice } from '../../config/menuPricing';
import { DEFAULT_TOPPING_PRODUCTS } from '../../config/menuToppings';
import { PRODUCT_IMAGES } from '../../config/images';
import { PLANS, type PlanId } from './CustomerApp';
import type { CustomerProduct } from './CustomerProductGrid';

const P = PRODUCT_IMAGES;

// Menu vị mặc định (fallback khi API/menu context trống) — cùng nguồn với CustomerProductGrid.
const defaultProducts: CustomerProduct[] = [
  { id: 'SM-01', name: 'Dâu hạt chia', category: 'smoothies', basePrice: 0, image: P.strawberry, description: 'Strawberry Chia · Giảm mỡ' },
  { id: 'SM-02', name: 'Dâu chuối', category: 'smoothies', basePrice: 0, image: P.strawberry, description: 'Strawberry Banana · Tone dáng' },
  { id: 'SM-03', name: 'Mãng cầu dâu', category: 'smoothies', basePrice: 0, image: P.strawberry, description: 'Soursop Strawberry · Detox' },
  { id: 'SM-04', name: 'Dâu cam', category: 'smoothies', basePrice: 0, image: P.strawberry, description: 'Strawberry Orange · Vitamin C' },
  { id: 'SM-07', name: 'Chuối hạt chia', category: 'smoothies', basePrice: 0, image: P.cacaoOat, description: 'Banana Chia · Tăng cơ' },
  { id: 'SM-09', name: 'Xoài thơm', category: 'smoothies', basePrice: 0, image: P.mango, description: 'Mango Pineapple · Tropical' },
  { id: 'SM-10', name: 'Xoài cam', category: 'smoothies', basePrice: 0, image: P.mango, description: 'Mango Orange · Vitamin' },
  { id: 'SM-11', name: 'Cacao yến mạch', category: 'smoothies', basePrice: 0, image: P.cacaoOat, description: 'Cacao Oat · Năng lượng bền' },
  { id: 'SM-13', name: 'Bơ', category: 'smoothies', basePrice: 0, image: P.hero, description: 'Avocado · Healthy fat' },
  { id: 'SM-15', name: 'Matcha', category: 'smoothies', basePrice: 0, image: P.hero, description: 'Matcha · Antioxidant' },
  ...DEFAULT_TOPPING_PRODUCTS,
];

const categoryConfig = [
  { key: 'smoothies', label: 'Sinh tố', emoji: '🥤' },
  { key: 'toppings', label: 'Topping', emoji: '🍯' },
  { key: 'combo', label: 'Combo gói', emoji: '📦' },
] as const;

type CatKey = typeof categoryConfig[number]['key'];

interface Props {
  onProductClick: (product: CustomerProduct) => void;
  onSelectCombo: (planId: PlanId) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

function isImg(s?: string) {
  return !!s && typeof s === 'string' && (s.startsWith('/') || s.startsWith('data:') || s.startsWith('http'));
}

// Thẻ món kiểu GrabFood: chữ bên trái (tên, mô tả, giá) + ảnh bên phải có nút "+" góc dưới.
function DishCard({ name, desc, priceLabel, image, onClick }: {
  name: string; desc?: string; priceLabel: string; image: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-stretch gap-3 py-3.5 text-left border-b border-zinc-100 active:bg-zinc-50 transition-colors">
      <div className="flex-1 min-w-0 flex flex-col">
        <h4 className="font-bold text-zinc-900 text-[15px] leading-snug">{name}</h4>
        {desc && <p className="text-[12px] text-zinc-400 mt-0.5 line-clamp-2 leading-normal">{desc}</p>}
        <div className="mt-auto pt-1.5">
          <span className="font-black text-[15px] text-zinc-900">{priceLabel}</span>
        </div>
      </div>
      <div className="relative w-[92px] h-[92px] shrink-0">
        <div className="w-full h-full rounded-2xl overflow-hidden bg-zinc-100 flex items-center justify-center">
          {isImg(image)
            ? <img src={image} alt={name} className="w-full h-full object-cover" />
            : <span className="text-4xl">{image}</span>}
        </div>
        <span className="absolute -bottom-2 right-1 w-8 h-8 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center" style={{ color: '#00b14f' }}>
          <Plus className="w-5 h-5" strokeWidth={2.75} />
        </span>
      </div>
    </button>
  );
}

export function GrabMenu({ onProductClick, onSelectCombo, search, onSearchChange }: Props) {
  const { products: menuProducts } = useMenu();
  const { priceTable } = useMenuPricing();
  const [products, setProducts] = useState<CustomerProduct[]>(defaultProducts);
  const [activeCategory, setActiveCategory] = useState<CatKey>('smoothies');

  useEffect(() => {
    if (menuProducts.length > 0) { setProducts(menuProducts as CustomerProduct[]); return; }
    api.fetchProducts().then((data) => { if (data && data.length > 0) setProducts(data); }).catch(() => {});
  }, [menuProducts]);

  // Giá "từ ...đ" cho sinh tố = ly rẻ nhất (size + protein nhỏ nhất).
  const smoothieFromPrice = useMemo(() => {
    let min = Infinity;
    for (const size of Object.keys(PROTEIN_LEVELS_BY_SIZE)) {
      for (const prot of PROTEIN_LEVELS_BY_SIZE[size]) {
        const p = resolveCupPrice(size, prot, priceTable);
        if (p && p < min) min = p;
      }
    }
    return Number.isFinite(min) ? min : 0;
  }, [priceTable]);

  const term = search.trim().toLowerCase();
  const smoothies = products.filter((p) => p.category === 'smoothies' && (!term || p.name.toLowerCase().includes(term)));
  const toppings = products.filter((p) => p.category === 'toppings' && (!term || p.name.toLowerCase().includes(term)));
  const combos = (['fat-loss', 'muscle-build', 'elite-mass'] as PlanId[])
    .filter((id) => !term || PLANS[id].name.toLowerCase().includes(term));

  const showSmoothies = activeCategory === 'smoothies';
  const showToppings = activeCategory === 'toppings';
  const showCombo = activeCategory === 'combo';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search */}
      <div className="px-4 pt-2 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm món trong FitBlend..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm bg-zinc-100 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
        {categoryConfig.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-[13px] whitespace-nowrap transition-all"
            style={activeCategory === cat.key
              ? { background: '#00b14f', color: '#fff' }
              : { background: '#f4f4f5', color: '#52525b' }}
          >
            <span>{cat.emoji}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Menu list */}
      <div className="flex-1 overflow-y-auto px-4 pb-28" style={{ scrollbarWidth: 'none' }}>
        {showSmoothies && (
          <>
            <h3 className="text-[13px] font-black text-zinc-400 uppercase tracking-wider pt-3 pb-1">Sinh tố ({smoothies.length})</h3>
            {smoothies.map((p) => (
              <DishCard key={p.id} name={p.name} desc={p.description} image={p.image}
                priceLabel={`từ ${smoothieFromPrice.toLocaleString('vi-VN')}đ`}
                onClick={() => onProductClick(p)} />
            ))}
            {smoothies.length === 0 && <p className="text-center text-sm text-zinc-400 py-10">Không tìm thấy món.</p>}
          </>
        )}

        {showToppings && (
          <>
            <h3 className="text-[13px] font-black text-zinc-400 uppercase tracking-wider pt-3 pb-1">Topping ({toppings.length})</h3>
            {toppings.map((p) => (
              <DishCard key={p.id} name={p.name} desc={p.description} image={p.image}
                priceLabel={`${(p.basePrice || 0).toLocaleString('vi-VN')}đ`}
                onClick={() => onProductClick(p)} />
            ))}
            {toppings.length === 0 && <p className="text-center text-sm text-zinc-400 py-10">Không tìm thấy topping.</p>}
          </>
        )}

        {showCombo && (
          <>
            <h3 className="text-[13px] font-black text-zinc-400 uppercase tracking-wider pt-3 pb-1">Combo gói tuần / tháng / quý</h3>
            {combos.map((id) => {
              const plan = PLANS[id];
              return (
                <DishCard key={id} name={plan.name} desc={`${plan.subtitle} · ${plan.specs}`} image={plan.icon}
                  priceLabel={`từ ${plan.weekly.price.toLocaleString('vi-VN')}k`}
                  onClick={() => onSelectCombo(id)} />
              );
            })}
            {combos.length === 0 && <p className="text-center text-sm text-zinc-400 py-10">Không tìm thấy combo.</p>}
          </>
        )}
      </div>
    </div>
  );
}
