export type RedeemProgramType = 'shipping' | 'item_vnd' | 'item_percent';

export interface LoyaltyTier {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  minPoints: number;
  maxPoints: number | null;
  autoAbovePrevious?: boolean;
}

export interface LoyaltyRedeemProgram {
  id: string;
  enabled: boolean;
  type: RedeemProgramType;
  title: string;
  description: string;
  pointsCost: number;
  value: number;
  /** Đơn hàng tối thiểu (VNĐ) mới được áp dụng — 0 = không giới hạn */
  minOrderAmount: number;
  /** Ngày bắt đầu (YYYY-MM-DD), null = không giới hạn */
  validFrom: string | null;
  /** Ngày kết thúc (YYYY-MM-DD), null = không giới hạn */
  validTo: string | null;
  /** Trần giảm giá (VNĐ) cho loại %, null = không giới hạn */
  maxDiscountAmount: number | null;
  imageUrl?: string;
}

export interface LoyaltyFullConfig {
  earnRate: number;
  tiers: LoyaltyTier[];
  redeemPrograms: LoyaltyRedeemProgram[];
}

export interface ProgramEligibility {
  eligible: boolean;
  reason?: string;
}

export type VoucherStatus = 'active' | 'used' | 'cancelled';

export interface LoyaltyVoucher {
  id: string;
  code: string;
  programId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: VoucherStatus;
  pointsDeducted: number;
  issuedAt: string;
  usedAt: string | null;
  expiresAt: string | null;
  program?: LoyaltyRedeemProgram;
}

export interface BulkIssueVoucherResult {
  total: number;
  successCount: number;
  failedCount: number;
  success: LoyaltyVoucher[];
  failed: { phone: string; error: string }[];
}

export function parsePhoneList(input: string): string[] {
  return [...new Set(
    input
      .split(/[\n,;]+/)
      .map(p => p.trim().replace(/\s/g, ''))
      .filter(Boolean)
  )];
}

export function exportVouchersCsv(vouchers: LoyaltyVoucher[], filename = 'vouchers.csv') {
  const header = 'Mã,Tên khách,SĐT,Trạng thái,Ngày cấp';
  const rows = vouchers.map(v =>
    [v.code, v.customerName, v.customerPhone, formatVoucherStatus(v.status), v.issuedAt.slice(0, 10)].join(',')
  );
  const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export const DEFAULT_LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: 'new',
    name: 'Thành viên mới',
    subtitle: 'Khách hàng mới tham gia',
    emoji: '🥉',
    gradient: 'from-blue-400 to-blue-600',
    minPoints: 0,
    maxPoints: 1000,
  },
  {
    id: 'bronze',
    name: 'Hạng Đồng',
    subtitle: 'Khách hàng thân thiết',
    emoji: '🏅',
    gradient: 'from-amber-600 to-amber-800',
    minPoints: 1001,
    maxPoints: 5000,
  },
  {
    id: 'silver',
    name: 'Hạng Bạc',
    subtitle: 'Khách hàng VIP',
    emoji: '🥈',
    gradient: 'from-gray-400 to-gray-600',
    minPoints: 5001,
    maxPoints: 10000,
  },
  {
    id: 'gold',
    name: 'Hạng Vàng',
    subtitle: 'Khách hàng VVIP',
    emoji: '👑',
    gradient: 'from-yellow-400 to-yellow-600',
    minPoints: 10001,
    maxPoints: 20000,
  },
  {
    id: 'diamond',
    name: 'Hạng Kim Cương',
    subtitle: 'Khách hàng đặc biệt',
    emoji: '💎',
    gradient: 'from-rose-500 to-pink-600',
    minPoints: 20001,
    maxPoints: null,
    autoAbovePrevious: true,
  },
];

export const DEFAULT_REDEEM_PROGRAMS: LoyaltyRedeemProgram[] = [
  {
    id: 'prog-ship',
    enabled: true,
    type: 'shipping',
    title: 'Miễn phí ship đơn tiếp theo',
    description: 'Đổi điểm lấy mã miễn phí ship cho đơn hàng tiếp theo',
    pointsCost: 300,
    value: 30000,
    minOrderAmount: 50000,
    validFrom: null,
    validTo: null,
    maxDiscountAmount: null,
  },
  {
    id: 'prog-free-drink',
    enabled: true,
    type: 'item_percent',
    title: 'Tặng 1 ly FitBlend bất kỳ',
    description: 'Đổi 2.000 điểm để nhận 1 ly FitBlend miễn phí',
    pointsCost: 2000,
    value: 100,
    minOrderAmount: 0,
    validFrom: null,
    validTo: null,
    maxDiscountAmount: 80000,
  },
  {
    id: 'prog-voucher-30k',
    enabled: true,
    type: 'item_vnd',
    title: 'Voucher giảm 30.000đ',
    description: 'Đổi 500 điểm lấy voucher 30.000đ cho đơn tiếp theo',
    pointsCost: 500,
    value: 30000,
    minOrderAmount: 50000,
    validFrom: null,
    validTo: null,
    maxDiscountAmount: null,
  },
  {
    id: 'prog-voucher-100k',
    enabled: true,
    type: 'item_vnd',
    title: 'Voucher giảm 100.000đ',
    description: 'Đổi 1.000 điểm lấy voucher 100.000đ',
    pointsCost: 1000,
    value: 100000,
    minOrderAmount: 150000,
    validFrom: null,
    validTo: null,
    maxDiscountAmount: null,
  },
];

