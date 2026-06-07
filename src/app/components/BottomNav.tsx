import { ClipboardList, UserCheck, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'orders' | 'attendance' | 'profile';
  onTabChange: (tab: 'orders' | 'attendance' | 'profile') => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-md mx-auto flex">
        <button
          onClick={() => onTabChange('orders')}
          className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'orders'
              ? 'text-emerald-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ClipboardList className="w-6 h-6" />
          <span className="text-xs font-semibold">Đơn Hàng</span>
        </button>

        <button
          onClick={() => onTabChange('attendance')}
          className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'attendance'
              ? 'text-emerald-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <UserCheck className="w-6 h-6" />
          <span className="text-xs font-semibold">Điểm Danh</span>
        </button>

        <button
          onClick={() => onTabChange('profile')}
          className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'profile'
              ? 'text-emerald-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs font-semibold">Trang Cá Nhân</span>
        </button>
      </div>
    </div>
  );
}
