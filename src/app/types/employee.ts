export type ProfileFieldType = 'text' | 'phone' | 'email' | 'date' | 'select' | 'textarea';

export interface ProfileFieldConfig {
  id: string;
  label: string;
  type: ProfileFieldType;
  source: 'builtin' | 'custom';
  fieldKey: string;
  visible: boolean;
  editable: boolean;
  options?: string[];
  order: number;
}

export interface Employee {
  id: string;
  fullName: string;
  employeeId: string;
  email: string;
  phone: string;
  idNumber: string;
  dateOfBirth: string;
  address: string;
  branch: string;
  position: string;
  baseSalary: number;
  startDate: string;
  username: string;
  photo?: string;
  customData?: Record<string, string>;
}

export type ShiftStatus = 'pending' | 'scheduled' | 'approved' | 'rejected' | 'in_progress' | 'completed';

export interface WorkShift {
  id: string;
  employeeId: string;
  employeeName: string;
  branch?: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType?: string;
  status: ShiftStatus;
  checkIn?: string;
  checkOut?: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
  requestedBy?: 'admin' | 'employee';
}

export function canCancelShift(shift: WorkShift): boolean {
  if (shift.checkIn) return false;
  if (shift.status === 'pending') return true;
  if (shift.requestedBy === 'employee' && ['approved', 'scheduled'].includes(shift.status)) return true;
  return false;
}

export const SHIFT_TEMPLATES = [
  { id: 'morning', name: 'Ca Sang', start: '06:00', end: '12:00', icon: '🌅' },
  { id: 'noon', name: 'Ca Trua', start: '12:00', end: '18:00', icon: '🌤️' },
  { id: 'afternoon', name: 'Ca Chieu', start: '14:00', end: '20:00', icon: '☀️' },
  { id: 'evening', name: 'Ca Toi', start: '18:00', end: '23:00', icon: '🌙' },
];

export const ONLINE_SALES_POSITIONS = ['online_sales', 'customer_care', 'cskh'] as const;

export function isOnlineSalesPosition(position: string): boolean {
  return (ONLINE_SALES_POSITIONS as readonly string[]).includes(position);
}

export const POSITION_LABELS: Record<string, string> = {
  manager: 'Quan Ly Chi Nhanh',
  store_manager: 'Quan Ly Cua Hang',
  cskh: 'Cham Soc Khach Hang',
  cashier: 'Thu Ngan',
  bartender: 'Pha Che',
  server: 'Phuc Vu',
  cleaner: 'Ve Sinh',
};

export const DEFAULT_PROFILE_FIELDS: ProfileFieldConfig[] = [
  { id: 'fullName', label: 'Ho va ten', type: 'text', source: 'builtin', fieldKey: 'fullName', visible: true, editable: false, order: 1 },
  { id: 'employeeId', label: 'Ma nhan vien', type: 'text', source: 'builtin', fieldKey: 'employeeId', visible: true, editable: false, order: 2 },
  { id: 'phone', label: 'So dien thoai', type: 'phone', source: 'builtin', fieldKey: 'phone', visible: true, editable: true, order: 3 },
  { id: 'email', label: 'Email', type: 'email', source: 'builtin', fieldKey: 'email', visible: true, editable: true, order: 4 },
  { id: 'branch', label: 'Chi nhanh', type: 'text', source: 'builtin', fieldKey: 'branch', visible: true, editable: false, order: 5 },
  { id: 'position', label: 'Chuc vu', type: 'text', source: 'builtin', fieldKey: 'position', visible: true, editable: false, order: 6 },
  { id: 'startDate', label: 'Ngay vao lam', type: 'date', source: 'builtin', fieldKey: 'startDate', visible: true, editable: false, order: 7 },
  { id: 'address', label: 'Dia chi', type: 'textarea', source: 'builtin', fieldKey: 'address', visible: true, editable: true, order: 8 },
];
