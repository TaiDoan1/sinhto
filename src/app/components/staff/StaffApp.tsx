import { useState } from 'react';
import { Home, ClipboardList, UserCheck, User, Package, History, ArrowLeft } from 'lucide-react';
import { StaffPOS } from './StaffPOS';
import { StaffCheckout } from './StaffCheckout';
import { OrderFeed } from '../OrderFeed';
import { AttendanceModule } from '../AttendanceModule';
import { ProfilePage } from '../ProfilePage';
import { ComboList } from './ComboList';
import { HistoryList } from './HistoryList';
import { useOrders } from '../../contexts/OrderContext';
import type { CartItem } from './StaffModifierModal';

export function StaffApp() {
  const { orders } = useOrders();
  const [activeTab, setActiveTab] = useState<'pos' | 'orders' | 'profile'>('pos');
  const [profileSubView, setProfileSubView] = useState<'menu' | 'info' | 'attendance' | 'history' | 'combo'>('menu');
  const [checkoutCart, setCheckoutCart] = useState<CartItem[] | null>(null);
  const [clearCartTrigger, setClearCartTrigger] = useState(0);

  const handleCheckout = (cart: CartItem[]) => {
    setCheckoutCart(cart);
  };

  const handleCheckoutComplete = () => {
    setCheckoutCart(null);
    setClearCartTrigger(prev => prev + 1);
    setActiveTab('pos');
  };

  if (checkoutCart) {
    return (
      <StaffCheckout
        cart={checkoutCart}
        onBack={() => setCheckoutCart(null)}
        onComplete={handleCheckoutComplete}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'pos':
        return <StaffPOS onCheckout={handleCheckout} clearCartTrigger={clearCartTrigger} />;
      case 'orders':
        return <OrderFeed />;
      case 'profile':
        if (profileSubView === 'attendance') {
          return (
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-4 flex items-center gap-3 shadow-lg">
                <button onClick={() => setProfileSubView('menu')} className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">Chấm Công</h1>
              </div>
              <div className="flex-1 overflow-hidden">
                <AttendanceModule />
              </div>
            </div>
          );
        }
        if (profileSubView === 'history') {
          return (
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-4 flex items-center gap-3 shadow-lg">
                <button onClick={() => setProfileSubView('menu')} className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">Lịch Sử Giao Dịch</h1>
              </div>
              <div className="flex-1 overflow-hidden">
                <HistoryList />
              </div>
            </div>
          );
        }
        if (profileSubView === 'info') {
          return (
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-4 flex items-center gap-3 shadow-lg">
                <button onClick={() => setProfileSubView('menu')} className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">Thông Tin Cá Nhân</h1>
              </div>
              <div className="flex-1 overflow-hidden">
                <ProfilePage />
              </div>
            </div>
          );
        }
        if (profileSubView === 'combo') {
          return (
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-4 flex items-center gap-3 shadow-lg">
                <button onClick={() => setProfileSubView('menu')} className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">Quản Lý Combo</h1>
              </div>
              <div className="flex-1 overflow-hidden">
                <ComboList />
              </div>
            </div>
          );
        }
        // Menu view
        return (
          <div className="h-full bg-gray-50 overflow-y-auto pb-20">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-6 pb-8">
              <h1 className="text-2xl font-bold mb-1">Cá Nhân</h1>
              <p className="text-sm opacity-90">Nguyễn Văn An</p>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => setProfileSubView('info')}
                className="w-full bg-white rounded-xl shadow-md p-4 flex items-center gap-4 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-800">Thông Tin Cá Nhân</div>
                  <div className="text-sm text-gray-600">Xem và chỉnh sửa hồ sơ</div>
                </div>
              </button>

              <button
                onClick={() => setProfileSubView('attendance')}
                className="w-full bg-white rounded-xl shadow-md p-4 flex items-center gap-4 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-800">Chấm Công</div>
                  <div className="text-sm text-gray-600">Check-in/out và xem lịch sử</div>
                </div>
              </button>

              <button
                onClick={() => setProfileSubView('history')}
                className="w-full bg-white rounded-xl shadow-md p-4 flex items-center gap-4 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <History className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-800">Lịch Sử Giao Dịch</div>
                  <div className="text-sm text-gray-600">Xem các đơn đã hoàn thành</div>
                </div>
              </button>

              <button
                onClick={() => setProfileSubView('combo')}
                className="w-full bg-white rounded-xl shadow-md p-4 flex items-center gap-4 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-800">Quản Lý Combo</div>
                  <div className="text-sm text-gray-600">Theo dõi combo của khách hàng</div>
                </div>
              </button>
            </div>
          </div>
        );
      default:
        return <StaffPOS onCheckout={handleCheckout} clearCartTrigger={clearCartTrigger} />;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg safe-area-inset-bottom">
        <div className="flex">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'pos'
                ? 'text-emerald-700'
                : 'text-gray-400'
            }`}
          >
            <Home className="w-7 h-7" />
            <span className="text-sm font-semibold">Bán Hàng</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors relative ${
              activeTab === 'orders'
                ? 'text-emerald-700'
                : 'text-gray-400'
            }`}
          >
            <div className="relative">
              <ClipboardList className="w-7 h-7" />
              {orders.length > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                  {orders.length}
                </div>
              )}
            </div>
            <span className="text-sm font-semibold">Đơn Hàng</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              setProfileSubView('menu');
            }}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'profile'
                ? 'text-emerald-700'
                : 'text-gray-400'
            }`}
          >
            <User className="w-7 h-7" />
            <span className="text-sm font-semibold">Cá Nhân</span>
          </button>
        </div>
      </div>
    </div>
  );
}
