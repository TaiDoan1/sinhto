import { useState, useEffect } from 'react';
import { Package, Plus, Save, Loader2, CheckCircle, Trash2, Pencil, Eye, EyeOff, X } from 'lucide-react';
import * as api from '../../utils/api';
import { useMenu } from '../../contexts/MenuContext';
import { COMBO_PACKAGE_SETTING_KEY, type ComboPackageDayItem, type ComboPackageTemplate } from '../../types/comboPackage';

const SETTING_KEY = COMBO_PACKAGE_SETTING_KEY;
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0]; // khớp quy ước deliveryDays sẵn có trong combo_subscriptions
const SIZE_OPTIONS = ['250ml', '360ml', '500ml', '700ml'];
const PROTEIN_OPTIONS = [20, 40];

function commissionAmount(type: 'percent' | 'amount' | undefined, value: number | undefined, price: number) {
  if (value == null || Number.isNaN(value)) return null;
  return type === 'amount' ? Math.round(value) : Math.round((price * value) / 100);
}

function commissionLabel(type: 'percent' | 'amount' | undefined, value: number | undefined, price: number) {
  const amt = commissionAmount(type, value, price);
  if (amt == null) return '—';
  const unit = type === 'amount' ? `${value?.toLocaleString('vi-VN')}đ` : `${value}%`;
  return `${unit} → ${amt.toLocaleString('vi-VN')}đ`;
}

function emptyItems(): ComboPackageDayItem[] {
  return DAY_NUMBERS.map((day, idx) => ({
    assignedDay: day,
    dayLabel: DAY_LABELS[idx],
    productName: '',
    size: '360ml',
    protein: 40,
    toppings: [],
  }));
}

function emptyTemplate(): ComboPackageTemplate {
  return {
    id: `PKG-${Date.now()}`,
    name: '',
    comboType: 'weekly',
    price: 0,
    active: true,
    items: emptyItems(),
  };
}

/**
 * Danh mục gói combo mẫu do Admin định nghĩa (tên, giá, thực đơn theo ngày) — để CSKH chọn
 * nhanh khi chốt đơn thay vì phải tự xây từng combo từ đầu mỗi lần (CustomComboBuilder vẫn
 * còn đó cho trường hợp khách muốn tùy chỉnh riêng). Lưu qua saveSetting/fetchSetting theo
 * đúng pattern đã dùng cho các cấu hình nhỏ khác trong app (shiftClosingBillTemplate,
 * posPrinterSettings...), không cần bảng riêng vì danh mục thường chỉ vài chục gói.
 */
