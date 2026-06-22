import { User, Clock, Calendar } from 'lucide-react';

export type EmployeeTab = 'info' | 'attendance' | 'schedule';

interface EmployeeBottomNavProps {
  activeTab: EmployeeTab;
  onTabChange: (tab: EmployeeTab) => void;
}

const tabs: { id: EmployeeTab; label: string; icon: typeof User }[] = [
  { id: 'attendance', label: 'Chấm công', icon: Clock },
  { id: 'schedule', label: 'Lịch làm', icon: Calendar },
  { id: 'info', label: 'Cá nhân', icon: User },
];

export function EmployeeBottomNav({ activeTab, onTabChange }: EmployeeBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-colors active:scale-95 ${
                active ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${active ? 'bg-emerald-50' : ''}`}>
                <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : ''}`} />
              </div>
              <span className={`text-[11px] leading-tight ${active ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
