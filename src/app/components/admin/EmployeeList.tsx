import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, X, Save, User } from 'lucide-react';
import { Employee } from './EmployeeRegistration';
import * as api from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';

const branches = [
  { id: 'ALL', name: 'Tất cả chi nhánh' },
  { id: 'CN1', name: 'CN1 - Quận 1' },
  { id: 'CN2', name: 'CN2 - Quận 3' },
  { id: 'CN3', name: 'CN3 - Thủ Đức' },
];

const positions = [
  { id: 'manager', name: 'Quản Lý' },
  { id: 'cashier', name: 'Thu Ngân' },
  { id: 'bartender', name: 'Pha Chế' },
  { id: 'server', name: 'Phục Vụ' },
  { id: 'cleaner', name: 'Vệ Sinh' },
  { id: 'online_sales', name: 'Bán Hàng Online' },
];

export function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [editForm, setEditForm] = useState<Employee | null>(null);
  const { subscribe } = useSSE();

  useEffect(() => {
    api.fetchEmployees()
      .then(data => setEmployees(data))
      .catch(err => console.error('Failed to load employees:', err));

    const unsubCreate = subscribe('EMPLOYEE_CREATED', (data) => {
      setEmployees(prev => (prev.some(e => e.id === data.id) ? prev : [...prev, data]));
    });
    const unsubUpdate = subscribe('EMPLOYEE_UPDATED', (data) => {
      setEmployees(prev => prev.map(e => e.id === data.id ? data : e));
    });
    const unsubDelete = subscribe('EMPLOYEE_DELETED', (data) => {
      setEmployees(prev => prev.filter(e => e.id !== data.id));
    });

    return () => { unsubCreate(); unsubUpdate(); unsubDelete(); };
  }, [subscribe]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa nhân viên này?')) return;
    try {
      await api.deleteEmployee(id);
    } catch (err) {
      console.error('Failed to delete employee:', err);
      alert('Lỗi xóa nhân viên.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    try {
      await api.saveEmployee(editForm);
      setEditForm(null);
    } catch (err) {
      console.error('Failed to update employee:', err);
      alert('Lỗi cập nhật nhân viên.');
    }
  };

  const filteredEmployees = employees
    .filter(emp => branchFilter === 'ALL' || emp.branch === branchFilter)
    .filter(emp =>
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm) ||
      emp.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.branch.localeCompare(b.branch) || a.employeeId.localeCompare(b.employeeId));

  const getPositionName = (id: string) => positions.find(p => p.id === id)?.name || id;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Danh Sách Nhân Viên</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filteredEmployees.length}/{employees.length} nhân viên
          </p>
        </div>
      </div>

      <div className="mb-4 bg-white rounded-xl shadow-md p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm tên, mã NV, email, SĐT, username..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
          />
        </div>
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium focus:border-emerald-500 outline-none"
        >
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {searchTerm || branchFilter !== 'ALL' ? 'Không tìm thấy nhân viên' : 'Chưa có nhân viên'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Mã NV</th>
                  <th className="px-4 py-3 min-w-[160px]">Họ và tên</th>
                  <th className="px-4 py-3">CN</th>
                  <th className="px-4 py-3">Chức vụ</th>
                  <th className="px-4 py-3">SĐT</th>
                  <th className="px-4 py-3 min-w-[180px]">Email</th>
                  <th className="px-4 py-3 text-right">Lương CB</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">MK</th>
                  <th className="px-4 py-3 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-700">{emp.employeeId}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {emp.photo ? (
                            <img src={emp.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-emerald-700">{emp.fullName.charAt(0)}</span>
                          )}
                        </div>
                        <span className="font-medium text-gray-800">{emp.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold text-gray-700">{emp.branch}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{getPositionName(emp.position)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.phone}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]" title={emp.email}>{emp.email}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">
                      {emp.baseSalary.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">{emp.username}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">{emp.password}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditForm({ ...emp })}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                          title="Sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-800">Sửa nhân viên — {editForm.employeeId}</h3>
              <button onClick={() => setEditForm(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="sm:col-span-2">
                <span className="text-xs font-semibold text-gray-500">Họ và tên</span>
                <input
                  value={editForm.fullName}
                  onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label>
                <span className="text-xs font-semibold text-gray-500">Email</span>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label>
                <span className="text-xs font-semibold text-gray-500">SĐT</span>
                <input
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label>
                <span className="text-xs font-semibold text-gray-500">Chi nhánh</span>
                <select
                  value={editForm.branch}
                  onChange={e => setEditForm({ ...editForm, branch: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500"
                >
                  {branches.filter(b => b.id !== 'ALL').map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-semibold text-gray-500">Chức vụ</span>
                <select
                  value={editForm.position}
                  onChange={e => setEditForm({ ...editForm, position: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500"
                >
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-semibold text-gray-500">Lương cơ bản</span>
                <input
                  type="number"
                  value={editForm.baseSalary}
                  onChange={e => setEditForm({ ...editForm, baseSalary: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label>
                <span className="text-xs font-semibold text-gray-500">Username</span>
                <input
                  value={editForm.username}
                  onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-semibold text-gray-500">Mật khẩu</span>
                <input
                  type="text"
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500"
                />
              </label>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Lưu
              </button>
              <button
                onClick={() => setEditForm(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
