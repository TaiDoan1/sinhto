// Dữ liệu macro (calo/protein/carb/fat) dùng chung giữa "Bảng Macro Tham Khảo" (MacroTable.tsx,
// nơi quản lý/chỉnh sửa) và tem dán ly (posPrint.ts, nơi tra cứu để in ra) — tách riêng module
// này để 2 nơi luôn đọc cùng 1 nguồn dữ liệu, không lệch nhau khi ai đó chỉnh sửa trong Macro.

export interface MacroSizeEntry {
  flavor: string;
  cal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface MacroSize {
  label: string;
  ml: string;
  protein: string;
  color: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  headerBg: string;
  data: MacroSizeEntry[];
}

export interface MacroTopping {
  name: string;
  cal: string;
  protein: string;
  carb: string;
  fat: string;
}

export const DEFAULT_MACRO_SIZES: MacroSize[] = [
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

export const DEFAULT_MACRO_TOPPINGS: MacroTopping[] = [
  { name: 'Bơ đậu phộng', cal: '+90', protein: '+4g', carb: '+3g', fat: '+8g' },
  { name: 'Dừa sấy',       cal: '+70', protein: '+1g', carb: '+3g', fat: '+6g' },
  { name: 'Hạt đác',       cal: '+35', protein: '0g',  carb: '+8g', fat: '0g'  },
  { name: 'Yến mạch',      cal: '+80', protein: '+3g', carb: '+14g',fat: '+1.5g'},
  { name: 'Chia seed',     cal: '+60', protein: '+2g', carb: '+5g', fat: '+4g' },
];

export function loadMacroSizes(): MacroSize[] {
  try {
    const raw = localStorage.getItem('fitblend_macro_sizes');
    return raw ? JSON.parse(raw) : DEFAULT_MACRO_SIZES;
  } catch {
    return DEFAULT_MACRO_SIZES;
  }
}

export function loadMacroToppings(): MacroTopping[] {
  try {
    const raw = localStorage.getItem('fitblend_macro_toppings');
    return raw ? JSON.parse(raw) : DEFAULT_MACRO_TOPPINGS;
  } catch {
    return DEFAULT_MACRO_TOPPINGS;
  }
}

/** Bỏ dấu tiếng Việt — backend luôn trả tên sản phẩm KHÔNG dấu (quy ước chung toàn hệ thống,
 * xem backend/vietnamese.js) trong khi Bảng Macro Tham Khảo lưu tên CÓ dấu, nên phải bỏ dấu cả
 * 2 vế trước khi so khớp, không thì không bao giờ khớp được (VD "Chuoi hat chia" vs "Chuối hạt chia"). */
function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function normalize(str: string): string {
  return removeDiacritics(str.trim().toLowerCase());
}

function parseDelta(value: string): number {
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

/** Tra bảng macro theo tên vị + size (ml) + danh sách topping — cộng dồn cal/fat của topping vào
 * giá trị gốc của vị. Trả về null nếu không khớp được vị/size nào (VD combo tùy chỉnh). */
export function lookupMacro(
  productName: string,
  size: string | undefined,
  toppings: string[] | undefined
): { cal: number; fat: number } | null {
  if (!size) return null;
  const sizes = loadMacroSizes();
  const sizeBracket = sizes.find((s) => normalize(s.ml) === normalize(size));
  if (!sizeBracket) return null;

  const entry = sizeBracket.data.find((d) => normalize(d.flavor) === normalize(productName));
  if (!entry) return null;

  let cal = entry.cal;
  let fat = entry.fat;

  if (toppings && toppings.length > 0) {
    const toppingTable = loadMacroToppings();
    for (const t of toppings) {
      const match = toppingTable.find((row) => normalize(row.name) === normalize(t));
      if (match) {
        cal += parseDelta(match.cal);
        fat += parseDelta(match.fat);
      }
    }
  }

  return { cal, fat };
}
