import { useState, useEffect } from 'react';
import { User, Clock, Calendar, LogOut, Save, Loader2, CheckCircle, MapPin } from 'lucide-react';
import { useEmployee } from '../../contexts/EmployeeContext';
import { SHIFT_TEMPLATES, POSITION_LABELS, BRANCH_LABELS } from '../../types/employee';
import type { ProfileFieldConfig } from '../../types/employee';

type Tab = 'info' | 'attendance' | 'schedule';

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
  const { activeEmployee, profileFields, myShifts, logout, updateProfile, requestShift, checkIn, checkOut } = useEmployee();
  const [tab, setTab] = useState<Tab>('info');
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(new Date());
  const [requestDate, setRequestDate] = useState(todayStr());
  const [requesting, setRequesting] = useState(false);

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

  const statusLabel: Record<string, string> = {
    pending: '⏳ Chờ duyệt',
    scheduled: '✅ Đã xếp ca',
    approved: '✅ Đã duyệt',
    rejected: '❌ Từ chối',
    in_progress: '🔥 Đang làm',
    completed: '✔️ Hoàn thành',
  };

  const tabs = [
    { id: 'info' as Tab, label: 'Thông tin', icon: User },
    { id: 'attendance' as Tab, label: 'Chấm công', icon: Clock },
    { id: 'schedule' as Tab, label: 'Lịch làm', icon: Calendar },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-4 pt-4 pb-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
              {activeEmployee.fullName.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">{activeEmployee.fullName}</div>
              <div className="text-emerald-100 text-sm">{POSITION_LABELS[activeEmployee.position] || activeEmployee.position}</div>
            </div>
          </div>
          <button onClick={logout} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors" title="Đăng xuất">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex bg-white/10 rounded-xl p-1 gap-1">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.id ? 'bg-white text-emerald-700 shadow' : 'text-white/80 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-8">
        {tab === 'info' && (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
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
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-md p-6 text-center">
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
                      onClick={() => checkIn(todayShift.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
                    >
                      Check-in
                    </button>
                  )}
                  {todayShift.checkIn && !todayShift.checkOut && (
                    <button
                      onClick={() => checkOut(todayShift.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
                    >
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

            <div className="bg-white rounded-2xl shadow-md p-4">
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
          <div className="space-y-4 max-w-lg mx-auto">
            {/* Request shift */}
            <div className="bg-white rounded-2xl shadow-md p-5">
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
                    className="flex items-center gap-3 p-3 border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl transition-all text-left disabled:opacity-60"
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
                Yêu cầu sẽ được gửi tới quản lý để duyệt
              </p>
            </div>

            {/* My shifts list */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h2 className="font-bold text-gray-800 mb-4">Lịch làm của tôi</h2>
              {upcomingShifts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Chưa có lịch làm</p>
              ) : (
                <div className="space-y-2">
                  {upcomingShifts.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <div className="font-semibold text-gray-800">{formatDate(s.date)}</div>
                        <div className="text-sm text-gray-500">{s.startTime} – {s.endTime}</div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-white border">
                        {statusLabel[s.status] || s.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
