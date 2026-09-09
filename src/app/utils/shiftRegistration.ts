// Đăng ký lịch làm cho NHÂN VIÊN: quản lý CHỦ ĐỘNG mở/đóng bằng công tắc (setting), không còn
// theo giờ cố định. Khi mở, nhân viên đăng ký cho TUẦN KẾ TIẾP (Thứ 2 → Chủ Nhật tuần tới) và
// mỗi khung giờ (chi nhánh+ngày+ca) chỉ 1 người — ai đăng ký trước giữ chỗ.
//
// Setting: key 'shiftRegistrationOpen', value boolean. Backend đọc cùng key trong POST /api/shifts.

export const REG_OPEN_SETTING_KEY = 'shiftRegistrationOpen';

// Chuẩn hoá giá trị setting về boolean (đề phòng lưu dạng chuỗi "true"/số).
export function parseRegOpen(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
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

export function formatDMY(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
