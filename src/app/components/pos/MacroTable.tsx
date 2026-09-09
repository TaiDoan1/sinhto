'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Info, Leaf, Edit2, Save, X, RotateCcw, Plus, Trash2, Lock, Loader2 } from 'lucide-react';
import {
  DEFAULT_MACRO_SIZES,
  DEFAULT_MACRO_TOPPINGS,
  MACRO_DATA_SETTING_KEY,
  applyMacroDataToCache,
} from '../../utils/macroData';
import * as api from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';

// ============================================================
// DỮ LIỆU MACRO MẶC ĐỊNH TRÍCH TỪ FILE PDF BẢNG THAM KHẢO FITBLEND — chuyển sang
// utils/macroData.ts để dùng chung với tem dán ly (posPrint.ts), tránh 2 nơi lệch dữ liệu.
// Đồng bộ qua server (setting 'macroData') — sửa ở máy nào cũng thấy trên mọi máy khác.
// ============================================================

const DEFAULT_SIZES = DEFAULT_MACRO_SIZES;
const DEFAULT_TOPPINGS = DEFAULT_MACRO_TOPPINGS;

// Bộ màu cho các "mức" (size) — khi Cửa hàng trưởng thêm mức mới sẽ xoay vòng lấy 1 bộ màu,
// để mỗi tab mức có màu riêng dễ phân biệt.
const SIZE_THEMES = [
  { color: 'from-emerald-500 to-teal-500', bgLight: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700', headerBg: 'bg-emerald-600' },
  { color: 'from-blue-500 to-indigo-500', bgLight: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700', headerBg: 'bg-blue-600' },
  { color: 'from-purple-500 to-rose-500', bgLight: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700', headerBg: 'bg-purple-600' },
  { color: 'from-amber-500 to-orange-500', bgLight: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-700', headerBg: 'bg-amber-600' },
  { color: 'from-rose-500 to-pink-500', bgLight: 'bg-rose-50', borderColor: 'border-rose-200', textColor: 'text-rose-700', headerBg: 'bg-rose-600' },
  { color: 'from-cyan-500 to-sky-500', bgLight: 'bg-cyan-50', borderColor: 'border-cyan-200', textColor: 'text-cyan-700', headerBg: 'bg-cyan-600' },
];

// Cho phép gõ số THẬP PHÂN: giữ chữ số + đúng 1 dấu thập phân (chấp nhận cả '.' lẫn ',').
// Giữ nguyên chuỗi đang gõ (kể cả "31." hay "31,") để không bị nhảy/mất dấu khi đang nhập.
function sanitizeDecimalInput(s: string): string {
  let v = String(s).replace(/[^\d.,]/g, '');
  const firstSep = v.search(/[.,]/);
  if (firstSep !== -1) {
    v = v.slice(0, firstSep + 1) + v.slice(firstSep + 1).replace(/[.,]/g, '');
  }
  return v;
}

// Chuyển giá trị ô macro (số hoặc chuỗi "31,1"/"31.") về SỐ khi lưu. Rỗng/không hợp lệ → 0.
function toMacroNum(x: unknown): number {
  if (typeof x === 'number') return Number.isFinite(x) ? x : 0;
  const n = parseFloat(String(x).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

interface MacroTableProps {
  /** Chỉ Cửa hàng trưởng (store_manager) và Quản lý chi nhánh (manager) được sửa — các chức danh
   * khác chỉ xem (giống quyền Nhập/Sửa kho). Nhận qua prop thay vì tự gọi usePos() bên trong vì
   * component này dùng chung ở 2 nơi có context khác nhau: POS (PosContext, xem POSInterface.tsx)
   * và cổng riêng Cửa hàng trưởng /store-manager (AdminContext, không có PosProvider bọc quanh —
   * xem StoreManagerApp.tsx), gọi usePos() trực tiếp ở đó sẽ crash vì thiếu PosProvider. */
  canEdit: boolean;
}

export function MacroTable({ canEdit }: MacroTableProps) {
  const { subscribe } = useSSE();
  const [activeSize, setActiveSize] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sizes, setSizes] = useState(DEFAULT_SIZES);
  const [toppings, setToppings] = useState(DEFAULT_TOPPINGS);
  // Bản đã lưu trên server gần nhất — dùng để "Hủy" quay lại đúng trạng thái, không mất khi người
  // khác vừa lưu song song.
  const [savedSizes, setSavedSizes] = useState(DEFAULT_SIZES);
  const [savedToppings, setSavedToppings] = useState(DEFAULT_TOPPINGS);

  useEffect(() => {
    api.fetchSetting(MACRO_DATA_SETTING_KEY)
      .then((data: any) => {
        const s = Array.isArray(data?.sizes) ? data.sizes : DEFAULT_SIZES;
        const t = Array.isArray(data?.toppings) ? data.toppings : DEFAULT_TOPPINGS;
        setSizes(s);
        setToppings(t);
        setSavedSizes(s);
        setSavedToppings(t);
      })
      .catch(() => {
        // Chưa từng lưu trên server (404) — dùng mặc định.
        setSavedSizes(DEFAULT_SIZES);
        setSavedToppings(DEFAULT_TOPPINGS);
      })
      .finally(() => setLoading(false));
  }, []);

  // Máy khác vừa lưu → làm mới nếu mình KHÔNG đang chỉnh sửa dở (tránh mất thao tác đang gõ).
  useEffect(() => {
    return subscribe('SETTING_UPDATED', (payload: { key: string; value: any }) => {
      if (payload?.key !== MACRO_DATA_SETTING_KEY || isEditing) return;
      const s = Array.isArray(payload.value?.sizes) ? payload.value.sizes : DEFAULT_SIZES;
      const t = Array.isArray(payload.value?.toppings) ? payload.value.toppings : DEFAULT_TOPPINGS;
      setSizes(s);
      setToppings(t);
      setSavedSizes(s);
      setSavedToppings(t);
    });
  }, [subscribe, isEditing]);

  const handleSave = async () => {
    if (!canEdit) return;
    // Bỏ các dòng lỡ thêm mà chưa gõ tên vị (tránh lưu rác) + ÉP số liệu về dạng SỐ (khi đang gõ
    // các ô lưu chuỗi "31,1"/"31." để không mất dấu — tới đây mới chuẩn hoá về number).
    const cleaned = sizes.map((s) => ({
      ...s,
      data: s.data
        .filter((d) => d.flavor.trim() !== '')
        .map((d) => ({ ...d, cal: toMacroNum(d.cal), protein: toMacroNum(d.protein), carb: toMacroNum(d.carb), fat: toMacroNum(d.fat) })),
    }));
    // Bỏ topping lỡ thêm mà chưa gõ tên (tránh lưu dòng rác).
    const cleanedToppings = toppings.filter((t) => (t.name || '').trim() !== '');
    setSaving(true);
    try {
      const payload = { sizes: cleaned, toppings: cleanedToppings };
      await api.saveSetting(MACRO_DATA_SETTING_KEY, payload);
      applyMacroDataToCache(payload); // làm mới ngay cache dùng cho tem in ở máy này
      setSizes(cleaned);
      setToppings(cleanedToppings);
      setSavedSizes(cleaned);
      setSavedToppings(cleanedToppings);
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lưu Bảng Macro thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSizes(savedSizes);
    setToppings(savedToppings);
    setIsEditing(false);
  };

  const handleReset = () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục dữ liệu macro gốc từ file PDF tham khảo không? Tất cả các chỉnh sửa hiện tại sẽ bị xóa.')) {
      setSizes(DEFAULT_SIZES);
      setToppings(DEFAULT_TOPPINGS);
      setIsEditing(false);
    }
  };

  const updateSizeValue = (
    sizeIdx: number,
    flavorIdx: number,
    field: 'cal' | 'protein' | 'carb' | 'fat',
    value: string
  ) => {
    // Lưu NGUYÊN chuỗi đang gõ (cho phép "31,1", "31.") — chỉ đổi về số khi bấm Lưu (toMacroNum).
    const newSizes = JSON.parse(JSON.stringify(sizes)); // Deep copy
    newSizes[sizeIdx].data[flavorIdx][field] = value;
    setSizes(newSizes);
  };

  const updateFlavorName = (sizeIdx: number, flavorIdx: number, name: string) => {
    const newSizes = JSON.parse(JSON.stringify(sizes));
    newSizes[sizeIdx].data[flavorIdx].flavor = name;
    setSizes(newSizes);
  };

  // Thêm 1 vị mới (dòng trống) vào size đang xem — gõ tên + số liệu rồi bấm "Lưu thay đổi".
  const addFlavorRow = (sizeIdx: number) => {
    const newSizes = JSON.parse(JSON.stringify(sizes));
    newSizes[sizeIdx].data.push({ flavor: '', cal: 0, protein: 0, carb: 0, fat: 0 });
    setSizes(newSizes);
  };

  const removeFlavorRow = (sizeIdx: number, flavorIdx: number) => {
    const newSizes = JSON.parse(JSON.stringify(sizes));
    newSizes[sizeIdx].data.splice(flavorIdx, 1);
    setSizes(newSizes);
  };

  const updateToppingValue = (
    toppingIdx: number,
    field: 'cal' | 'protein' | 'carb' | 'fat',
    value: string
  ) => {
    const newToppings = JSON.parse(JSON.stringify(toppings)); // Deep copy
    newToppings[toppingIdx][field] = value;
    setToppings(newToppings);
  };

  const updateToppingName = (toppingIdx: number, name: string) => {
    const newToppings = JSON.parse(JSON.stringify(toppings));
    newToppings[toppingIdx].name = name;
    setToppings(newToppings);
  };

  // Thêm 1 dòng topping trống (gõ tên + số liệu rồi Lưu). Số có thể để dạng "+1.5g" tuỳ ý.
  const addTopping = () => {
    setToppings([...toppings, { name: '', cal: '', protein: '', carb: '', fat: '' }]);
  };

  const removeTopping = (toppingIdx: number) => {
    setToppings(toppings.filter((_, i) => i !== toppingIdx));
  };

  // Sửa thông tin của 1 mức (tên/ml/mức protein) — hiện ô nhập ở đầu bảng khi đang chỉnh sửa.
  const updateSizeMeta = (sizeIdx: number, field: 'label' | 'ml' | 'protein', value: string) => {
    const newSizes = JSON.parse(JSON.stringify(sizes));
    newSizes[sizeIdx][field] = value;
    setSizes(newSizes);
  };

  // Thêm 1 MỨC (size) mới — tự lấy 1 bộ màu, tạo sẵn 1 dòng vị trống để gõ ngay, rồi chuyển tab
  // sang mức mới. Cửa hàng trưởng đặt tên + ml + mức protein ở ô đầu bảng.
  const addSize = () => {
    const theme = SIZE_THEMES[sizes.length % SIZE_THEMES.length];
    const newSize = { label: 'Mức mới', ml: '', protein: '', ...theme, data: [{ flavor: '', cal: 0, protein: 0, carb: 0, fat: 0 }] };
    const next = [...sizes, newSize];
    setSizes(next);
    setActiveSize(next.length - 1);
  };

  // Xóa 1 mức (phải còn ít nhất 1 mức). Clamp tab đang xem về mức hợp lệ.
  const removeSize = (sizeIdx: number) => {
    if (sizes.length <= 1) { alert('Phải còn ít nhất 1 mức.'); return; }
    if (!confirm(`Xóa mức "${sizes[sizeIdx]?.label || ''}"? Toàn bộ vị trong mức này sẽ mất.`)) return;
    const next = sizes.filter((_, i) => i !== sizeIdx);
    setSizes(next);
    setActiveSize((cur) => Math.max(0, Math.min(cur, next.length - 1)));
  };

  const size = sizes[activeSize] || DEFAULT_SIZES[activeSize];

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Bảng Macro Tham Khảo</h2>
              <p className="text-xs text-gray-500 font-medium">Công thức chuẩn FitBlend Protein Smoothie</p>
            </div>
          </div>

          {/* Action Buttons — bọc flex-wrap để tự xuống dòng trên máy POS màn hẹp, không bị tràn
              ngang/cắt chữ (trước đây cố định 1 hàng nên máy nhỏ hiện vỡ layout). */}
          <div className="flex flex-wrap items-center gap-2">
            {loading ? (
              <div className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang tải…
              </div>
            ) : isEditing ? (
              <>
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-all disabled:opacity-50"
                  title="Khôi phục dữ liệu gốc từ PDF"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Mặc định
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
              </>
            ) : canEdit ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-sm transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Chỉnh sửa công thức
                </button>
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="text-[11px] text-amber-700 font-semibold">Giá trị tham khảo</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600 font-semibold">🔒 Chỉ xem — chỉ Cửa hàng trưởng/Quản lý chi nhánh được chỉnh sửa</span>
              </div>
            )}
          </div>
        </div>

        {/* Size Tabs */}
        <div className="flex flex-wrap gap-2">
          {sizes.map((s, idx) => (
            <button
              key={idx}
              disabled={isEditing && activeSize !== idx}
              onClick={() => setActiveSize(idx)}
              className={`flex-1 min-w-[110px] py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                activeSize === idx
                  ? `bg-gradient-to-r ${s.color} text-white shadow-md`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <div>{s.label || '(chưa đặt tên)'}</div>
              <div className={`text-[10px] font-bold mt-0.5 ${activeSize === idx ? 'text-white/80' : 'text-gray-400'}`}>
                {s.ml || '—'} · {s.protein || '—'} protein
              </div>
            </button>
          ))}
          {isEditing && canEdit && (
            <button
              onClick={addSize}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide bg-emerald-50 text-emerald-700 border-2 border-dashed border-emerald-300 hover:bg-emerald-100 transition-all"
              title="Thêm một mức size mới (VD 360ml 20g protein)"
            >
              <Plus className="w-4 h-4" />
              Thêm mức
            </button>
          )}
        </div>
        {isEditing && (
          <p className="text-[11px] text-emerald-600 font-bold mt-2 bg-emerald-50 border border-emerald-100 rounded px-2.5 py-1">
            💡 Bạn đang trong chế độ chỉnh sửa. Hãy chỉnh sửa thông số trực tiếp dưới bảng rồi nhấn &quot;Lưu thay đổi&quot;.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Smoothie Table */}
        <div className={`rounded-2xl border-2 ${size.borderColor} overflow-hidden bg-white`}>
          <div className={`${size.headerBg} px-4 py-2.5 flex items-center justify-between gap-2`}>
            {isEditing ? (
              <div className="flex items-center gap-1.5 flex-wrap flex-1">
                <input
                  type="text"
                  value={size.label}
                  onChange={(e) => updateSizeMeta(activeSize, 'label', e.target.value)}
                  placeholder="Tên mức"
                  className="w-28 text-sm font-black text-gray-800 bg-white/95 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <input
                  type="text"
                  value={size.ml}
                  onChange={(e) => updateSizeMeta(activeSize, 'ml', e.target.value)}
                  placeholder="360ml"
                  className="w-20 text-sm font-bold text-gray-800 bg-white/95 rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-white"
                />
                <div className="flex items-center gap-1 bg-white/95 rounded px-2 py-1">
                  <span className="text-[11px] font-bold text-gray-500">Protein</span>
                  <input
                    type="text"
                    value={size.protein}
                    onChange={(e) => updateSizeMeta(activeSize, 'protein', e.target.value)}
                    placeholder="20g"
                    className="w-14 text-sm font-bold text-gray-800 text-center focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => removeSize(activeSize)}
                  className="flex items-center gap-1 bg-rose-500/90 hover:bg-rose-600 text-white text-[11px] font-bold px-2 py-1 rounded"
                  title="Xóa mức này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa mức
                </button>
              </div>
            ) : (
              <>
                <span className="text-white font-black text-sm">{size.label} — {size.ml}</span>
                <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                  Protein: {size.protein}
                </span>
              </>
            )}
          </div>

          {/* Máy POS màn hẹp: 5 cột (nhất là lúc sửa có ô nhập) sẽ bị bóp méo/khó bấm nếu ép vừa
              màn hình — thay vào đó cho cuộn/kéo NGANG tự nhiên (min-width cố định bên trong),
              vẫn đọc/bấm thoải mái, chỉ cần vuốt sang để xem hết cột. */}
          <div className={`${size.bgLight} overflow-x-auto`}>
            <div className="min-w-[560px]">
              {/* Column headers */}
              <div className="grid grid-cols-5 px-4 py-2 border-b border-gray-200 bg-white/60">
                <div className="col-span-2 text-[11px] font-black text-gray-500 uppercase tracking-wider">Vị</div>
                <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">🔥 Cal</div>
                <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">💪 Protein</div>
                <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Carb / Fat</div>
              </div>

              {/* Rows */}
              {size.data.map((row, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-5 px-4 py-3 items-center transition-colors hover:bg-white/80 ${
                    idx < size.data.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="col-span-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={row.flavor}
                          placeholder="Tên vị..."
                          onChange={(e) => updateFlavorName(activeSize, idx, e.target.value)}
                          className="w-full text-sm font-black text-gray-800 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeFlavorRow(activeSize, idx)}
                          title="Xóa vị này"
                          className="shrink-0 p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-black text-gray-800">{row.flavor}</span>
                    )}
                  </div>

                  {/* Calorie */}
                  <div className="text-center px-1">
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={row.cal === 0 ? '' : row.cal}
                        onChange={(e) => updateSizeValue(activeSize, idx, 'cal', sanitizeDecimalInput(e.target.value))}
                        className="w-full text-center text-sm font-black text-orange-600 bg-white border border-orange-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    ) : (
                      <>
                        <span className="text-sm font-black text-orange-600">~{row.cal}</span>
                        <span className="text-[10px] text-gray-400 block">kcal</span>
                      </>
                    )}
                  </div>

                  {/* Protein */}
                  <div className="text-center px-1">
                    {isEditing ? (
                      <div className="flex items-center gap-0.5 bg-white border border-gray-300 rounded px-1 py-0.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={row.protein === 0 ? '' : row.protein}
                          onChange={(e) => updateSizeValue(activeSize, idx, 'protein', sanitizeDecimalInput(e.target.value))}
                          className="w-full text-center text-sm font-black text-emerald-700 focus:outline-none"
                        />
                        <span className="text-xs text-gray-400 font-bold">g</span>
                      </div>
                    ) : (
                      <span className={`text-sm font-black ${size.textColor}`}>{row.protein}g</span>
                    )}
                  </div>

                  {/* Carb / Fat */}
                  <div className="text-center px-1">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-0.5 bg-white border border-gray-300 rounded px-1 py-0.5">
                          <span className="text-[9px] text-gray-400 font-bold">C:</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={row.carb === 0 ? '' : row.carb}
                            onChange={(e) => updateSizeValue(activeSize, idx, 'carb', sanitizeDecimalInput(e.target.value))}
                            className="w-full text-center text-xs font-bold text-gray-700 focus:outline-none"
                          />
                          <span className="text-[9px] text-gray-400">g</span>
                        </div>
                        <div className="flex items-center gap-0.5 bg-white border border-gray-300 rounded px-1 py-0.5">
                          <span className="text-[9px] text-gray-400 font-bold">F:</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={row.fat === 0 ? '' : row.fat}
                            onChange={(e) => updateSizeValue(activeSize, idx, 'fat', sanitizeDecimalInput(e.target.value))}
                            className="w-full text-center text-xs font-bold text-gray-500 focus:outline-none"
                          />
                          <span className="text-[9px] text-gray-400">g</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-gray-700">{row.carb}g</span>
                        <span className="text-[10px] text-gray-400"> / </span>
                        <span className="text-xs font-bold text-gray-500">{row.fat}g</span>
                        <div className="text-[9px] text-gray-400">carb / fat</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => addFlavorRow(activeSize)}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 border-t border-gray-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm vị mới vào {size.label}
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="sm:hidden text-center text-[10px] text-gray-400 font-semibold">
          ↔ Vuốt/kéo ngang bảng để xem đủ cột trên màn hình nhỏ
        </p>

        {/* Topping Extras */}
        <div className="rounded-2xl border-2 border-amber-200 overflow-hidden bg-white">
          <div className="bg-amber-500 px-4 py-2.5 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-white" />
            <span className="text-white font-black text-sm">Topping Cộng Thêm</span>
          </div>
          <div className="bg-amber-50 overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-5 px-4 py-2 border-b border-amber-100 bg-white/60">
                <div className="col-span-2 text-[11px] font-black text-gray-500 uppercase tracking-wider">Topping</div>
                <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">🔥 Cal</div>
                <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">💪 Protein</div>
                <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Carb / Fat</div>
              </div>

              {toppings.map((t, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-5 px-4 py-3 items-center hover:bg-white/80 transition-colors ${
                    idx < toppings.length - 1 ? 'border-b border-amber-100' : ''
                  }`}
                >
                  <div className="col-span-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => updateToppingName(idx, e.target.value)}
                          placeholder="Tên topping"
                          className="flex-1 min-w-0 text-sm font-black text-gray-800 bg-white border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeTopping(idx)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 flex-shrink-0"
                          title="Xóa topping"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-black text-gray-800">{t.name}</span>
                    )}
                  </div>

                  {/* Topping Calorie */}
                  <div className="text-center px-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={t.cal}
                        onChange={(e) => updateToppingValue(idx, 'cal', e.target.value)}
                        className="w-full text-center text-sm font-black text-orange-500 bg-white border border-amber-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    ) : (
                      <>
                        <span className="text-sm font-black text-orange-500">{t.cal}</span>
                        <span className="text-[10px] text-gray-400 block">kcal</span>
                      </>
                    )}
                  </div>

                  {/* Topping Protein */}
                  <div className="text-center px-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={t.protein}
                        onChange={(e) => updateToppingValue(idx, 'protein', e.target.value)}
                        className="w-full text-center text-sm font-black text-amber-600 bg-white border border-amber-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    ) : (
                      <span className="text-sm font-black text-amber-600">{t.protein}</span>
                    )}
                  </div>

                  {/* Topping Carb / Fat */}
                  <div className="text-center px-1">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-0.5 bg-white border border-amber-200 rounded px-1 py-0.5">
                          <span className="text-[9px] text-gray-400 font-bold">C:</span>
                          <input
                            type="text"
                            value={t.carb}
                            onChange={(e) => updateToppingValue(idx, 'carb', e.target.value)}
                            className="w-full text-center text-xs font-bold text-gray-700 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-0.5 bg-white border border-amber-200 rounded px-1 py-0.5">
                          <span className="text-[9px] text-gray-400 font-bold">F:</span>
                          <input
                            type="text"
                            value={t.fat}
                            onChange={(e) => updateToppingValue(idx, 'fat', e.target.value)}
                            className="w-full text-center text-xs font-bold text-gray-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-gray-700">{t.carb}</span>
                        <span className="text-[10px] text-gray-400 flex justify-center"> / </span>
                        <span className="text-xs font-bold text-gray-500">{t.fat}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {isEditing && (
                <button
                  type="button"
                  onClick={addTopping}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100 border-t border-amber-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm topping mới
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-100 rounded-xl px-4 py-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
            Macro mang tính tham khảo, có thể thay đổi theo lượng trái cây, đá và topping thực tế.
          </p>
        </div>
      </div>
    </div>
  );
}