export function normalizeRedeemProgram(raw: Partial<LoyaltyRedeemProgram> & { id: string }): LoyaltyRedeemProgram {
  return {
    id: raw.id,
    enabled: raw.enabled ?? true,
    type: raw.type ?? 'item_vnd',
    title: raw.title ?? 'Chương trình mới',
    description: raw.description ?? '',
    pointsCost: raw.pointsCost ?? 100,
    value: raw.value ?? 10000,
    minOrderAmount: raw.minOrderAmount ?? 0,
    validFrom: raw.validFrom ?? null,
    validTo: raw.validTo ?? null,
    maxDiscountAmount: raw.maxDiscountAmount ?? null,
    imageUrl: raw.imageUrl,
  };
}

export function isProgramInPeriod(program: LoyaltyRedeemProgram, at = new Date()): boolean {
  const today = toLocalDateStr(at);
  if (program.validFrom && today < program.validFrom) return false;
  if (program.validTo && today > program.validTo) return false;
  return true;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getProgramEligibility(
  program: LoyaltyRedeemProgram,
  opts: { customerPoints: number; orderSubtotal: number; now?: Date },
): ProgramEligibility {
  if (!program.enabled) return { eligible: false, reason: 'Chương trình đang tắt' };

  const now = opts.now ?? new Date();
  const today = toLocalDateStr(now);
  if (program.validFrom && today < program.validFrom) {
    return { eligible: false, reason: `Bắt đầu từ ${formatDateVi(program.validFrom)}` };
  }
  if (program.validTo && today > program.validTo) {
    return { eligible: false, reason: 'Chương trình đã hết hạn' };
  }
  if (opts.customerPoints < program.pointsCost) {
    return { eligible: false, reason: `Cần ${program.pointsCost.toLocaleString('vi-VN')} điểm` };
  }
  if (program.minOrderAmount > 0 && opts.orderSubtotal < program.minOrderAmount) {
    return {
      eligible: false,
      reason: `Đơn tối thiểu ${program.minOrderAmount.toLocaleString('vi-VN')}đ`,
    };
  }
  return { eligible: true };
}

export function formatDateVi(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function formatProgramPeriod(program: LoyaltyRedeemProgram): string {
  if (!program.validFrom && !program.validTo) return 'Không giới hạn thời gian';
  if (program.validFrom && program.validTo) {
    return `${formatDateVi(program.validFrom)} – ${formatDateVi(program.validTo)}`;
  }
  if (program.validFrom) return `Từ ${formatDateVi(program.validFrom)}`;
  return `Đến ${formatDateVi(program.validTo!)}`;
}

export function getTierForPoints(points: number, tiers: LoyaltyTier[]): LoyaltyTier {
  const sorted = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
  return sorted.find(t => points >= t.minPoints && (t.maxPoints === null || points <= t.maxPoints))
    || tiers[0];
}

export function getProgramTypeLabel(type: RedeemProgramType): string {
  if (type === 'shipping') return 'Mã giảm phí ship';
  if (type === 'item_percent') return 'Mã giảm giá món';
  return 'Mã giảm giá món';
}

export function formatProgramValue(program: LoyaltyRedeemProgram): string {
  if (program.type === 'item_percent') return `${program.value} %`;
  return `${program.value.toLocaleString('vi-VN')} đ`;
}

export function createEmptyRedeemProgram(): LoyaltyRedeemProgram {
  return normalizeRedeemProgram({
    id: `prog-${Date.now()}`,
    enabled: true,
    type: 'item_vnd',
    title: 'Chương trình mới',
    description: '',
    pointsCost: 100,
    value: 10000,
    minOrderAmount: 0,
    validFrom: null,
    validTo: null,
    maxDiscountAmount: null,
  });
}

export function formatVoucherStatus(status: VoucherStatus): string {
  if (status === 'active') return 'Chưa dùng';
  if (status === 'used') return 'Đã dùng';
  return 'Đã hủy';
}
