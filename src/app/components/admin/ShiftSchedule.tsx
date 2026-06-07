import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Pin, RefreshCw, Trash2, Repeat } from 'lucide-react';
import { Employee } from './EmployeeRegistration';

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  date: string;
  startTime: string;
  endTime: string;
  isPinned?: boolean;
  shiftType?: 'morning' | 'afternoon' | 'evening';
  originalEmployeeId?: string;
  originalEmployeeName?: string;
  isSubstitute?: boolean;
}

const branches = [
  { id: 'CN1', name: 'CN1' },
  { id: 'CN2', name: 'CN2' },
  { id: 'CN3', name: 'CN3' },
];

const shiftTemplates = [
  { name: '🌅 Sáng', start: '06:00', end: '14:00', color: 'from-emerald-500 to-yellow-400' },
  { name: '☀️ Chiều', start: '14:00', end: '22:00', color: 'from-blue-400 to-cyan-400' },
  { name: '🌙 Tối', start: '22:00', end: '06:00', color: 'from-purple-400 to-pink-400' },
];

export function ShiftSchedule() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('CN1');
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedCell, setSelectedCell] = useState<{employeeId: string, date: string} | null>(null);
  const [substituteModal, setSubstituteModal] = useState<{shift: Shift} | null>(null);

  useEffect(() => {
    loadEmployees();
    loadShifts();
  }, []);

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const loadEmployees = () => {
    const stored = localStorage.getItem('employees');
    if (stored) setEmployees(JSON.parse(stored));
  };

  const loadShifts = () => {
    const stored = localStorage.getItem('shifts');
    if (stored) setShifts(JSON.parse(stored));
  };

  const saveShifts = (newShifts: Shift[]) => {
    setShifts(newShifts);
    localStorage.setItem('shifts', JSON.stringify(newShifts));
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const handleAddShift = (employeeId: string, date: string, template: typeof shiftTemplates[0]) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const startHour = parseInt(template.start.split(':')[0]);
    let shiftType: 'morning' | 'afternoon' | 'evening';
    if (startHour >= 6 && startHour < 14) shiftType = 'morning';
    else if (startHour >= 14 && startHour < 22) shiftType = 'afternoon';
    else shiftType = 'evening';

    const newShift: Shift = {
      id: Date.now().toString(),
      employeeId: employee.id,
      employeeName: employee.fullName,
      branch: selectedBranch,
      date,
      startTime: template.start,
      endTime: template.end,
      isPinned: false,
      shiftType,
    };

    saveShifts([...shifts, newShift]);
    setSelectedCell(null);
  };

  const handleDeleteShift = (id: string) => {
    saveShifts(shifts.filter(s => s.id !== id));
  };

  const handleTogglePin = (id: string) => {
    saveShifts(shifts.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));
  };

  const handleSubstitute = (substituteEmployeeId: string) => {
    if (!substituteModal) return;

    const substituteEmployee = employees.find(e => e.id === substituteEmployeeId);
    if (!substituteEmployee) return;

    const updatedShift = {
      ...substituteModal.shift,
      originalEmployeeId: substituteModal.shift.isSubstitute
        ? substituteModal.shift.originalEmployeeId
        : substituteModal.shift.employeeId,
      originalEmployeeName: substituteModal.shift.isSubstitute
        ? substituteModal.shift.originalEmployeeName
        : substituteModal.shift.employeeName,
      employeeId: substituteEmployee.id,
      employeeName: substituteEmployee.fullName,
      isSubstitute: true,
    };

    saveShifts(shifts.map(s => s.id === substituteModal.shift.id ? updatedShift : s));
    setSubstituteModal(null);
  };

  const handleCancelSubstitute = (shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift || !shift.isSubstitute || !shift.originalEmployeeId) return;

    const restoredShift = {
      ...shift,
      employeeId: shift.originalEmployeeId,
      employeeName: shift.originalEmployeeName!,
      originalEmployeeId: undefined,
      originalEmployeeName: undefined,
      isSubstitute: false,
    };

    saveShifts(shifts.map(s => s.id === shiftId ? restoredShift : s));
  };

  const handleRotateShifts = () => {
    if (!confirm('Xoay ca tự động? (Ca đã ghim sẽ giữ nguyên)')) return;

    const weekDays = getWeekDays();
    const availableEmployees = employees.filter(e => e.branch === selectedBranch);
    if (availableEmployees.length === 0) return;

    const weekDates = weekDays.map(d => d.toISOString().split('T')[0]);
    const otherShifts = shifts.filter(s =>
      s.branch !== selectedBranch || !weekDates.includes(s.date) || s.isPinned
    );

    const newShifts: Shift[] = [...otherShifts];
    let empIndex = 0;

    weekDays.forEach((day) => {
      const dateStr = day.toISOString().split('T')[0];
      const pinnedIds = otherShifts.filter(s => s.date === dateStr).map(s => s.employeeId);

      // Morning
      let morningEmp = availableEmployees[empIndex % availableEmployees.length];
      while (pinnedIds.includes(morningEmp.id)) {
        empIndex++;
        morningEmp = availableEmployees[empIndex % availableEmployees.length];
      }
      newShifts.push({
        id: `r-${dateStr}-${morningEmp.id}-m`,
        employeeId: morningEmp.id,
        employeeName: morningEmp.fullName,
        branch: selectedBranch,
        date: dateStr,
        startTime: '06:00',
        endTime: '14:00',
        isPinned: false,
        shiftType: 'morning',
      });
      empIndex++;

      // Afternoon
      let afternoonEmp = availableEmployees[empIndex % availableEmployees.length];
      while (pinnedIds.includes(afternoonEmp.id)) {
        empIndex++;
        afternoonEmp = availableEmployees[empIndex % availableEmployees.length];
      }
      newShifts.push({
        id: `r-${dateStr}-${afternoonEmp.id}-a`,
        employeeId: afternoonEmp.id,
        employeeName: afternoonEmp.fullName,
        branch: selectedBranch,
        date: dateStr,
        startTime: '14:00',
        endTime: '22:00',
        isPinned: false,
        shiftType: 'afternoon',
      });
      empIndex++;
    });

    saveShifts(newShifts);
  };

  const handleClearWeek = () => {
    if (!confirm('Xóa lịch tuần này? (Trừ ca ghim)')) return;
    const weekDates = getWeekDays().map(d => d.toISOString().split('T')[0]);
    saveShifts(shifts.filter(s =>
      s.branch !== selectedBranch || !weekDates.includes(s.date) || s.isPinned
    ));
  };

  const getShift = (employeeId: string, date: string) =>
    shifts.find(s => s.employeeId === employeeId && s.date === date && s.branch === selectedBranch);

  const getShiftColor = (template: typeof shiftTemplates[0]) => template.color;

  const availableEmployees = employees.filter(e => e.branch === selectedBranch);
  const weekDays = getWeekDays();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lịch Làm Việc</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold"
          >
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={handleRotateShifts} className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Xoay Ca
          </button>
          <button onClick={handleClearWeek} className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Xóa
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button onClick={() => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() - 7)))} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => setWeekStart(getMonday(new Date()))} className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg font-semibold hover:bg-blue-200">
          Tuần này
        </button>
        <span className="font-semibold text-gray-700">
          {weekDays[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - {weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
        </span>
        <button onClick={() => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() + 7)))} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl shadow-lg overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              <th className="border border-gray-200 p-3 bg-gray-100 min-w-[120px] text-left font-bold text-gray-700">
                Nhân Viên
              </th>
              {weekDays.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <th key={i} className={`border border-gray-200 p-2 min-w-[130px] ${isToday ? 'bg-emerald-100' : ''}`}>
                    <div className={`font-bold ${isToday ? 'text-emerald-800' : 'text-gray-700'}`}>
                      {day.toLocaleDateString('vi-VN', { weekday: 'short' })}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {day.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {availableEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 p-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {emp.photo ? (
                        <img src={emp.photo} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        emp.fullName.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800 truncate">{emp.fullName}</div>
                    </div>
                  </div>
                </td>
                {weekDays.map((day, i) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const shift = getShift(emp.id, dateStr);

                  return (
                    <td key={i} className="border border-gray-200 p-1 align-top">
                      {shift ? (
                        <div className={`relative bg-gradient-to-r ${shift.shiftType === 'morning' ? 'from-emerald-500 to-yellow-400' : shift.shiftType === 'afternoon' ? 'from-blue-400 to-cyan-400' : 'from-purple-400 to-pink-400'} text-white rounded-lg p-2 shadow-sm group`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold">
                              {shift.shiftType === 'morning' ? '🌅' : shift.shiftType === 'afternoon' ? '☀️' : '🌙'}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleTogglePin(shift.id)}
                                className={`p-1 rounded ${shift.isPinned ? 'bg-yellow-500' : 'bg-white/20 hover:bg-white/30'}`}
                                title={shift.isPinned ? 'Bỏ ghim' : 'Ghim'}
                              >
                                <Pin className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setSubstituteModal({ shift })}
                                className="p-1 bg-white/20 hover:bg-white/30 rounded"
                                title="Thay ca"
                              >
                                <Repeat className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteShift(shift.id)}
                                className="p-1 bg-red-500 rounded hover:bg-red-600"
                                title="Xóa"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs font-semibold">{shift.startTime} - {shift.endTime}</div>
                          {shift.isSubstitute && shift.originalEmployeeName && (
                            <div className="mt-1 pt-1 border-t border-white/30">
                              <div className="text-xs opacity-90">
                                <span className="font-semibold">Thay:</span> {shift.originalEmployeeName}
                              </div>
                              <button
                                onClick={() => handleCancelSubstitute(shift.id)}
                                className="mt-1 text-xs underline hover:no-underline"
                              >
                                Hủy thay ca
                              </button>
                            </div>
                          )}
                        </div>
                      ) : selectedCell?.employeeId === emp.id && selectedCell?.date === dateStr ? (
                        <div className="space-y-1">
                          {shiftTemplates.map((tpl) => (
                            <button
                              key={tpl.name}
                              onClick={() => handleAddShift(emp.id, dateStr, tpl)}
                              className={`w-full bg-gradient-to-r ${tpl.color} text-white rounded-lg p-2 text-xs font-bold hover:shadow-lg transition-all`}
                            >
                              {tpl.name}
                            </button>
                          ))}
                          <button
                            onClick={() => setSelectedCell(null)}
                            className="w-full bg-gray-200 text-gray-700 rounded-lg p-1 text-xs font-semibold hover:bg-gray-300"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedCell({ employeeId: emp.id, date: dateStr })}
                          className="w-full h-full min-h-[60px] flex items-center justify-center text-gray-300 hover:bg-green-50 hover:text-green-500 transition-colors rounded-lg"
                        >
                          <div className="text-2xl">+</div>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Substitute Modal */}
      {substituteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Chọn Nhân Viên Thay Ca</h3>

            <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Ca gốc:</span> {substituteModal.shift.isSubstitute ? substituteModal.shift.originalEmployeeName : substituteModal.shift.employeeName}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                <span className="font-semibold">Giờ:</span> {substituteModal.shift.startTime} - {substituteModal.shift.endTime}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                <span className="font-semibold">Ngày:</span> {new Date(substituteModal.shift.date).toLocaleDateString('vi-VN')}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
              {availableEmployees
                .filter(e => e.id !== (substituteModal.shift.isSubstitute ? substituteModal.shift.originalEmployeeId : substituteModal.shift.employeeId))
                .map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => handleSubstitute(emp.id)}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {emp.photo ? (
                        <img src={emp.photo} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        emp.fullName.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-800">{emp.fullName}</div>
                      <div className="text-xs text-gray-600">{emp.employeeId}</div>
                    </div>
                  </button>
                ))}
            </div>

            <button
              onClick={() => setSubstituteModal(null)}
              className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-yellow-400 rounded"></div>
          <span>🌅 Sáng 6h-14h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded"></div>
          <span>☀️ Chiều 14h-22h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded"></div>
          <span>🌙 Tối 22h-6h</span>
        </div>
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-yellow-600" />
          <span>Ca ghim</span>
        </div>
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-emerald-700" />
          <span>Thay ca</span>
        </div>
      </div>
    </div>
  );
}
