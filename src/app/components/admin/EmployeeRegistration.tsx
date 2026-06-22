import { useState } from 'react';
import { UserPlus, Save, X, CheckCircle, Upload, Camera } from 'lucide-react';
import * as api from '../../utils/api';

export interface Employee {
  id: string;
  fullName: string;
  employeeId: string;
  email: string;
  phone: string;
  idNumber: string;
  dateOfBirth: string;
  address: string;
  branch: string;
  position: string;
  baseSalary: number;
  startDate: string;
  photo?: string;
  username: string;
  password: string;
}

interface EmployeeFormData {
  fullName: string;
  employeeId: string;
  email: string;
  phone: string;
  idNumber: string;
  dateOfBirth: string;
  address: string;
  branch: string;
  position: string;
  baseSalary: string;
  startDate: string;
  username: string;
  password: string;
}

const initialFormData: EmployeeFormData = {
  fullName: '',
  employeeId: '',
  email: '',
  phone: '',
  idNumber: '',
  dateOfBirth: '',
  address: '',
  branch: '',
  position: '',
  baseSalary: '',
  startDate: '',
  username: '',
  password: '',
};

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
  { id: 'online_sales', name: 'Bán Hàng Online' },
];

export function EmployeeRegistration() {
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newEmployee: Employee = {
      id: Date.now().toString(),
      ...formData,
      baseSalary: Number(formData.baseSalary),
      photo: photoPreview,
    };

    try {
      await api.saveEmployee(newEmployee);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setFormData(initialFormData);
        setPhotoPreview('');
      }, 3000);
    } catch (err) {
      console.error('Failed to save employee:', err);
      alert('Lỗi lưu nhân viên. Vui lòng thử lại.');
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setPhotoPreview('');
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Đăng Ký Nhân Viên Mới</h1>
          <p className="text-gray-600 mt-1">Điền thông tin đầy đủ để tạo hồ sơ nhân viên</p>
        </div>
        <UserPlus className="w-12 h-12 text-emerald-700" />
      </div>

      {showSuccess && (
        <div className="mb-6 bg-green-100 border-l-4 border-green-500 p-4 rounded-lg animate-pulse">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-bold text-green-800">Đăng ký thành công!</h3>
              <p className="text-green-700 text-sm">Thông tin nhân viên đã được lưu vào hệ thống.</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Thông tin cá nhân */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-emerald-600">
              Thông Tin Cá Nhân
            </h2>
          </div>

          {/* Photo Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ảnh Nhân Viên
            </label>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <label
                  htmlFor="photo-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg font-semibold hover:bg-blue-200 transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  Chọn Ảnh
                </label>
                <p className="text-xs text-gray-500 mt-2">Định dạng: JPG, PNG. Kích thước tối đa: 5MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Họ và Tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mã Nhân Viên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
              placeholder="NV-001"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Số Điện Thoại <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
              placeholder="0901234567"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CCCD/CMND <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
              placeholder="001234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ngày Sinh <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Địa Chỉ <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              rows={2}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors resize-none"
              placeholder="Số nhà, đường, phường, quận, thành phố"
            />
          </div>

          {/* Thông tin tài khoản */}
          <div className="md:col-span-2 mt-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-emerald-500">
              Thông Tin Tài Khoản
            </h2>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tên Đăng Nhập <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
              placeholder="username"
            />
            <p className="text-xs text-gray-500 mt-1">Tên đăng nhập để truy cập ứng dụng nhân viên</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mật Khẩu <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={6}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">Tối thiểu 6 ký tự</p>
          </div>

          {/* Thông tin công việc */}
          <div className="md:col-span-2 mt-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-green-500">
              Thông Tin Công Việc
            </h2>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chi Nhánh <span className="text-red-500">*</span>
            </label>
            <select
              name="branch"
              value={formData.branch}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
            >
              <option value="">-- Chọn chi nhánh --</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Vị Trí <span className="text-red-500">*</span>
            </label>
            <select
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
            >
              <option value="">-- Chọn vị trí --</option>
              {positions.map(position => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Lương Cơ Bản (VNĐ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="baseSalary"
              value={formData.baseSalary}
              onChange={handleInputChange}
              required
              min="0"
              step="100000"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
              placeholder="8000000"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ngày Bắt Đầu <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex gap-4 justify-end border-t pt-6">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Xóa Form
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white rounded-lg font-semibold hover:from-emerald-800 hover:to-blue-800 transition-all shadow-lg flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Đăng Ký Nhân Viên
          </button>
        </div>
      </form>

      {/* Info box */}
      <div className="mt-6 space-y-4">
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">Lưu ý khi đăng ký nhân viên:</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Tất cả các trường có dấu (*) là bắt buộc phải điền</li>
            <li>Mã nhân viên phải là duy nhất trong hệ thống</li>
            <li>Email sẽ được sử dụng để gửi thông tin đăng nhập</li>
            <li>Thông tin CCCD/CMND cần chính xác để làm hợp đồng lao động</li>
            <li>Lương cơ bản chưa bao gồm phụ cấp và thưởng</li>
          </ul>
        </div>

        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg">
          <h3 className="font-bold text-emerald-800 mb-2">Thông tin tài khoản:</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Tên đăng nhập và mật khẩu sẽ được sử dụng để nhân viên đăng nhập vào ứng dụng</li>
            <li>Mật khẩu phải có ít nhất 6 ký tự</li>
            <li>Nên hướng dẫn nhân viên đổi mật khẩu sau lần đăng nhập đầu tiên</li>
            <li>Tên đăng nhập không thể trùng lặp trong hệ thống</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
