import { useState } from 'react';
import { X, Minus, Plus, ChevronDown } from 'lucide-react';
import { PLANS, type PlanId, type Duration } from './CustomerApp';
import type { CartItem } from './CustomerCartPanel';

// ─── Flavor list ──────────────────────────────────────────────────────────────
const FLAVORS = [
  { name: 'Dâu hạt chia', english: 'Strawberry chia' },
  { name: 'Dâu chuối', english: 'Strawberry banana' },
  { name: 'Dâu cam', english: 'Strawberry orange' },
  { name: 'Mãng cầu dâu', english: 'Soursop strawberry' },
  { name: 'Dâu tằm chuối', english: 'Mulberry banana', tag: 'Mới' },
  { name: 'Dâu tằm yến mạch', english: 'Mulberry oat', tag: 'Mới' },
  { name: 'Phúc bồn tử chuối', english: 'Raspberry banana', tag: 'Mới' },
  { name: 'Phúc bồn tử yến mạch', english: 'Raspberry oat', tag: 'Mới' },
  { name: 'Thanh long chuối', english: 'Dragonfruit banana', tag: 'Mới' },
  { name: 'Thanh long yến mạch', english: 'Dragonfruit oat', tag: 'Phải thử' },
  { name: 'Xoài thơm', english: 'Mango pineapple' },
  { name: 'Xoài cam', english: 'Mango orange', tag: 'Bán chạy' },
  { name: 'Xoài dâu', english: 'Mango strawberry', tag: 'Mới' },
  { name: 'Xoài chuối', english: 'Mango banana', tag: 'Mới' },
  { name: 'Chuối hạt chia', english: 'Banana chia' },
  { name: 'Chanh dây chuối', english: 'Passionfruit banana' },
  { name: 'Cacao yến mạch', english: 'Cacao oat', tag: 'Bán chạy' },
  { name: 'Cacao chuối', english: 'Cacao banana', tag: 'Bán chạy' },
  { name: 'Cà phê chuối', english: 'Coffee banana' },
  { name: 'Bơ', english: 'Avocado' },
  { name: 'Bơ chuối', english: 'Avocado banana' },
  { name: 'Matcha', english: 'Matcha green tea' },
  { name: 'Matcha chuối', english: 'Matcha banana', tag: 'Mới' },
  { name: 'Matcha yến mạch', english: 'Matcha oat', tag: 'Mới' },
];

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const DEFAULT_FLAVORS = [
  'Matcha',
  'Phúc bồn tử chuối',
  'Bơ',
  'Xoài cam',
  'Cacao yến mạch',
  'Cà phê chuối',
  'Chuối hạt chia',
];

interface Props {
  planId: PlanId;
  onClose: () => void;
  onAddToCart: (item: Omit<CartItem, 'cartItemId'>) => void;
}

