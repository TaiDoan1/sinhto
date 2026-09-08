import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Image as ImageIcon, Eye, EyeOff, UtensilsCrossed } from 'lucide-react';
import * as api from '../../utils/api';
import type { GrabMenuItem, GrabBadge, GrabOptionGroup } from '../../utils/api';

const BADGES: { key: GrabBadge; label: string; chip: string }[] = [
  { key: '', label: 'Không nhãn', chip: 'bg-gray-100 text-gray-500' },
  { key: 'bestseller', label: 'Bán chạy', chip: 'bg-emerald-100 text-emerald-700' },
  { key: 'loved', label: 'Được yêu thích', chip: 'bg-pink-100 text-pink-600' },
  { key: 'new', label: 'Món mới', chip: 'bg-sky-100 text-sky-700' },
];
function badgeInfo(key: string) { return BADGES.find((b) => b.key === key) || BADGES[0]; }

const EMPTY: Partial<GrabMenuItem> = {
  name: '', description: '', imageUrl: '', section: '', badge: '', layout: 'grid',
  basePrice: 0, discountPercent: 0, optionGroups: [], sortOrder: 0, active: 1,
};

function newGroup(): GrabOptionGroup {
  return { id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title: '', type: 'multi', required: false, max: 0, options: [{ name: '', price: 0 }] };
}
function finalPrice(base: number, discount: number) { return Math.round((base || 0) * (1 - (discount || 0) / 100)); }

