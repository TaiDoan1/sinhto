import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, X, Save, User } from 'lucide-react';
import { Employee } from './EmployeeRegistration';
import { EmployeeCredentials } from './EmployeeCredentials';
import * as api from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';

const branches = [
  { id: 'CN1', name: 'Chi Nhánh 1 - Quận 1' },
  { id: 'CN2', name: 'Chi Nhánh 2 - Quận 3' },
  { id: 'CN3', name: 'Chi Nhánh 3 - Thủ Đức' },
];

const positions = [
  { id: 'manager', name: 'Quản Lý Chi Nhánh' },
  { id: 'cashier', name: 'Thu Ngân' },
  { id: 'bartender', name: 'Pha Chế' },
  { id: 'server', name: 'Phục Vụ' },
  { id: 'cleaner', name: 'Vệ Sinh' },
];

export function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Employee | null>(null);
  const { subscribe } = useSSE();

  useEffect(() => {
    // Load employees from backend
    api.fetchEmployees()
      .then(data => setEmployees(data))
      .catch(err => console.error('Failed to load employees:', err));

    const unsubCreate = subscribe('EMPLOYEE_CREATED', (data) => {
      setEmployees(prev => {
        if (prev.some(e => e.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    const unsubUpdate = subscribe('EMPLOYEE_UPDATED', (data) => {
      setEmployees(prev => prev.map(e => e.id === data.id ? data : e));
    });

    const unsubDelete = subscribe('EMPLOYEE_DELETED', (data) => {
      setEmployees(prev => prev.filter(e => e.id !== data.id));
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
    };
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

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setEditForm({ ...employee });
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    try {
      await api.saveEmployee(editForm);
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      console.error('Failed to update employee:', err);
      alert('Lỗi cập nhật nhân viên.');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBranchName = (id: string) => branches.find(b => b.id === id)?.name || id;
  const getPositionName = (id: string) => positions.find(p => p.id === id)?.name || id;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Danh Sách Nhân Viên</h1>
          <p className="text-gray-600 mt-1">Quản lý thông tin nhân viên trong hệ thống</p>
        </div>
        <div className="text-2xl font-bold text-emerald-700">
          {employees.length} nhân viên
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 bg-white rounded-xl shadow-lg p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, mã NV, hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Employee Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {searchTerm ? 'Không tìm thấy nhân viên nào' : 'Chưa có nhân viên nào được đăng ký'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map(employee => (
            <div key={employee.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {editingId === employee.id && editForm ? (
                // Edit Mode
                <div className="p-6">
                  <div className="mb-4">
                    <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {editForm.photo ? (
                        <img src={editForm.photo} alt={editForm.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm"
                      placeholder="Họ và tên"
                    />

                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm"
                      placeholder="Email"
                    />

                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm"
                      placeholder="Số điện thoại"
                    />

                    <select
                      value={editForm.branch}
                      onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm"
                    >
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>

                    <select
                      value={editForm.position}
                      onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm"
                    >
                      {positions.map(position => (
                        <option key={position.id} value={position.id}>{position.name}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={editForm.baseSalary}
                      onChange={(e) => setEditForm({ ...editForm, baseSalary: Number(e.target.value) })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm"
                      placeholder="Lương cơ bản"
                    />

                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm"
                      placeholder="Username"
                    />

                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm"
                      placeholder="Password"
                    />
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Lưu
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
                        {employee.photo ? (
                          <img src={employee.photo} alt={employee.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{employee.fullName}</h3>
                        <p className="text-sm text-emerald-100">{employee.employeeId}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold">Vị trí</div>
                      <div className="text-sm font-medium text-gray-800">{getPositionName(employee.position)}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold">Chi nhánh</div>
                      <div className="text-sm font-medium text-gray-800">{getBranchName(employee.branch)}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold">Email</div>
                      <div className="text-sm text-gray-700 truncate">{employee.email}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold">Điện thoại</div>
                      <div className="text-sm text-gray-700">{employee.phone}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold">Lương cơ bản</div>
                      <div className="text-sm font-bold text-green-600">
                        {employee.baseSalary.toLocaleString('vi-VN')} đ
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold">Ngày bắt đầu</div>
                      <div className="text-sm text-gray-700">
                        {new Date(employee.startDate).toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    <EmployeeCredentials username={employee.username} password={employee.password} />
                  </div>

                  <div className="px-6 pb-6 flex gap-2">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="flex-1 bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Xóa
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
