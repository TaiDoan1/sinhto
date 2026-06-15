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
  requestedBy?: 'admin' | 'employee';
}

export const SHIFT_TEMPLATES = [
  { id: 'morning', name: 'Ca Sáng', start: '06:00', end: '14:00', icon: '🌅' },
  { id: 'afternoon', name: 'Ca Chiều', start: '14:00', end: '22:00', icon: '☀️' },
  { id: 'evening', name: 'Ca Tối', start: '22:00', end: '06:00', icon: '🌙' },
];

export const POSITION_LABELS: Record<string, string> = {
  manager: 'Quản Lý Chi Nhánh',
  cashier: 'Thu Ngân',
  bartender: 'Pha Chế',
  server: 'Phục Vụ',
  cleaner: 'Vệ Sinh',
};

export const BRANCH_LABELS: Record<string, string> = {
  CN1: 'Chi Nhánh 1 - Quận 1',
  CN2: 'Chi Nhánh 2 - Quận 3',
  CN3: 'Chi Nhánh 3 - Thủ Đức',
};

export const DEFAULT_PROFILE_FIELDS: ProfileFieldConfig[] = [
  { id: 'fullName', label: 'Họ và tên', type: 'text', source: 'builtin', fieldKey: 'fullName', visible: true, editable: false, order: 1 },
  { id: 'employeeId', label: 'Mã nhân viên', type: 'text', source: 'builtin', fieldKey: 'employeeId', visible: true, editable: false, order: 2 },
  { id: 'phone', label: 'Số điện thoại', type: 'phone', source: 'builtin', fieldKey: 'phone', visible: true, editable: true, order: 3 },
  { id: 'email', label: 'Email', type: 'email', source: 'builtin', fieldKey: 'email', visible: true, editable: true, order: 4 },
  { id: 'branch', label: 'Chi nhánh', type: 'text', source: 'builtin', fieldKey: 'branch', visible: true, editable: false, order: 5 },
  { id: 'position', label: 'Chức vụ', type: 'text', source: 'builtin', fieldKey: 'position', visible: true, editable: false, order: 6 },
  { id: 'startDate', label: 'Ngày vào làm', type: 'date', source: 'builtin', fieldKey: 'startDate', visible: true, editable: false, order: 7 },
  { id: 'address', label: 'Địa chỉ', type: 'textarea', source: 'builtin', fieldKey: 'address', visible: true, editable: true, order: 8 },
];
