import { UserPlus, Phone, Mail, Calendar, Users, Edit2, Trash2, X, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as api from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';
import type { Employee } from '../../types/employee';
import { POSITION_LABELS } from '../../types/employee';

const positions = [
  { id: 'manager', name: 'Quản Lý Chi Nhánh' },
  { id: 'cashier', name: 'Thu Ngân' },
  { id: 'bartender', name: 'Pha Chế' },
  { id: 'server', name: 'Phục Vụ' },
  { id: 'cleaner', name: 'Vệ Sinh' },
];

interface BranchStaffProps {
  branchId: string;
  branchName?: string;
}

const emptyEmployee: Partial<Employee> = {
  fullName: '',
  employeeId: '',
  email: '',
  phone: '',
  position: 'cashier',
  username: '',
  password: '123',
  startDate: new Date().toISOString().slice(0, 10),
  baseSalary: 0,
  address: '',
  idNumber: '',
  dateOfBirth: '',
};

export function BranchStaff({ branchId, branchName }: BranchStaffProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee> | null>(null);
  const [saving, setSaving] = useState(false);
  const { subscribe } = useSSE();

  const load = () => {
    api.fetchEmployees()
      .then((data) => setEmployees(data.filter((e: Employee) => e.branch === branchId)))
      .catch((err) => console.error('Failed to load employees:', err));
  };

  useEffect(() => {
    load();
    const unsubCreate = subscribe('EMPLOYEE_CREATED', (data: Employee) => {
      if (data.branch === branchId) setEmployees((prev) => [...prev, data]);
    });
    const unsubUpdate = subscribe('EMPLOYEE_UPDATED', (data: Employee) => {
      setEmployees((prev) => {
        if (data.branch !== branchId) return prev.filter((e) => e.id !== data.id);
        const exists = prev.some((e) => e.id === data.id);
        return exists ? prev.map((e) => (e.id === data.id ? data : e)) : [...prev, data];
      });
    });
    const unsubDelete = subscribe('EMPLOYEE_DELETED', (data: { id: string }) => {
      setEmployees((prev) => prev.filter((e) => e.id !== data.id));
    });
    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
    };
  }, [branchId, subscribe]);

  const openAdd = () => {
    setEditForm({ ...emptyEmployee, branch: branchId });
    setShowForm(true);
  };

  const openEdit = (emp: Employee) => {
    setEditForm({ ...emp, password: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editForm?.fullName?.trim() || !editForm.username?.trim()) {
      alert('Vui lòng nhập họ tên và tên đăng nhập');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        branch: branchId,
        password: editForm.password || undefined,
      };
      await api.saveEmployee(payload);
      setShowForm(false);
      setEditForm(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa nhân viên này khỏi chi nhánh?')) return;
    try {
      await api.deleteEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert('Xóa thất bại');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Nhân viên {branchName ? `— ${branchName}` : ''} ({employees.length})
        </h2>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Thêm nhân viên
        </button>
      </div>

      {employees.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">Chưa có nhân viên tại chi nhánh này</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Thêm nhân viên đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {employees.map((member) => (
            <div key={member.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-emerald-700 font-bold text-lg">
                        {member.fullName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{member.fullName}</h3>
                      <p className="text-sm text-gray-600">
                        {POSITION_LABELS[member.position] || member.position}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                      {member.employeeId}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      {member.phone || '—'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      {member.email || '—'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      Vào làm:{' '}
                      {member.startDate
                        ? new Date(member.startDate).toLocaleDateString('vi-VN')
                        : '—'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Đăng nhập: {member.username}</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(member)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                    title="Sửa"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(member.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                    title="Xóa"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-bold">
                {editForm.id ? 'Sửa nhân viên' : 'Thêm nhân viên'} — {branchId}
              </h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <input
                placeholder="Họ và tên *"
                value={editForm.fullName || ''}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                placeholder="Mã NV (VD: NV-015)"
                value={editForm.employeeId || ''}
                onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <select
                value={editForm.position || 'cashier'}
                onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Số điện thoại"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                placeholder="Email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                placeholder="Tên đăng nhập *"
                value={editForm.username || ''}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <input
                type="password"
                placeholder={editForm.id ? 'Mật khẩu mới (để trống = giữ cũ)' : 'Mật khẩu (mặc định 123)'}
                value={editForm.password || ''}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Đang lưu...' : 'Lưu nhân viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