export function ComboPackageTemplates() {
  const { products } = useMenu();
  const smoothieProducts = products.filter((p) => p.category === 'smoothies');

  const [templates, setTemplates] = useState<ComboPackageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<ComboPackageTemplate | null>(null);

  useEffect(() => {
    api
      .fetchSetting(SETTING_KEY)
      .then((v: any) => {
        if (Array.isArray(v)) setTemplates(v);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const persist = async (next: ComboPackageTemplate[]) => {
    setTemplates(next);
    setSaving(true);
    try {
      await api.saveSetting(SETTING_KEY, next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (id: string) => {
    persist(templates.map((t) => (t.id === id ? { ...t, active: !t.active } : t)));
  };

  const handleDelete = (id: string) => {
    if (!confirm('Xóa gói combo mẫu này? CSKH sẽ không còn chọn được gói này nữa.')) return;
    persist(templates.filter((t) => t.id !== id));
  };

  const handleSaveEditing = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      alert('Vui lòng nhập tên gói combo.');
      return;
    }
    if (editing.items.some((it) => !it.productName)) {
      alert('Vui lòng chọn đủ vị cho tất cả các ngày.');
      return;
    }
    const exists = templates.some((t) => t.id === editing.id);
    const next = exists ? templates.map((t) => (t.id === editing.id ? editing : t)) : [...templates, editing];
    persist(next);
    setEditing(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Gói Combo Mẫu</h2>
            <p className="text-sm text-gray-500">CSKH chọn nhanh gói có sẵn khi chốt đơn, thay vì tự xây từng combo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Đã lưu</span>}
          <button
            onClick={() => setEditing(emptyTemplate())}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm gói mới
          </button>
        </div>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Chưa có gói combo mẫu nào — bấm "Thêm gói mới" để tạo.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className={`border rounded-2xl p-4 ${t.active ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.comboType === 'weekly' ? 'Theo tuần' : 'Theo tháng'} · {t.items.length} ngày</p>
                </div>
                <p className="font-black text-emerald-700">{t.price.toLocaleString('vi-VN')}đ</p>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5 mb-3">
                {t.items.slice(0, 3).map((it, i) => (
                  <div key={i}>{it.dayLabel}: {it.productName || '—'} · {it.size} · {it.protein}g</div>
                ))}
                {t.items.length > 3 && <div>...</div>}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mb-2 flex items-center gap-1">
                💰 HH: {commissionLabel(t.commissionType, t.commissionValue, t.price)}
                {t.renewCommissionValue != null && (
                  <span className="text-gray-400 font-normal">· gia hạn {commissionLabel(t.renewCommissionType, t.renewCommissionValue, t.price)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(t)} className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-emerald-700">
                  <Pencil className="w-3.5 h-3.5" /> Sửa
                </button>
                <button onClick={() => handleToggleActive(t.id)} className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-amber-700">
                  {t.active ? <><EyeOff className="w-3.5 h-3.5" /> Ẩn</> : <><Eye className="w-3.5 h-3.5" /> Hiện</>}
                </button>
                <button onClick={() => handleDelete(t.id)} className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 ml-auto">
                  <Trash2 className="w-3.5 h-3.5" /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{templates.some((t) => t.id === editing.id) ? 'Sửa gói combo' : 'Tạo gói combo mới'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 font-semibold">Tên gói *</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="VD: Fat Loss Plan"
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Loại gói</label>
                <select
                  value={editing.comboType}
                  onChange={(e) => setEditing({ ...editing, comboType: e.target.value as 'weekly' | 'monthly' })}
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="weekly">Theo tuần</option>
                  <option value="monthly">Theo tháng</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Giá (đ)</label>
                <input
                  type="number"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) || 0 })}
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="border border-emerald-100 bg-emerald-50/60 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-emerald-800 mb-2">💰 Hoa hồng CSKH (khi chốt bán gói này)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Bán mới</label>
                  <div className="flex gap-1 mt-0.5">
                    <select
                      value={editing.commissionType || 'percent'}
                      onChange={(e) => setEditing({ ...editing, commissionType: e.target.value as 'percent' | 'amount' })}
                      className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white w-16"
                    >
                      <option value="percent">%</option>
                      <option value="amount">đ</option>
                    </select>
                    <input
                      type="number"
                      value={editing.commissionValue ?? ''}
                      onChange={(e) => setEditing({ ...editing, commissionValue: e.target.value === '' ? undefined : Number(e.target.value) })}
                      placeholder="0"
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Gia hạn <span className="font-normal text-gray-400">(trống = như bán mới)</span></label>
                  <div className="flex gap-1 mt-0.5">
                    <select
                      value={editing.renewCommissionType || 'percent'}
                      onChange={(e) => setEditing({ ...editing, renewCommissionType: e.target.value as 'percent' | 'amount' })}
                      className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white w-16"
                    >
                      <option value="percent">%</option>
                      <option value="amount">đ</option>
                    </select>
                    <input
                      type="number"
                      value={editing.renewCommissionValue ?? ''}
                      onChange={(e) => setEditing({ ...editing, renewCommissionValue: e.target.value === '' ? undefined : Number(e.target.value) })}
                      placeholder="—"
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Bán mới: <span className="font-semibold text-emerald-700">{commissionLabel(editing.commissionType, editing.commissionValue, editing.price)}</span>
                {' · '}Gia hạn: <span className="font-semibold text-emerald-700">{
                  editing.renewCommissionValue != null
                    ? commissionLabel(editing.renewCommissionType, editing.renewCommissionValue, editing.price)
                    : commissionLabel(editing.commissionType, editing.commissionValue, editing.price)
                }</span>
              </p>
            </div>

            <p className="text-xs font-semibold text-gray-500 mb-2">Thực đơn theo ngày</p>
            <div className="space-y-2 mb-4">
              {editing.items.map((item, idx) => (
                <div key={item.assignedDay} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <div className="col-span-2 text-xs font-semibold text-gray-600">{item.dayLabel}</div>
                  <select
                    value={item.productName}
                    onChange={(e) => {
                      const items = [...editing.items];
                      items[idx] = { ...items[idx], productName: e.target.value };
                      setEditing({ ...editing, items });
                    }}
                    className="col-span-5 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                  >
                    <option value="">-- Chọn vị --</option>
                    {smoothieProducts.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={item.size}
                    onChange={(e) => {
                      const items = [...editing.items];
                      items[idx] = { ...items[idx], size: e.target.value };
                      setEditing({ ...editing, items });
                    }}
                    className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                  >
                    {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    value={item.protein}
                    onChange={(e) => {
                      const items = [...editing.items];
                      items[idx] = { ...items[idx], protein: Number(e.target.value) };
                      setEditing({ ...editing, items });
                    }}
                    className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                  >
                    {PROTEIN_OPTIONS.map((p) => <option key={p} value={p}>{p}g protein</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold">Hủy</button>
              <button
                onClick={handleSaveEditing}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-semibold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu gói combo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
