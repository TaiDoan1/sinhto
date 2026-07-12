import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Pin, RefreshCw, Trash2, Repeat } from 'lucide-react';
import { Employee } from './EmployeeRegistration';
import * as api from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';
import { useBranches } from '../../contexts/BranchContext';
import { useOrders } from '../../contexts/OrderContext';
import { useAdmin } from '../../contexts/AdminContext';

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  date: string;
  startTime: string;
  endTime: string;
  isPinned?: boolean;
  shiftType?: 'morning' | 'noon' | 'afternoon' | 'evening';
  originalEmployeeId?: string;
  originalEmployeeName?: string;
  isSubstitute?: boolean;
  status?: string;
  requestedBy?: 'admin' | 'employee';
  checkIn?: string;
  checkOut?: string;
  closingOrderCount?: number;
  closingRevenue?: number;
}

const shiftTemplates: { id: Shift['shiftType']; name: string; start: string; end: string; color: string; icon: string }[] = [
  { id: 'morning', name: '🌅 Sáng', start: '06:00', end: '12:00', color: 'from-emerald-500 to-yellow-400', icon: '🌅' },
  { id: 'noon', name: '🌤️ Trưa', start: '12:00', end: '18:00', color: 'from-amber-400 to-orange-400', icon: '🌤️' },
  { id: 'afternoon', name: '☀️ Chiều', start: '14:00', end: '20:00', color: 'from-blue-400 to-cyan-400', icon: '☀️' },
  { id: 'evening', name: '🌙 Tối', start: '18:00', end: '23:00', color: 'from-purple-400 to-pink-400', icon: '🌙' },
];

function shiftTemplateFor(shiftType?: Shift['shiftType']) {
  return shiftTemplates.find((t) => t.id === shiftType) || shiftTemplates[0];
}

