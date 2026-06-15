'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Info, Leaf, Edit2, Save, X, RotateCcw } from 'lucide-react';

// ============================================================
// DỮ LIỆU MACRO MẶC ĐỊNH TRÍCH TỪ FILE PDF BẢNG THAM KHẢO FITBLEND
// ============================================================

const DEFAULT_SIZES = [
  {
    label: 'Standard',
    ml: '360ml',
    protein: '40g',
    color: 'from-emerald-500 to-teal-500',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    headerBg: 'bg-emerald-600',
    data: [
      { flavor: 'Chuối hạt chia',      cal: 320, protein: 40, carb: 24, fat: 7 },
      { flavor: 'Dâu chuối',           cal: 300, protein: 40, carb: 22, fat: 5 },
      { flavor: 'Cacao yến mạch',      cal: 360, protein: 40, carb: 30, fat: 8 },
      { flavor: 'Bơ chuối',            cal: 390, protein: 40, carb: 20, fat: 15 },
      { flavor: 'Việt quất chuối',     cal: 310, protein: 40, carb: 25, fat: 5 },
      { flavor: 'Phúc bồn tử chuối',  cal: 300, protein: 40, carb: 23, fat: 5 },
      { flavor: 'Xoài cam',            cal: 290, protein: 40, carb: 26, fat: 4 },
      { flavor: 'Chanh dây chuối',     cal: 305, protein: 40, carb: 27, fat: 4 },
    ],
  },
  {
    label: 'Large',
    ml: '500ml',
    protein: '60g',
    color: 'from-blue-500 to-indigo-500',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    headerBg: 'bg-blue-600',
    data: [
      { flavor: 'Chuối hạt chia',      cal: 430, protein: 60, carb: 30, fat: 9 },
      { flavor: 'Dâu chuối',           cal: 410, protein: 60, carb: 28, fat: 7 },
      { flavor: 'Cacao yến mạch',      cal: 490, protein: 60, carb: 38, fat: 11 },
      { flavor: 'Bơ chuối',            cal: 540, protein: 60, carb: 26, fat: 20 },
      { flavor: 'Việt quất chuối',     cal: 420, protein: 60, carb: 32, fat: 7 },
      { flavor: 'Phúc bồn tử chuối',  cal: 415, protein: 60, carb: 30, fat: 7 },
      { flavor: 'Xoài cam',            cal: 400, protein: 60, carb: 34, fat: 6 },
      { flavor: 'Chanh dây chuối',     cal: 410, protein: 60, carb: 35, fat: 6 },
    ],
  },
  {
    label: 'Elite Mass',
    ml: '700ml',
    protein: '90g',
    color: 'from-purple-500 to-rose-500',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    headerBg: 'bg-purple-600',
    data: [
      { flavor: 'Chuối hạt chia',      cal: 620, protein: 90, carb: 42, fat: 13 },
      { flavor: 'Dâu chuối',           cal: 590, protein: 90, carb: 38, fat: 10 },
      { flavor: 'Cacao yến mạch',      cal: 710, protein: 90, carb: 55, fat: 16 },
      { flavor: 'Bơ chuối',            cal: 780, protein: 90, carb: 35, fat: 28 },
      { flavor: 'Việt quất chuối',     cal: 600, protein: 90, carb: 44, fat: 10 },
      { flavor: 'Phúc bồn tử chuối',  cal: 595, protein: 90, carb: 42, fat: 10 },
      { flavor: 'Xoài cam',            cal: 570, protein: 90, carb: 48, fat: 8 },
      { flavor: 'Chanh dây chuối',     cal: 585, protein: 90, carb: 50, fat: 8 },
    ],
  },
];

const DEFAULT_TOPPINGS = [
  { name: 'Bơ đậu phộng', cal: '+90', protein: '+4g', carb: '+3g', fat: '+8g' },
  { name: 'Dừa sấy',       cal: '+70', protein: '+1g', carb: '+3g', fat: '+6g' },
  { name: 'Hạt đác',       cal: '+35', protein: '0g',  carb: '+8g', fat: '0g'  },
  { name: 'Yến mạch',      cal: '+80', protein: '+3g', carb: '+14g',fat: '+1.5g'},
  { name: 'Chia seed',     cal: '+60', protein: '+2g', carb: '+5g', fat: '+4g' },
];

