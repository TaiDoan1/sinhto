// Chống HIỂN THỊ ĐÚP ca: 1 nhân viên không thể có 2 ca GIỐNG HỆT (cùng ngày/giờ vào–ra/chi
// nhánh). Khi dữ liệu lỡ có ca bị nhân đôi, dùng các hàm này để chỉ hiện/tính 1 ca — GIỮ ca
// "đầy" nhất: ưu tiên ca có ẢNH check-in thật (chụp từ điện thoại) → có đơn → đang/đã chạy.
export function shiftRichness(s: any): number {
  return (
    (s?.checkInPhoto ? 2000 : 0) + // ca có ảnh check-in thật (giữ đúng giờ vào ca của nhân viên)
    (s?.checkOutPhoto ? 500 : 0) +
    (s?.checkIn ? 1000 : 0) +
    (s?.status === 'in_progress' || s?.status === 'completed' ? 100 : 0) +
    (Number(s?.closingOrderCount) || 0)
  );
}

/** Gộp các ca TRÙNG HỆT (cùng nhân viên/ngày/giờ vào–ra/chi nhánh) → chỉ giữ 1 ca đầy nhất. */
export function dedupeShiftsBySlot<T>(list: T[]): T[] {
  const best = new Map<string, T>();
  for (const s of list as any[]) {
    const key = `${s.employeeId || ''}|${s.date || ''}|${s.startTime || ''}|${s.endTime || ''}|${s.branch || ''}`;
    const cur = best.get(key) as any;
    if (!cur || shiftRichness(s) > shiftRichness(cur)) best.set(key, s as T);
  }
  return [...best.values()];
}
