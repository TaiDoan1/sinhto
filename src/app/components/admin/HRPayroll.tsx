import { useState, useEffect } from 'react';
import { Clock, Camera, DollarSign, Award, Repeat, Settings, History, Save, Download, Loader2, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Employee } from './EmployeeRegistration';
import type { Shift } from './ShiftSchedule';
import { useBranches } from '../../contexts/BranchContext';
import { localDateStr, parseLocalDateStr } from '../../utils/dateUtils';

function currentMonthStr() {
  return localDateStr().slice(0, 7); // "YYYY-MM"
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtVN(dateStr: string) {
  return dateStr.split('-').reverse().join('/');
}

function addDays(dateStr: string, days: number): string {
  const d = parseLocalDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return fmtDate(d);
}

// Nhận 1 ngày bất kỳ (chuỗi "YYYY-MM-DD") và trả về khoảng Thứ 2 - Chủ Nhật thật của tuần chứa
// ngày đó. Dùng input type="date" (chọn 1 ngày trong tuần) thay vì type="week" vì Safari/iOS
// không hỗ trợ input type="week" (không hiện lịch chọn được, chỉ ra ô nhập chữ trống trơn).
function weekRange(dateStr: string): { start: string; end: string } {
  const d = parseLocalDateStr(dateStr);
  const dayNr = (d.getDay() + 6) % 7; // 0 = Thứ 2
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayNr);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: fmtDate(monday), end: fmtDate(sunday) };
}

interface EmployeeRecord {
  id: string;
  employeeId: string;
  name: string;
  branch: string;
  shifts: number;
  substituteShifts: number;
  hoursWorked: number;
  overtimeHours: number;
  comboSales: number;
  baseSalary: number;
  payType?: 'monthly' | 'hourly';
  hourlyRate?: number;
  otPay: number;
  comboBonus: number;
  totalSalary: number;
  selfieChecks: number;
}

interface SalarySettings {
  baseSalaryMin: number;
  baseSalaryMax: number;
  standardWorkHours: number;
  comboBonus: number;
}

interface OTSettings {
  otRate: number;
  otThreshold: number;
  weekendOTRate: number;
  holidayOTRate: number;
}

interface CheckInRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  location: string;
  status: 'on-time' | 'late' | 'early-leave';
  checkInPhoto?: string;
  checkOutPhoto?: string;
}

type PayrollTab = 'payroll' | 'salary-settings' | 'ot-settings' | 'checkin-history';

import * as api from '../../utils/api';

interface HRPayrollProps {
  /** Ẩn 2 tab cấu hình (Cài Đặt Lương/OT) — dùng cho màn hình Nhân Sự thu gọn, chỉ xem/tính
   * lương chứ không chỉnh công thức lương chung của cả hệ thống. */
  hideSettingsTabs?: boolean;
}

