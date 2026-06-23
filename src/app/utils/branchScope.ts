/** Lọc dữ liệu theo chi nhánh — mỗi CN chỉ thấy của mình */

export function belongsToBranch<T extends { branchId?: string | null }>(
  row: T,
  branchId: string | null | undefined
): boolean {
  if (!branchId) return true;
  return (row.branchId || 'CN1') === branchId;
}

export function filterByBranch<T extends { branchId?: string | null }>(
  rows: T[],
  branchId: string | null | undefined
): T[] {
  if (!branchId) return rows;
  return rows.filter((r) => belongsToBranch(r, branchId));
}
