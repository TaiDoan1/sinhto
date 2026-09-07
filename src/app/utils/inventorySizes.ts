/**
 * Size túi Kho Vị dùng chung cho POS Nhập kho + Admin (BranchInventory, CrossBranchInventory).
 *
 * Mỗi vị có đúng 3 size túi:
 *   - S = 360ml (túi nhỏ)
 *   - M = 500ml (túi vừa)
 *   - L = 700ml (túi lớn)
 *
 * Trước đây kho tách 2 tầng: mức ml (250/360/500/700) × size (S/M/L) = 12 ô/vị. Đã gộp lại còn 3
 * size, bỏ 250ml. Key tồn kho lưu theo MÃ SIZE ('S' | 'M' | 'L'); key format cũ ('360ml-S'...) còn
 * sót trong dữ liệu sẽ bị bỏ qua khi cộng tổng và loại khi lưu.
 */
export const PRODUCT_SIZES: { key: string; volume: string }[] = [
  { key: 'S', volume: '360ml' },
  { key: 'M', volume: '500ml' },
  { key: 'L', volume: '700ml' },
];

export const PRODUCT_SIZE_KEYS = PRODUCT_SIZES.map((s) => s.key);

/** Nhãn hiển thị gọn cho 1 size, vd "S (360ml)". */
export const sizeLabel = (s: { key: string; volume: string }) => `${s.key} (${s.volume})`;
