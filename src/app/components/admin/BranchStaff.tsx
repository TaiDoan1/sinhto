import { UserPlus, Mail, Phone, Calendar, Users } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  joinDate: string;
  status: 'active' | 'inactive';
}

const mockStaff: Record<string, StaffMember[]> = {
  CN1: [
    {
      id: 'NV-001',
      name: 'Nguyễn Văn An',
      role: 'Nhân viên bán hàng',
      phone: '0901234567',
      email: 'an.nguyen@smoothie.vn',
      joinDate: '2024-01-15',
      status: 'active'
    },
    {
      id: 'NV-002',
      name: 'Trần Thị Bình',
      role: 'Nhân viên pha chế',
      phone: '0907654321',
      email: 'binh.tran@smoothie.vn',
      joinDate: '2024-02-20',
      status: 'active'
    },
  ],
};

interface BranchStaffProps {
  branchId: string;
}

export function BranchStaff({ branchId }: BranchStaffProps) {
  const staff = mockStaff[branchId] || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Danh Sách Nhân Viên ({staff.length})
        </h2>
        <button className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
          <UserPlus className="w-5 h-5" />
          Thêm Nhân Viên
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">Chưa có nhân viên nào</p>
          <button className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
            Thêm nhân viên đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {staff.map(member => (
            <div key={member.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-700 font-bold text-lg">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.role}</p>
                    </div>
                    <span className="ml-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                      {member.id}
                    </span>
                    {member.status === 'active' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        Đang làm việc
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{member.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Tham gia: {new Date(member.joinDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors">
                    Chỉnh sửa
                  </button>
                  <button className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-colors">
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
