import { useState, useEffect } from 'react';
import { LogOut, Save, Loader2, CheckCircle, MapPin, Camera, X, Clock, CalendarOff, Receipt, Printer, Download } from 'lucide-react';
import { useEmployee } from '../../contexts/EmployeeContext';
import { useOrders } from '../../contexts/OrderContext';
import { useBranches } from '../../contexts/BranchContext';
import { SHIFT_TEMPLATES, POSITION_LABELS, canCancelShift } from '../../types/employee';
import type { ProfileFieldConfig } from '../../types/employee';
import { AttendanceCamera } from './AttendanceCamera';
import { ImageViewer } from './ImageViewer';
import { EmployeeBottomNav, type EmployeeTab } from './EmployeeBottomNav';
import * as api from '../../utils/api';
import { localDateStr, parseLocalDateStr } from '../../utils/dateUtils';
import type { WorkShift } from '../../types/employee';
import {
  buildShiftClosingReceiptData,
  buildShiftClosingHtml,
  saveShiftClosingReceiptAsImage,
  DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE,
  RECEIPT_STYLE,
  type ShiftClosingBillTemplate,
  type ShiftClosingReceiptData,
} from '../../utils/posPrint';

type Tab = EmployeeTab;

function getFieldValue(employee: any, field: ProfileFieldConfig, branchLabel: (id: string) => string): string {
  if (field.source === 'custom') return employee.customData?.[field.fieldKey] || '';
  const val = employee[field.fieldKey];
  if (field.fieldKey === 'position') return POSITION_LABELS[val] || val || '';
  if (field.fieldKey === 'branch') return branchLabel(val) || val || '';
  return val ?? '';
}

function formatDate(d: string) {
  if (!d) return '';
  return parseLocalDateStr(d).toLocaleDateString('vi-VN');
}

function todayStr() {
  return localDateStr();
}