export function ShiftSchedule() {
  const { adminUser } = useAdmin();
  const isStoreManager = adminUser?.position === 'store_manager';
  const { activeBranches } = useBranches();
  const branches = [
    ...(isStoreManager ? [{ id: 'ALL', name: 'Tất cả chi nhánh' }] : []),
    ...activeBranches.map((b) => ({ id: b.id, name: `${b.id} — ${b.name}` })),
  ];
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(isStoreManager ? 'ALL' : 'CN1');
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const { orders, history } = useOrders();
  const shiftStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const o of [...orders, ...history]) {
      if (!o.shiftId) continue;
      const stat = map.get(o.shiftId) || { count: 0, total: 0 };
      stat.count += 1;
      stat.total += o.total || 0;
      map.set(o.shiftId, stat);
    }
    return map;
  }, [orders, history]);
  const [selectedCell, setSelectedCell] = useState<{employeeId: string, date: string} | null>(null);
  const [substituteModal, setSubstituteModal] = useState<{shift: Shift} | null>(null);

  const { subscribe } = useSSE();

  useEffect(() => {
    const loadEmployees = () => {
      api.fetchEmployees()
        .then(data => setEmployees(data))
        .catch(err => console.error('Failed to load employees:', err));
    };

    loadEmployees();

    api.fetchShifts()
      .then(data => setShifts(data))
      .catch(err => console.error('Failed to load shifts:', err));

    const unsubCreate = subscribe('SHIFT_CREATED', (data) => {
      setShifts(prev => {
        if (prev.some(s => s.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    const unsubUpdate = subscribe('SHIFT_UPDATED', (data) => {
      setShifts(prev => prev.map(s => s.id === data.id ? data : s));
    });

    const unsubDelete = subscribe('SHIFT_DELETED', (data) => {
      setShifts(prev => prev.filter(s => s.id !== data.id));
    });

    const unsubEmpCreate = subscribe('EMPLOYEE_CREATED', () => loadEmployees());
    const unsubEmpUpdate = subscribe('EMPLOYEE_UPDATED', () => loadEmployees());
    const unsubEmpDelete = subscribe('EMPLOYEE_DELETED', () => loadEmployees());

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
      unsubEmpCreate();
      unsubEmpUpdate();
      unsubEmpDelete();
    };
  }, [subscribe]);

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const handleAddShift = async (employeeId: string, date: string, template: typeof shiftTemplates[0]) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const newShift: Shift = {
      id: Date.now().toString(),
      employeeId: employee.id,
      employeeName: employee.fullName,
      branch: shiftBranch || employee.branch,
      date,
      startTime: template.start,
      endTime: template.end,
      isPinned: false,
      shiftType: template.id,
      status: 'scheduled',
      requestedBy: 'admin',
    };

    try {
      const saved = await api.saveShift(newShift);
      setShifts(prev => (prev.some(s => s.id === saved.id) ? prev : [...prev, saved]));
      setSelectedCell(null);
    } catch (err) {
      console.error('Failed to add shift:', err);
      alert('Lỗi lưu ca làm việc.');
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await api.deleteShift(id);
    } catch (err) {
      console.error('Failed to delete shift:', err);
      alert('Lỗi xóa ca làm việc.');
    }
  };

  const handleTogglePin = async (id: string) => {
    const shift = shifts.find(s => s.id === id);
    if (!shift) return;
    try {
      await api.saveShift({ ...shift, isPinned: !shift.isPinned });
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleSubstitute = async (substituteEmployeeId: string) => {
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

    try {
      await api.saveShift(updatedShift);
      setSubstituteModal(null);
    } catch (err) {
      console.error('Failed to update substitute:', err);
      alert('Lỗi thay ca.');
    }
  };

  const handleCancelSubstitute = async (shiftId: string) => {
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

    try {
      await api.saveShift(restoredShift);
    } catch (err) {
      console.error('Failed to cancel substitute:', err);
    }
  };

  const handleRotateShifts = async () => {
    if (selectedBranch === 'ALL') {
      alert('Chọn một chi nhánh cụ thể để xoay ca tự động.');
      return;
    }
    if (!confirm('Xoay ca tự động? (Ca đã ghim sẽ giữ nguyên)')) return;

    const weekDays = getWeekDays();
    const availableEmployees = employees.filter(e => e.branch === selectedBranch);
    if (availableEmployees.length === 0) return;

    const weekDates = weekDays.map(d => d.toISOString().split('T')[0]);
    const otherShifts = shifts.filter(s =>
      s.branch !== selectedBranch || !weekDates.includes(s.date) || s.isPinned
    );

    // Filter out shifts that will be replaced
    const shiftsToKeep = otherShifts;
    
    // We will save new shifts to database
    let empIndex = 0;
    try {
      // First clean up unpinned shifts for this week on this branch
      const unpinnedThisWeek = shifts.filter(s =>
        s.branch === selectedBranch && weekDates.includes(s.date) && !s.isPinned
      );
      for (const sh of unpinnedThisWeek) {
        await api.deleteShift(sh.id);
      }

      // Create new shifts
      for (const day of weekDays) {
        const dateStr = day.toISOString().split('T')[0];
        const pinnedIds = shiftsToKeep.filter(s => s.date === dateStr).map(s => s.employeeId);

        for (const tpl of shiftTemplates) {
          let emp = availableEmployees[empIndex % availableEmployees.length];
          while (pinnedIds.includes(emp.id)) {
            empIndex++;
            emp = availableEmployees[empIndex % availableEmployees.length];
          }
          await api.saveShift({
            id: `r-${dateStr}-${emp.id}-${tpl.id}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            branch: selectedBranch,
            date: dateStr,
            startTime: tpl.start,
            endTime: tpl.end,
            isPinned: false,
            shiftType: tpl.id,
            status: 'scheduled',
            requestedBy: 'admin',
          });
          empIndex++;
        }
      }
    } catch (err) {
      console.error('Failed during auto shift rotation:', err);
      alert('Lỗi khi xoay ca tự động.');
    }
  };

  const handleClearWeek = async () => {
    if (selectedBranch === 'ALL') {
      alert('Chọn một chi nhánh cụ thể để xóa lịch tuần.');
      return;
    }
    if (!confirm('Xóa lịch tuần này? (Trừ ca ghim)')) return;
    const weekDates = getWeekDays().map(d => d.toISOString().split('T')[0]);
    const toDelete = shifts.filter(s =>
      s.branch === selectedBranch && weekDates.includes(s.date) && !s.isPinned
    );
    try {
      for (const sh of toDelete) {
        await api.deleteShift(sh.id);
      }
    } catch (err) {
      console.error('Failed to clear week shifts:', err);
      alert('Lỗi khi xóa lịch tuần.');
    }
  };

  const getShiftsForCell = (employeeId: string, date: string) =>
    shifts
      .filter(s =>
        s.employeeId === employeeId && s.date === date &&
        (shiftBranch ? s.branch === shiftBranch : true) &&
        s.status !== 'pending' && s.status !== 'rejected'
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const pendingShifts = shifts.filter(s => s.status === 'pending');

  const handleApproveShift = async (shift: Shift) => {
    try {
      await api.saveShift({ ...shift, status: 'scheduled' });
    } catch (err) {
      console.error('Failed to approve shift:', err);
      alert('Lỗi duyệt ca');
    }
  };

  const handleRejectShift = async (shift: Shift) => {
    try {
      await api.saveShift({ ...shift, status: 'rejected' });
    } catch (err) {
      console.error('Failed to reject shift:', err);
      alert('Lỗi từ chối ca');
    }
  };

  const getShiftColor = (template: typeof shiftTemplates[0]) => template.color;

  const availableEmployees = selectedBranch === 'ALL'
    ? [...employees].sort((a, b) => a.branch.localeCompare(b.branch) || a.fullName.localeCompare(b.fullName))
    : employees
        .filter(e => e.branch === selectedBranch || (e.secondaryBranches || []).includes(selectedBranch))
        .sort((a, b) => (a.branch === selectedBranch ? 0 : 1) - (b.branch === selectedBranch ? 0 : 1));
  const weekDays = getWeekDays();
  const shiftBranch = selectedBranch === 'ALL' ? null : selectedBranch;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lịch Làm Việc</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedBranch === 'ALL'
              ? `Hiển thị ${availableEmployees.length}/${employees.length} nhân viên (tất cả chi nhánh)`
              : `Hiển thị ${availableEmployees.length} nhân viên · ${branches.find(b => b.id === selectedBranch)?.name}`}
          </p>
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

      {/* Pending shift requests */}
      {pendingShifts.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 mb-3">Yêu cầu đăng ký lịch ({pendingShifts.length})</h3>
          <div className="space-y-2">
            {pendingShifts.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-amber-100">
                <div>
                  <span className="font-semibold text-gray-800">{s.employeeName}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    {new Date(s.date).toLocaleDateString('vi-VN')} · {s.startTime}–{s.endTime}
                  </span>
                  {s.branch && <span className="text-xs text-gray-400 ml-2">({s.branch})</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveShift(s)}
                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg"
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => handleRejectShift(s)}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold rounded-lg"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {availableEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-500">
                  <p className="font-medium">Chưa có nhân viên tại chi nhánh này</p>
                  <p className="text-sm mt-1">Đăng ký nhân viên mới hoặc chọn chi nhánh khác</p>
                </td>
              </tr>
            ) : availableEmployees.map((emp) => (
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
                      {selectedBranch === 'ALL' && (
                        <div className="text-xs text-gray-500">{emp.branch}</div>
                      )}
                      {selectedBranch !== 'ALL' && emp.branch !== selectedBranch && (
                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700">
                          Hỗ trợ từ {emp.branch || 'chưa gán CN'}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                {weekDays.map((day, i) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const dayShifts = getShiftsForCell(emp.id, dateStr);
                  const isPicking = selectedCell?.employeeId === emp.id && selectedCell?.date === dateStr;

                  return (
                    <td key={i} className="border border-gray-200 p-1 align-top">
                      <div className="space-y-1">
                        {dayShifts.map((shift) => (
                          <div key={shift.id} className={`relative bg-gradient-to-r ${shiftTemplateFor(shift.shiftType).color} text-white rounded-lg p-2 shadow-sm group`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold">
                                {shiftTemplateFor(shift.shiftType).icon}
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
                            {(() => {
                              const hasClosingSnapshot =
                                shift.status === 'completed' && shift.closingOrderCount != null;
                              const stat = hasClosingSnapshot
                                ? { count: shift.closingOrderCount!, total: shift.closingRevenue || 0 }
                                : shiftStats.get(shift.id);
                              if (!stat || (shift.status !== 'in_progress' && shift.status !== 'completed')) return null;
                              return (
                                <div className="mt-1 text-[11px] bg-white/20 rounded px-1.5 py-0.5 inline-block">
                                  {stat.count} đơn · {stat.total.toLocaleString('vi-VN')}đ
                                </div>
                              );
                            })()}
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
                        ))}

                        {isPicking ? (
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
                            className={`w-full flex items-center justify-center text-gray-300 hover:bg-green-50 hover:text-green-500 transition-colors rounded-lg ${dayShifts.length === 0 ? 'min-h-[60px]' : 'py-1'}`}
                            title="Thêm ca"
                          >
                            <div className={dayShifts.length === 0 ? 'text-2xl' : 'text-sm'}>+</div>
                          </button>
                        )}
                      </div>
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
