import { useEffect, useState } from 'react';
import { Save, RotateCcw, Plus, Trash2, BookOpen, Loader2 } from 'lucide-react';
import * as api from '../../utils/api';
import {
  DEFAULT_MENU_BOOK,
  MENU_BOOK_SETTING_KEY,
  type MenuBookData,
  type FlavourTag,
} from '../../config/menuBook';

const clone = (d: MenuBookData): MenuBookData => JSON.parse(JSON.stringify(d));

function TextField({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-gray-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-emerald-500 outline-none ${mono ? 'font-mono' : ''}`}
      />
    </label>
  );
}

function Card({ title, children, onRemove }: { title: string; children: React.ReactNode; onRemove?: () => void }) {
  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white relative">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-gray-700">{title}</h4>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-red-500 hover:bg-red-50 p-1 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Section({ title, hint, onAdd, children }: { title: string; hint?: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-black text-gray-900">{title}</h3>
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
        {onAdd && (
          <button type="button" onClick={onAdd} className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg">
            <Plus className="w-4 h-4" /> Thêm
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function MenuBookEditor() {
  const [data, setData] = useState<MenuBookData>(DEFAULT_MENU_BOOK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.fetchSetting(MENU_BOOK_SETTING_KEY)
      .then((d: any) => {
        if (d && Array.isArray(d.comboToppings) && Array.isArray(d.flavours)) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upd = (fn: (d: MenuBookData) => void) => setData((prev) => { const c = clone(prev); fn(c); return c; });

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.saveSetting(MENU_BOOK_SETTING_KEY, data);
      setMsg('Đã lưu! Trang menu sẽ cập nhật ngay.');
    } catch (e: any) {
      setMsg('Lỗi lưu: ' + (e?.message || 'thử lại'));
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const resetDefault = () => {
    if (confirm('Khôi phục nội dung menu về mặc định? Thay đổi chưa lưu sẽ mất.')) setData(clone(DEFAULT_MENU_BOOK));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-1">
        <BookOpen className="w-7 h-7 text-emerald-700" />
        <h1 className="text-2xl font-black text-gray-900">Sách Menu</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">Chỉnh nội dung menu (giá, món, vị...) — lưu là trang khách cập nhật ngay.</p>

      {/* Thanh lưu dính trên cùng */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-gray-100/90 backdrop-blur flex items-center gap-3 mb-6 border-b border-gray-200">
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu thay đổi
        </button>
        <button type="button" onClick={resetDefault} className="flex items-center gap-2 text-gray-600 hover:bg-gray-200 font-semibold px-4 py-2.5 rounded-xl">
          <RotateCcw className="w-4 h-4" /> Về mặc định
        </button>
        {msg && <span className={`text-sm font-semibold ${msg.startsWith('Lỗi') ? 'text-red-600' : 'text-emerald-700'}`}>{msg}</span>}
      </div>

      {/* Thông tin chung */}
      <Section title="Thông tin chung">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TextField label="Tagline" value={data.tagline} onChange={(v) => upd((d) => { d.tagline = v; })} />
          <TextField label="Hotline" value={data.phone} onChange={(v) => upd((d) => { d.phone = v; })} />
          <TextField label="Website" value={data.web} onChange={(v) => upd((d) => { d.web = v; })} />
          <TextField label="Zalo OA" value={data.zalo} onChange={(v) => upd((d) => { d.zalo = v; })} />
        </div>
      </Section>

      {/* Combo topping */}
      <Section
        title="Combo Topping"
        hint="Các combo topping (trang 1)"
        onAdd={() => upd((d) => { d.comboToppings.push({ no: String(d.comboToppings.length + 1).padStart(2, '0'), name: 'COMBO MỚI', nameEn: '', ingredients: '', ingredientsEn: '', stat: '', statEn: '', price: '0K', was: '', color: '#2f7d4f' }); })}
      >
        <div className="grid md:grid-cols-2 gap-3">
          {data.comboToppings.map((c, i) => (
            <Card key={i} title={`Combo ${c.no}`} onRemove={() => upd((d) => { d.comboToppings.splice(i, 1); })}>
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Số" value={c.no} onChange={(v) => upd((d) => { d.comboToppings[i].no = v; })} />
                <TextField label="Tên" value={c.name} onChange={(v) => upd((d) => { d.comboToppings[i].name = v; })} />
                <TextField label="Nguyên liệu (VI)" value={c.ingredients} onChange={(v) => upd((d) => { d.comboToppings[i].ingredients = v; })} />
                <TextField label="Nguyên liệu (EN)" value={c.ingredientsEn} onChange={(v) => upd((d) => { d.comboToppings[i].ingredientsEn = v; })} />
                <TextField label="Chỉ số (VI)" value={c.stat} onChange={(v) => upd((d) => { d.comboToppings[i].stat = v; })} />
                <TextField label="Chỉ số (EN)" value={c.statEn} onChange={(v) => upd((d) => { d.comboToppings[i].statEn = v; })} />
                <TextField label="Giá" value={c.price} onChange={(v) => upd((d) => { d.comboToppings[i].price = v; })} />
                <TextField label="Giá cũ" value={c.was} onChange={(v) => upd((d) => { d.comboToppings[i].was = v; })} />
                <label className="flex items-center gap-2 text-xs col-span-2">
                  <span className="text-gray-500">Màu</span>
                  <input type="color" value={c.color} onChange={(e) => upd((d) => { d.comboToppings[i].color = e.target.value; })} className="h-8 w-12 rounded border" />
                  <span className="font-mono text-gray-400">{c.color}</span>
                </label>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Topping đơn lẻ */}
      <Section
        title="Topping Đơn Lẻ"
        hint="Danh sách topping mua lẻ"
        onAdd={() => upd((d) => { d.singleToppings.push({ name: '', nameEn: '', price: '0k' }); })}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data.singleToppings.map((t, i) => (
            <div key={i} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2 bg-white">
              <div className="grid grid-cols-3 gap-1.5 flex-1">
                <input placeholder="Tên" value={t.name} onChange={(e) => upd((d) => { d.singleToppings[i].name = e.target.value; })} className="px-2 py-1 rounded border border-gray-200 text-sm" />
                <input placeholder="EN" value={t.nameEn} onChange={(e) => upd((d) => { d.singleToppings[i].nameEn = e.target.value; })} className="px-2 py-1 rounded border border-gray-200 text-sm" />
                <input placeholder="Giá" value={t.price} onChange={(e) => upd((d) => { d.singleToppings[i].price = e.target.value; })} className="px-2 py-1 rounded border border-gray-200 text-sm" />
              </div>
              <button type="button" onClick={() => upd((d) => { d.singleToppings.splice(i, 1); })} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </Section>

      {/* 24 vị */}
      <Section
        title={data.flavoursTitle}
        hint="Danh sách vị (trang 2)"
        onAdd={() => upd((d) => { d.flavours.push({ no: String(d.flavours.length + 1).padStart(2, '0'), name: '', nameEn: '' }); })}
      >
        <div className="mb-3 grid grid-cols-2 gap-3 max-w-md">
          <TextField label="Tiêu đề" value={data.flavoursTitle} onChange={(v) => upd((d) => { d.flavoursTitle = v; })} />
          <TextField label="Ghi chú" value={data.flavoursNote} onChange={(v) => upd((d) => { d.flavoursNote = v; })} />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data.flavours.map((f, i) => (
            <div key={i} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2 bg-white">
              <div className="grid grid-cols-[40px_1fr_1fr_84px] gap-1.5 flex-1">
                <input placeholder="#" value={f.no} onChange={(e) => upd((d) => { d.flavours[i].no = e.target.value; })} className="px-1.5 py-1 rounded border border-gray-200 text-sm" />
                <input placeholder="Tên" value={f.name} onChange={(e) => upd((d) => { d.flavours[i].name = e.target.value; })} className="px-2 py-1 rounded border border-gray-200 text-sm" />
                <input placeholder="EN" value={f.nameEn} onChange={(e) => upd((d) => { d.flavours[i].nameEn = e.target.value; })} className="px-2 py-1 rounded border border-gray-200 text-sm" />
                <select value={f.tag || ''} onChange={(e) => upd((d) => { const v = e.target.value; d.flavours[i].tag = v ? (v as FlavourTag) : undefined; })} className="px-1 py-1 rounded border border-gray-200 text-xs">
                  <option value="">—</option>
                  <option value="hot">Bán chạy</option>
                  <option value="try">Phải thử</option>
                  <option value="new">Mới</option>
                </select>
              </div>
              <button type="button" onClick={() => upd((d) => { d.flavours.splice(i, 1); })} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </Section>

      {/* Bảng giá ly lẻ */}
      <Section
        title="Bảng Giá Ly Lẻ"
        onAdd={() => upd((d) => { d.sizes.push({ name: 'SIZE', ml: '000', desc: '', descEn: '', color: '#2f7d4f', rows: [{ label: '', price: '' }] }); })}
      >
        <div className="mb-3 grid grid-cols-2 gap-3 max-w-md">
          <TextField label="Tiêu đề" value={data.sizesTitle} onChange={(v) => upd((d) => { d.sizesTitle = v; })} />
          <TextField label="Ghi chú" value={data.sizesNote} onChange={(v) => upd((d) => { d.sizesNote = v; })} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {data.sizes.map((s, i) => (
            <Card key={i} title={`${s.name} ${s.ml}ml`} onRemove={() => upd((d) => { d.sizes.splice(i, 1); })}>
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Tên size" value={s.name} onChange={(v) => upd((d) => { d.sizes[i].name = v; })} />
                <TextField label="Dung tích (ml)" value={s.ml} onChange={(v) => upd((d) => { d.sizes[i].ml = v; })} />
                <TextField label="Mô tả (VI)" value={s.desc} onChange={(v) => upd((d) => { d.sizes[i].desc = v; })} />
                <TextField label="Mô tả (EN)" value={s.descEn} onChange={(v) => upd((d) => { d.sizes[i].descEn = v; })} />
              </div>
              <div className="mt-2 space-y-1.5">
                {s.rows.map((r, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    <input placeholder="Nhãn (vd 60g protein)" value={r.label} onChange={(e) => upd((d) => { d.sizes[i].rows[ri].label = e.target.value; })} className="px-2 py-1 rounded border border-gray-200 text-sm flex-1" />
                    <input placeholder="Giá" value={r.price} onChange={(e) => upd((d) => { d.sizes[i].rows[ri].price = e.target.value; })} className="px-2 py-1 rounded border border-gray-200 text-sm w-24" />
                    <button type="button" onClick={() => upd((d) => { d.sizes[i].rows.splice(ri, 1); })} className="text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => upd((d) => { d.sizes[i].rows.push({ label: '', price: '' }); })} className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><Plus className="w-3 h-3" /> Thêm dòng giá</button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Combo tiết kiệm */}
      <Section
        title="Combo Tiết Kiệm"
        onAdd={() => upd((d) => { d.savings.push({ title: 'COMBO MỚI', titleEn: '', discount: '-0%', color: '#2f7d4f', gift: '', giftEn: '', rows: [{ label: 'Fat Loss', price: '' }] }); })}
      >
        <div className="mb-3 grid grid-cols-2 gap-3 max-w-md">
          <TextField label="Tiêu đề" value={data.savingsTitle} onChange={(v) => upd((d) => { d.savingsTitle = v; })} />
          <TextField label="Ghi chú" value={data.savingsNote} onChange={(v) => upd((d) => { d.savingsNote = v; })} />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {data.savings.map((s, i) => (
            <Card key={i} title={s.title} onRemove={() => upd((d) => { d.savings.splice(i, 1); })}>
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Tên" value={s.title} onChange={(v) => upd((d) => { d.savings[i].title = v; })} />
                <TextField label="Tên (EN)" value={s.titleEn} onChange={(v) => upd((d) => { d.savings[i].titleEn = v; })} />
                <TextField label="Giảm giá" value={s.discount} onChange={(v) => upd((d) => { d.savings[i].discount = v; })} />
                <TextField label="Quà tặng" value={s.gift} onChange={(v) => upd((d) => { d.savings[i].gift = v; })} />
              </div>
              <div className="mt-2 space-y-1.5">
                {s.rows.map((r, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    <input placeholder="Nhãn" value={r.label} onChange={(e) => upd((d) => { d.savings[i].rows[ri].label = e.target.value; })} className="px-2 py-1 rounded border border-gray-200 text-sm flex-1" />
                    <input placeholder="Giá" value={r.price} onChange={(e) => upd((d) => { d.savings[i].rows[ri].price = e.target.value; })} className="px-2 py-1 rounded border border-gray-200 text-sm w-24" />
                    <button type="button" onClick={() => upd((d) => { d.savings[i].rows.splice(ri, 1); })} className="text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => upd((d) => { d.savings[i].rows.push({ label: '', price: '' }); })} className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><Plus className="w-3 h-3" /> Thêm dòng</button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Chi nhánh */}
      <Section
        title="Chi Nhánh"
        onAdd={() => upd((d) => { d.branches.push({ district: '', address: '', ward: '', note: '', noteEn: '' }); })}
      >
        <div className="grid md:grid-cols-3 gap-3">
          {data.branches.map((b, i) => (
            <Card key={i} title={b.district || `Chi nhánh ${i + 1}`} onRemove={() => upd((d) => { d.branches.splice(i, 1); })}>
              <div className="grid gap-2">
                <TextField label="Quận" value={b.district} onChange={(v) => upd((d) => { d.branches[i].district = v; })} />
                <TextField label="Địa chỉ" value={b.address} onChange={(v) => upd((d) => { d.branches[i].address = v; })} />
                <TextField label="Phường" value={b.ward} onChange={(v) => upd((d) => { d.branches[i].ward = v; })} />
                <TextField label="Ghi chú" value={b.note} onChange={(v) => upd((d) => { d.branches[i].note = v; })} />
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}
