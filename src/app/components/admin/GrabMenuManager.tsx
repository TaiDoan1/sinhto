import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Image as ImageIcon, Eye, EyeOff, UtensilsCrossed } from 'lucide-react';
import * as api from '../../utils/api';
import type { GrabMenuItem, GrabBadge } from '../../utils/api';
import { useMenuPricing } from '../../hooks/useMenuPricing';
import { PROTEIN_LEVELS_BY_SIZE, resolveCupPrice } from '../../config/menuPricing';

const SIZES = Object.keys(PROTEIN_LEVELS_BY_SIZE);
const BADGES: { key: GrabBadge; label: string; chip: string }[] = [
  { key: '', label: 'Không nhãn', chip: 'bg-gray-100 text-gray-500' },
  { key: 'bestseller', label: 'Bán chạy', chip: 'bg-emerald-100 text-emerald-700' },
  { key: 'loved', label: 'Được yêu thích', chip: 'bg-pink-100 text-pink-600' },
  { key: 'new', label: 'Món mới', chip: 'bg-sky-100 text-sky-700' },
];
function badgeInfo(key: string) { return BADGES.find((b) => b.key === key) || BADGES[0]; }

const EMPTY: Partial<GrabMenuItem> = {
  name: '', description: '', imageUrl: '', section: '', badge: '', layout: 'grid',
  defaultSize: '360ml', defaultProtein: 40, discountPercent: 0, sortOrder: 0, active: 1,
};