export function GrabMenuManager() {
  const [items, setItems] = useState<GrabMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<GrabMenuItem> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => { setLoading(true); api.fetchGrabMenu(true).then(setItems).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const sections = useMemo(() => Array.from(new Set(items.map((i) => i.section).filter(Boolean))), [items]);
  const grouped = useMemo(() => {
    const map = new Map<string, GrabMenuItem[]>();
    for (const it of items) { const k = it.section || '(Chưa xếp mục)'; if (!map.has(k)) map.set(k, []); map.get(k)!.push(it); }
    return [...map.entries()];
  }, [items]);

  const openNew = () => { setEditing({ ...EMPTY, sortOrder: items.length }); setIsNew(true); };
  const openEdit = (it: GrabMenuItem) => { setEditing({ ...it, optionGroups: (it.optionGroups || []).map((g) => ({ ...g, options: [...g.options] })) }); setIsNew(false); };

  const pickImage = async (file: File) => {
    setUploading(true);
    try { const url = await api.uploadImage(file); setEditing((p) => ({ ...p, imageUrl: url })); }
    catch { alert('Tải ảnh lên thất bại'); } finally { setUploading(false); }
  };

  // ── Cập nhật nhóm/lựa chọn (bất biến) ──
  const setGroups = (fn: (gs: GrabOptionGroup[]) => GrabOptionGroup[]) =>
    setEditing((p) => ({ ...p, optionGroups: fn([...(p?.optionGroups || [])]) }));
  const updateGroup = (gi: number, patch: Partial<GrabOptionGroup>) => setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const updateOption = (gi: number, oi: number, patch: Partial<{ name: string; price: number }>) =>
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : g)));

  const save = async () => {
    if (!editing?.name?.trim()) { alert('Nhập tên món'); return; }
    setSaving(true);
    try {
      if (isNew || !editing.id) await api.createGrabMenuItem(editing);
      else await api.updateGrabMenuItem(editing.id, editing);
      setEditing(null); load();
    } catch (e) { alert(e instanceof Error ? e.message : 'Lưu thất bại'); } finally { setSaving(false); }
  };
  const toggleActive = async (it: GrabMenuItem) => { try { await api.updateGrabMenuItem(it.id, { active: it.active ? 0 : 1 }); load(); } catch { alert('Không đổi được trạng thái'); } };
  const remove = async (it: GrabMenuItem) => { if (!confirm(`Xóa món "${it.name}"?`)) return; try { await api.deleteGrabMenuItem(it.id); load(); } catch { alert('Xóa thất bại'); } };

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
        Khách bấm món sẽ hiện <b>giá gốc + các nhóm tùy chọn</b> (giống Grab). Đặt giá gốc, tạo nhóm (trứng, healthy, topping, hương vị, độ ngọt, mức đá…), mỗi lựa chọn có giá cộng thêm.
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-14 text-gray-400 bg-white rounded-2xl border border-dashed">
          <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">Chưa có món nào</p>
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
                      <p className="text-[11px] text-gray-400 truncate">
                        {finalPrice(it.basePrice, it.discountPercent).toLocaleString('vi-VN')}đ · {(it.optionGroups || []).length} nhóm tùy chọn · {it.layout === 'grid' ? 'lưới' : 'danh sách'}
                      </p>
                    </div>
                    <button onClick={() => toggleActive(it)} className="p-2 text-gray-400 hover:text-emerald-600" title={it.active ? 'Đang hiện' : 'Đang ẩn'}>
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
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
                <textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="Mô tả ngắn dưới tên món" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Mục (nhóm hiển thị)</span>
                <input list="grab-sections" value={editing.section || ''} onChange={(e) => setEditing({ ...editing, section: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="VD: Signature Protein Shake Smoothie" />
                <datalist id="grab-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Kiểu hiển thị</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEditing({ ...editing, layout: 'grid' })} className={`py-2 rounded-lg text-sm font-semibold border ${(editing.layout || 'grid') === 'grid' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>▦ Lưới 2 cột</button>
                  <button type="button" onClick={() => setEditing({ ...editing, layout: 'list' })} className={`py-2 rounded-lg text-sm font-semibold border ${editing.layout === 'list' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>☰ Danh sách</button>
                </div>
              </label>

              <div className="grid grid-cols-3 gap-3">
                <label className="block col-span-1">
                  <span className="text-xs font-semibold text-gray-500">Nhãn</span>
                  <select value={editing.badge || ''} onChange={(e) => setEditing({ ...editing, badge: e.target.value as GrabBadge })} className="mt-1 w-full px-2 py-2 border rounded-lg text-sm bg-white">
                    {BADGES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Giá gốc (đ)</span>
                  <input type="number" min={0} value={editing.basePrice ?? 0} onChange={(e) => setEditing({ ...editing, basePrice: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm font-mono" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Giảm (%)</span>
                  <input type="number" min={0} max={90} value={editing.discountPercent ?? 0} onChange={(e) => setEditing({ ...editing, discountPercent: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
                </label>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-sm text-emerald-800">
                Giá hiển thị: <b>{finalPrice(editing.basePrice || 0, editing.discountPercent || 0).toLocaleString('vi-VN')}đ</b>
                {(editing.discountPercent || 0) > 0 && <span className="text-gray-400 line-through ml-1">{(editing.basePrice || 0).toLocaleString('vi-VN')}đ</span>}
                <span className="text-gray-500"> (chưa gồm tùy chọn)</span>
              </div>

              {/* ── Nhóm tùy chọn ── */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-gray-600 uppercase tracking-wide">Nhóm tùy chọn</span>
                  <button type="button" onClick={() => setGroups((gs) => [...gs, newGroup()])} className="text-xs font-bold text-emerald-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Thêm nhóm</button>
                </div>
                {(editing.optionGroups || []).length === 0 && <p className="text-xs text-gray-400">Chưa có nhóm nào. Bấm "Thêm nhóm" (vd: trứng luộc, chọn hương vị, mức đá…).</p>}
                <div className="space-y-3">
                  {(editing.optionGroups || []).map((g, gi) => (
                    <div key={g.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <input value={g.title} onChange={(e) => updateGroup(gi, { title: e.target.value })} placeholder="Tên nhóm (vd: trứng luộc)" className="flex-1 px-2.5 py-1.5 border rounded-lg text-sm font-semibold" />
                        <button type="button" onClick={() => setGroups((gs) => gs.filter((_, i) => i !== gi))} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-2 text-xs">
                        <div className="flex rounded-lg overflow-hidden border border-gray-200">
                          <button type="button" onClick={() => updateGroup(gi, { type: 'single', required: true })} className={`px-2.5 py-1 font-semibold ${g.type === 'single' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500'}`}>Chọn 1</button>
                          <button type="button" onClick={() => updateGroup(gi, { type: 'multi' })} className={`px-2.5 py-1 font-semibold ${g.type === 'multi' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500'}`}>Tích nhiều</button>
                        </div>
                        {g.type === 'multi' && (
                          <>
                            <label className="flex items-center gap-1 text-gray-600">Tối đa <input type="number" min={0} value={g.max || 0} onChange={(e) => updateGroup(gi, { max: Number(e.target.value) })} className="w-14 px-2 py-1 border rounded" /></label>
                            <label className="flex items-center gap-1 text-gray-600"><input type="checkbox" checked={!!g.required} onChange={(e) => updateGroup(gi, { required: e.target.checked })} className="accent-emerald-600" /> Ít nhất 1</label>
                          </>
                        )}
                        {g.type === 'single' && <span className="text-gray-400">Khách phải chọn đúng 1</span>}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {g.options.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input value={o.name} onChange={(e) => updateOption(gi, oi, { name: e.target.value })} placeholder="Tên lựa chọn" className="flex-1 px-2.5 py-1.5 border rounded-lg text-sm" />
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-gray-400">+</span>
                              <input type="number" min={0} value={o.price} onChange={(e) => updateOption(gi, oi, { price: Number(e.target.value) })} className="w-24 px-2 py-1.5 border rounded-lg text-sm font-mono" />
                              <span className="text-xs text-gray-400">đ</span>
                            </div>
                            <button type="button" onClick={() => updateGroup(gi, { options: g.options.filter((_, j) => j !== oi) })} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => updateGroup(gi, { options: [...g.options, { name: '', price: 0 }] })} className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1"><Plus className="w-3.5 h-3.5" /> Thêm lựa chọn</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Thứ tự</span>
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
