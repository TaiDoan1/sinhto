import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Pin, RefreshCw, Trash2, Repeat, CalendarOff, Plus, Clock, Pencil } from 'lucide-react';
import { Employee } from './EmployeeRegistration';
import * as api from '../../utils/api';
import { dedupeShiftsBySlot } from '../../utils/shiftDedup';
import { useSSE } from '../../contexts/SSEContext';
import { useBranches } from '../../contexts/BranchContext';
import { useOrders } from '../../contexts/OrderContext';
import { useAdmin } from '../../contexts/AdminContext';
import { localDateStr, parseLocalDateStr } from '../../utils/dateUtils';

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  date: string;
  startTime: string;
  endTime: string;
  isPinned?: boolean;
  shiftType?: 'morning' | 'noon' | 'afternoon' | 'evening' | 'block_8_13' | 'block_13_18' | 'block_18_22' | 'custom' | 'off';
  originalEmployeeId?: string;
  originalEmployeeName?: string;
  isSubstitute?: boolean;
  status?: string;
  requestedBy?: 'admin' | 'employee';
  checkIn?: string;
  checkOut?: string;
  closingOrderCount?: number;
  closingRevenue?: number;
  reason?: string;
  startCash?: number;
  endCashActual?: number;
}

// Quick-pick: chỉ giữ 4 ca quen thuộc nhất. Mọi khung giờ khác (kể cả 08-13/13-18/18-22)
// dùng ô chọn giờ tự do bên dưới — tránh phải thêm nút cứng mỗi khi có giờ mới.
const shiftTemplates: { id: Shift['shiftType']; name: string; start: string; end: string; color: string; icon: string }[] = [
  { id: 'morning', name: '🌅 Sáng', start: '06:00', end: '12:00', color: 'from-emerald-500 to-yellow-400', icon: '🌅' },
  { id: 'noon', name: '🌤️ Trưa', start: '12:00', end: '18:00', color: 'from-amber-400 to-orange-400', icon: '🌤️' },
  { id: 'afternoon', name: '☀️ Chiều', start: '14:00', end: '20:00', color: 'from-blue-400 to-cyan-400', icon: '☀️' },
  { id: 'evening', name: '🌙 Tối', start: '18:00', end: '23:00', color: 'from-purple-400 to-pink-400', icon: '🌙' },
];

