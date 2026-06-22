import { useState, useEffect } from 'react';
import { LogOut, Save, Loader2, CheckCircle, MapPin, Camera, X, Clock } from 'lucide-react';
import { useEmployee } from '../../contexts/EmployeeContext';
import { SHIFT_TEMPLATES, POSITION_LABELS, BRANCH_LABELS, canCancelShift } from '../../types/employee';
import type { ProfileFieldConfig } from '../../types/employee';
import { AttendanceCamera } from './AttendanceCamera';
import { EmployeeBottomNav, type EmployeeTab } from './EmployeeBottomNav';
import * as api from '../../utils/api';

type Tab = EmployeeTab;

function getFieldValue(employee: any, field: ProfileFieldConfig): string {
  if (field.source === 'custom') return employee.customData?.[field.fieldKey] || '';
  const val = employee[field.fieldKey];
  if (field.fieldKey === 'position') return POSITION_LABELS[val] || val || '';
  if (field.fieldKey === 'branch') return BRANCH_LABELS[val] || val || '';
  return val ?? '';
}

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('vi-VN');
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function EmployeePortal() {
  const { activeEmployee, profileFields, myShifts, logout, updateProfile, requestShift, cancelShift, checkIn, checkOut } = useEmployee();
  const [tab, setTab] = useState<Tab>('attendance');
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(new Date());
  const [requestDate, setRequestDate] = useState(todayStr());
  const [requesting, setRequesting] = useState(false);
  const [cameraMode, setCameraMode] = useState<'in' | 'out' | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!activeEmployee) return;
    const data: Record<string, string> = {};
    profileFields.filter(f => f.editable).forEach(f => {
      data[f.id] = getFieldValue(activeEmployee, f);
    });
    setEditData(data);
  }, [activeEmployee, profileFields]);

  if (!activeEmployee) return null;

  const visibleFields = [...profileFields].filter(f => f.visible).sort((a, b) => a.order - b.order);
  const todayShift = myShifts.find(s => s.date === todayStr() && ['scheduled', 'approved', 'in_progress'].includes(s.status));
  const upcomingShifts = myShifts.filter(s => s.date >= todayStr()).sort((a, b) => a.date.localeCompare(b.date));

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
    } finally {
      setRequesting(false);
    }
  };

  const handleAttendanceCapture = async (file: File) => {
    if (!todayShift || !cameraMode) return;
    try {
      const photoUrl = await api.uploadImage(file);
      if (cameraMode === 'in') await checkIn(todayShift.id, photoUrl);
      else await checkOut(todayShift.id, photoUrl);
      setCameraMode(null);
    } catch {
      alert('Chấm công thất bại. Vui lòng thử lại.');
      setCameraMode(null);
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
                      {field.type === 'date' ? formatDate(getFieldValue(activeEmployee, field)) : getFieldValue(activeEmployee, field) || '—'}
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
                    <div className="font-bold text-emerald-800 mb-2">Ca hôm nay</div>
                    <div className="text-sm space-y-1 text-gray-700">
                      <div className="flex justify-between"><span>Giờ vào ca:</span><span className="font-semibold">{todayShift.startTime}</span></div>
                      <div className="flex justify-between"><span>Giờ tan ca:</span><span className="font-semibold">{todayShift.endTime}</span></div>
                      {todayShift.checkIn && <div className="flex justify-between"><span>Check-in:</span><span className="font-semibold text-green-600">{new Date(todayShift.checkIn).toLocaleTimeString('vi-VN')}</span></div>}
                      {todayShift.checkOut && <div className="flex justify-between"><span>Check-out:</span><span className="font-semibold text-green-600">{new Date(todayShift.checkOut).toLocaleTimeString('vi-VN')}</span></div>}
                    </div>
                  </div>

                  {!todayShift.checkIn && (
                    <button
                      onClick={() => setCameraMode('in')}
                      className="w-full bg-green-500 active:bg-green-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 min-h-[56px]"
                    >
                      <Camera className="w-5 h-5" />
                      Check-in
                    </button>
                  )}
                  {todayShift.checkIn && !todayShift.checkOut && (
                    <button
                      onClick={() => setCameraMode('out')}
                      className="w-full bg-emerald-600 active:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 min-h-[56px]"
                    >
                      <Camera className="w-5 h-5" />
                      Check-out
                    </button>
                  )}
                  {todayShift.checkOut && (
                    <div className="flex items-center justify-center gap-2 text-green-600 font-semibold py-2">
                      <CheckCircle className="w-5 h-5" />
                      Đã hoàn thành ca hôm nay
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 py-4">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Không có ca làm hôm nay</p>
                  <p className="text-sm mt-1">Đăng ký lịch làm hoặc liên hệ quản lý</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-800 mb-3">Lịch sử chấm công gần đây</h3>
              <div className="space-y-2">
                {myShifts.filter(s => s.checkIn).slice(0, 5).map(s => (
                  <div key={s.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">{formatDate(s.date)}</span>
                    <span className="font-medium text-gray-800">
                      {s.checkIn ? new Date(s.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      {' → '}
                      {s.checkOut ? new Date(s.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="font-bold text-gray-800 mb-4">Đăng ký lịch làm</h2>
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
                Yêu cầu sẽ được gửi tới quản lý để duyệt. Nhấn ✕ ở danh sách bên dưới để hủy nếu đăng ký nhầm.
              </p>
            </div>

            {/* My shifts list */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="font-bold text-gray-800 mb-4">Lịch làm của tôi</h2>
              {upcomingShifts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Chưa có lịch làm</p>
              ) : (
                <div className="space-y-2">
                  {upcomingShifts.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800">{formatDate(s.date)}</div>
                        <div className="text-sm text-gray-500">{s.startTime} – {s.endTime}</div>
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
                  ))}
                </div>
              )}
            </div>
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
    </div>
  );
}
