import { useState } from 'react';
import { LogOut, Store, Calendar, List, Warehouse, Package, CalendarCheck } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { useBranches } from '../../contexts/BranchContext';
import { AdminLogin } from './AdminLogin';
import { ShiftSchedule } from './ShiftSchedule';
import { StoreManagerEmployeeList } from './StoreManagerEmployeeList';
import { StoreManagerAttendance } from './StoreManagerAttendance';
import { CrossBranchInventory } from './CrossBranchInventory';
import { InventoryDashboard } from './InventoryDashboard';

type StoreManagerTab = 'schedule' | 'list' | 'attendance' | 'stock' | 'materials';

const tabs: { id: StoreManagerTab; label: string; icon: typeof Calendar }[] = [
  { id: 'schedule', label: 'Sắp Lịch', icon: Calendar },
  { id: 'list', label: 'Danh Sách NV', icon: List },
  { id: 'attendance', label: 'Chấm Công', icon: CalendarCheck },
  { id: 'stock', label: 'Quản Lý Kho', icon: Warehouse },
  { id: 'materials', label: 'Nguyên Liệu', icon: Package },
];

/** Màn hình "Cửa hàng trưởng" độc lập — cùng đăng nhập với Admin/Nhân Sự (chức vụ Cửa hàng
 * trưởng) nhưng chỉ đưa vào 5 mục vận hành cửa hàng: sắp lịch, quản lý nhân viên (đăng ký +
 * danh sách — bao gồm gán chi nhánh hỗ trợ thêm cho nhân viên), quản lý kho (kho chi nhánh +
 * kho tổng gộp trong CrossBranchInventory), quản lý nguyên liệu. Tái dùng nguyên các component
 * thật đã có ở Admin/Nhân Sự, không dựng UI giả như bản cũ. */
export function StoreManagerApp() {
  const { adminUser, isLoggedIn, isLoading, logout } = useAdmin();
  const { branchLabel } = useBranches();
  const [activeTab, setActiveTab] = useState<StoreManagerTab>('schedule');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <AdminLogin
        title="FitBlend Cửa Hàng Trưởng"
        subtitle="Đăng nhập tài khoản Cửa hàng trưởng"
        submitLabel="Đăng nhập"
        icon={Store}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">Cửa Hàng Trưởng</h1>
            <p className="text-xs text-slate-500 truncate">
              {adminUser?.fullName}{adminUser?.branch ? ` · ${branchLabel(adminUser.branch)}` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 px-2.5 sm:px-3 py-2 rounded-lg hover:bg-red-50 shrink-0"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Đăng xuất
        </button>
      </header>

      <main className="p-3 sm:p-6 max-w-7xl mx-auto">
        <div className="mb-4 bg-white rounded-lg shadow p-1 overflow-x-auto hidden sm:block">
          <div className="flex gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded font-semibold text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pb-24 sm:pb-0">
          {activeTab === 'schedule' && <ShiftSchedule />}
          {activeTab === 'list' && <StoreManagerEmployeeList />}
          {activeTab === 'attendance' && <StoreManagerAttendance />}
          {activeTab === 'stock' && <CrossBranchInventory />}
          {activeTab === 'materials' && <InventoryDashboard />}
        </div>
      </main>

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
    </div>
  );
}