export function HRPayroll({ hideSettingsTabs = false }: HRPayrollProps = {}) {
  const [activeTab, setActiveTab] = useState<PayrollTab>('payroll');
  const [employeeRecords, setEmployeeRecords] = useState<EmployeeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [payrollBranchFilter, setPayrollBranchFilter] = useState<string>('ALL');
  const [payrollPeriodType, setPayrollPeriodType] = useState<'month' | 'week' | 'custom'>('month');
  const [payrollMonth, setPayrollMonth] = useState<string>(currentMonthStr());
  const [payrollWeek, setPayrollWeek] = useState<string>(localDateStr());
  const [payrollCustomStart, setPayrollCustomStart] = useState<string>(localDateStr());
  const [payrollCustomEnd, setPayrollCustomEnd] = useState<string>(localDateStr());
  const { activeBranches, branchLabel } = useBranches();

  const [salarySettings, setSalarySettings] = useState<SalarySettings>({
    baseSalaryMin: 5000000,
    baseSalaryMax: 15000000,
    standardWorkHours: 160,
    comboBonus: 50000,
  });

  const [otSettings, setOTSettings] = useState<OTSettings>({
    otRate: 1.5,
    otThreshold: 8,
    weekendOTRate: 2.0,
    holidayOTRate: 3.0,
  });

  const [checkinRecords, setCheckinRecords] = useState<CheckInRecord[]>([]);
  const [checkinStart, setCheckinStart] = useState<string>('');
  const [checkinEnd, setCheckinEnd] = useState<string>('');
  const [checkinBranchFilter, setCheckinBranchFilter] = useState<string>('ALL');
  const [checkinEmployeeQuery, setCheckinEmployeeQuery] = useState<string>('');
  const [comboSubscriptions, setComboSubscriptions] = useState<{ careStaffId?: string; closedByStaffId?: string; status: string; createdAt?: string }[]>([]);
  const [selectedCheckInRecord, setSelectedCheckInRecord] = useState<CheckInRecord | null>(null);
  const [backupStatus, setBackupStatus] = useState<{ loading: boolean; message?: string }>({ loading: false });
  const [backupFiles, setBackupFiles] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [payrollSort, setPayrollSort] = useState<'default' | 'desc' | 'asc'>('default');
  const [checkinSort, setCheckinSort] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    Promise.all([
      api.fetchSetting('hrSalarySettings').catch(() => null),
      api.fetchSetting('hrOtSettings').catch(() => null),
      fetchBackupStatus(),
    ]).then(([salary, ot]) => {
      if (salary && typeof salary === 'object') setSalarySettings(salary as SalarySettings);
      if (ot && typeof ot === 'object') setOTSettings(ot as OTSettings);
    });
  }, []);

  useEffect(() => {
    Promise.all([api.fetchEmployees(), api.fetchShifts(), api.fetchComboSubscriptions()])
      .then(([empData, shiftData, comboData]) => {
        setEmployees(empData);
        setShifts(shiftData);
        setComboSubscriptions(comboData);
      })
      .catch((err) => console.error('Failed to fetch HR data:', err));
  }, []);

  // Real check-in records from shifts
  useEffect(() => {
    if (employees.length === 0) return;
    const records: CheckInRecord[] = shifts
      .filter((s) => s.checkIn)
      .map((s) => {
        const emp = employees.find((e) => e.id === s.employeeId);
        const checkInDate = new Date(s.checkIn!);
        const checkOutDate = s.checkOut ? new Date(s.checkOut) : null;
        const shiftStart = parseInt(s.startTime.split(':')[0], 10);
        const isLate =
          checkInDate.getHours() > shiftStart ||
          (checkInDate.getHours() === shiftStart && checkInDate.getMinutes() > 15);
        return {
          id: s.id,
          employeeId: emp?.employeeId || s.employeeId,
          employeeName: s.employeeName,
          date: s.date,
          checkInTime: checkInDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          checkOutTime: checkOutDate
            ? checkOutDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '—',
          location: s.branch || emp?.branch || '',
          status: isLate ? 'late' as const : 'on-time' as const,
          checkInPhoto: s.checkInPhoto,
          checkOutPhoto: s.checkOutPhoto,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.checkInTime.localeCompare(a.checkInTime));
    setCheckinRecords(records);
  }, [employees, shifts]);

  useEffect(() => {
    if (employees.length > 0) {
      calculatePayroll();
    }
  }, [employees, shifts, otSettings, salarySettings, comboSubscriptions, payrollBranchFilter, payrollPeriodType, payrollMonth, payrollWeek, payrollCustomStart, payrollCustomEnd]);

  const fetchBackupStatus = async () => {
    try {
      const response = await fetch('/api/backup/status');
      const data = await response.json();
      setBackupFiles(data.files || []);
    } catch (error) {
      console.error('Fetch backup status failed:', error);
    }
  };

  const handleTriggerBackup = async () => {
    setBackupStatus({ loading: true, message: 'Đang tạo backup...' });
    try {
      const response = await fetch('/api/backup/trigger', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setBackupStatus({ loading: false, message: '✅ Backup hoàn tất!' });
        setTimeout(() => setBackupStatus({ loading: false }), 3000);
        await fetchBackupStatus();
      } else {
        setBackupStatus({ loading: false, message: `❌ ${data.error || data.message}` });
      }
    } catch (error) {
      setBackupStatus({ loading: false, message: '❌ Lỗi backup' });
    }
  };

  const calculatePayroll = () => {
    // Lọc theo chi nhánh chỉ để XEM giờ làm/số ca tại đúng nơi đó (nhân viên chạy nhiều chi nhánh
    // vẫn hiện đủ). Công luôn tính theo check-in/check-out thực tế, không phân biệt chi nhánh nào.
    const byBranch = payrollBranchFilter !== 'ALL';
    const relevantEmployees = byBranch
      ? employees.filter(
          (emp) => emp.branch === payrollBranchFilter || (emp.secondaryBranches || []).includes(payrollBranchFilter)
        )
      : employees;

    // Công tính theo giờ TRÊN LỊCH (không theo giờ check-in/check-out thực tế — không tính
    // OT/ở lại trễ, cũng không tự trừ giờ đi trễ). Đi trễ chỉ hiện báo cáo cho admin biết (xem
    // "status: late" ở checkInRecords bên dưới) — admin tự quyết định có trừ lương hay không,
    // hệ thống không tự động trừ. Chưa check-in thì chưa tính công ca đó.
    const scheduledHoursOf = (shift: Shift) => {
      const [startH, startM] = shift.startTime.split(':').map(Number);
      const [endH, endM] = shift.endTime.split(':').map(Number);
      let hours = endH + endM / 60 - (startH + startM / 60);
      if (hours <= 0) hours += 24; // ca qua đêm
      return hours;
    };

    const sumHours = (shiftList: Shift[]) =>
      shiftList.reduce((total, shift) => (shift.checkIn ? total + scheduledHoursOf(shift) : total), 0);

    // Mức lương/giờ áp dụng cho MỘT ngày cụ thể: lấy mốc gần nhất trong salaryHistory có
    // effectiveFrom ≤ ngày đó. Ca trước mốc đầu tiên dùng chính mốc đầu tiên. Không có lịch sử
    // → dùng hourlyRate hiện tại cho mọi ca (giữ nguyên hành vi cũ). Nhờ vậy tăng lương từ ngày
    // X không làm tính lại sai các ca trước X.
    const hourlyRateForDate = (emp: Employee, dateStr: string) => {
      const hist = (emp.salaryHistory || [])
        .filter((h) => h && h.effectiveFrom && Number.isFinite(h.hourlyRate))
        .slice()
        .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
      if (!hist.length) return emp.hourlyRate || 0;
      const day = (dateStr || '').slice(0, 10);
      let rate = hist[0].hourlyRate;
      for (const h of hist) {
        if (h.effectiveFrom <= day) rate = h.hourlyRate;
        else break;
      }
      return rate;
    };

    // Kỳ lương đang xem — theo tháng (prefix "YYYY-MM") hoặc theo tuần (khoảng ngày Thứ 2 - CN thật).
    const inPeriod = (dateStr: string) => {
      if (!dateStr) return false;
      const day = dateStr.slice(0, 10);
      if (payrollPeriodType === 'week') {
        const { start, end } = weekRange(payrollWeek);
        return day >= start && day <= end;
      }
      if (payrollPeriodType === 'custom') {
        const start = payrollCustomStart <= payrollCustomEnd ? payrollCustomStart : payrollCustomEnd;
        const end = payrollCustomStart <= payrollCustomEnd ? payrollCustomEnd : payrollCustomStart;
        return day >= start && day <= end;
      }
      return day.startsWith(payrollMonth);
    };

    const records: EmployeeRecord[] = relevantEmployees
      .map((emp) => {
        const employeeShifts = shifts.filter(
          (s) =>
            s.employeeId === emp.id &&
            (!byBranch || s.branch === payrollBranchFilter) &&
            inPeriod(s.date)
        );
        if (byBranch && employeeShifts.length === 0) return null; // gán CN nhưng chưa có ca nào ở đây — chưa phát sinh chi phí

        const hoursWorked = sumHours(employeeShifts);
        const substituteShifts = employeeShifts.filter((s) => s.isSubstitute).length;
        // Giờ làm thêm (OT) đã được cửa hàng trưởng DUYỆT — cộng vào lương. Chỉ tính ca đã check-in.
        const overtimeHours = employeeShifts.reduce(
          (t, s: any) => (s.checkIn && s.overtimeStatus === 'approved' ? t + (Number(s.overtimeHours) || 0) : t),
          0
        );

        // Thưởng combo tính theo kỳ lương đang xem (dựa vào lúc combo được chốt/tạo) — nếu không
        // lọc theo kỳ, thưởng combo cũ sẽ cộng dồn mãi mãi vào mọi kỳ lương sau này.
        const comboSales = comboSubscriptions.filter(
          (c) =>
            (c.closedByStaffId === emp.id || c.careStaffId === emp.id) &&
            ['active', 'completed'].includes(c.status) &&
            inPeriod(c.createdAt || '')
        ).length;

        const isHourly = emp.payType === 'hourly';
        const monthlyHourly = (emp.baseSalary || 0) / salarySettings.standardWorkHours;
        // Mức lương/giờ của TỪNG ca: theo giờ → tra lịch sử mức lương theo ngày ca; theo tháng
        // → quy đổi từ lương cơ bản. Nhờ đó ca trước/sau ngày tăng lương tính đúng mức riêng.
        const rateForShift = (s: Shift) => (isHourly ? hourlyRateForDate(emp, s.date) : monthlyHourly);

        // OT: mỗi ca đã DUYỆT tính theo mức lương của NGÀY ca đó (không dùng 1 mức chung).
        const otPay = Math.round(
          employeeShifts.reduce(
            (t, s: any) => (s.checkIn && s.overtimeStatus === 'approved'
              ? t + (Number(s.overtimeHours) || 0) * rateForShift(s)
              : t),
            0
          )
        );
        const comboBonus = comboSales * salarySettings.comboBonus;

        // Lương không chia theo % chi nhánh — nhân viên làm ở chi nhánh nào (chính hay hỗ trợ)
        // đều tính công đầy đủ theo giờ trên lịch (trừ đi trễ). Lọc theo chi nhánh chỉ để
        // xem giờ làm/số ca tại đúng nơi đó, không cắt bớt lương thực nhận của nhân viên.
        // Lương giờ cộng theo TỪNG ca × mức lương của ngày ca đó → tăng lương giữa kỳ vẫn đúng.
        const regularPay = isHourly
          ? employeeShifts.reduce((t, s) => (s.checkIn ? t + scheduledHoursOf(s) * hourlyRateForDate(emp, s.date) : t), 0)
          : (emp.baseSalary || 0);
        const totalSalary = regularPay + otPay + comboBonus;

        // Đếm số ca có ĐỦ ảnh xác nhận (check-in + check-out) — không dùng s.checkIn vì giờ đó
        // có thể do POS tự động ghi lúc đăng nhập, không có ảnh xác minh thật sự. Chỉ tính là
        // "đã chấm công đầy đủ" khi có ảnh từ app nhân viên.
        const selfieChecks = employeeShifts.filter((s) => s.checkInPhoto && s.checkOutPhoto).length;

        return {
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.fullName,
          branch: byBranch ? payrollBranchFilter : emp.branch,
          shifts: employeeShifts.length,
          substituteShifts,
          hoursWorked,
          overtimeHours,
          comboSales,
          baseSalary: regularPay,
          payType: emp.payType,
          hourlyRate: emp.hourlyRate,
          otPay,
          comboBonus,
          totalSalary,
          selfieChecks,
        };
      })
      .filter((r): r is EmployeeRecord => r !== null);

    setEmployeeRecords(records);
  };


  const saveSalarySettings = async () => {
    await api.saveSetting('hrSalarySettings', salarySettings);
    calculatePayroll();
    alert('Đã lưu cài đặt lương!');
  };

  const saveOTSettings = async () => {
    await api.saveSetting('hrOtSettings', otSettings);
    calculatePayroll();
    alert('Đã lưu cài đặt OT!');
  };

  const periodLabel = (() => {
    if (payrollPeriodType === 'week') {
      const { start, end } = weekRange(payrollWeek);
      return `tuần ${fmtVN(start)} - ${fmtVN(end)}`;
    }
    if (payrollPeriodType === 'custom') {
      const start = payrollCustomStart <= payrollCustomEnd ? payrollCustomStart : payrollCustomEnd;
      const end = payrollCustomStart <= payrollCustomEnd ? payrollCustomEnd : payrollCustomStart;
      return start === end ? `ngày ${fmtVN(start)}` : `${fmtVN(start)} - ${fmtVN(end)}`;
    }
    return `tháng ${payrollMonth}`;
  })();

  // Khoảng ngày thật (Thứ 2-CN / mùng 1-cuối tháng / tùy chỉnh) của kỳ đang chọn — dùng để lọc
  // check-in/lịch làm việc theo ĐÚNG kỳ lương đang xem, đồng bộ với cách calculatePayroll() tính.
  const periodDateRange = (() => {
    if (payrollPeriodType === 'week') return weekRange(payrollWeek);
    if (payrollPeriodType === 'custom') {
      const start = payrollCustomStart <= payrollCustomEnd ? payrollCustomStart : payrollCustomEnd;
      const end = payrollCustomStart <= payrollCustomEnd ? payrollCustomEnd : payrollCustomStart;
      return { start, end };
    }
    const [y, m] = payrollMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return { start: `${payrollMonth}-01`, end: `${payrollMonth}-${pad2(lastDay)}` };
  })();

  // Lọc lịch sử check-in/out theo khoảng ngày + chi nhánh + tên/mã NV — mặc định không lọc gì
  // (checkinStart/End rỗng) để vẫn thấy ngay danh sách gần nhất như trước, chỉ lọc khi nhập.
  const filteredCheckinRecords = checkinRecords.filter((r) => {
    if (checkinStart && r.date < checkinStart) return false;
    if (checkinEnd && r.date > checkinEnd) return false;
    if (checkinBranchFilter !== 'ALL' && r.location !== checkinBranchFilter) return false;
    if (checkinEmployeeQuery.trim()) {
      const q = checkinEmployeeQuery.trim().toLowerCase();
      if (!r.employeeName.toLowerCase().includes(q) && !r.employeeId.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // checkinRecords vốn đã sắp xếp mới nhất trước (xem effect tính toán ở trên) — 'oldest' chỉ
  // cần đảo ngược lại, không cần so sánh lại từ đầu.
  const sortedCheckinRecords = checkinSort === 'oldest' ? [...filteredCheckinRecords].reverse() : filteredCheckinRecords;

  const sortedEmployeeRecords = payrollSort === 'default'
    ? employeeRecords
    : [...employeeRecords].sort((a, b) => payrollSort === 'desc' ? b.totalSalary - a.totalSalary : a.totalSalary - b.totalSalary);

  const shiftTypeLabel = (type: Shift['shiftType']) => {
    if (type === 'off') return 'Nghỉ';
    return '';
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const { start, end } = periodDateRange;
      const byBranch = payrollBranchFilter !== 'ALL';

      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'FitBlend';
      workbook.created = new Date();

      const headerStyle = { font: { bold: true } } as const;

      // Sheet 1 — Bảng Lương
      const payrollSheet = workbook.addWorksheet('Bảng Lương');
      payrollSheet.columns = [
        { header: 'Mã NV', key: 'employeeId', width: 12 },
        { header: 'Họ tên', key: 'name', width: 24 },
        { header: 'Chi nhánh', key: 'branch', width: 12 },
        { header: 'Số ca làm', key: 'shifts', width: 10 },
        { header: 'Số ca thay ca', key: 'substituteShifts', width: 12 },
        { header: 'Giờ công', key: 'hoursWorked', width: 10 },
        { header: 'Giờ OT', key: 'overtimeHours', width: 10 },
        { header: 'Doanh số combo', key: 'comboSales', width: 14 },
        { header: 'Lương cơ bản', key: 'baseSalary', width: 14 },
        { header: 'Lương OT', key: 'otPay', width: 12 },
        { header: 'Thưởng combo', key: 'comboBonus', width: 14 },
        { header: 'Tổng lương', key: 'totalSalary', width: 14 },
        { header: 'Số lần chấm công có ảnh', key: 'selfieChecks', width: 18 },
      ];
      payrollSheet.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
      sortedEmployeeRecords.forEach((r) => payrollSheet.addRow({ ...r, branch: branchLabel(r.branch) }));

      // Sheet 2 — Lịch Sử Check In/Out (theo đúng kỳ + chi nhánh đang chọn ở Bảng Lương)
      const checkinSheet = workbook.addWorksheet('Lịch Sử Check In-Out');
      checkinSheet.columns = [
        { header: 'Mã NV', key: 'employeeId', width: 12 },
        { header: 'Tên NV', key: 'employeeName', width: 24 },
        { header: 'Ngày', key: 'date', width: 12 },
        { header: 'Giờ vào', key: 'checkInTime', width: 10 },
        { header: 'Giờ ra', key: 'checkOutTime', width: 10 },
        { header: 'Chi nhánh', key: 'location', width: 12 },
        { header: 'Trạng thái', key: 'statusLabel', width: 12 },
      ];
      checkinSheet.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
      const statusLabels: Record<string, string> = { 'on-time': 'Đúng giờ', late: 'Trễ', 'early-leave': 'Về sớm' };
      const periodCheckinRecords = checkinRecords.filter(
        (r) => r.date >= start && r.date <= end && (!byBranch || r.location === payrollBranchFilter)
      );
      (checkinSort === 'oldest' ? [...periodCheckinRecords].reverse() : periodCheckinRecords)
        .forEach((r) => checkinSheet.addRow({ ...r, location: branchLabel(r.location), statusLabel: statusLabels[r.status] || r.status }));

      // Sheet 3 — Lịch Làm Việc (cùng kỳ + chi nhánh)
      const scheduleSheet = workbook.addWorksheet('Lịch Làm Việc');
      scheduleSheet.columns = [
        { header: 'Ngày', key: 'date', width: 12 },
        { header: 'Thứ', key: 'weekday', width: 12 },
        { header: 'Chi nhánh', key: 'branch', width: 12 },
        { header: 'Tên NV', key: 'employeeName', width: 24 },
        { header: 'Giờ ca', key: 'time', width: 14 },
        { header: 'Ghi chú thay ca', key: 'substituteNote', width: 20 },
      ];
      scheduleSheet.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
      shifts
        .filter((s) => s.date >= start && s.date <= end && (!byBranch || s.branch === payrollBranchFilter))
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
        .forEach((s) => {
          scheduleSheet.addRow({
            date: s.date,
            weekday: parseLocalDateStr(s.date).toLocaleDateString('vi-VN', { weekday: 'long' }),
            branch: branchLabel(s.branch),
            employeeName: s.employeeName,
            time: s.shiftType === 'off' ? shiftTypeLabel('off') : `${s.startTime}–${s.endTime}`,
            substituteNote: s.isSubstitute && s.originalEmployeeName ? `Thay: ${s.originalEmployeeName}` : '',
          });
        });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NhanSu_${start}_den_${end}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const allTabs = [
    { id: 'payroll' as PayrollTab, label: 'Bảng Lương', icon: DollarSign },
    { id: 'salary-settings' as PayrollTab, label: 'Cài Đặt Lương', icon: Settings },
    { id: 'ot-settings' as PayrollTab, label: 'Cài Đặt OT', icon: Clock },
    { id: 'checkin-history' as PayrollTab, label: 'Lịch Sử Check In/Out', icon: History },
  ];
  const tabs = hideSettingsTabs
    ? allTabs.filter(t => t.id !== 'salary-settings' && t.id !== 'ot-settings')
    : allTabs;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Nhân Sự & Bảng Lương</h1>

      <div className="mb-6 bg-white rounded-xl shadow-lg p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-min">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 sm:w-5 h-4 sm:h-5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'payroll' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="text-sm text-gray-500">
              {payrollBranchFilter === 'ALL'
                ? `Lương ${periodLabel} theo từng nhân viên — tính đủ công ở mọi chi nhánh họ làm việc, không chia %`
                : `Xem giờ làm/số ca ${periodLabel} tại chi nhánh đã chọn (lương hiển thị vẫn là lương thực nhận đầy đủ, không bị cắt bớt)`}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex border-2 border-gray-300 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPayrollPeriodType('month')}
                  className={`px-3 py-2 text-sm font-semibold ${payrollPeriodType === 'month' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600'}`}
                >
                  Theo tháng
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollPeriodType('week')}
                  className={`px-3 py-2 text-sm font-semibold ${payrollPeriodType === 'week' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600'}`}
                >
                  Theo tuần
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollPeriodType('custom')}
                  className={`px-3 py-2 text-sm font-semibold ${payrollPeriodType === 'custom' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600'}`}
                >
                  Theo ngày
                </button>
              </div>
              {/* Dùng input type="date" (chọn 1 ngày bất kỳ trong tháng/tuần muốn xem) thay vì
                  type="month"/type="week" — Safari (iPhone/Mac) không hỗ trợ 2 loại input đó,
                  chỉ hiện ô chữ trống chứ không ra lịch để bấm chọn. type="date" thì mọi trình
                  duyệt đều hiện lịch bình thường. */}
              {payrollPeriodType === 'month' && (
                <input
                  type="date"
                  title="Chọn 1 ngày bất kỳ trong tháng muốn xem"
                  value={`${payrollMonth}-01`}
                  onChange={(e) => setPayrollMonth(e.target.value ? e.target.value.slice(0, 7) : currentMonthStr())}
                  className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
                />
              )}
              {payrollPeriodType === 'week' && (() => {
                const { start, end } = weekRange(payrollWeek);
                return (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPayrollWeek(addDays(payrollWeek, -7))}
                      title="Tuần trước"
                      className="p-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-3 py-2 border-2 border-gray-300 rounded-lg font-semibold text-sm bg-white whitespace-nowrap">
                      {fmtVN(start)} – {fmtVN(end)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPayrollWeek(addDays(payrollWeek, 7))}
                      title="Tuần sau"
                      className="p-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <input
                      type="date"
                      title="Nhảy đến tuần chứa ngày này"
                      value={payrollWeek}
                      onChange={(e) => setPayrollWeek(e.target.value || localDateStr())}
                      className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm"
                    />
                  </div>
                );
              })()}
              {payrollPeriodType === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={payrollCustomStart}
                    onChange={(e) => setPayrollCustomStart(e.target.value || localDateStr())}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
                  />
                  <span className="text-gray-400 text-sm">đến</span>
                  <input
                    type="date"
                    value={payrollCustomEnd}
                    onChange={(e) => setPayrollCustomEnd(e.target.value || localDateStr())}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
                  />
                </div>
              )}
              <select
                value={payrollBranchFilter}
                onChange={(e) => setPayrollBranchFilter(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
              >
                <option value="ALL">Tất cả chi nhánh</option>
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <select
                value={payrollSort}
                onChange={(e) => setPayrollSort(e.target.value as typeof payrollSort)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
              >
                <option value="default">Sắp xếp: Mặc định</option>
                <option value="desc">Lương: Cao → Thấp</option>
                <option value="asc">Lương: Thấp → Cao</option>
              </select>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg font-semibold text-sm disabled:opacity-60"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                Xuất Excel
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8" />
            <div className="text-sm opacity-90">Tổng Giờ Làm</div>
          </div>
          <div className="text-3xl font-bold">
            {employeeRecords.reduce((sum, emp) => sum + emp.hoursWorked, 0)}h
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8" />
            <div className="text-sm opacity-90">Tổng Giờ OT</div>
          </div>
          <div className="text-3xl font-bold">
            {employeeRecords.reduce((sum, emp) => sum + emp.overtimeHours, 0)}h
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-8 h-8" />
            <div className="text-sm opacity-90">Combo Đã Bán</div>
          </div>
          <div className="text-3xl font-bold">
            {employeeRecords.reduce((sum, emp) => sum + emp.comboSales, 0)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8" />
            <div className="text-sm opacity-90">Tổng Lương</div>
          </div>
          <div className="text-2xl font-bold">
            {(employeeRecords.reduce((sum, emp) => sum + emp.totalSalary, 0) / 1000000).toFixed(1)}M
          </div>
          </div>
        </div>

        {/* Duyệt làm thêm giờ (OT) đã chuyển sang màn Chấm Công. Bảng lương chỉ CỘNG giờ OT đã duyệt. */}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mã NV</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tên</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Chi Nhánh</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    <div className="flex items-center justify-center gap-1">
                      <Camera className="w-3 h-3" />
                      Ca Làm
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    <div className="flex items-center justify-center gap-1">
                      <Repeat className="w-3 h-3" />
                      Ca Thay
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Giờ Làm</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Giờ OT</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Combo Bán</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Lương Cơ Bản</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Lương OT</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Thưởng Combo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase bg-green-50">Tổng Lương</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedEmployeeRecords.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.employeeId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {emp.name}
                      {emp.payType === 'hourly' && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded text-[10px] font-bold align-middle">
                          Theo giờ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">
                        {branchLabel(emp.branch)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-semibold">{emp.shifts}</span>
                        {emp.selfieChecks === emp.shifts && emp.shifts > 0 && (
                          <span className="w-2 h-2 bg-green-500 rounded-full" title="Đầy đủ selfie"></span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.substituteShifts > 0 ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                          {emp.substituteShifts}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{emp.hoursWorked.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-center">
                      {emp.overtimeHours > 0 ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                          {emp.overtimeHours.toFixed(1)}h
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                        {emp.comboSales}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {emp.baseSalary.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-emerald-700 font-medium">
                      +{emp.otPay.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-emerald-600 font-medium">
                      +{emp.comboBonus.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-700 bg-green-50">
                      {emp.totalSalary.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={8} className="px-4 py-3 text-right font-bold text-gray-700">
                    TỔNG CỘNG:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    {employeeRecords.reduce((sum, emp) => sum + emp.baseSalary, 0).toLocaleString('vi-VN')}đ
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    +{employeeRecords.reduce((sum, emp) => sum + emp.otPay, 0).toLocaleString('vi-VN')}đ
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    +{employeeRecords.reduce((sum, emp) => sum + emp.comboBonus, 0).toLocaleString('vi-VN')}đ
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700 text-lg bg-green-100">
                    {employeeRecords.reduce((sum, emp) => sum + emp.totalSalary, 0).toLocaleString('vi-VN')}đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

          <div className="mt-4 space-y-3">
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded">
              <div className="flex items-start gap-3">
                <Camera className="w-5 h-5 text-emerald-700 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <strong>Ghi chú:</strong> Lịch sử check-in lấy từ ca làm thực tế (Staff chấm công). Dấu chấm xanh = đã selfie check-in.
                </div>
              </div>
            </div>
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
              <div className="flex items-start gap-3">
                <Repeat className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <strong>Ca Thay:</strong> Số ca mà nhân viên làm thay cho người khác. Ngày công và lương sẽ được tính cho người thực tế làm việc.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'salary-settings' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Cài Đặt Lương</h2>
            <button
              onClick={saveSalarySettings}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <Save className="w-5 h-5" />
              Lưu Cài Đặt
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lương Cơ Bản Tối Thiểu (VNĐ)
              </label>
              <input
                type="number"
                value={salarySettings.baseSalaryMin}
                onChange={(e) => setSalarySettings({ ...salarySettings, baseSalaryMin: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lương Cơ Bản Tối Đa (VNĐ)
              </label>
              <input
                type="number"
                value={salarySettings.baseSalaryMax}
                onChange={(e) => setSalarySettings({ ...salarySettings, baseSalaryMax: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Số Giờ Làm Chuẩn / Tháng
              </label>
              <input
                type="number"
                value={salarySettings.standardWorkHours}
                onChange={(e) => setSalarySettings({ ...salarySettings, standardWorkHours: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Thưởng Mỗi Combo (VNĐ)
              </label>
              <input
                type="number"
                value={salarySettings.comboBonus}
                onChange={(e) => setSalarySettings({ ...salarySettings, comboBonus: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-6 bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded">
            <div className="text-sm text-gray-700">
              <strong>Lưu ý:</strong> Những thiết lập này sẽ ảnh hưởng đến cách tính lương cơ bản và thưởng cho tất cả nhân viên.
              Hệ số tính lương theo giờ = Lương cơ bản / Số giờ làm chuẩn.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ot-settings' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Cài Đặt OT (Làm Thêm Giờ)</h2>
            <button
              onClick={saveOTSettings}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <Save className="w-5 h-5" />
              Lưu Cài Đặt
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hệ Số Lương OT Thường Ngày
              </label>
              <input
                type="number"
                step="0.1"
                value={otSettings.otRate}
                onChange={(e) => setOTSettings({ ...otSettings, otRate: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Thông thường: 1.5x lương giờ cơ bản</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ngưỡng OT (Giờ/Ca)
              </label>
              <input
                type="number"
                value={otSettings.otThreshold}
                onChange={(e) => setOTSettings({ ...otSettings, otThreshold: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Số giờ chuẩn mỗi ca làm việc</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hệ Số Lương OT Cuối Tuần
              </label>
              <input
                type="number"
                step="0.1"
                value={otSettings.weekendOTRate}
                onChange={(e) => setOTSettings({ ...otSettings, weekendOTRate: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Thông thường: 2.0x lương giờ cơ bản</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hệ Số Lương OT Ngày Lễ
              </label>
              <input
                type="number"
                step="0.1"
                value={otSettings.holidayOTRate}
                onChange={(e) => setOTSettings({ ...otSettings, holidayOTRate: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Thông thường: 3.0x lương giờ cơ bản</p>
            </div>
          </div>

          <div className="mt-6 bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded">
            <div className="text-sm text-gray-700">
              <strong>Công thức tính lương OT:</strong> Lương OT = Số giờ OT × (Lương cơ bản / Số giờ chuẩn) × Hệ số OT
              <br />
              <span className="text-xs mt-2 block">
                Ví dụ: Lương cơ bản 8,000,000đ, 160 giờ chuẩn, làm OT 10 giờ với hệ số 1.5 → OT = 10 × 50,000 × 1.5 = 750,000đ
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'checkin-history' && (
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Lịch Sử Check In/Check Out</h2>
                <p className="text-sm text-gray-600 mt-1">Theo dõi giờ vào ra của nhân viên</p>
              </div>
              <button
                onClick={handleTriggerBackup}
                disabled={backupStatus.loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {backupStatus.loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang backup...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Backup Excel
                  </>
                )}
              </button>
            </div>
            {backupStatus.message && (
              <p className={`text-sm mt-2 ${backupStatus.message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {backupStatus.message}
              </p>
            )}
            {backupFiles.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                <p className="font-semibold">Các backup gần đây:</p>
                <ul className="mt-1 space-y-1">
                  {backupFiles.slice(0, 3).map(file => (
                    <li key={file.name} className="flex justify-between">
                      <a href={file.path} download className="text-blue-600 hover:underline">
                        {file.name}
                      </a>
                      <span className="text-gray-500">{file.size} KB</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap mt-4">
              <input
                type="date"
                value={checkinStart}
                onChange={(e) => setCheckinStart(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
              />
              <span className="text-gray-400 text-sm">đến</span>
              <input
                type="date"
                value={checkinEnd}
                onChange={(e) => setCheckinEnd(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
              />
              <select
                value={checkinBranchFilter}
                onChange={(e) => setCheckinBranchFilter(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
              >
                <option value="ALL">Tất cả chi nhánh</option>
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <select
                value={checkinSort}
                onChange={(e) => setCheckinSort(e.target.value as typeof checkinSort)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
              >
                <option value="newest">Ngày: Mới nhất trước</option>
                <option value="oldest">Ngày: Cũ nhất trước</option>
              </select>
              <input
                type="text"
                value={checkinEmployeeQuery}
                onChange={(e) => setCheckinEmployeeQuery(e.target.value)}
                placeholder="Tìm theo tên/mã NV..."
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm flex-1 min-w-[160px]"
              />
              {(checkinStart || checkinEnd || checkinBranchFilter !== 'ALL' || checkinEmployeeQuery) && (
                <button
                  type="button"
                  onClick={() => { setCheckinStart(''); setCheckinEnd(''); setCheckinBranchFilter('ALL'); setCheckinEmployeeQuery(''); }}
                  className="text-sm text-gray-500 underline hover:text-gray-700"
                >
                  Bỏ lọc
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ngày</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mã NV</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tên Nhân Viên</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check In</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check Out</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Địa Điểm</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Ảnh</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedCheckinRecords.slice(0, 50).map(record => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.employeeId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.employeeName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-900">{record.checkInTime}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-gray-900">{record.checkOutTime}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">
                        {branchLabel(record.location)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(record.checkInPhoto || record.checkOutPhoto) && (
                        <button
                          onClick={() => setSelectedCheckInRecord(record)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors"
                        >
                          <Camera className="w-3 h-3" />
                          Xem
                        </button>
                      )}
                      {!record.checkInPhoto && !record.checkOutPhoto && (
                        <span className="text-xs text-gray-400">Chưa có</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.status === 'on-time' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          Đúng Giờ
                        </span>
                      )}
                      {record.status === 'late' && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          Đi Muộn
                        </span>
                      )}
                      {record.status === 'early-leave' && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                          Về Sớm
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Hiển thị {Math.min(50, filteredCheckinRecords.length)}/{filteredCheckinRecords.length} bản ghi
                {filteredCheckinRecords.length !== checkinRecords.length ? ` (đã lọc từ ${checkinRecords.length})` : ' gần nhất'}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">Đúng Giờ: {filteredCheckinRecords.filter(r => r.status === 'on-time').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">Đi Muộn: {filteredCheckinRecords.filter(r => r.status === 'late').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCheckInRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 border-b p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{selectedCheckInRecord.employeeName}</h3>
                <p className="text-sm text-gray-600">{new Date(selectedCheckInRecord.date).toLocaleDateString('vi-VN')}</p>
              </div>
              <button
                onClick={() => setSelectedCheckInRecord(null)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Clock className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedCheckInRecord.checkInPhoto && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Check-in: {selectedCheckInRecord.checkInTime}
                  </div>
                  <img
                    src={selectedCheckInRecord.checkInPhoto}
                    alt="Check-in"
                    className="w-full rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {selectedCheckInRecord.checkOutPhoto && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Check-out: {selectedCheckInRecord.checkOutTime}
                  </div>
                  <img
                    src={selectedCheckInRecord.checkOutPhoto}
                    alt="Check-out"
                    className="w-full rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {!selectedCheckInRecord.checkInPhoto && !selectedCheckInRecord.checkOutPhoto && (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Không có ảnh check-in/out</p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 border-t p-4">
              <button
                onClick={() => setSelectedCheckInRecord(null)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
