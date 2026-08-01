import { useState } from 'react';
import { Users, UserPlus, List, Calendar, Settings, Package } from 'lucide-react';
import { HRPayroll } from './HRPayroll';
import { EmployeeRegistration } from './EmployeeRegistration';
import { EmployeeList } from './EmployeeList';
import { ShiftSchedule } from './ShiftSchedule';
import { EmployeeProfileConfig } from './EmployeeProfileConfig';
import { CrossBranchInventory } from './CrossBranchInventory';
import { useAdmin } from '../../contexts/AdminContext';

type HRTab = 'payroll' | 'register' | 'list' | 'schedule' | 'config' | 'inventory';

interface HRManagementProps {
  /** Ẩn 2 tab Cài Đặt Lương/OT bên trong Bảng Lương — dùng cho màn hình Nhân Sự thu gọn. */
  hidePayrollSettings?: boolean;
  /** Lịch Làm Việc chỉ xem, không cho duyệt/thêm/sửa/xóa ca — dùng cho màn hình Nhân Sự thu gọn. */
  readOnlySchedule?: boolean;
}

export function HRManagement({ hidePayrollSettings = false, readOnlySchedule = false }: HRManagementProps = {}) {
  const { adminUser } = useAdmin();
  const isStoreManager = adminUser?.position === 'store_manager';

  // Store manager chỉ thấy 3 tabs: Lịch Làm Việc, Danh Sách NV, Quản Lý Kho
  const storeManagerTabs = [
    { id: 'schedule' as HRTab, label: 'Lịch Làm Việc', icon: Calendar },
    { id: 'list' as HRTab, label: 'Danh Sách NV', icon: List },
    { id: 'inventory' as HRTab, label: 'Quản Lý Kho', icon: Package },
  ];

  const adminTabs = [
    { id: 'schedule' as HRTab, label: 'Lịch Làm Việc', icon: Calendar },
    { id: 'register' as HRTab, label: 'Đăng Ký NV', icon: UserPlus },
    { id: 'list' as HRTab, label: 'Danh Sách NV', icon: List },
    { id: 'config' as HRTab, label: 'Cấu Hình NV', icon: Settings },
    { id: 'payroll' as HRTab, label: 'Bảng Lương', icon: Users },
  ];

  const tabs = isStoreManager ? storeManagerTabs : adminTabs;
  const [activeTab, setActiveTab] = useState<HRTab>(isStoreManager ? 'inventory' : 'schedule');

  return (
    <div>
      <div className="mb-4 bg-white rounded-lg shadow p-1 overflow-x-auto">
        <div className="flex gap-1 min-w-min sm:gap-2 sm:min-w-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-1.5 sm:py-2 rounded font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 sm:w-5 h-4 sm:h-5" />
                <span className="text-xs sm:text-sm leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {activeTab === 'payroll' && <HRPayroll hideSettingsTabs={hidePayrollSettings} />}
        {activeTab === 'schedule' && <ShiftSchedule readOnly={readOnlySchedule} />}
        {activeTab === 'register' && <EmployeeRegistration />}
        {activeTab === 'list' && <EmployeeList />}
        {activeTab === 'config' && <EmployeeProfileConfig />}
        {activeTab === 'inventory' && <CrossBranchInventory />}
      </div>
    </div>
  );
}