export function MacroTable() {
  const [activeSize, setActiveSize] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [sizes, setSizes] = useState(DEFAULT_SIZES);
  const [toppings, setToppings] = useState(DEFAULT_TOPPINGS);

  // Load from localStorage on mount
  useEffect(() => {
    const savedSizes = localStorage.getItem('fitblend_macro_sizes');
    const savedToppings = localStorage.getItem('fitblend_macro_toppings');
    if (savedSizes) {
      try {
        setSizes(JSON.parse(savedSizes));
      } catch (e) {
        console.error('Lỗi load macro sizes:', e);
      }
    }
    if (savedToppings) {
      try {
        setToppings(JSON.parse(savedToppings));
      } catch (e) {
        console.error('Lỗi load toppings:', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('fitblend_macro_sizes', JSON.stringify(sizes));
    localStorage.setItem('fitblend_macro_toppings', JSON.stringify(toppings));
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Re-load to revert unsaved UI state
    const savedSizes = localStorage.getItem('fitblend_macro_sizes');
    const savedToppings = localStorage.getItem('fitblend_macro_toppings');
    setSizes(savedSizes ? JSON.parse(savedSizes) : DEFAULT_SIZES);
    setToppings(savedToppings ? JSON.parse(savedToppings) : DEFAULT_TOPPINGS);
    setIsEditing(false);
  };

  const handleReset = () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục dữ liệu macro gốc từ file PDF tham khảo không? Tất cả các chỉnh sửa hiện tại sẽ bị xóa.')) {
      setSizes(DEFAULT_SIZES);
      setToppings(DEFAULT_TOPPINGS);
      localStorage.removeItem('fitblend_macro_sizes');
      localStorage.removeItem('fitblend_macro_toppings');
      setIsEditing(false);
    }
  };

  const updateSizeValue = (
    sizeIdx: number,
    flavorIdx: number,
    field: 'cal' | 'protein' | 'carb' | 'fat',
    value: number
  ) => {
    const newSizes = JSON.parse(JSON.stringify(sizes)); // Deep copy
    newSizes[sizeIdx].data[flavorIdx][field] = value;
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-all"
                  title="Khôi phục dữ liệu gốc từ PDF"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Mặc định
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  Lưu thay đổi
                </button>
              </>
            ) : (
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
            )}
          </div>
        </div>

        {/* Size Tabs */}
        <div className="flex gap-2">
          {sizes.map((s, idx) => (
            <button
              key={s.label}
              disabled={isEditing && activeSize !== idx}
              onClick={() => setActiveSize(idx)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                activeSize === idx
                  ? `bg-gradient-to-r ${s.color} text-white shadow-md`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <div>{s.label}</div>
              <div className={`text-[10px] font-bold mt-0.5 ${activeSize === idx ? 'text-white/80' : 'text-gray-400'}`}>
                {s.ml} · {s.protein} protein
              </div>
            </button>
          ))}
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
          <div className={`${size.headerBg} px-4 py-2.5 flex items-center justify-between`}>
            <span className="text-white font-black text-sm">{size.label} — {size.ml}</span>
            <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
              Protein: {size.protein}
            </span>
          </div>

          <div className={`${size.bgLight}`}>
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
                key={row.flavor}
                className={`grid grid-cols-5 px-4 py-3 items-center transition-colors hover:bg-white/80 ${
                  idx < size.data.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="col-span-2">
                  <span className="text-sm font-black text-gray-800">{row.flavor}</span>
                </div>
                
                {/* Calorie */}
                <div className="text-center px-1">
                  {isEditing ? (
                    <input
                      type="number"
                      value={row.cal}
                      onChange={(e) => updateSizeValue(activeSize, idx, 'cal', parseInt(e.target.value) || 0)}
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
                        type="number"
                        value={row.protein}
                        onChange={(e) => updateSizeValue(activeSize, idx, 'protein', parseInt(e.target.value) || 0)}
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
                          type="number"
                          value={row.carb}
                          onChange={(e) => updateSizeValue(activeSize, idx, 'carb', parseInt(e.target.value) || 0)}
                          className="w-full text-center text-xs font-bold text-gray-700 focus:outline-none"
                        />
                        <span className="text-[9px] text-gray-400">g</span>
                      </div>
                      <div className="flex items-center gap-0.5 bg-white border border-gray-300 rounded px-1 py-0.5">
                        <span className="text-[9px] text-gray-400 font-bold">F:</span>
                        <input
                          type="number"
                          value={row.fat}
                          onChange={(e) => updateSizeValue(activeSize, idx, 'fat', parseInt(e.target.value) || 0)}
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
          </div>
        </div>

        {/* Topping Extras */}
        <div className="rounded-2xl border-2 border-amber-200 overflow-hidden bg-white">
          <div className="bg-amber-500 px-4 py-2.5 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-white" />
            <span className="text-white font-black text-sm">Topping Cộng Thêm</span>
          </div>
          <div className="bg-amber-50">
            <div className="grid grid-cols-5 px-4 py-2 border-b border-amber-100 bg-white/60">
              <div className="col-span-2 text-[11px] font-black text-gray-500 uppercase tracking-wider">Topping</div>
              <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">🔥 Cal</div>
              <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">💪 Protein</div>
              <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Carb / Fat</div>
            </div>
            
            {toppings.map((t, idx) => (
              <div
                key={t.name}
                className={`grid grid-cols-5 px-4 py-3 items-center hover:bg-white/80 transition-colors ${
                  idx < toppings.length - 1 ? 'border-b border-amber-100' : ''
                }`}
              >
                <div className="col-span-2">
                  <span className="text-sm font-black text-gray-800">{t.name}</span>
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

