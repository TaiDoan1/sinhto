import { LayoutDashboard, TrendingUp, Users, Package, Settings, LogOut, Award } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'overview', label: 'Tổng Quan', icon: LayoutDashboard },
    { id: 'analytics', label: 'Doanh Thu', icon: TrendingUp },
    { id: 'hr', label: 'Nhân Sự & Lương', icon: Users },
    { id: 'inventory', label: 'Kho Hàng', icon: Package },
    { id: 'affiliate', label: 'PT & Affiliate', icon: Award },
    { id: 'settings', label: 'Cài Đặt', icon: Settings },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-emerald-700 to-blue-800 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-emerald-600">
        <h1 className="text-2xl font-bold">FitBlend</h1>
        <p className="text-sm text-blue-200 mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === item.id
                      ? 'bg-white text-emerald-700 shadow-lg'
                      : 'hover:bg-emerald-800 text-emerald-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-emerald-600">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
            <span className="font-bold">AD</span>
          </div>
          <div>
            <div className="font-semibold">Admin</div>
            <div className="text-xs text-blue-200">Quản trị viên</div>
          </div>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-emerald-800 text-emerald-100 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Đăng Xuất</span>
        </button>
      </div>
    </div>
  );
}
