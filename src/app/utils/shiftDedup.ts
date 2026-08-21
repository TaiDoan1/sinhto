// Chống HIỂN THỊ/TÍNH ĐÚP ca: 1 nhân viên KHÔNG THỂ có 2 ca cùng ngày/giờ vào–ra/chi nhánh.
// Khi dữ liệu lỡ có ca bị nhân đôi, các hàm này gộp về ĐÚNG 1 ca/slot — giữ ca "đầy" nhất để
// KHÔNG bao giờ làm mất/giấu đơn hàng và KHÔNG double doanh thu.
//
// Độ ưu tiên GIỮ ca (từ cao xuống thấp):
//  1) SỐ ĐƠN đã chốt (closingOrderCount) — ca có nhiều đơn nhất luôn thắng (không mất doanh thu)
//  2) Ca ĐANG LÀM (in_progress) — đang chứa các đơn hiện tại (đơn chưa vào snapshot)
//  3) Có ẢNH check-in / check-out (chấm công thật)
//  4) Đã check-in
export function shiftRichness(s: any): number {
  return (
    (Number(s?.closingOrderCount) || 0) * 100000 + // số đơn: ưu tiên cao nhất → không bao giờ mất đơn
    (s?.status === 'in_progress' ? 10000 : 0) +      // ca đang làm (chứa đơn hiện tại)
    (s?.checkInPhoto ? 1000 : 0) +
    (s?.checkOutPhoto ? 100 : 0) +
    (s?.checkIn ? 10 : 0) +
    (s?.status === 'completed' ? 1 : 0)
  );
}

const slotKey = (s: any) =>
  `${s.employeeId || ''}|${s.date || ''}|${s.startTime || ''}|${s.endTime || ''}|${s.branch || ''}`;

/**
 * Gộp ca TRÙNG HỆT về ĐÚNG 1 ca/slot — giữ ca đầy nhất (nhiều đơn nhất / đang làm / có ảnh).
 * Dùng cho MỌI nơi hiển thị & tính toán để không bao giờ thấy đúp và không double doanh thu.
 */
export function dedupeShiftsBySlot<T>(list: T[]): T[] {
  const best = new Map<string, T>();
  for (const s of list as any[]) {
    const key = slotKey(s);
    const cur = best.get(key) as any;
    if (!cur || shiftRichness(s) > shiftRichness(cur)) best.set(key, s as T);
  }
  return [...best.values()];
}

/** Alias — cùng logic (giữ đúng 1 ca/slot). Dùng cho tính giờ/lương. */
export const dedupeShiftsStrict = dedupeShiftsBySlot;
