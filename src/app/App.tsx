import { useState, useEffect } from 'react';
import { Sidebar } from './components/admin/Sidebar';
import { BranchOverview } from './components/admin/BranchOverview';
import { RevenueAnalytics } from './components/admin/RevenueAnalytics';
import { HRManagement } from './components/admin/HRManagement';
import { InventoryDashboard } from './components/admin/InventoryDashboard';
import { POSInterface } from './components/pos/POSInterface';
import { StaffApp } from './components/staff/StaffApp';
import { CustomerApp } from './components/customer/CustomerApp';
import { ShipperApp } from './components/shipper/ShipperApp';
import { PartnerDashboard } from './components/customer/PartnerDashboard';
import { ProductManagement } from './components/admin/ProductManagement';
import { ComboManagement } from './components/admin/ComboManagement';
import { LoyaltyManagement } from './components/admin/LoyaltyManagement';
import { OrderProvider } from './contexts/OrderContext';
import { ComboProvider } from './contexts/ComboContext';
import { InventoryProvider } from './contexts/InventoryContext';
import { AffiliateProvider, useAffiliate } from './contexts/AffiliateContext';
import { SSEProvider } from './contexts/SSEContext';
import { MenuProvider } from './contexts/MenuContext';
import { LoyaltyProvider } from './contexts/LoyaltyContext';
import { EmployeeProvider } from './contexts/EmployeeContext';

function AppContent() {
  const { resolveCode } = useAffiliate();
  const [mode, setMode] = useState<'staff' | 'admin' | 'pos' | 'customer' | 'shipper' | 'partner'>('customer');
  const [adminView, setAdminView] = useState('overview');
  const [showNav, setShowNav] = useState(true);

  useEffect(() => {
    // Capture PT referral code from URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref') || params.get('pt');
    if (refCode) {
      const pt = resolveCode(refCode);
      if (pt) {
        localStorage.setItem('activeReferralCode', pt.code);
        alert(`🎉 Đã áp dụng mã giới thiệu PT: ${pt.name} (${pt.code})`);
      }
    }
  }, [resolveCode]);

  const ModeNavigation = () => (
    <div className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50 border-b-2 border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-gray-800">Coffee House System</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('customer')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              mode === 'customer'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🛒 Khách Hàng
          </button>
          <button
            onClick={() => setMode('staff')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              mode === 'staff'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👤 Nhân Viên
          </button>
          <button
            onClick={() => setMode('pos')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              mode === 'pos'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💳 POS
          </button>
          <button
            onClick={() => setMode('admin')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              mode === 'admin'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⚙️ Admin
          </button>
        </div>
        <button
          onClick={() => setShowNav(!showNav)}
          className="text-gray-600 hover:text-gray-800 text-sm"
        >
          {showNav ? '🔼 Ẩn' : '🔽 Hiện'}
        </button>
      </div>
    </div>
  );

  // Customer Mode - Mobile App for ordering
  if (mode === 'customer') {
    return (
      <>
        {showNav && <ModeNavigation />}
        <div className={showNav ? 'pt-16' : ''}>
          <CustomerApp />
        </div>
      </>
    );
  }

  // Staff Mode - Mobile App
  if (mode === 'staff') {
    return (
      <>
        {showNav && <ModeNavigation />}
        <div className={`h-screen overflow-hidden ${showNav ? 'pt-16' : ''}`}>
          <StaffApp />
        </div>
      </>
    );
  }

  // POS Mode - Tablet
  if (mode === 'pos') {
    return (
      <>
        {showNav && <ModeNavigation />}
        <div className={showNav ? 'pt-16' : ''}>
          <POSInterface />
        </div>
      </>
    );
  }

  // Admin Mode
  const renderAdminContent = () => {
    switch (adminView) {
      case 'overview':
        return <BranchOverview />;
      case 'analytics':
        return <RevenueAnalytics />;
      case 'hr':
        return <HRManagement />;
      case 'inventory':
        return <InventoryDashboard />;
      case 'products':
        return <ProductManagement />;
      case 'combos':
        return <ComboManagement />;
      case 'loyalty':
        return <LoyaltyManagement />;
      default:
        return <BranchOverview />;
    }
  };

  return (
    <>
      {showNav && <ModeNavigation />}
      <div className={`min-h-screen bg-gray-100 ${showNav ? 'pt-16' : ''}`}>
        <Sidebar activeView={adminView} onViewChange={setAdminView} />

        <div className="ml-64 p-8">
          {renderAdminContent()}
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <SSEProvider>
      <MenuProvider>
        <InventoryProvider>
          <OrderProvider>
            <ComboProvider>
              <AffiliateProvider>
                <LoyaltyProvider>
                  <EmployeeProvider>
                    <AppContent />
                  </EmployeeProvider>
                </LoyaltyProvider>
              </AffiliateProvider>
            </ComboProvider>
          </OrderProvider>
        </InventoryProvider>
      </MenuProvider>
    </SSEProvider>
  );
}