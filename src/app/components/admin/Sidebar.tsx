import { LayoutDashboard, TrendingUp, Users, Package, Settings, LogOut, ShoppingBag, Coffee, Award, Globe, Truck } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { adminUser, logout } = useAdmin();

  const menuItems = [
    { id: 'overview', label: 'Quản Lý CH', icon: LayoutDashboard },
    { id: 'analytics', label: 'Doanh Thu', icon: TrendingUp },
    { id: 'hr', label: 'Nhân Sự & Lương', icon: Users },
    { id: 'inventory', label: 'Danh Mục NL', icon: Package },
    { id: 'products', label: 'Sản Phẩm', icon: ShoppingBag },
    { id: 'combos', label: 'Quản Lý Combo', icon: Coffee },
    { id: 'combo-ship', label: 'Giao Combo Hôm Nay', icon: Truck },
    { id: 'online-sales', label: 'Bán Hàng Online', icon: Globe },
    { id: 'loyalty', label: 'Tích Điểm KH', icon: Award },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-emerald-700 to-blue-800 text-white h-screen fixed left-0 top-0 flex flex-col z-40">
      <div className="p-6 border-b border-emerald-600">
        <h1 className="text-2xl font-bold">FitBlend</h1>
        <p className="text-sm text-blue-200 mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === item.id
                      ? 'bg-white text-emerald-700 shadow-lg'
                      : 'hover:bg-emerald-800 text-emerald-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold text-sm">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-emerald-600">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center shrink-0">
            <span className="font-bold text-sm">{adminUser?.fullName?.charAt(0) || 'A'}</span>
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{adminUser?.fullName || 'Admin'}</div>
            <div className="text-xs text-blue-200 truncate">{adminUser?.employeeId}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-emerald-800 text-emerald-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Đăng Xuất</span>
        </button>
      </div>
    </div>
  );
}
