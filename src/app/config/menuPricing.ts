/** Bảng giá ly lẻ — khớp menu in (menu2.jpg) */
export const DEFAULT_MENU_PRICE_TABLE: Record<string, Record<number, number>> = {
  '250ml': { 20: 39000 },
  '360ml': { 20: 55000, 40: 79000 },
  '500ml': { 40: 99000, 60: 115000 },
  '700ml': { 60: 139000, 90: 155000 },
};

/** Mức protein khả dụng theo size — khớp menu in */
export const PROTEIN_LEVELS_BY_SIZE: Record<string, number[]> = {
  '250ml': [20],
  '360ml': [20, 40],
  '500ml': [40, 60],
  '700ml': [60, 90],
};

export function proteinLevelsFromPriceTable(
  table: Record<string, Record<number, number>>
): Record<string, number[]> {
  return Object.fromEntries(
    Object.entries(table).map(([size, levels]) => [
      size,
      Object.keys(levels)
        .map(Number)
        .sort((a, b) => a - b),
    ])
  );
}

/** Giá thấp nhất mỗi size (hiển thị trên grid khi chưa chọn protein) */
export function basePriceBySize(
  table: Record<string, Record<number, number>> = DEFAULT_MENU_PRICE_TABLE
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(table).map(([size, levels]) => [
      size,
      Math.min(...Object.values(levels)),
    ])
  );
}

/** Giá ly lẻ — chỉ phụ thuộc size + protein, không phụ thuộc vị */
export function resolveCupPrice(
  size: string,
  protein: number,
  table: Record<string, Record<number, number>> = DEFAULT_MENU_PRICE_TABLE
): number {
  const price = table[size]?.[protein];
  if (price != null) return price;
  const fallback = basePriceBySize(table)[size];
  return fallback ?? 0;
}
