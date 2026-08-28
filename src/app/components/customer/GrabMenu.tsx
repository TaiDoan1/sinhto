'use client';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import * as api from '../../utils/api';
import type { GrabMenuItem } from '../../utils/api';
import { useMenuPricing } from '../../hooks/useMenuPricing';
import { resolveCupPrice } from '../../config/menuPricing';
import { useSSE } from '../../contexts/SSEContext';
import { PLANS, type PlanId } from './CustomerApp';

const BADGE_LABEL: Record<string, { label: string; cls: string }> = {
  bestseller: { label: 'Bán chạy', cls: 'bg-emerald-100 text-emerald-700' },
  loved: { label: 'Được yêu thích', cls: 'bg-pink-100 text-pink-600' },
  new: { label: 'Món mới', cls: 'bg-sky-100 text-sky-700' },
};

interface Props {
  onProductClick: (item: GrabMenuItem) => void;
  onSelectCombo: (planId: PlanId) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

function isImg(s?: string) {
  return !!s && typeof s === 'string' && (s.startsWith('/') || s.startsWith('data:') || s.startsWith('http'));
}

// Thẻ món kiểu GrabFood: chữ bên trái (tên, mô tả, nhãn, giá) + ảnh phải có nút "+".
function DishCard({ name, desc, priceLabel, oldPriceLabel, badge, discountPercent, image, onClick }: {
  name: string; desc?: string; priceLabel: string; oldPriceLabel?: string;
  badge?: string; discountPercent?: number; image: string; onClick: () => void;
}) {
  const b = badge ? BADGE_LABEL[badge] : null;
  return (
    <button onClick={onClick} className="w-full flex items-stretch gap-3 py-3.5 text-left border-b border-zinc-100 active:bg-zinc-50 transition-colors">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="font-bold text-zinc-900 text-[15px] leading-snug">{name}</h4>
          {b && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>}
        </div>
        {desc && <p className="text-[12px] text-zinc-400 mt-0.5 line-clamp-2 leading-normal">{desc}</p>}
        <div className="mt-auto pt-1.5 flex items-center gap-2">
          <span className="font-black text-[15px]" style={{ color: discountPercent ? '#e8740c' : '#18181b' }}>{priceLabel}</span>
          {oldPriceLabel && <span className="text-[12px] text-zinc-400 line-through">{oldPriceLabel}</span>}
          {discountPercent ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">-{discountPercent}%</span> : null}
        </div>
      </div>
      <div className="relative w-[92px] h-[92px] shrink-0">
        <div className="w-full h-full rounded-2xl overflow-hidden bg-zinc-100 flex items-center justify-center">
          {isImg(image) ? <img src={image} alt={name} className="w-full h-full object-cover" /> : <span className="text-4xl">{image || '🥤'}</span>}
        </div>
        <span className="absolute -bottom-2 right-1 w-8 h-8 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center" style={{ color: '#00b14f' }}>
          <Plus className="w-5 h-5" strokeWidth={2.75} />
        </span>
      </div>
    </button>
  );
}

// Thẻ món kiểu lưới 2 cột GrabFood: ảnh trên (nút + góc phải, ruy-băng nhãn/giảm giá đáy ảnh),
// tên + giá bên dưới.
function GridCard({ name, priceLabel, oldPriceLabel, badge, discountPercent, image, onClick }: {
  name: string; priceLabel: string; oldPriceLabel?: string;
  badge?: string; discountPercent?: number; image: string; onClick: () => void;
}) {
  const b = badge ? BADGE_LABEL[badge] : null;
  const ribbon = discountPercent ? { label: `Giảm ${discountPercent}%`, bg: '#e8740c' } : (b ? { label: b.label, bg: '#00b14f' } : null);
  return (
    <button onClick={onClick} className="text-left">
      <div className="relative rounded-2xl overflow-hidden bg-zinc-100 aspect-square">
        {isImg(image) ? <img src={image} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl">{image || '🥤'}</div>}
        <span className="absolute top-2 right-2 w-9 h-9 rounded-full text-white flex items-center justify-center shadow-md" style={{ background: '#00b14f' }}>
          <Plus className="w-5 h-5" strokeWidth={2.75} />
        </span>
        {ribbon && (
          <span className="absolute bottom-0 left-0 right-0 py-1.5 text-center text-white text-[11px] font-bold" style={{ background: ribbon.bg }}>{ribbon.label}</span>
        )}
      </div>
      <h4 className="mt-2 font-bold text-zinc-900 text-[14px] leading-snug line-clamp-2">{name}</h4>
      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
        <span className="font-black text-[15px]" style={{ color: discountPercent ? '#e8740c' : '#18181b' }}>{priceLabel}</span>
        {oldPriceLabel && <span className="text-[12px] text-zinc-400 line-through">{oldPriceLabel}</span>}
      </div>
    </button>
  );
}

export function GrabMenu({ onProductClick, onSelectCombo, search, onSearchChange }: Props) {
  const { priceTable } = useMenuPricing();
  const { subscribe } = useSSE();
  const [items, setItems] = useState<GrabMenuItem[]>([]);

  const load = () => { api.fetchGrabMenu().then(setItems).catch(() => {}); };
  useEffect(() => { load(); }, []);
  // Chủ quán sửa menu ở admin → app khách tự cập nhật.
  useEffect(() => {
    const u1 = subscribe('GRAB_MENU_UPDATED', () => load());
    const u2 = subscribe('GRAB_MENU_DELETED', () => load());
    return () => { u1(); u2(); };
  }, [subscribe]);

  const priceOf = (it: GrabMenuItem) => {
    const base = resolveCupPrice(it.defaultSize, it.defaultProtein, priceTable) || 0;
    return { final: Math.round(base * (1 - (it.discountPercent || 0) / 100)), base };
  };

  const term = search.trim().toLowerCase();
  const filtered = items.filter((it) => !term || it.name.toLowerCase().includes(term) || (it.section || '').toLowerCase().includes(term));

  const grouped = useMemo(() => {
    const map = new Map<string, GrabMenuItem[]>();
    for (const it of filtered) {
      const k = it.section || 'Món ngon';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return [...map.entries()];
  }, [filtered]);

  const combos = (['fat-loss', 'muscle-build', 'elite-mass'] as PlanId[])
    .filter((id) => !term || PLANS[id].name.toLowerCase().includes(term));

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 pt-2 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Tìm món trong FitBlend..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm bg-zinc-100 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-200" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28" style={{ scrollbarWidth: 'none' }}>
        {items.length === 0 && (
          <div className="py-10 text-center text-zinc-400">
            <span className="text-4xl block mb-2">🥤</span>
            <p className="font-semibold text-sm">Menu đang được cập nhật</p>
            <p className="text-xs mt-1">Quán sẽ sớm thêm món. Bạn có thể xem Combo bên dưới.</p>
          </div>
        )}

        {grouped.map(([section, list]) => {
          const gridItems = list.filter((it) => (it.layout || 'grid') === 'grid');
          const listItems = list.filter((it) => it.layout === 'list');
          return (
            <div key={section}>
              <h3 className="text-[16px] font-black text-zinc-900 pt-4 pb-2">{section}</h3>
              {gridItems.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {gridItems.map((it) => {
                    const { final, base } = priceOf(it);
                    return (
                      <GridCard key={it.id} name={it.name} image={it.imageUrl}
                        badge={it.badge} discountPercent={it.discountPercent}
                        priceLabel={`${final.toLocaleString('vi-VN')}đ`}
                        oldPriceLabel={it.discountPercent ? `${base.toLocaleString('vi-VN')}đ` : undefined}
                        onClick={() => onProductClick(it)} />
                    );
                  })}
                </div>
              )}
              {listItems.map((it) => {
                const { final, base } = priceOf(it);
                return (
                  <DishCard key={it.id} name={it.name} desc={it.description} image={it.imageUrl}
                    badge={it.badge} discountPercent={it.discountPercent}
                    priceLabel={`từ ${final.toLocaleString('vi-VN')}đ`}
                    oldPriceLabel={it.discountPercent ? `${base.toLocaleString('vi-VN')}đ` : undefined}
                    onClick={() => onProductClick(it)} />
                );
              })}
            </div>
          );
        })}

        {combos.length > 0 && (
          <div>
            <h3 className="text-[16px] font-black text-zinc-900 pt-5 pb-1">📦 Combo gói tuần / tháng / quý</h3>
            {combos.map((id) => {
              const plan = PLANS[id];
              return (
                <DishCard key={id} name={plan.name} desc={`${plan.subtitle} · ${plan.specs}`} image={plan.icon}
                  priceLabel={`từ ${plan.weekly.price.toLocaleString('vi-VN')}k`}
                  onClick={() => onSelectCombo(id)} />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
