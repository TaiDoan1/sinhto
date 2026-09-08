'use client';
import { useState, useMemo } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import type { GrabMenuItem, GrabOptionGroup } from '../../utils/api';

interface Props {
  item: GrabMenuItem;
  onClose: () => void;
  onAdd: (cartItem: { name: string; price: number; quantity: number; options: string[]; note: string }) => void;
}

function isImg(s?: string) { return !!s && (s.startsWith('/') || s.startsWith('data:') || s.startsWith('http')); }

// Luật hiển thị của nhóm.
function ruleLabel(g: GrabOptionGroup) {
  if (g.type === 'single') return 'Chọn 1';
  if (g.required) return `Chọn ít nhất 1${g.max ? ` · tối đa ${g.max}` : ''}`;
  return `Không bắt buộc${g.max ? ` · tối đa ${g.max}` : ''}`;
}

export function GrabItemSheet({ item, onClose, onAdd }: Props) {
  const groups = item.optionGroups || [];
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const priceOfOption = (g: GrabOptionGroup, name: string) => g.options.find((o) => o.name === name)?.price || 0;

  const toggle = (g: GrabOptionGroup, name: string) => {
    setSelected((prev) => {
      const cur = prev[g.id] || [];
      if (g.type === 'single') return { ...prev, [g.id]: cur[0] === name ? [] : [name] };
      // multi
      if (cur.includes(name)) return { ...prev, [g.id]: cur.filter((n) => n !== name) };
      if (g.max && cur.length >= g.max) return prev; // đã đạt tối đa
      return { ...prev, [g.id]: [...cur, name] };
    });
  };

  const addonTotal = useMemo(() => {
    let sum = 0;
    for (const g of groups) for (const n of selected[g.id] || []) sum += priceOfOption(g, n);
    return sum;
  }, [groups, selected]);

  const unitPrice = Math.round((item.basePrice + addonTotal) * (1 - (item.discountPercent || 0) / 100));
  const total = unitPrice * qty;

  // Kiểm tra các nhóm bắt buộc đã chọn đủ chưa.
  const missing = groups.filter((g) => {
    const cnt = (selected[g.id] || []).length;
    if (g.type === 'single' || g.required) return cnt < 1;
    return false;
  });
  const canAdd = missing.length === 0;

  const handleAdd = () => {
    if (!canAdd) return;
    const opts: string[] = [];
    for (const g of groups) for (const n of selected[g.id] || []) {
      const p = priceOfOption(g, n);
      opts.push(p > 0 ? `${n} (+${p.toLocaleString('vi-VN')}đ)` : n);
    }
    onAdd({ name: item.name, price: unitPrice, quantity: qty, options: opts, note: note.trim() });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Hero ảnh */}
        <div className="relative h-48 bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
          {isImg(item.imageUrl) ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-7xl">🥤</span>}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg hover:bg-white"><X className="w-5 h-5 text-gray-800" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-black text-gray-900">{item.name}</h2>
              <div className="text-right shrink-0">
                <p className="text-lg font-black" style={{ color: item.discountPercent ? '#e8740c' : '#111' }}>{Math.round(item.basePrice * (1 - (item.discountPercent || 0) / 100)).toLocaleString('vi-VN')}đ</p>
                {item.discountPercent ? <p className="text-xs text-gray-400 line-through">{item.basePrice.toLocaleString('vi-VN')}đ</p> : <p className="text-[11px] text-gray-400">Giá gốc</p>}
              </div>
            </div>
            {item.description && <p className="text-gray-500 mt-1 text-sm">{item.description}</p>}
          </div>

          {/* Nhóm tùy chọn */}
          {groups.map((g) => {
            const cur = selected[g.id] || [];
            const isMissing = missing.includes(g);
            return (
              <div key={g.id} className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-gray-800 text-[15px]">{g.title}</h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isMissing ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{ruleLabel(g)}</span>
                </div>
                <div className="space-y-1">
                  {g.options.map((o) => {
                    const on = cur.includes(o.name);
                    const disabled = g.type === 'multi' && !on && !!g.max && cur.length >= g.max;
                    return (
                      <button key={o.name} type="button" onClick={() => toggle(g, o.name)} disabled={disabled}
                        className={`w-full flex items-center gap-3 py-2.5 text-left ${disabled ? 'opacity-40' : ''}`}>
                        <span className={`shrink-0 w-5 h-5 flex items-center justify-center border-2 ${g.type === 'single' ? 'rounded-full' : 'rounded-md'} ${on ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                          {on && <span className={`bg-white ${g.type === 'single' ? 'w-2 h-2 rounded-full' : 'w-2.5 h-2.5 rounded-sm'}`} />}
                        </span>
                        <span className="flex-1 text-[15px] text-gray-800">{o.name}</span>
                        {o.price > 0 && <span className="text-sm text-gray-500 shrink-0">+{o.price.toLocaleString('vi-VN')}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Ghi chú */}
          <div className="px-5 py-4">
            <h3 className="font-black text-gray-800 text-[15px] mb-2">Thêm lưu ý cho quán</h3>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Việc thực hiện yêu cầu còn tùy thuộc vào khả năng của quán." className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-emerald-500" />
          </div>
        </div>

        {/* Footer: số lượng + thêm giỏ */}
        <div className="p-4 border-t bg-white shrink-0 space-y-3">
          <div className="flex items-center justify-center gap-5">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
            <span className="text-lg font-black w-8 text-center">{qty}</span>
            <button type="button" onClick={() => setQty((q) => q + 1)} className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center"><Plus className="w-4 h-4" /></button>
          </div>
          <button onClick={handleAdd} disabled={!canAdd}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-2xl font-black text-base shadow-xl shadow-emerald-200 transition-all active:scale-[0.98]">
            {canAdd ? `Thêm vào giỏ hàng • ${total.toLocaleString('vi-VN')}đ` : `Chọn đủ mục bắt buộc (${missing.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
