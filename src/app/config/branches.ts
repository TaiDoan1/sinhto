import type { Branch } from '../types/branch';

/** Fallback khi API chưa sẵn sàng */
export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'CN1',
    name: 'Chi Nhánh 1 - Quận 1',
    address: '123 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM',
    phone: '0901000001',
    active: true,
    sortOrder: 1,
  },
  {
    id: 'CN2',
    name: 'Chi Nhánh 2 - Quận 3',
    address: '456 Lê Văn Sỹ, Phường 14, Quận 3, TP.HCM',
    phone: '0901000002',
    active: true,
    sortOrder: 2,
  },
  {
    id: 'CN3',
    name: 'Chi Nhánh 3 - Thủ Đức',
    address: '789 Võ Văn Ngân, Linh Chiểu, TP.Thủ Đức, TP.HCM',
    phone: '0901000003',
    active: true,
    sortOrder: 3,
  },
];

export function branchLabel(branches: Branch[], id: string): string {
  return branches.find((b) => b.id === id)?.name || id;
}
