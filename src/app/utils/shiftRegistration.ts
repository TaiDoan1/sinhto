// Cửa sổ đăng ký lịch làm cho NHÂN VIÊN tự đăng ký:
//   Mở: 23:59 tối Thứ 4 (thứ 4 = getDay() 3)  →  Đóng: hết Thứ 6 (23:59:59, thứ 6 = getDay() 5)
//   Trong cửa sổ này, nhân viên đăng ký lịch cho TUẦN KẾ TIẾP (Thứ 2 → Chủ Nhật tuần tới).
// Quản lý/admin KHÔNG bị giới hạn bởi cửa sổ này (xếp lịch bất cứ lúc nào).
//
// Logic được nhân bản y hệt ở backend (backend/index.js) để chặn cả khi gọi API trực tiếp —
// nếu sửa quy tắc, nhớ sửa cả 2 nơi.

const OPEN_DOW = 3; // Thứ 4
const OPEN_HHMM = 23 * 60 + 59; // 23:59
const CLOSE_DOW = 5; // Thứ 6 (mở hết cả ngày thứ 6)

export function isShiftRegistrationOpen(now: Date = new Date()): boolean {
  const dow = now.getDay();
  if (dow === OPEN_DOW) return now.getHours() * 60 + now.getMinutes() >= OPEN_HHMM;
  return dow === 4 || dow === CLOSE_DOW; // Thứ 5, Thứ 6
}

function atMidnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Thứ 2 (đầu tuần) của tuần chứa ngày `d`.
function getMonday(d: Date): Date {
  const x = atMidnight(d);
  const day = x.getDay(); // 0=CN..6=T7
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Khoảng ngày được phép đăng ký (tuần kế tiếp: Thứ 2 → Chủ Nhật tuần tới).
export function nextWeekRange(now: Date = new Date()): { startDate: Date; endDate: Date; start: string; end: string } {
  const thisMonday = getMonday(now);
  const startDate = new Date(thisMonday);
  startDate.setDate(thisMonday.getDate() + 7);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return { startDate, endDate, start: toISODate(startDate), end: toISODate(endDate) };
}

// Lần mở đăng ký kế tiếp (Thứ 4 23:59 sắp tới) — dùng cho thông báo khi đang đóng.
export function nextOpenAt(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(23, 59, 0, 0);
  // Nếu hôm nay là Thứ 4 nhưng đã qua 23:59 rồi thì nhảy sang Thứ 4 tuần sau.
  let addDays = (OPEN_DOW - d.getDay() + 7) % 7;
  if (addDays === 0 && now.getTime() >= d.getTime()) addDays = 7;
  d.setDate(d.getDate() + addDays);
  return d;
}

const DOW_LABEL = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function formatDMY(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function nextOpenLabel(now: Date = new Date()): string {
  const d = nextOpenAt(now);
  return `${DOW_LABEL[d.getDay()]} ${formatDMY(d)} lúc 23:59`;
}

export const REGISTRATION_WINDOW_LABEL = '23:59 Thứ 4 → hết Thứ 6 hằng tuần';
