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

export function HRManagement() {
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
      <div className="mb-6 bg-white rounded-xl shadow-lg p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-min sm:min-w-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-base transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 sm:w-5 h-4 sm:h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {activeTab === 'payroll' && <HRPayroll />}
        {activeTab === 'schedule' && <ShiftSchedule />}
        {activeTab === 'register' && <EmployeeRegistration />}
        {activeTab === 'list' && <EmployeeList />}
        {activeTab === 'config' && <EmployeeProfileConfig />}
        {activeTab === 'inventory' && <CrossBranchInventory />}
      </div>
    </div>
  );
}