export function GrabMenuManager() {
  const { priceTable } = useMenuPricing();
  const [items, setItems] = useState<GrabMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<GrabMenuItem> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    api.fetchGrabMenu(true).then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const sections = useMemo(() => Array.from(new Set(items.map((i) => i.section).filter(Boolean))), [items]);
  const grouped = useMemo(() => {
    const map = new Map<string, GrabMenuItem[]>();
    for (const it of items) {
      const k = it.section || '(Chưa xếp mục)';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return [...map.entries()];
  }, [items]);

  const priceOf = (size: string, protein: number, discount: number) => {
    const base = resolveCupPrice(size, protein, priceTable) || 0;
    return Math.round(base * (1 - (discount || 0) / 100));
  };

  const openNew = () => { setEditing({ ...EMPTY, sortOrder: items.length }); setIsNew(true); };
  const openEdit = (it: GrabMenuItem) => { setEditing({ ...it }); setIsNew(false); };

  const pickImage = async (file: File) => {
    setUploading(true);
    try {
      const url = await api.uploadImage(file);
      setEditing((p) => ({ ...p, imageUrl: url }));
    } catch { alert('Tải ảnh lên thất bại'); } finally { setUploading(false); }
  };

  const save = async () => {
    if (!editing?.name?.trim()) { alert('Nhập tên món'); return; }
    setSaving(true);
    try {
      if (isNew || !editing.id) await api.createGrabMenuItem(editing);
      else await api.updateGrabMenuItem(editing.id, editing);
      setEditing(null);
      load();
    } catch (e) { alert(e instanceof Error ? e.message : 'Lưu thất bại'); } finally { setSaving(false); }
  };

  const toggleActive = async (it: GrabMenuItem) => {
    try { await api.updateGrabMenuItem(it.id, { active: it.active ? 0 : 1 }); load(); } catch { alert('Không đổi được trạng thái'); }
  };

  const remove = async (it: GrabMenuItem) => {
    if (!confirm(`Xóa món "${it.name}"?`)) return;
    try { await api.deleteGrabMenuItem(it.id); load(); } catch { alert('Xóa thất bại'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
        <h3 className="text-base font-bold text-gray-800">Menu món (app đặt món /dat-mon)</h3>
        <button onClick={openNew} className="ml-auto flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-3 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Thêm món
        </button>
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        Món hiển thị trong app đặt món của khách (giống Grab). Khách bấm món vẫn chọn size/protein/topping;
        <b> size + protein mặc định</b> quyết định giá hiển thị "từ …đ".
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-14 text-gray-400 bg-white rounded-2xl border border-dashed">
          <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">Chưa có món nào</p>
          <p className="text-sm mt-1">Bấm "Thêm món" để tạo menu cho app đặt món.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([section, list]) => (
            <div key={section}>
              <p className="text-[13px] font-black text-gray-400 uppercase tracking-wider mb-2">{section}</p>
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {list.map((it) => (
                  <div key={it.id} className={`flex items-center gap-3 px-3 py-3 ${it.active ? '' : 'opacity-50'}`}>
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                      {it.imageUrl ? <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-gray-300" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-gray-800 text-sm truncate">{it.name}</p>
                        {it.badge ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeInfo(it.badge).chip}`}>{badgeInfo(it.badge).label}</span> : null}
                        {it.discountPercent > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">Giảm {it.discountPercent}%</span>}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">{it.defaultSize} · {it.defaultProtein}g · từ {priceOf(it.defaultSize, it.defaultProtein, it.discountPercent).toLocaleString('vi-VN')}đ</p>
                    </div>
                    <button onClick={() => toggleActive(it)} className="p-2 text-gray-400 hover:text-emerald-600" title={it.active ? 'Đang hiện — bấm để ẩn' : 'Đang ẩn — bấm để hiện'}>
                      {it.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(it)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(it)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-gray-800">{isNew ? 'Thêm món' : 'Sửa món'}</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3.5">
              {/* Ảnh */}
              <div>
                <span className="text-xs font-semibold text-gray-500">Ảnh món</span>
                <div className="mt-1 flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                    {editing.imageUrl ? <img src={editing.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-gray-300" />}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-emerald-400">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} Chọn ảnh
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ''; }} />
                  </label>
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Tên món *</span>
                <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="VD: FitBlend PRO 500ml | 60g protein" />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Mô tả</span>
                <textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="Mô tả ngắn hiển thị dưới tên món" />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Mục (nhóm hiển thị)</span>
                <input list="grab-sections" value={editing.section || ''} onChange={(e) => setEditing({ ...editing, section: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="VD: Signature Protein Shake Smoothie" />
                <datalist id="grab-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Kiểu hiển thị trên app</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEditing({ ...editing, layout: 'grid' })}
                    className={`py-2 rounded-lg text-sm font-semibold border ${(editing.layout || 'grid') === 'grid' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>
                    ▦ Lưới 2 cột
                  </button>
                  <button type="button" onClick={() => setEditing({ ...editing, layout: 'list' })}
                    className={`py-2 rounded-lg text-sm font-semibold border ${editing.layout === 'list' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>
                    ☰ Danh sách
                  </button>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Nhãn</span>
                  <select value={editing.badge || ''} onChange={(e) => setEditing({ ...editing, badge: e.target.value as GrabBadge })} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    {BADGES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Giảm giá (%)</span>
                  <input type="number" min={0} max={90} value={editing.discountPercent ?? 0} onChange={(e) => setEditing({ ...editing, discountPercent: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Size mặc định</span>
                  <select value={editing.defaultSize || '360ml'} onChange={(e) => {
                    const size = e.target.value;
                    const levels = PROTEIN_LEVELS_BY_SIZE[size] || [20];
                    setEditing({ ...editing, defaultSize: size, defaultProtein: levels.includes(editing.defaultProtein || 40) ? editing.defaultProtein : levels[0] });
                  }} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Protein mặc định</span>
                  <select value={editing.defaultProtein ?? 40} onChange={(e) => setEditing({ ...editing, defaultProtein: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    {(PROTEIN_LEVELS_BY_SIZE[editing.defaultSize || '360ml'] || [20, 40]).map((l) => <option key={l} value={l}>{l}g</option>)}
                  </select>
                </label>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-sm text-emerald-800">
                Giá hiển thị trên app: <b>từ {priceOf(editing.defaultSize || '360ml', editing.defaultProtein || 40, editing.discountPercent || 0).toLocaleString('vi-VN')}đ</b>
                {(editing.discountPercent || 0) > 0 && <span className="text-orange-600"> (đã giảm {editing.discountPercent}%)</span>}
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Thứ tự (nhỏ = trên)</span>
                  <input type="number" value={editing.sortOrder ?? 0} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
                </label>
                <label className="flex items-center gap-2 mt-5 cursor-pointer">
                  <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked ? 1 : 0 })} className="w-4 h-4 accent-emerald-600" />
                  <span className="text-sm text-gray-700">Hiển thị</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t sticky bottom-0 bg-white">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-lg border font-semibold text-gray-600">Hủy</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Lưu món
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
