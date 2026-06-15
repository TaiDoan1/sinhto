import { useState } from 'react';
import { Users, UserPlus, List, Calendar, Settings } from 'lucide-react';
import { HRPayroll } from './HRPayroll';
import { EmployeeRegistration } from './EmployeeRegistration';
import { EmployeeList } from './EmployeeList';
import { ShiftSchedule } from './ShiftSchedule';
import { EmployeeProfileConfig } from './EmployeeProfileConfig';

type HRTab = 'payroll' | 'register' | 'list' | 'schedule' | 'config';

export function HRManagement() {
  const [activeTab, setActiveTab] = useState<HRTab>('schedule');

  const tabs = [
    { id: 'schedule' as HRTab, label: 'Lịch Làm Việc', icon: Calendar },
    { id: 'register' as HRTab, label: 'Đăng Ký NV', icon: UserPlus },
    { id: 'list' as HRTab, label: 'Danh Sách NV', icon: List },
    { id: 'config' as HRTab, label: 'Cấu Hình NV', icon: Settings },
    { id: 'payroll' as HRTab, label: 'Bảng Lương', icon: Users },
  ];

  return (
    <div>
      <div className="mb-6 bg-white rounded-xl shadow-lg p-2">
        <div className="flex gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
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
      </div>
    </div>
  );
}
