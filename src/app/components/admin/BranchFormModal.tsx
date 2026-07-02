import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Branch } from '../../types/branch';

interface BranchFormModalProps {
  branch?: Branch | null;
  onClose: () => void;
  onSave: (data: Partial<Branch>) => Promise<void>;
}

const emptyForm = {
  name: '',
  address: '',
  phone: '',
  active: true,
};

export function BranchFormModal({ branch, onClose, onSave }: BranchFormModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        active: branch.active,
      });
    } else {
      setForm(emptyForm);
    }
  }, [branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên chi nhánh');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...(branch ? { id: branch.id } : {}),
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        active: form.active,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {branch ? 'Cập nhật chi nhánh' : 'Thêm chi nhánh mới'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {branch && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Mã chi nhánh</label>
              <input
                type="text"
                value={branch.id}
                disabled
                className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tên chi nhánh <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Chi Nhánh 4 - Bình Thạnh"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Địa chỉ</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Số nhà, đường, phường, quận..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="090..."
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {branch && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm font-medium text-gray-700">Chi nhánh đang hoạt động</span>
            </label>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