export function EmployeePortal() {
  const { activeEmployee, profileFields, myShifts, logout, updateProfile, requestShift, requestOff, cancelShift, checkIn, checkOut } = useEmployee();
  const { orders, history } = useOrders();
  const { branchLabel, activeBranches } = useBranches();
  const [tab, setTab] = useState<Tab>('attendance');
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(new Date());
  const [requestDate, setRequestDate] = useState(todayStr());
  const [requesting, setRequesting] = useState(false);
  const [cameraMode, setCameraMode] = useState<'in' | 'out' | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [shiftSummary, setShiftSummary] = useState<{ count: number; total: number } | null>(null);
  const [viewingImage, setViewingImage] = useState<{ src: string; title: string; timestamp?: string } | null>(null);
  const [startingShift, setStartingShift] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showOffForm, setShowOffForm] = useState(false);
  const [offReason, setOffReason] = useState('');
  const [requestingOff, setRequestingOff] = useState(false);
  const [scheduleView, setScheduleView] = useState<'mine' | 'branch'>('mine');
  const [branchShifts, setBranchShifts] = useState<WorkShift[]>([]);
  const [branchShiftsLoading, setBranchShiftsLoading] = useState(false);
  const [scheduleBranchFilter, setScheduleBranchFilter] = useState<string>('all');

  // Kết ca + xem bill online (đỡ tốn giấy) — chốt doanh thu/tiền mặt của ca đang mở, xem bill
  // ngay trên màn hình thay vì bắt buộc in giấy như ở máy POS.
  const [closingShift, setClosingShift] = useState<WorkShift | null>(null);
  const [closingCashMovements, setClosingCashMovements] = useState<api.ShiftCashMovement[]>([]);
  const [closingShiftOrders, setClosingShiftOrders] = useState<any[] | null>(null);
  const [closingBillTemplate, setClosingBillTemplate] = useState<ShiftClosingBillTemplate>(DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE);
  const [closingActualCashInput, setClosingActualCashInput] = useState('');
  const [closingSubmitting, setClosingSubmitting] = useState(false);
  const [findingShiftToClose, setFindingShiftToClose] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [closedBillHtml, setClosedBillHtml] = useState('');
  const [closedSummary, setClosedSummary] = useState<ShiftClosingReceiptData | null>(null);
  const [savingBillImage, setSavingBillImage] = useState(false);
  const [printingClosedBill, setPrintingClosedBill] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!activeEmployee) return;
    const data: Record<string, string> = {};
    profileFields.filter(f => f.editable).forEach(f => {
      data[f.id] = getFieldValue(activeEmployee, f, branchLabel);
    });
    setEditData(data);
  }, [activeEmployee, profileFields]);

  // Lịch cả chi nhánh — chỉ tải khi nhân viên thực sự bật xem (tránh gọi API thừa mỗi lần vào tab).
  // Tải TẤT CẢ chi nhánh (không lọc theo branch của nhân viên) để xem được lịch đầy đủ mọi
  // chi nhánh, không chỉ chi nhánh mình đang làm — lọc lại theo scheduleBranchFilter khi hiển thị.
  useEffect(() => {
    if (scheduleView !== 'branch') return;
    setBranchShiftsLoading(true);
    api
      .fetchShifts({})
      .then((data: WorkShift[]) => setBranchShifts(data || []))
      .catch(() => setBranchShifts([]))
      .finally(() => setBranchShiftsLoading(false));
  }, [scheduleView]);

  useEffect(() => {
    if (!closingShift) {
      setClosingCashMovements([]);
      setClosingShiftOrders(null);
      setClosingActualCashInput('');
      return;
    }
    api.fetchCashMovements(closingShift.id).then(setClosingCashMovements).catch(() => setClosingCashMovements([]));
    api
      .fetchSetting('shiftClosingBillTemplate')
      .then((v: any) => {
        if (v && typeof v === 'object') setClosingBillTemplate({ ...DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE, ...v });
      })
      .catch(() => setClosingBillTemplate(DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE));
    api
      .fetchOrders({ shiftId: closingShift.id })
      .then(setClosingShiftOrders)
      .catch(() => setClosingShiftOrders(null));
  }, [closingShift]);

  if (!activeEmployee) return null;

  const visibleFields = [...profileFields].filter(f => f.visible).sort((a, b) => a.order - b.order);
  // Bao gồm cả ca đã "completed" — nếu POS đã tự kết ca trước khi nhân viên kịp mở app chụp ảnh
  // xác nhận, ca đó vẫn phải hiện ra để họ chụp bổ sung (ảnh tách riêng khỏi giờ/trạng thái ca,
  // xem PosContext.tsx). Trước đây lọc bỏ "completed" khiến ca biến mất hẳn khỏi app — nhân viên
  // không còn cách nào chụp ảnh checkout nữa.
  const todayShift = myShifts.find(s => s.date === todayStr() && ['scheduled', 'approved', 'in_progress', 'completed'].includes(s.status));
  const upcomingShifts = myShifts.filter(s => s.date >= todayStr()).sort((a, b) => a.date.localeCompare(b.date));

  // Lịch cả chi nhánh — gộp theo ngày để hiện dạng "ngày -> danh sách ai làm ca nào", chỉ lấy từ
  // hôm nay trở đi và bỏ qua ca đã hủy (rejected) cho gọn.
  const branchScheduleByDate = (() => {
    const upcoming = branchShifts
      .filter(s => s.date >= todayStr() && s.status !== 'rejected')
      .filter(s => scheduleBranchFilter === 'all' || s.branch === scheduleBranchFilter)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const map = new Map<string, WorkShift[]>();
    for (const s of upcoming) {
      const list = map.get(s.date) || [];
      list.push(s);
      map.set(s.date, list);
    }
    return Array.from(map.entries());
  })();

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updates: any = {};
      const customData = { ...(activeEmployee.customData || {}) };
      profileFields.filter(f => f.editable).forEach(f => {
        const val = editData[f.id] ?? '';
        if (f.source === 'custom') customData[f.fieldKey] = val;
        else updates[f.fieldKey] = val;
      });
      updates.customData = customData;
      await updateProfile(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestShift = async (templateId: string) => {
    setRequesting(true);
    try {
      await requestShift(requestDate, templateId);
      setShowRequestForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Đăng ký ca thất bại.');
    } finally {
      setRequesting(false);
    }
  };

  const handleRequestOff = async () => {
    setRequestingOff(true);
    try {
      await requestOff(requestDate, offReason.trim());
      setShowOffForm(false);
      setOffReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xin nghỉ thất bại.');
    } finally {
      setRequestingOff(false);
    }
  };

  const handleAttendanceCapture = async (file: File) => {
    if (!todayShift || !cameraMode) return;
    try {
      const photoUrl = await api.uploadImage(file);
      if (cameraMode === 'in') {
        await checkIn(todayShift.id, photoUrl);
      } else {
        const shiftOrders = [...orders, ...history].filter(o => o.shiftId === todayShift.id);
        const count = shiftOrders.length;
        const total = shiftOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        await checkOut(todayShift.id, photoUrl);
        setShiftSummary({ count, total });
      }
      setCameraMode(null);
    } catch {
      alert('Chấm công thất bại. Vui lòng thử lại.');
      setCameraMode(null);
    }
  };

  const handleStartWalkInShift = async () => {
    if (!activeEmployee) return;
    setStartingShift(true);
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const startTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const end = new Date(now.getTime() + 9 * 3600000);
      const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
      await api.saveShift({
        employeeId: activeEmployee.id,
        employeeName: activeEmployee.fullName,
        branch: activeEmployee.branch,
        date: todayStr(),
        shiftType: 'walk-in',
        startTime,
        endTime,
        status: 'scheduled',
        requestedBy: 'employee',
      });
      await refreshShifts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể bắt đầu ca làm. Vui lòng thử lại.');
    } finally {
      setStartingShift(false);
    }
  };

  const handleCancelShift = async (shiftId: string) => {
    if (!confirm('Bạn có chắc muốn hủy đăng ký ca làm này?')) return;
    setCancellingId(shiftId);
    try {
      await cancelShift(shiftId);
    } finally {
      setCancellingId(null);
    }
  };

  // Tìm ca đang mở (in_progress) của chính mình để kết ca — không giới hạn theo chi nhánh vì
  // nhân viên có thể hỗ trợ chi nhánh khác chi nhánh mặc định của họ.
  const handleOpenEndShift = async () => {
    setFindingShiftToClose(true);
    try {
      const activeShifts = (await api.fetchShifts({
        employeeId: activeEmployee.id,
        status: 'in_progress',
      })) as WorkShift[];
      if (activeShifts.length === 0) {
        alert('Không có ca nào đang mở để kết ca.');
        return;
      }
      setClosingShift(activeShifts[0]);
    } catch {
      alert('Không kiểm tra được ca đang mở — thử lại nhé.');
    } finally {
      setFindingShiftToClose(false);
    }
  };

  const closingSummary = closingShift
    ? (() => {
        const shiftOrders =
          closingShiftOrders ?? [...orders, ...history].filter((o) => o.shiftId === closingShift.id);
        const actualCash = closingActualCashInput.trim() === '' ? undefined : Number(closingActualCashInput);
        return buildShiftClosingReceiptData(closingShift, shiftOrders, closingCashMovements, closingBillTemplate, actualCash);
      })()
    : null;

  const handleConfirmEndShift = async () => {
    if (!closingShift || !closingSummary) return;
    if (closingActualCashInput.trim() === '' || Number.isNaN(Number(closingActualCashInput))) {
      alert('Vui lòng nhập số tiền mặt thực tế đếm được.');
      return;
    }
    setClosingSubmitting(true);
    try {
      await api.shiftCheckIn(closingShift.id, 'out', undefined, { endCashActual: Number(closingActualCashInput) });
      // Bill online — hiện ngay trên màn hình thay vì bắt buộc in giấy, đỡ tốn giấy như yêu cầu.
      const finalSummary = { ...closingSummary, endCashActual: Number(closingActualCashInput) };
      setClosedSummary(finalSummary);
      setClosedBillHtml(buildShiftClosingHtml(finalSummary));
      setClosingShift(null);
      setShowBillPreview(true);
    } catch {
      alert('Kết ca thất bại — thử lại nhé.');
    } finally {
      setClosingSubmitting(false);
    }
  };

  const handleSaveBillImage = async () => {
    if (!closedSummary) return;
    setSavingBillImage(true);
    try {
      await saveShiftClosingReceiptAsImage(closedSummary, activeEmployee.fullName);
    } catch {
      alert('Lưu ảnh bill thất bại — thử lại nhé.');
    } finally {
      setSavingBillImage(false);
    }
  };

  // Ca đã được kết trên máy POS (máy tính) rồi — lấy đúng số liệu đã chốt sẵn (startCash/
  // endCashActual đã lưu, không hỏi lại tiền mặt) rồi hiện bill lên màn hình, y hệt bill vừa
  // kết ca xong: có nút tải ảnh về máy + in giấy tùy chọn, không tự động in luôn.
  const handlePrintClosedShiftBill = async (shift: WorkShift) => {
    setPrintingClosedBill(true);
    try {
      let shiftOrders: any[] = [];
      try {
        shiftOrders = await api.fetchOrders({ shiftId: shift.id });
      } catch {
        shiftOrders = [...orders, ...history].filter((o) => o.shiftId === shift.id);
      }
      let cashMovements: api.ShiftCashMovement[] = [];
      try {
        cashMovements = await api.fetchCashMovements(shift.id);
      } catch {
        cashMovements = [];
      }
      let template = DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE;
      try {
        const saved = await api.fetchSetting('shiftClosingBillTemplate');
        if (saved && typeof saved === 'object') template = { ...DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE, ...saved };
      } catch {
        // giữ mặc định
      }
      const data = buildShiftClosingReceiptData(shift, shiftOrders, cashMovements, template);
      setClosedSummary(data);
      setClosedBillHtml(buildShiftClosingHtml(data));
      setShowBillPreview(true);
    } catch {
      alert('Không lấy được dữ liệu bill — thử lại nhé.');
    } finally {
      setPrintingClosedBill(false);
    }
  };

  const statusLabel: Record<string, string> = {
    pending: '⏳ Chờ duyệt',
    scheduled: '✅ Đã xếp ca',
    approved: '✅ Đã duyệt',
    rejected: '❌ Từ chối',
    in_progress: '🔥 Đang làm',
    completed: '✔️ Hoàn thành',
  };

  const pageTitles: Record<Tab, string> = {
    info: 'Thông tin cá nhân',
    attendance: 'Chấm công',
    schedule: 'Lịch làm việc',
    history: 'Lịch sử chấm công',
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-4 pt-3 pb-4 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 overflow-hidden">
              {activeEmployee.photo ? (
                <img src={activeEmployee.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                activeEmployee.fullName.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base leading-tight truncate">{activeEmployee.fullName}</div>
              <div className="text-emerald-100 text-xs truncate">
                {POSITION_LABELS[activeEmployee.position] || activeEmployee.position}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2.5 bg-white/15 rounded-xl active:bg-white/25 transition-colors flex-shrink-0"
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <h1 className="mt-3 text-lg font-bold">{pageTitles[tab]}</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-28">
        {tab === 'info' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
              <h2 className="font-bold text-gray-800 text-lg">Hồ sơ nhân viên</h2>
              {visibleFields.map(field => (
                <div key={field.id}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{field.label}</label>
                  {field.editable ? (
                    field.type === 'textarea' ? (
                      <textarea
                        value={editData[field.id] ?? ''}
                        onChange={e => setEditData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                      />
                    ) : (
                      <input
                        type={field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                        value={editData[field.id] ?? ''}
                        onChange={e => setEditData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    )
                  ) : (
                    <div className="text-gray-800 font-medium py-1">
                      {field.type === 'date' ? formatDate(getFieldValue(activeEmployee, field, branchLabel)) : getFieldValue(activeEmployee, field, branchLabel) || '—'}
                    </div>
                  )}
                </div>
              ))}

              {profileFields.some(f => f.editable) && (
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? 'Đã lưu!' : 'Lưu thay đổi'}
                </button>
              )}
            </div>
          </div>
        )}

        {tab === 'attendance' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <div className="text-4xl font-mono font-bold text-gray-800 mb-1">
                {now.toLocaleTimeString('vi-VN')}
              </div>
              <div className="text-gray-500 text-sm mb-6">
                {now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              {todayShift ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-emerald-800">Ca hôm nay</div>
                      {todayShift.branch && (
                        <span className="bg-emerald-700 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          {branchLabel(todayShift.branch) || todayShift.branch}
                        </span>
                      )}
                    </div>
                    <div className="text-sm space-y-1 text-gray-700">
                      <div className="flex justify-between"><span>Giờ vào ca:</span><span className="font-semibold">{todayShift.startTime}</span></div>
                      <div className="flex justify-between"><span>Giờ tan ca:</span><span className="font-semibold">{todayShift.endTime}</span></div>
                      {todayShift.checkIn && <div className="flex justify-between"><span>Check-in:</span><span className="font-semibold text-green-600">{new Date(todayShift.checkIn).toLocaleTimeString('vi-VN')}</span></div>}
                      {todayShift.checkOut && <div className="flex justify-between"><span>Check-out:</span><span className="font-semibold text-green-600">{new Date(todayShift.checkOut).toLocaleTimeString('vi-VN')}</span></div>}
                    </div>
                  </div>

                  {todayShift.checkInPhoto && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3">
                      <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                        <Camera className="w-4 h-4" />
                        Ảnh Check-in
                      </div>
                      <img src={todayShift.checkInPhoto} alt="Check-in" className="w-full h-auto rounded-lg object-cover max-h-48" />
                    </div>
                  )}

                  {todayShift.checkOutPhoto && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3">
                      <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                        <Camera className="w-4 h-4" />
                        Ảnh Check-out
                      </div>
                      <img src={todayShift.checkOutPhoto} alt="Check-out" className="w-full h-auto rounded-lg object-cover max-h-48" />
                    </div>
                  )}

                  {/* Giờ vào/ra ca có thể đã được máy POS tự động ghi nhận (để tính doanh thu đúng ca) —
                      ảnh xác nhận là bước riêng, chụp lúc nào trong ngày cũng được, không phụ thuộc giờ đó. */}
                  {!todayShift.checkInPhoto && (
                    <button
                      onClick={() => setCameraMode('in')}
                      className="w-full bg-green-500 active:bg-green-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 min-h-[56px]"
                    >
                      <Camera className="w-5 h-5" />
                      {todayShift.checkIn ? 'Chụp ảnh xác nhận vào ca' : 'Check-in'}
                    </button>
                  )}
                  {!todayShift.checkOutPhoto && (
                    <button
                      onClick={() => setCameraMode('out')}
                      className="w-full bg-emerald-600 active:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 min-h-[56px]"
                    >
                      <Camera className="w-5 h-5" />
                      {todayShift.checkOut ? 'Chụp ảnh xác nhận tan ca' : 'Check-out'}
                    </button>
                  )}
                  {todayShift.checkInPhoto && todayShift.checkOutPhoto && (
                    <div className="flex items-center justify-center gap-2 text-green-600 font-semibold py-2">
                      <CheckCircle className="w-5 h-5" />
                      Đã hoàn thành ca hôm nay
                    </div>
                  )}

                  {todayShift.status === 'completed' ? (
                    // Ca đã được kết trên máy POS rồi — chỉ cần in lại đúng bill đó, không hỏi lại tiền mặt.
                    <button
                      onClick={() => handlePrintClosedShiftBill(todayShift)}
                      disabled={printingClosedBill}
                      className="w-full bg-white border-2 border-emerald-600 text-emerald-700 active:bg-emerald-50 disabled:opacity-60 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 min-h-[52px]"
                    >
                      {printingClosedBill ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                      In bill kết ca
                    </button>
                  ) : (
                    <button
                      onClick={handleOpenEndShift}
                      disabled={findingShiftToClose}
                      className="w-full bg-white border-2 border-emerald-600 text-emerald-700 active:bg-emerald-50 disabled:opacity-60 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 min-h-[52px]"
                    >
                      {findingShiftToClose ? <Loader2 className="w-5 h-5 animate-spin" /> : <Receipt className="w-5 h-5" />}
                      Kết ca & Xem bill
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 py-4 space-y-4">
                  <div>
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Không có ca làm hôm nay</p>
                    <p className="text-sm mt-1">Đăng ký lịch làm hoặc liên hệ quản lý</p>
                  </div>
                  <button
                    onClick={handleStartWalkInShift}
                    disabled={startingShift}
                    className="w-full bg-green-500 active:bg-green-600 disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 min-h-[56px]"
                  >
                    {startingShift ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                    Chấm công ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-800 mb-3">Lịch sử chấm công gần đây</h3>
              <div className="space-y-3">
                {myShifts.filter(s => s.checkIn).slice(0, 10).map(s => (
                  <div key={s.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-gray-800">{formatDate(s.date)}</div>
                        {s.branch && (
                          <span className="inline-block bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full my-1">
                            {branchLabel(s.branch) || s.branch}
                          </span>
                        )}
                        <div className="text-sm text-gray-600">
                          {s.checkIn ? new Date(s.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          {' → '}
                          {s.checkOut ? new Date(s.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </div>
                      {s.checkOut && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">Hoàn thành</span>
                      )}
                    </div>
                    {(s.checkInPhoto || s.checkOutPhoto) && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {s.checkInPhoto && (
                          <button
                            onClick={() => setViewingImage({ src: s.checkInPhoto, title: `Check-in - ${formatDate(s.date)}`, timestamp: s.checkIn ? new Date(s.checkIn).toLocaleTimeString('vi-VN') : '' })}
                            className="relative group cursor-pointer"
                          >
                            <img src={s.checkInPhoto} alt="Check-in" className="w-full h-20 rounded-lg object-cover bg-gray-200" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="text-white text-xs font-bold">In</span>
                            </div>
                          </button>
                        )}
                        {s.checkOutPhoto && (
                          <button
                            onClick={() => setViewingImage({ src: s.checkOutPhoto, title: `Check-out - ${formatDate(s.date)}`, timestamp: s.checkOut ? new Date(s.checkOut).toLocaleTimeString('vi-VN') : '' })}
                            className="relative group cursor-pointer"
                          >
                            <img src={s.checkOutPhoto} alt="Check-out" className="w-full h-20 rounded-lg object-cover bg-gray-200" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="text-white text-xs font-bold">Out</span>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {myShifts.filter(s => s.checkIn).length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">Chưa có lịch sử chấm công</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="space-y-4">
            {/* Chuyển giữa lịch của riêng mình và lịch cả chi nhánh */}
            <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setScheduleView('mine')}
                className={`flex-1 py-2.5 text-sm font-bold transition-colors ${scheduleView === 'mine' ? 'bg-emerald-600 text-white' : 'text-gray-500'}`}
              >
                Ca của tôi
              </button>
              <button
                type="button"
                onClick={() => setScheduleView('branch')}
                className={`flex-1 py-2.5 text-sm font-bold transition-colors ${scheduleView === 'branch' ? 'bg-emerald-600 text-white' : 'text-gray-500'}`}
              >
                Lịch cả chi nhánh
              </button>
            </div>

            {scheduleView === 'mine' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <h2 className="font-bold text-gray-800">Lịch làm của tôi</h2>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowOffForm(true)}
                    className="flex items-center gap-1.5 text-sm font-bold text-red-700 bg-red-50 active:bg-red-100 px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
                  >
                    <CalendarOff className="w-4 h-4" />
                    Xin nghỉ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(true)}
                    className="text-sm font-bold text-emerald-700 bg-emerald-50 active:bg-emerald-100 px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
                  >
                    + Đăng ký lịch làm
                  </button>
                </div>
              </div>
              {upcomingShifts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Chưa có lịch làm</p>
              ) : (
                <div className="space-y-2">
                  {upcomingShifts.map(s => {
                    const isOff = s.shiftType === 'off';
                    return (
                    <div key={s.id} className={`flex items-center justify-between p-3.5 rounded-xl gap-2 ${isOff ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800">{formatDate(s.date)}</div>
                        {s.branch && !isOff && (
                          <span className="inline-block bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full my-1">
                            {branchLabel(s.branch) || s.branch}
                          </span>
                        )}
                        {isOff ? (
                          <div className="text-sm text-red-700 font-semibold flex items-center gap-1">
                            <CalendarOff className="w-3.5 h-3.5" />
                            Nghỉ{s.reason ? ` — ${s.reason}` : ''}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">{s.startTime} – {s.endTime}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-white border">
                          {statusLabel[s.status] || s.status}
                        </span>
                        {canCancelShift(s) && (
                          <button
                            type="button"
                            onClick={() => handleCancelShift(s.id)}
                            disabled={cancellingId === s.id}
                            className="p-2 text-red-500 active:bg-red-50 rounded-lg transition-colors disabled:opacity-50 min-w-[40px] min-h-[40px] flex items-center justify-center"
                            title="Hủy đăng ký"
                          >
                            {cancellingId === s.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>
            )}

            {scheduleView === 'branch' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="font-bold text-gray-800 mb-3">Lịch cả chi nhánh</h2>
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => setScheduleBranchFilter('all')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${scheduleBranchFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Tất cả chi nhánh
                </button>
                {activeBranches.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => setScheduleBranchFilter(b.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${scheduleBranchFilter === b.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
              {branchShiftsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                </div>
              ) : branchScheduleByDate.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Chưa có lịch nào</p>
              ) : (
                <div className="space-y-4">
                  {branchScheduleByDate.map(([date, dayShifts]) => (
                    <div key={date}>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        {formatDate(date)}
                      </div>
                      <div className="space-y-1.5">
                        {dayShifts.map(s => {
                          const isOff = s.shiftType === 'off';
                          return (
                            <div
                              key={s.id}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-lg ${isOff ? 'bg-red-50' : 'bg-gray-50'}`}
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-gray-800 text-sm truncate block">
                                  {s.employeeName}
                                </span>
                                {scheduleBranchFilter === 'all' && s.branch && (
                                  <span className="text-[11px] text-emerald-700 font-semibold">
                                    {branchLabel(s.branch) || s.branch}
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
                                  {s.startTime}–{s.endTime}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        )}
      </main>

      <EmployeeBottomNav activeTab={tab} onTabChange={setTab} />

      {cameraMode && todayShift && (
        <AttendanceCamera
          label={cameraMode === 'in' ? 'Chụp ảnh Check-in' : 'Chụp ảnh Check-out'}
          onCapture={handleAttendanceCapture}
          onCancel={() => setCameraMode(null)}
        />
      )}

      {shiftSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <CheckCircle className="w-14 h-14 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Kết ca thành công!</h3>
            <p className="text-sm text-gray-500 mb-4">Tổng kết ca làm việc của bạn</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Số đơn đã bán</span>
                <span className="font-bold text-gray-900">{shiftSummary.count} đơn</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Doanh thu</span>
                <span className="font-bold text-emerald-700">{shiftSummary.total.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShiftSummary(null)}
              className="w-full mt-5 bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {showRequestForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-lg">Đăng ký lịch làm</h2>
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="p-2 -m-2 text-gray-400 active:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">Chọn ngày</label>
              <input
                type="date"
                value={requestDate}
                min={todayStr()}
                onChange={e => setRequestDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SHIFT_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleRequestShift(tpl.id)}
                  disabled={requesting}
                  className="flex items-center gap-3 p-3.5 border-2 border-gray-100 active:border-emerald-300 active:bg-emerald-50 rounded-2xl text-left disabled:opacity-60 min-h-[60px]"
                >
                  <span className="text-2xl">{tpl.icon}</span>
                  <div>
                    <div className="font-bold text-gray-800">{tpl.name}</div>
                    <div className="text-sm text-gray-500">{tpl.start} – {tpl.end}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Yêu cầu sẽ được gửi tới quản lý để duyệt. Nhấn ✕ ở danh sách để hủy nếu đăng ký nhầm.
            </p>
          </div>
        </div>
      )}

      {showOffForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-red-600" />
                Xin nghỉ
              </h2>
              <button
                type="button"
                onClick={() => setShowOffForm(false)}
                className="p-2 -m-2 text-gray-400 active:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">Chọn ngày</label>
              <input
                type="date"
                value={requestDate}
                min={todayStr()}
                onChange={e => setRequestDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-400 outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">Lý do (không bắt buộc)</label>
              <textarea
                value={offReason}
                onChange={e => setOffReason(e.target.value)}
                placeholder="VD: về quê có việc gia đình"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none"
              />
            </div>
            <button
              onClick={handleRequestOff}
              disabled={requestingOff}
              className="w-full flex items-center justify-center gap-2 p-3.5 bg-red-600 active:bg-red-700 text-white rounded-2xl font-bold disabled:opacity-60"
            >
              {requestingOff ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarOff className="w-5 h-5" />}
              Gửi xin nghỉ
            </button>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Yêu cầu sẽ được gửi tới quản lý để duyệt.
            </p>
          </div>
        </div>
      )}

      {viewingImage && (
        <ImageViewer
          src={viewingImage.src}
          title={viewingImage.title}
          timestamp={viewingImage.timestamp}
          onClose={() => setViewingImage(null)}
        />
      )}

      {closingShift && closingSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center my-4">
            <Receipt className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Kết ca</h3>
            <p className="text-sm text-gray-500 mb-4">{closingShift.startTime} - {closingShift.endTime}</p>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Số đơn đã bán</span>
                <span className="font-bold text-gray-900">{closingSummary.orderCount} đơn</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Doanh thu</span>
                <span className="font-bold text-emerald-700">{closingSummary.totalRevenue.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3 text-left space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 mb-1">Đối chiếu tiền mặt</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Tiền mặt đầu ca</span>
                <span className="font-semibold text-gray-800">{closingSummary.startCash.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Doanh thu tiền mặt</span>
                <span className="font-semibold text-gray-800">{closingSummary.breakdown.cash.toLocaleString('vi-VN')}đ</span>
              </div>
              {closingSummary.cashIn > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Thu vào khác</span>
                  <span className="font-semibold text-gray-800">+{closingSummary.cashIn.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              {closingSummary.cashOut > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Chi ra</span>
                  <span className="font-semibold text-gray-800">-{closingSummary.cashOut.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1 border-t border-amber-200">
                <span className="text-gray-600 font-semibold">Dự kiến</span>
                <span className="font-bold text-gray-900">{closingSummary.expectedCash.toLocaleString('vi-VN')}đ</span>
              </div>

              <label className="block text-xs font-semibold text-gray-700 mt-2">Tiền mặt thực tế đếm được *</label>
              <input
                type="number"
                inputMode="decimal"
                value={closingActualCashInput}
                onChange={(e) => setClosingActualCashInput(e.target.value)}
                placeholder="Nhập số tiền..."
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-semibold"
              />
              {closingActualCashInput.trim() !== '' && !Number.isNaN(Number(closingActualCashInput)) && (
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-gray-600 font-semibold">Chênh lệch</span>
                  <span className={`font-bold ${closingSummary.cashDiscrepancy < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {closingSummary.cashDiscrepancy >= 0 ? '+' : ''}
                    {closingSummary.cashDiscrepancy.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
            </div>

            {closingSummary.items.length > 0 && (
              <div className="text-left mt-4">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Sản phẩm đã bán</p>
                <div className="bg-gray-50 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                  {closingSummary.items.map((it) => (
                    <div key={it.productName} className="flex justify-between text-xs">
                      <span className="text-gray-700">{it.productName} x{it.quantity}</span>
                      <span className="text-gray-500">{it.revenue.toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-gray-400 text-center mt-4">
              Bấm "Xác nhận kết ca" bên dưới — bill sẽ hiện ngay trên màn hình, không cần in giấy.
            </p>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setClosingShift(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={closingSubmitting}
                onClick={handleConfirmEndShift}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white py-3 rounded-xl font-bold"
              >
                {closingSubmitting ? 'Đang kết ca...' : 'Xác nhận kết ca'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBillPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm my-4 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Bill kết ca
              </h3>
              <button type="button" onClick={() => setShowBillPreview(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-4">
              <style>{RECEIPT_STYLE}</style>
              <div dangerouslySetInnerHTML={{ __html: closedBillHtml }} />
            </div>
            <div className="p-3 border-t shrink-0 space-y-2">
              {closedSummary && (
                <button
                  type="button"
                  onClick={handleSaveBillImage}
                  disabled={savingBillImage}
                  className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-semibold text-sm"
                >
                  {savingBillImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Lưu ảnh vào album
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowBillPreview(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm"
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
