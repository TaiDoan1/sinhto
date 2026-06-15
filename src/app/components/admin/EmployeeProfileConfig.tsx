import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, GripVertical, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { useEmployee } from '../../contexts/EmployeeContext';
import type { ProfileFieldConfig, ProfileFieldType } from '../../types/employee';
import { DEFAULT_PROFILE_FIELDS } from '../../types/employee';

const FIELD_TYPES: { value: ProfileFieldType; label: string }[] = [
  { value: 'text', label: 'Văn bản' },
  { value: 'phone', label: 'Số điện thoại' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Ngày' },
  { value: 'textarea', label: 'Đoạn văn' },
  { value: 'select', label: 'Lựa chọn' },
];

const BUILTIN_KEYS = [
  { key: 'fullName', label: 'Họ và tên' },
  { key: 'employeeId', label: 'Mã NV' },
  { key: 'phone', label: 'SĐT' },
  { key: 'email', label: 'Email' },
  { key: 'branch', label: 'Chi nhánh' },
  { key: 'position', label: 'Chức vụ' },
  { key: 'startDate', label: 'Ngày vào làm' },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'idNumber', label: 'CCCD' },
  { key: 'dateOfBirth', label: 'Ngày sinh' },
];

export function EmployeeProfileConfig() {
  const { profileFields, saveProfileFields } = useEmployee();
  const [fields, setFields] = useState<ProfileFieldConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFields([...profileFields].sort((a, b) => a.order - b.order));
  }, [profileFields]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfileFields(fields.map((f, i) => ({ ...f, order: i + 1 })));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    const id = `custom-${Date.now()}`;
    setFields(prev => [...prev, {
      id,
      label: 'Trường mới',
      type: 'text',
      source: 'custom',
      fieldKey: id,
      visible: true,
      editable: true,
      order: prev.length + 1,
    }]);
  };

  const addBuiltinField = (key: string, label: string) => {
    if (fields.some(f => f.fieldKey === key && f.source === 'builtin')) return;
    setFields(prev => [...prev, {
      id: key,
      label,
      type: key.includes('Date') || key === 'dateOfBirth' || key === 'startDate' ? 'date' : key === 'address' ? 'textarea' : key === 'phone' ? 'phone' : key === 'email' ? 'email' : 'text',
      source: 'builtin',
      fieldKey: key,
      visible: true,
      editable: false,
      order: prev.length + 1,
    }]);
  };

  const updateField = (id: string, updates: Partial<ProfileFieldConfig>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const next = [...fields];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setFields(next);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Cấu Hình Màn Hình Nhân Viên</h2>
            <p className="text-sm text-gray-500">Chọn trường hiển thị trên cổng nhân viên</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Đã lưu' : 'Lưu cấu hình'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Field list */}
        <div className="lg:col-span-2 space-y-3">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="flex flex-col gap-1 pt-1">
                <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▲</button>
                <GripVertical className="w-4 h-4 text-gray-300" />
                <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▼</button>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Nhãn hiển thị</label>
                  <input
                    value={field.label}
                    onChange={e => updateField(field.id, { label: e.target.value })}
                    className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Loại</label>
                  <select
                    value={field.type}
                    onChange={e => updateField(field.id, { type: e.target.value as ProfileFieldType })}
                    disabled={field.source === 'builtin'}
                    className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm disabled:bg-gray-100"
                  >
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4 col-span-2">
                  <button
                    onClick={() => updateField(field.id, { visible: !field.visible })}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${field.visible ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                  >
                    {field.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {field.visible ? 'Hiển thị' : 'Ẩn'}
                  </button>
                  <button
                    onClick={() => updateField(field.id, { editable: !field.editable })}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${field.editable ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                  >
                    {field.editable ? 'NV có thể sửa' : 'Chỉ đọc'}
                  </button>
                  <span className="text-xs text-gray-400 ml-auto">
                    {field.source === 'builtin' ? `Hệ thống: ${field.fieldKey}` : 'Trường tùy chỉnh'}
                  </span>
                </div>
              </div>

              <button onClick={() => removeField(field.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={addCustomField}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            Thêm trường tùy chỉnh
          </button>
        </div>

        {/* Sidebar: add builtin fields */}
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">Thêm trường hệ thống</h3>
            <div className="space-y-1">
              {BUILTIN_KEYS.map(b => {
                const added = fields.some(f => f.fieldKey === b.key && f.source === 'builtin');
                return (
                  <button
                    key={b.key}
                    onClick={() => addBuiltinField(b.key, b.label)}
                    disabled={added}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {added ? '✓ ' : '+ '}{b.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-2 text-sm">Khôi phục mặc định</h3>
            <button
              onClick={() => setFields([...DEFAULT_PROFILE_FIELDS])}
              className="w-full text-sm text-emerald-700 hover:bg-emerald-50 py-2 rounded-lg font-semibold transition-colors"
            >
              Đặt lại cấu hình mặc định
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
