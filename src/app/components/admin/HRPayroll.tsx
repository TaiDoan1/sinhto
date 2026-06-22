import { useState, useEffect } from 'react';
import { Clock, Camera, DollarSign, Award, Repeat, Settings, History, Save } from 'lucide-react';
import type { Employee } from './EmployeeRegistration';
import type { Shift } from './ShiftSchedule';

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
}

type PayrollTab = 'payroll' | 'salary-settings' | 'ot-settings' | 'checkin-history';

import * as api from '../../utils/api';

export function HRPayroll() {
  const [activeTab, setActiveTab] = useState<PayrollTab>('payroll');
  const [employeeRecords, setEmployeeRecords] = useState<EmployeeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

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
  const [comboSubscriptions, setComboSubscriptions] = useState<{ careStaffId?: string; closedByStaffId?: string; status: string }[]>([]);

  useEffect(() => {
    Promise.all([
      api.fetchSetting('hrSalarySettings').catch(() => null),
      api.fetchSetting('hrOtSettings').catch(() => null),
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
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.checkInTime.localeCompare(a.checkInTime));
    setCheckinRecords(records);
  }, [employees, shifts]);

  useEffect(() => {
    if (employees.length > 0) {
      calculatePayroll();
    }
  }, [employees, shifts, otSettings, salarySettings, comboSubscriptions]);

  const calculatePayroll = () => {
    const records: EmployeeRecord[] = employees.map((emp) => {
      const employeeShifts = shifts.filter((s) => s.employeeId === emp.id);

      const hoursWorked = employeeShifts.reduce((total, shift) => {
        const start = parseInt(shift.startTime.split(':')[0], 10);
        const end = parseInt(shift.endTime.split(':')[0], 10);
        const hours = end > start ? end - start : 24 - start + end;
        return total + hours;
      }, 0);

      const substituteShifts = employeeShifts.filter((s) => s.isSubstitute).length;
      const overtimeHours = Math.max(0, hoursWorked - employeeShifts.length * otSettings.otThreshold);

      const comboSales = comboSubscriptions.filter(
        (c) =>
          (c.closedByStaffId === emp.id || c.careStaffId === emp.id) &&
          ['active', 'completed'].includes(c.status)
      ).length;

      const hourlyRate = emp.baseSalary / salarySettings.standardWorkHours;
      const otPay = overtimeHours * hourlyRate * otSettings.otRate;
      const comboBonus = comboSales * salarySettings.comboBonus;
      const totalSalary = emp.baseSalary + otPay + comboBonus;

      const selfieChecks = employeeShifts.filter((s) => s.checkIn).length;

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.fullName,
        branch: emp.branch,
        shifts: employeeShifts.length,
        substituteShifts,
        hoursWorked,
        overtimeHours,
        comboSales,
        baseSalary: emp.baseSalary,
        otPay,
        comboBonus,
        totalSalary,
        selfieChecks,
      };
    });

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

  const tabs = [
    { id: 'payroll' as PayrollTab, label: 'Bảng Lương', icon: DollarSign },
    { id: 'salary-settings' as PayrollTab, label: 'Cài Đặt Lương', icon: Settings },
    { id: 'ot-settings' as PayrollTab, label: 'Cài Đặt OT', icon: Clock },
    { id: 'checkin-history' as PayrollTab, label: 'Lịch Sử Check In/Out', icon: History },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Nhân Sự & Bảng Lương</h1>

      <div className="mb-6 bg-white rounded-xl shadow-lg p-2">
        <div className="flex gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'payroll' && (
        <div>
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
                {employeeRecords.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.employeeId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{emp.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">
                        {emp.branch}
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
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{emp.hoursWorked}h</td>
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
            <h2 className="text-2xl font-bold text-gray-800">Lịch Sử Check In/Check Out</h2>
            <p className="text-sm text-gray-600 mt-1">Theo dõi giờ vào ra của nhân viên</p>
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
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {checkinRecords.slice(0, 50).map(record => (
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
                        {record.location}
                      </span>
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
                Hiển thị 50 bản ghi gần nhất
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">Đúng Giờ: {checkinRecords.filter(r => r.status === 'on-time').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">Đi Muộn: {checkinRecords.filter(r => r.status === 'late').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
