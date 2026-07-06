import { useState, useEffect } from 'react';
import { Users, Clock, Package, Bell, LogIn, LogOut } from 'lucide-react';
import { CskhCheckin } from './CskhCheckin';
import { OnlineOrderCreation } from './OnlineOrderCreation';
import { DeliveryAlerts } from './DeliveryAlerts';
import { CustomerManagement } from './CustomerManagement';
import * as api from '../../utils/api';

export type CskhTab = 'checkin' | 'orders' | 'customers' | 'alerts';

interface CskhSession {
  id: string;
  cskhId: string;
  cskhName: string;
  checkinTime: string;
  checkoutTime?: string;
  status: 'active' | 'completed';
  branchId?: string;
}

export function CskhOnlineApp() {
  const [activeTab, setActiveTab] = useState<CskhTab>('checkin');
  const [currentSession, setCurrentSession] = useState<CskhSession | null>(null);
  const [cskhId, setCskhId] = useState('');
  const [cskhName, setCskhName] = useState('');
  const [loading, setLoading] = useState(false);

  const tabs: { id: CskhTab; label: string; icon: typeof Users }[] = [
    { id: 'checkin', label: 'Check-in/out', icon: Clock },
    { id: 'orders', label: 'Đặt đơn', icon: Package },
    { id: 'customers', label: 'Khách hàng', icon: Users },
    { id: 'alerts', label: 'Cảnh báo', icon: Bell },
  ];

  const handleCheckin = async () => {
    if (!cskhId || !cskhName) {
      alert('Vui lòng nhập ID và tên CSKH');
      return;
    }
    setLoading(true);
    try {
      const result = await api.post('/api/cskh/checkin', {
        cskhId,
        cskhName,
        branchId: 'CN1',
      });
      setCurrentSession(result);
    } catch (error) {
      console.error('Check-in failed:', error);
      alert('Check-in thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentSession) return;
    setLoading(true);
    try {
      const result = await api.patch(`/api/cskh/checkout/${currentSession.id}`, {});
      setCurrentSession(result);
      alert('Check-out thành công');
    } catch (error) {
      console.error('Check-out failed:', error);
      alert('Check-out thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="max-w-md mx-auto pt-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-blue-600 rounded-2xl flex items-center justify-center">
                <LogIn className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
              CSKH Online
            </h1>
            <p className="text-gray-600 text-center mb-8">
              Quản lý đơn hàng online từ Facebook, Zalo
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ID CSKH
                </label>
                <input
                  type="text"
                  value={cskhId}
                  onChange={(e) => setCskhId(e.target.value)}
                  placeholder="e.g., CSKH-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên CSKH
                </label>
                <input
                  type="text"
                  value={cskhName}
                  onChange={(e) => setCskhName(e.target.value)}
                  placeholder="e.g., Nguyễn Văn A"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleCheckin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Đang check-in...' : 'Check-in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">CSKH Online</h1>
            <p className="text-sm text-gray-600">
              👤 {currentSession.cskhName} · {new Date(currentSession.checkinTime).toLocaleTimeString('vi-VN')}
            </p>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            Check-out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'checkin' && <CskhCheckin session={currentSession} />}
        {activeTab === 'orders' && <OnlineOrderCreation cskhId={currentSession.cskhId} cskhName={currentSession.cskhName} />}
        {activeTab === 'customers' && <CustomerManagement cskhId={currentSession.cskhId} />}
        {activeTab === 'alerts' && <DeliveryAlerts cskhId={currentSession.cskhId} />}
      </div>
    </div>
  );
}
