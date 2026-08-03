import { LogOut, Users, UserCog } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { useBranches } from '../../contexts/BranchContext';
import { AdminLogin } from './AdminLogin';
import { HRManagement } from './HRManagement';

/** Màn hình "Nhân Sự" độc lập — cùng đăng nhập với Admin (chức vụ Quản lý chi nhánh/Cửa hàng
 * trưởng) nhưng chỉ đưa thẳng vào Nhân Sự & Bảng Lương (lịch làm, đăng ký/chỉnh NV, bảng lương,
 * lịch sử check-in/out), không kèm các mục quản lý cửa hàng khác không liên quan (kho, sản phẩm,
 * doanh thu...) — dùng cho người chỉ phụ trách nhân sự/tính lương, không cần toàn quyền Admin. */
export function HrApp() {
  const { adminUser, isLoggedIn, isLoading, logout } = useAdmin();
  const { branchLabel } = useBranches();

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
        title="FitBlend Nhân Sự"
        subtitle="Đăng nhập tài khoản Nhân Sự / Quản lý chi nhánh"
        submitLabel="Đăng nhập Nhân Sự"
        icon={UserCog}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-900 leading-tight">Nhân Sự</h1>
            <p className="text-xs text-slate-500 truncate">
              {adminUser?.fullName}{adminUser?.branch ? ` · ${branchLabel(adminUser.branch)}` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </header>

      <main className="p-3 sm:p-6 max-w-7xl mx-auto">
        <HRManagement hidePayrollSettings readOnlySchedule useBottomNavOnMobile hideConfigTab />
      </main>
    </div>
  );
}
