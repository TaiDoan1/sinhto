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
  /** Chuyển thanh tab chính xuống thanh điều hướng cố định ở đáy màn hình trên điện thoại
   * (giống EmployeeBottomNav bên app Nhân Viên) thay vì dải tab cuộn ngang phía trên — dùng cho
   * màn hình Nhân Sự thu gọn để bấm chuyển mục dễ hơn bằng ngón cái. */
  useBottomNavOnMobile?: boolean;
  /** Ẩn tab Cấu Hình NV — dùng cho màn hình Nhân Sự thu gọn. */
  hideConfigTab?: boolean;
}

export function HRManagement({ hidePayrollSettings = false, readOnlySchedule = false, useBottomNavOnMobile = false, hideConfigTab = false }: HRManagementProps = {}) {
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
  ].filter(t => !(hideConfigTab && t.id === 'config'));

  const tabs = isStoreManager ? storeManagerTabs : adminTabs;
  const [activeTab, setActiveTab] = useState<HRTab>(isStoreManager ? 'inventory' : 'schedule');

  return (
    <div>
      <div className={`mb-4 bg-white rounded-lg shadow p-1 overflow-x-auto ${useBottomNavOnMobile ? 'hidden sm:block' : ''}`}>
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

      <div className={useBottomNavOnMobile ? 'pb-24 sm:pb-0' : ''}>
        {activeTab === 'payroll' && <HRPayroll hideSettingsTabs={hidePayrollSettings} />}
        {activeTab === 'schedule' && <ShiftSchedule readOnly={readOnlySchedule} />}
        {activeTab === 'register' && <EmployeeRegistration />}
        {activeTab === 'list' && <EmployeeList />}
        {activeTab === 'config' && <EmployeeProfileConfig />}
        {activeTab === 'inventory' && <CrossBranchInventory />}
      </div>

      {/* Thanh điều hướng cố định đáy màn hình trên điện thoại — cùng kiểu EmployeeBottomNav
          bên app Nhân Viên, dễ bấm bằng ngón cái hơn dải tab cuộn ngang phía trên. */}
      {useBottomNavOnMobile && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-colors active:scale-95 ${
                    active ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  <div className={`p-1 rounded-xl transition-colors ${active ? 'bg-emerald-50' : ''}`}>
                    <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : ''}`} />
                  </div>
                  <span className={`text-[11px] leading-tight text-center px-0.5 ${active ? 'font-bold' : 'font-medium'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
