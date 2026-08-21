// Chống HIỂN THỊ ĐÚP ca: 1 nhân viên không thể có 2 ca GIỐNG HỆT (cùng ngày/giờ vào–ra/chi
// nhánh). Khi dữ liệu lỡ có ca bị nhân đôi, dùng các hàm này để bớt hiện đúp.
//
// AN TOÀN TUYỆT ĐỐI: chỉ ẩn đi ca RỖNG thật sự (không đơn, không ảnh, không đang chạy). TUYỆT
// ĐỐI không ẩn ca có đơn / có ảnh / đang làm — thà hiện 2 ca còn hơn giấu mất ca có đơn hàng.
export function shiftRichness(s: any): number {
  return (
    (s?.checkInPhoto ? 2000 : 0) + // ca có ảnh check-in thật (giữ đúng giờ vào ca của nhân viên)
    (s?.checkOutPhoto ? 500 : 0) +
    (s?.status === 'in_progress' ? 100000 : 0) + // ca ĐANG LÀM chứa các đơn hiện tại → ưu tiên cao nhất
    (s?.checkIn ? 1000 : 0) +
    (s?.status === 'completed' ? 100 : 0) +
    (Number(s?.closingOrderCount) || 0)
  );
}

/**
 * Ca "rỗng" (ghost) = có thể ẩn an toàn khi trùng: KHÔNG có đơn nào (closingOrderCount 0) và
 * KHÔNG đang chạy. Ca đang làm (in_progress) hoặc ca đã có đơn thì KHÔNG BAO GIỜ bị coi là ghost
 * → không bao giờ giấu mất đơn hàng. (Ghost có thể vẫn có ảnh chấm công nhưng 0 đơn → vẫn ẩn được
 * vì bản trùng "đầy" hơn đã được giữ.)
 */
function isEmptyGhost(s: any): boolean {
  return s?.status !== 'in_progress' && !(Number(s?.closingOrderCount) > 0);
}

/**
 * Gộp ca TRÙNG HỆT (cùng nhân viên/ngày/giờ vào–ra/chi nhánh). Trong mỗi nhóm trùng: giữ ca đầy
 * nhất, và CHỈ loại bỏ những ca RỖNG (ghost). Ca nào có đơn/ảnh/đang chạy đều được GIỮ LẠI để
 * không bao giờ làm "biến mất" đơn hàng.
 */
export function dedupeShiftsBySlot<T>(list: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const s of list as any[]) {
    const key = `${s.employeeId || ''}|${s.date || ''}|${s.startTime || ''}|${s.endTime || ''}|${s.branch || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s as T);
  }
  const result: T[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) { result.push(group[0]); continue; }
    const sorted = [...group].sort((a, b) => shiftRichness(b) - shiftRichness(a));
    const keep = sorted[0];
    result.push(keep);
    // Giữ thêm mọi ca KHÔNG rỗng (có đơn/ảnh/đang chạy) — chỉ bỏ đi các ca rỗng thừa.
    for (const s of sorted.slice(1)) {
      if (!isEmptyGhost(s)) result.push(s);
    }
  }
  return result;
}

/** Bản dedup cho TÍNH GIỜ/LƯƠNG: bắt buộc chỉ giữ 1 ca/slot (tránh cộng đôi giờ). Giữ ca đầy nhất. */
export function dedupeShiftsStrict<T>(list: T[]): T[] {
  const best = new Map<string, T>();
  for (const s of list as any[]) {
    const key = `${s.employeeId || ''}|${s.date || ''}|${s.startTime || ''}|${s.endTime || ''}|${s.branch || ''}`;
    const cur = best.get(key) as any;
    if (!cur || shiftRichness(s) > shiftRichness(cur)) best.set(key, s as T);
  }
  return [...best.values()];
}