// Không phải quick-pick — chỉ dùng để tra icon/màu khi render ca đã tạo bằng giờ tự do
// (kể cả ca cũ có shiftType block_8_13/13_18/18_22 từ trước khi đổi sang UI này).
const customTemplateFallback = { id: 'custom' as const, name: '⏱️ Tùy chỉnh', start: '', end: '', color: 'from-slate-500 to-slate-400', icon: '⏱️' };
const offTemplate = { id: 'off' as const, name: 'Nghỉ', start: '', end: '', color: 'from-red-600 to-red-500', icon: '' };
const legacyBlockTemplates: Record<string, { color: string; icon: string }> = {
  block_8_13: { color: 'from-teal-500 to-emerald-400', icon: '🕗' },
  block_13_18: { color: 'from-orange-500 to-amber-400', icon: '🕐' },
  block_18_22: { color: 'from-indigo-500 to-purple-400', icon: '🕕' },
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Khớp đúng logic chống trùng ca ở backend (findConflictingShift/timeRangesOverlap trong
// backend/index.js) — xử lý cả ca qua đêm (VD 23:00-08:00) để không báo sai.
function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  let a1 = timeToMinutes(startA);
  let a2 = timeToMinutes(endA);
  let b1 = timeToMinutes(startB);
  let b2 = timeToMinutes(endB);
  if (a2 <= a1) a2 += 24 * 60;
  if (b2 <= b1) b2 += 24 * 60;
  return a1 < b2 && b1 < a2;
}

function shiftTemplateFor(shiftType?: Shift['shiftType']) {
  const known = shiftTemplates.find((t) => t.id === shiftType);
  if (known) return known;
  if (shiftType === 'off') return offTemplate;
  if (shiftType && legacyBlockTemplates[shiftType]) {
    return { ...customTemplateFallback, ...legacyBlockTemplates[shiftType] };
  }
  if (shiftType === 'custom') return customTemplateFallback;
  return shiftTemplates[0];
}

interface ShiftScheduleProps {
  /** Chỉ xem lịch làm — ẩn hết Duyệt/Từ chối, Thêm ca, Ghim/Thay ca/Xóa, Xoay Ca, Xóa lịch tuần.
   * Dùng cho màn hình Nhân Sự thu gọn (không được sửa lịch, chỉ xem để tính công/lương). */
  readOnly?: boolean;
}

export function ShiftSchedule({ readOnly = false }: ShiftScheduleProps = {}) {
  const { adminUser } = useAdmin();
  const isStoreManager = adminUser?.position === 'store_manager';
  const { activeBranches, branchLabel } = useBranches();
  const branches = [
    ...(isStoreManager ? [{ id: 'ALL', name: 'Tất cả chi nhánh' }] : []),
    ...activeBranches.map((b) => ({ id: b.id, name: b.name })),
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
  const [customStart, setCustomStart] = useState('08:00');
  const [customEnd, setCustomEnd] = useState('17:00');
  const [substituteModal, setSubstituteModal] = useState<{shift: Shift} | null>(null);
  // Sửa giờ ca đã tạo (giữ nguyên check-in/ảnh chấm công — không xóa tạo lại làm mất lịch sử).
  const [editTimeModal, setEditTimeModal] = useState<{shift: Shift} | null>(null);
  const [editStart, setEditStart] = useState('08:00');
  const [editEnd, setEditEnd] = useState('17:00');
  const [editTimeSaving, setEditTimeSaving] = useState(false);
  // Ngày đang chọn ở bản chỉnh sửa trên điện thoại (0=Thứ 2 … 6=CN). Mặc định hôm nay.
  const [mobileDay, setMobileDay] = useState<number>(() => (new Date().getDay() + 6) % 7);

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

  const handleAddShift = async (employeeId: string, date: string, startTime: string, endTime: string, shiftType: Shift['shiftType']) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    // Ở chế độ "Tất cả chi nhánh" không biết ca thuộc chi nhánh nào → nếu để mặc định chi nhánh
    // nhà của nhân viên sẽ gán SAI cho người làm hỗ trợ chi nhánh khác. Bắt buộc chọn 1 chi nhánh
    // cụ thể trước khi thêm ca, để chi nhánh của ca luôn đúng.
    if (!shiftBranch) {
      alert('Vui lòng chọn 1 chi nhánh cụ thể (không phải "Tất cả chi nhánh") trước khi thêm ca — để ca được gán đúng chi nhánh.');
      return;
    }

    const newShift: Shift = {
      id: Date.now().toString(),
      employeeId: employee.id,
      employeeName: employee.fullName,
      branch: shiftBranch,
      date,
      startTime,
      endTime,
      isPinned: false,
      shiftType,
      status: 'scheduled',
      requestedBy: 'admin',
    };

    try {
      const saved = await api.saveShift(newShift);
      setShifts(prev => (prev.some(s => s.id === saved.id) ? prev : [...prev, saved]));
      setSelectedCell(null);
    } catch (err) {
      console.error('Failed to add shift:', err);
      alert(err instanceof Error ? err.message : 'Lỗi lưu ca làm việc.');
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await api.deleteShift(id);
      // Cập nhật NGAY tại máy này (không chờ sự kiện SSE) — quán mạng yếu SSE hay rớt, nếu chỉ
      // dựa vào SHIFT_DELETED thì ca đã xóa vẫn "ma" trên màn hình và tiếp tục chặn giờ (báo
      // trùng dù DB đã xóa). Xóa optimistic cho khớp cách handleAddShift đã làm.
      setShifts(prev => prev.filter(s => s.id !== id));
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

  // CHT/Admin thêm giờ tăng ca (OT) cho 1 ca ngay trên LỊCH.
  const [otModalShift, setOtModalShift] = useState<Shift | null>(null);
  const [otModalHours, setOtModalHours] = useState('');
  const [otModalReason, setOtModalReason] = useState('');
  const [otModalSaving, setOtModalSaving] = useState(false);
  const openOtModal = (shift: Shift) => {
    setOtModalShift(shift);
    setOtModalHours((shift as any).overtimeHours ? String((shift as any).overtimeHours) : '');
    setOtModalReason((shift as any).overtimeReason || '');
  };
  const saveOtModal = async () => {
    if (!otModalShift) return;
    const h = Number(otModalHours);
    if (!(h > 0)) { alert('Nhập số giờ OT (VD 2)'); return; }
    setOtModalSaving(true);
    try {
      const updated = await api.shiftOvertime(otModalShift.id, 'approve', { hours: h, reason: otModalReason.trim() || 'Cửa hàng trưởng thêm' });
      setShifts(prev => prev.map(s => s.id === otModalShift.id ? { ...s, ...updated } : s));
      setOtModalShift(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thêm được giờ OT');
    } finally {
      setOtModalSaving(false);
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
      alert(err instanceof Error ? err.message : 'Lỗi thay ca.');
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

  const openEditTime = (shift: Shift) => {
    setEditStart(shift.startTime || '08:00');
    setEditEnd(shift.endTime || '17:00');
    setEditTimeModal({ shift });
  };

  // Sửa GIỜ ca đã tạo tại chỗ (giữ nguyên check-in/ảnh/đơn) — thay cho cách xóa+thêm lại làm mất
  // lịch sử chấm công.
  const handleSaveEditTime = async () => {
    if (!editTimeModal) return;
    const shift = editTimeModal.shift;
    if (!editStart || !editEnd) { alert('Nhập giờ vào ca và giờ kết ca'); return; }
    if (editStart === shift.startTime && editEnd === shift.endTime) { setEditTimeModal(null); return; }
    const conflict = findTimeConflict(shift.employeeId, shift.date, editStart, editEnd, shift.id);
    if (conflict) {
      alert(`${shift.employeeName} đã có ca ${conflict.startTime}-${conflict.endTime}${conflict.branch ? ` tại ${branchLabel(conflict.branch)}` : ''} cùng ngày — không thể sửa trùng giờ.`);
      return;
    }
    setEditTimeSaving(true);
    try {
      // Gửi FULL shift (kèm checkIn/checkOut/ảnh) → backend giữ nguyên chấm công, chỉ đổi giờ.
      const saved = await api.saveShift({ ...shift, startTime: editStart, endTime: editEnd });
      setShifts(prev => prev.map(s => (s.id === shift.id ? { ...s, ...saved } : s)));
      setEditTimeModal(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi sửa giờ ca.');
    } finally {
      setEditTimeSaving(false);
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

    const weekDates = weekDays.map(d => localDateStr(d));
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
        const dateStr = localDateStr(day);
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
    const weekDates = getWeekDays().map(d => localDateStr(d));
    const toDelete = shifts.filter(s =>
      s.branch === selectedBranch && weekDates.includes(s.date) && !s.isPinned
    );
    try {
      const deletedIds: string[] = [];
      for (const sh of toDelete) {
        await api.deleteShift(sh.id);
        deletedIds.push(sh.id);
      }
      // Cập nhật ngay tại máy (không chờ SSE) để tránh ca "ma" còn chặn giờ khi mạng yếu.
      setShifts(prev => prev.filter(s => !deletedIds.includes(s.id)));
    } catch (err) {
      console.error('Failed to clear week shifts:', err);
      alert('Lỗi khi xóa lịch tuần.');
    }
  };

  // Gộp ca TRÙNG HỆT khi hiển thị — CHỈ ẩn ca rỗng thật sự, không bao giờ giấu ca có đơn/ảnh/đang chạy.
  const getShiftsForCell = (employeeId: string, date: string) =>
    dedupeShiftsBySlot(
      shifts.filter(s =>
        s.employeeId === employeeId && s.date === date &&
        (shiftBranch ? s.branch === shiftBranch : true) &&
        s.status !== 'pending' && s.status !== 'rejected'
      )
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Lịch của nhân viên tại các chi nhánh KHÁC — chỉ để xem (không sửa được ở đây), giúp
  // admin thấy ngay nhân viên hỗ trợ đã bận ngày nào bên chi nhánh kia mà không cần đổi
  // dropdown chi nhánh qua lại.
  const getOtherBranchShiftsForCell = (employeeId: string, date: string) =>
    shiftBranch
      ? shifts
          .filter(s =>
            s.employeeId === employeeId && s.date === date &&
            s.branch !== shiftBranch &&
            s.status !== 'pending' && s.status !== 'rejected'
          )
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
      : [];

  // Toàn bộ ca của nhân viên ngày đó ở BẤT KỲ chi nhánh nào — dùng để chặn chọn giờ trùng
  // ngay trên UI, khớp đúng phạm vi kiểm tra trùng giờ mà backend đã áp dụng khi lưu.
  const getShiftsForConflictCheck = (employeeId: string, date: string, excludeShiftId?: string) =>
    shifts.filter(s =>
      s.employeeId === employeeId && s.date === date &&
      s.id !== excludeShiftId &&
      // Loại 'pending' (đơn XIN lịch chưa duyệt) — khớp backend findConflictingShift. Đơn chờ
      // duyệt không chiếm chỗ; nếu trùng thật thì lúc bấm Duyệt backend sẽ chặn.
      s.status !== 'rejected' && s.status !== 'cancelled' && s.status !== 'pending'
    );

  const findTimeConflict = (employeeId: string, date: string, startTime: string, endTime: string, excludeShiftId?: string) =>
    getShiftsForConflictCheck(employeeId, date, excludeShiftId).find(s =>
      timeRangesOverlap(startTime, endTime, s.startTime, s.endTime)
    ) || null;

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
    ? [...employees].sort((a, b) => (a.branch || '').localeCompare(b.branch || '') || (a.fullName || '').localeCompare(b.fullName || ''))
    : employees
        .filter(e => e.branch === selectedBranch || (e.secondaryBranches || []).includes(selectedBranch))
        .sort((a, b) => (a.branch === selectedBranch ? 0 : 1) - (b.branch === selectedBranch ? 0 : 1));
  const weekDays = getWeekDays();
  const shiftBranch = selectedBranch === 'ALL' ? null : selectedBranch;

  // Danh sách lịch gộp theo ngày (mỗi ngày → ai làm ca nào) — chỉ dùng cho bản xem trên điện
  // thoại ở chế độ readOnly, cùng kiểu trình bày với "Lịch cả chi nhánh" bên app Nhân Viên để
  // Nhân Sự thấy quen mắt, dễ dùng hơn bảng lưới vốn phải cuộn ngang rất khó xem trên màn nhỏ.
  const mobileScheduleByDay = weekDays.map((day) => {
    const dateStr = localDateStr(day);
    const entries = availableEmployees.flatMap((emp) =>
      getShiftsForCell(emp.id, dateStr).map((shift) => ({ emp, shift }))
    );
    return { day, dateStr, entries };
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Lịch Làm Việc</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedBranch === 'ALL'
              ? `Hiển thị ${availableEmployees.length}/${employees.length} nhân viên (tất cả chi nhánh)`
              : `Hiển thị ${availableEmployees.length} nhân viên · ${branches.find(b => b.id === selectedBranch)?.name}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="flex-1 sm:flex-none min-w-[140px] px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold"
          >
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {!readOnly && (
            <>
              <button onClick={handleRotateShifts} className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Xoay Ca
              </button>
              <button onClick={handleClearWeek} className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Xóa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pending shift requests — chỉ Admin/Cửa hàng trưởng mới thấy và duyệt được, Nhân Sự chỉ xem lịch nên ẩn hẳn mục này */}
      {!readOnly && pendingShifts.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 mb-3">Yêu cầu đăng ký lịch ({pendingShifts.length})</h3>
          <div className="space-y-2">
            {pendingShifts.map(s => (
              <div key={s.id} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${s.shiftType === 'off' ? 'bg-red-50 border-red-200' : 'bg-white border-amber-100'}`}>
                <div>
                  <span className="font-semibold text-gray-800">{s.employeeName}</span>
                  {s.shiftType === 'off' ? (
                    <span className="text-red-700 text-sm ml-2 font-semibold inline-flex items-center gap-1">
                      <CalendarOff className="w-3.5 h-3.5" />
                      Xin nghỉ {parseLocalDateStr(s.date).toLocaleDateString('vi-VN')}
                      {s.reason ? ` — ${s.reason}` : ''}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm ml-2">
                      {parseLocalDateStr(s.date).toLocaleDateString('vi-VN')} · {s.startTime}–{s.endTime}
                    </span>
                  )}
                  {s.branch && <span className="text-xs text-gray-400 ml-2">({branchLabel(s.branch)})</span>}
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

      {/* Duyệt làm thêm giờ (OT) đã chuyển sang trang Nhân Sự & Lương — không duyệt ở màn Lịch nữa. */}

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

      {/* Bản CHỈNH SỬA trên điện thoại (không readOnly) — chọn 1 ngày rồi thêm/xóa ca cho từng
          nhân viên theo chiều dọc, khỏi cuộn ngang bảng lưới. Dùng lại toàn bộ handler & modal. */}
      {!readOnly && (
        <div className="sm:hidden pb-4">
          {/* Chọn ngày trong tuần */}
          <div className="flex gap-1.5 mb-3">
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const active = i === mobileDay;
              return (
                <button
                  key={i}
                  onClick={() => setMobileDay(i)}
                  className={`flex-1 rounded-xl py-2 px-0.5 text-center transition-colors ${
                    active
                      ? 'bg-emerald-600 text-white shadow'
                      : isToday
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase leading-none">
                    {day.toLocaleDateString('vi-VN', { weekday: 'short' })}
                  </div>
                  <div className="text-[15px] font-black mt-0.5 leading-none">{day.getDate()}</div>
                </button>
              );
            })}
          </div>

          {(() => {
            const day = weekDays[mobileDay];
            const dateStr = localDateStr(day);
            if (availableEmployees.length === 0) {
              return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center text-gray-400 text-sm">
                  Chưa có nhân viên tại chi nhánh này
                </div>
              );
            }
            return (
              <div className="space-y-2">
                {availableEmployees.map((emp) => {
                  const dayShifts = getShiftsForCell(emp.id, dateStr);
                  const otherShifts = getOtherBranchShiftsForCell(emp.id, dateStr);
                  return (
                    <div key={emp.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
                          {emp.photo ? (
                            <img src={emp.photo} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            emp.fullName.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm text-gray-800 truncate">{emp.fullName}</div>
                          {selectedBranch === 'ALL' && (
                            <div className="text-[11px] text-gray-500">{branchLabel(emp.branch)}</div>
                          )}
                          {selectedBranch !== 'ALL' && emp.branch !== selectedBranch && (
                            <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700">
                              Hỗ trợ từ {emp.branch ? branchLabel(emp.branch) : 'chưa gán chi nhánh'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {dayShifts.map((shift) => (
                          <div
                            key={shift.id}
                            className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 bg-gradient-to-r ${shiftTemplateFor(shift.shiftType).color} text-white`}
                          >
                            <div className="min-w-0">
                              <span className="text-sm font-semibold">
                                {shift.shiftType === 'off' ? 'Nghỉ cả ngày' : `${shift.startTime} – ${shift.endTime}`}
                              </span>
                              {shift.isSubstitute && shift.originalEmployeeName && (
                                <span className="block text-[11px] opacity-90">Thay: {shift.originalEmployeeName}</span>
                              )}
                              {(shift as any).overtimeStatus === 'approved' && (shift as any).overtimeHours > 0 && (
                                <span className="block text-[11px] font-bold opacity-95">⏰ OT +{(shift as any).overtimeHours}h</span>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {shift.shiftType !== 'off' && (
                                <button
                                  onClick={() => openOtModal(shift)}
                                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded"
                                  title="Thêm giờ tăng ca (OT)"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {shift.shiftType !== 'off' && (
                                <button
                                  onClick={() => openEditTime(shift)}
                                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded"
                                  title="Sửa giờ ca (giữ check-in)"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleTogglePin(shift.id)}
                                className={`p-1.5 rounded ${shift.isPinned ? 'bg-yellow-500' : 'bg-white/20 hover:bg-white/30'}`}
                                title={shift.isPinned ? 'Bỏ ghim' : 'Ghim'}
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSubstituteModal({ shift })}
                                className="p-1.5 bg-white/20 hover:bg-white/30 rounded"
                                title="Thay ca"
                              >
                                <Repeat className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteShift(shift.id)}
                                className="p-1.5 bg-red-500 rounded hover:bg-red-600"
                                title="Xóa"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {otherShifts.map((s) => (
                          <div
                            key={s.id}
                            className="text-[11px] bg-gray-100 text-gray-500 border border-dashed border-gray-300 rounded-lg px-2 py-1"
                            title={`${emp.fullName} đã có lịch tại ${branchLabel(s.branch)}`}
                          >
                            <span className="font-bold">{branchLabel(s.branch)}</span>{' '}
                            {s.shiftType === 'off' ? 'Nghỉ' : `${s.startTime}-${s.endTime}`}
                          </div>
                        ))}

                        <button
                          onClick={() => { setSelectedCell({ employeeId: emp.id, date: dateStr }); setCustomStart('08:00'); setCustomEnd('17:00'); }}
                          className="w-full flex items-center justify-center gap-1 text-emerald-600 border-2 border-dashed border-emerald-200 rounded-lg py-2 text-sm font-semibold hover:bg-emerald-50 active:scale-[0.99] transition-all"
                        >
                          <Plus className="w-4 h-4" /> Thêm ca
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Bản xem thẻ theo ngày trên điện thoại (chỉ chế độ readOnly) — cùng kiểu "Lịch cả chi
          nhánh" bên app Nhân Viên, đỡ phải cuộn ngang như bảng lưới. */}
      {readOnly && (
        <div className="sm:hidden space-y-4 pb-4">
          {mobileScheduleByDay.every(d => d.entries.length === 0) ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center text-gray-400 text-sm">
              Chưa có ca làm nào trong tuần này
            </div>
          ) : (
            mobileScheduleByDay.map(({ day, dateStr, entries }) => {
              if (entries.length === 0) return null;
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={dateStr} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${isToday ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {day.toLocaleDateString('vi-VN', { weekday: 'long' })} · {day.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    {isToday ? ' · Hôm nay' : ''}
                  </div>
                  <div className="space-y-1.5">
                    {entries.map(({ emp, shift }) => {
                      const isOff = shift.shiftType === 'off';
                      return (
                        <div
                          key={shift.id}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-lg ${isOff ? 'bg-red-50' : 'bg-gray-50'}`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-gray-800 text-sm truncate block">
                              {emp.fullName}
                            </span>
                            {selectedBranch === 'ALL' && shift.branch && (
                              <span className="text-[11px] text-emerald-700 font-semibold">{branchLabel(shift.branch)}</span>
                            )}
                            {shift.isSubstitute && shift.originalEmployeeName && (
                              <span className="text-[11px] text-sky-700 font-semibold block">
                                Thay: {shift.originalEmployeeName}
                              </span>
                            )}
                          </div>
                          {isOff ? (
                            <span className="text-xs font-semibold text-red-600 flex items-center gap-1 flex-shrink-0">
                              <CalendarOff className="w-3.5 h-3.5" />
                              Nghỉ
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                              {shift.startTime}–{shift.endTime}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Table — chỉ hiện từ tablet trở lên; điện thoại dùng bản thẻ ở trên */}
      <div className="flex-1 bg-white rounded-xl shadow-lg overflow-auto hidden sm:block">
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
                        <div className="text-xs text-gray-500">{branchLabel(emp.branch)}</div>
                      )}
                      {selectedBranch !== 'ALL' && emp.branch !== selectedBranch && (
                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700">
                          Hỗ trợ từ {emp.branch ? branchLabel(emp.branch) : 'chưa gán chi nhánh'}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                {weekDays.map((day, i) => {
                  const dateStr = localDateStr(day);
                  const dayShifts = getShiftsForCell(emp.id, dateStr);
                  const isPicking = selectedCell?.employeeId === emp.id && selectedCell?.date === dateStr;

                  return (
                    <td key={i} className="border border-gray-200 p-1 align-top">
                      <div className="space-y-1">
                        {dayShifts.map((shift) => (
                          <div key={shift.id} className={`relative bg-gradient-to-r ${shiftTemplateFor(shift.shiftType).color} text-white rounded-lg p-2 shadow-sm group`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold">
                                {shift.shiftType === 'off' ? <CalendarOff className="w-3.5 h-3.5" /> : shiftTemplateFor(shift.shiftType).icon}
                              </span>
                              {!readOnly && (
                                <div className="flex gap-1">
                                  {shift.shiftType !== 'off' && (
                                    <button
                                      onClick={() => openOtModal(shift)}
                                      className="p-1 bg-white/20 hover:bg-white/30 rounded"
                                      title="Thêm giờ tăng ca (OT)"
                                    >
                                      <Clock className="w-3 h-3" />
                                    </button>
                                  )}
                                  {shift.shiftType !== 'off' && (
                                    <button
                                      onClick={() => openEditTime(shift)}
                                      className="p-1 bg-white/20 hover:bg-white/30 rounded"
                                      title="Sửa giờ ca (giữ check-in)"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
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
                              )}
                            </div>
                            <div className="text-xs font-semibold">
                              {shift.shiftType === 'off' ? 'Nghỉ' : `${shift.startTime} - ${shift.endTime}`}
                            </div>
                            {(shift as any).overtimeStatus === 'approved' && (shift as any).overtimeHours > 0 && (
                              <div className="mt-0.5 text-[10px] font-bold bg-orange-500/90 rounded px-1.5 py-0.5 inline-block">⏰ OT +{(shift as any).overtimeHours}h</div>
                            )}
                            {shift.shiftType === 'off' && shift.reason && (
                              <div className="text-[10px] opacity-90 mt-0.5 line-clamp-2">{shift.reason}</div>
                            )}
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
                                {!readOnly && (
                                  <button
                                    onClick={() => handleCancelSubstitute(shift.id)}
                                    className="mt-1 text-xs underline hover:no-underline"
                                  >
                                    Hủy thay ca
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {getOtherBranchShiftsForCell(emp.id, dateStr).map((s) => (
                          <div
                            key={s.id}
                            className="text-[10px] leading-tight bg-gray-100 text-gray-500 border border-dashed border-gray-300 rounded-lg px-1.5 py-1"
                            title={`${emp.fullName} đã có lịch tại ${branchLabel(s.branch)}`}
                          >
                            <span className="font-bold">{branchLabel(s.branch)}</span>{' '}
                            {s.shiftType === 'off' ? 'Nghỉ' : `${s.startTime}-${s.endTime}`}
                          </div>
                        ))}

                        {!readOnly && (
                          <button
                            onClick={() => { setSelectedCell({ employeeId: emp.id, date: dateStr }); setCustomStart('08:00'); setCustomEnd('17:00'); }}
                            className={`w-full flex items-center justify-center text-gray-300 hover:bg-green-50 hover:text-green-500 transition-colors rounded-lg ${dayShifts.length === 0 && !isPicking ? 'min-h-[60px]' : 'py-1'}`}
                            title="Thêm ca"
                          >
                            <div className={dayShifts.length === 0 && !isPicking ? 'text-2xl' : 'text-sm'}>+</div>
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

      {/* Add Shift Modal */}
      {selectedCell && (() => {
        const emp = employees.find(e => e.id === selectedCell.employeeId);
        if (!emp) return null;
        const dayConflicts = getShiftsForConflictCheck(selectedCell.employeeId, selectedCell.date);
        const customConflict = customStart && customEnd
          ? findTimeConflict(selectedCell.employeeId, selectedCell.date, customStart, customEnd)
          : null;
        const conflictLabel = (c: Shift) =>
          `Trùng giờ ca ${c.startTime}-${c.endTime}${c.branch ? ` tại ${branchLabel(c.branch)}` : ''}`;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-800">Thêm ca làm việc</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {emp.fullName} · {parseLocalDateStr(selectedCell.date).toLocaleDateString('vi-VN')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {shiftTemplates.map((tpl) => {
                  const conflict = findTimeConflict(selectedCell.employeeId, selectedCell.date, tpl.start, tpl.end);
                  return (
                    <button
                      key={tpl.name}
                      disabled={!!conflict}
                      title={conflict ? conflictLabel(conflict) : undefined}
                      onClick={() => handleAddShift(selectedCell.employeeId, selectedCell.date, tpl.start, tpl.end, tpl.id)}
                      className={`bg-gradient-to-r ${tpl.color} text-white rounded-xl py-3 font-bold transition-all ${
                        conflict ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:shadow-lg'
                      }`}
                    >
                      <div className="text-xl">{tpl.icon}</div>
                      <div className="text-xs font-semibold opacity-90 mt-0.5">{tpl.start} - {tpl.end}</div>
                      {conflict && <div className="text-[10px] font-bold mt-0.5">Đã trùng giờ</div>}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handleAddShift(selectedCell.employeeId, selectedCell.date, '00:00', '23:59', 'off')}
                disabled={dayConflicts.length > 0}
                title={dayConflicts.length > 0 ? conflictLabel(dayConflicts[0]) : undefined}
                className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${offTemplate.color} text-white rounded-xl py-3 font-bold transition-all mb-4 ${
                  dayConflicts.length > 0 ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:shadow-lg'
                }`}
              >
                <CalendarOff className="w-4 h-4" />
                Đánh dấu nghỉ cả ngày
              </button>

              <div className="border-t border-gray-200 pt-4">
                <div className="text-xs text-gray-500 font-semibold mb-2">Giờ tùy chỉnh</div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="time"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                  />
                </div>
                {customConflict && (
                  <p className="text-xs text-red-600 font-semibold mt-1.5">{conflictLabel(customConflict)}</p>
                )}
                <button
                  onClick={() => handleAddShift(selectedCell.employeeId, selectedCell.date, customStart, customEnd, 'custom')}
                  disabled={!customStart || !customEnd || !!customConflict}
                  className="w-full mt-2 bg-gradient-to-r from-slate-600 to-slate-500 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed text-white rounded-xl py-3 font-bold hover:shadow-lg transition-all"
                >
                  ⏱️ Thêm ca này
                </button>
              </div>

              <button
                onClick={() => setSelectedCell(null)}
                className="w-full mt-3 bg-gray-200 text-gray-700 rounded-xl py-2.5 font-semibold hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </div>
        );
      })()}

      {/* Substitute Modal */}
      {otModalShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5">
            <h3 className="text-lg font-black text-gray-900 mb-1">⏰ Thêm giờ tăng ca</h3>
            <p className="text-xs text-gray-500 mb-4">{otModalShift.employeeName} · {parseLocalDateStr(otModalShift.date).toLocaleDateString('vi-VN')} · ca {otModalShift.startTime}–{otModalShift.endTime}. Duyệt luôn — cộng vào lương.</p>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Số giờ OT</label>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3].map((h) => (
                <button key={h} type="button" onClick={() => setOtModalHours(String(h))}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border ${otModalHours === String(h) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300'}`}>+{h}h</button>
              ))}
              <input type="number" min="0" step="0.5" value={otModalHours} onChange={(e) => setOtModalHours(e.target.value)}
                placeholder="giờ" className="w-20 border border-gray-300 rounded-xl px-2 py-2 text-sm text-center" />
            </div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Lý do (tuỳ chọn)</label>
            <input value={otModalReason} onChange={(e) => setOtModalReason(e.target.value)}
              placeholder="VD: quán đông, ở lại phụ..." className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-4" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setOtModalShift(null)} disabled={otModalSaving}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">Huỷ</button>
              <button type="button" onClick={saveOtModal} disabled={otModalSaving}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black disabled:opacity-60">{otModalSaving ? 'Đang lưu...' : 'Lưu OT'}</button>
            </div>
          </div>
        </div>
      )}

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
                <span className="font-semibold">Ngày:</span> {parseLocalDateStr(substituteModal.shift.date).toLocaleDateString('vi-VN')}
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

      {editTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-1">Sửa giờ ca</h3>
            <p className="text-xs text-gray-500 mb-4">
              {editTimeModal.shift.employeeName} · {parseLocalDateStr(editTimeModal.shift.date).toLocaleDateString('vi-VN')}
              {editTimeModal.shift.branch ? ` · ${branchLabel(editTimeModal.shift.branch)}` : ''}
            </p>
            {(editTimeModal.shift.checkIn || editTimeModal.shift.checkOut) && (
              <div className="mb-4 text-xs bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg px-3 py-2">
                ✓ Ca này đã có chấm công — sửa giờ sẽ <b>giữ nguyên</b> check-in/ảnh, không mất lịch sử.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Giờ vào ca</label>
                <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Giờ kết ca</label>
                <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditTimeModal(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                Hủy
              </button>
              <button onClick={handleSaveEditTime} disabled={editTimeSaving}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-60">
                {editTimeSaving ? 'Đang lưu...' : 'Lưu giờ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend — lấy trực tiếp từ shiftTemplates để không bao giờ lệch giờ hiển thị */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
        {shiftTemplates.map((tpl) => (
          <div key={tpl.id} className="flex items-center gap-2">
            <div className={`w-4 h-4 bg-gradient-to-r ${tpl.color} rounded`}></div>
            <span>{tpl.name} {tpl.start}-{tpl.end}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 bg-gradient-to-r ${offTemplate.color} rounded flex items-center justify-center`}>
            <CalendarOff className="w-2.5 h-2.5 text-white" />
          </div>
          <span>{offTemplate.name}</span>
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