// ─── Flavor Picker Sheet ──────────────────────────────────────────────────────
function FlavorSheet({ dayIndex, current, onSelect, onClose }: {
  dayIndex: number;
  current: string;
  onSelect: (flavor: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in" style={{ maxHeight: '75vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-black text-[17px] text-gray-900">Chọn vị – {DAYS[dayIndex]}</h3>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">24 vị trái cây tươi, không đường</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 transition-transform active:scale-95">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto pb-10 flex-1" style={{ maxHeight: 'calc(75vh - 72px)' }}>
          {FLAVORS.map(f => (
            <button
              key={f.name}
              onClick={() => { onSelect(f.name); onClose(); }}
              className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-50 hover:bg-emerald-50/20 active:bg-emerald-50/50 transition-colors text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[15px] text-gray-800">{f.name}</span>
                  {f.tag && (
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md text-white ${
                      f.tag === 'Mới' ? 'bg-red-500' :
                      f.tag === 'Bán chạy' ? 'bg-amber-500' :
                      'bg-indigo-600'
                    }`}>
                      {f.tag}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 font-medium italic mt-0.5">{f.english}</div>
              </div>
              {f.name === current && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#10b981' }}>
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PlanDetailModal ──────────────────────────────────────────────────────────
export function PlanDetailModal({ planId, onClose, onAddToCart }: Props) {
  const plan = PLANS[planId];

  const [duration, setDuration] = useState<Duration>('weekly');
  const [quantity, setQuantity] = useState(1);
  const [flavors, setFlavors] = useState<string[]>([...DEFAULT_FLAVORS]);
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(null);

  const p = plan[duration];
  const totalPrice = p.price * quantity;
  const totalOriginal = p.original * quantity;
  const totalSave = p.save * quantity;
  const durationDays = duration === 'weekly' ? 7 : duration === 'monthly' ? 30 : 90;

  const durationTabs: { key: Duration; label: string; emoji?: string }[] = [
    { key: 'weekly',    label: 'TUẦN –10%' },
    { key: 'monthly',   label: 'THÁNG –15%' },
    { key: 'quarterly', label: 'QUÝ –20%', emoji: '🔥' },
  ];

  const handleAdd = () => {
    onAddToCart({
      name: `${plan.name} (${duration === 'weekly' ? 'Tuần' : duration === 'monthly' ? 'Tháng' : 'Quý'} × ${quantity})`,
      image: plan.icon,
      price: totalPrice,
      quantity: 1,
      isCustomCombo: true,
      toppings: flavors.map((f, i) => `${DAYS[i]}: ${f}`),
      rawComboData: { planId, duration, quantity, flavors },
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-[110] rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: '#f5f0e8', maxHeight: '95vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }} />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* ── Plan Header ── */}
          <div className="px-5 pt-3 pb-4 bg-white border-b border-gray-100 flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: plan.ctaColor }}>
                {plan.name.toUpperCase().split(' ').slice(0, 2).join(' ')} · {plan.subtitle.split('·')[0].trim()}
              </p>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[28px]">{plan.icon}</span>
                <h2 className="text-[24px] font-black text-gray-900">{plan.name}</h2>
              </div>
              <p className="text-[13px] text-gray-400 font-medium">{plan.specs}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full text-white" style={{ background: plan.ctaColor }}>
                {plan.badge}
              </span>
              <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* ── Flavor 7 days ── */}
          <div className="px-5 pt-5 pb-4">
            <p className="font-black text-[16px] text-gray-900 mb-3">
              Chọn vị 7 ngày:{' '}
              <span className="text-[13px] font-normal text-gray-400">dropdown để đổi từng ngày</span>
            </p>
            <div className="space-y-2">
              {DAYS.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => setOpenDayIndex(idx)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white border border-gray-100 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-gray-400 w-14 text-left">{day}</span>
                    <span className="text-[14px] font-semibold text-gray-800">{flavors[idx]}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>

          {/* ── Quantity counter ── */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white border border-gray-100">
              <span className="font-black text-[15px] text-gray-900">
                {duration === 'weekly' ? 'Số tuần:' : duration === 'monthly' ? 'Số tháng:' : 'Số quý:'}
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-blue-500 hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-[20px] font-black text-gray-900 w-6 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-blue-500 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Duration tabs with price ── */}
          <div className="px-5 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {durationTabs.map(tab => {
                const tabPrice = plan[tab.key].price * quantity;
                const isActive = duration === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setDuration(tab.key)}
                    className="py-3 px-2 rounded-2xl text-center transition-all"
                    style={isActive
                      ? { background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e' }
                      : { background: 'white', border: '2px solid #e5e7eb' }
                    }
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: isActive ? '#166534' : '#9ca3af' }}>
                      {tab.emoji && <span>{tab.emoji} </span>}{tab.label}
                    </p>
                    <p className="text-[15px] font-black mt-0.5" style={{ color: isActive ? '#166534' : '#374151' }}>
                      {tabPrice.toLocaleString('vi-VN')}k
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Price summary ── */}
          <div className="px-5 pb-6">
            <div className="bg-white rounded-3xl px-5 py-4 border border-gray-100">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-[15px] font-bold text-gray-300 line-through">
                  {totalOriginal.toLocaleString('vi-VN')}k
                </span>
                <span className="text-[48px] font-black leading-none" style={{ color: plan.ctaColor }}>
                  {totalPrice.toLocaleString('vi-VN')}
                </span>
                <span className="text-[22px] font-black text-gray-600">k</span>
              </div>
              <p className="text-[13px] text-gray-400 mb-3">
                = {p.perCup}k/ly · {durationDays} ngày freeship
              </p>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold"
                style={{ background: `${plan.ctaColor}18`, color: plan.ctaColor, border: `1px solid ${plan.ctaColor}40` }}>
                ✦ Tiết kiệm {totalSave.toLocaleString('vi-VN')}k
              </div>
            </div>
          </div>

        </div>

        {/* ── Sticky CTA ── */}
        <div className="px-5 pt-3 pb-6 bg-white border-t border-gray-100 shrink-0">
          <button
            onClick={handleAdd}
            className="w-full py-4 rounded-2xl font-black text-[17px] text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
            style={{ background: plan.ctaColor }}
          >
            🛒 Thêm {plan.name.split(' ').slice(0, 2).join(' ')} vào giỏ →
          </button>
        </div>
      </div>

      {/* Flavor Sheet */}
      {openDayIndex !== null && (
        <FlavorSheet
          dayIndex={openDayIndex}
          current={flavors[openDayIndex]}
          onSelect={(f) => {
            const updated = [...flavors];
            updated[openDayIndex] = f;
            setFlavors(updated);
          }}
          onClose={() => setOpenDayIndex(null)}
        />
      )}
    </>
  );
}
