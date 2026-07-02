import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/admin/Sidebar';
import { AdminLogin } from './components/admin/AdminLogin';
import { BranchOverview } from './components/admin/BranchOverview';
import { RevenueAnalytics } from './components/admin/RevenueAnalytics';
import { HRManagement } from './components/admin/HRManagement';
import { InventoryDashboard } from './components/admin/InventoryDashboard';
import { POSInterface } from './components/pos/POSInterface';
import { StaffApp } from './components/staff/StaffApp';
import { OnlineSalesApp } from './components/online-sales/OnlineSalesApp';
import { OnlineSalesProvider } from './contexts/OnlineSalesContext';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { CustomerApp } from './components/customer/CustomerApp';
import { ComboShipBoard } from './components/combo-ship/ComboShipBoard';
import { ShipperApp } from './components/shipper/ShipperApp';
import { ProductManagement } from './components/admin/ProductManagement';
import { ComboManagement } from './components/admin/ComboManagement';
import { LoyaltyManagement } from './components/admin/LoyaltyManagement';
import { CustomerCareManagement } from './components/admin/CustomerCareManagement';
import { OrderProvider } from './contexts/OrderContext';
import { ComboProvider } from './contexts/ComboContext';
import { InventoryProvider } from './contexts/InventoryContext';
import { AffiliateProvider, useAffiliate } from './contexts/AffiliateContext';
import { SSEProvider } from './contexts/SSEContext';
import { MenuProvider } from './contexts/MenuContext';
import { LoyaltyProvider } from './contexts/LoyaltyContext';
import { EmployeeProvider } from './contexts/EmployeeContext';
import { BranchProvider } from './contexts/BranchContext';
import { captureSalesRefFromUrl } from './utils/salesRef';
import {
  type AppMode,
  getModeFromPath,
  navigateToMode,
  isDevEnvironment,
} from './utils/appMode';

function DevModeNavigation({ mode, onModeChange }: { mode: AppMode; onModeChange: (m: AppMode) => void }) {
  const items: { id: AppMode; label: string }[] = [
    { id: 'customer', label: '🛒 Khách' },
    { id: 'online-sales', label: '🛍️ CSKH' },
    { id: 'staff', label: '👤 NV' },
    { id: 'pos', label: '💳 POS' },
    { id: 'combo-ship', label: '🚚 Giao Combo' },
    { id: 'admin', label: '⚙️ Admin' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-50 border-b-2 border-amber-300 z-[100] px-3 py-2">
      <div className="flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-bold text-amber-800 shrink-0">DEV</span>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onModeChange(item.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
              mode === item.id ? 'bg-amber-500 text-white' : 'bg-white text-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdminShell() {
  const { isLoggedIn, isLoading } = useAdmin();
  const [adminView, setAdminView] = useState('overview');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) return <AdminLogin />;

  const renderContent = () => {
    switch (adminView) {
      case 'overview': return <BranchOverview />;
      case 'analytics': return <RevenueAnalytics />;
      case 'hr': return <HRManagement />;
      case 'inventory': return <InventoryDashboard />;
      case 'products': return <ProductManagement />;
      case 'combos': return <ComboManagement />;
      case 'combo-ship': return <ComboShipBoard />;
      case 'loyalty': return <LoyaltyManagement />;
      case 'online-sales': return <CustomerCareManagement />;
      default: return <BranchOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar activeView={adminView} onViewChange={setAdminView} />
      <div className="ml-64 p-8">{renderContent()}</div>
    </div>
  );
}

function AppContent() {
  const { resolveCode } = useAffiliate();
  const [mode, setMode] = useState<AppMode>(() => getModeFromPath());

  const syncModeFromUrl = useCallback(() => {
    setMode(getModeFromPath());
  }, []);

  useEffect(() => {
    syncModeFromUrl();
    window.addEventListener('popstate', syncModeFromUrl);
    return () => window.removeEventListener('popstate', syncModeFromUrl);
  }, [syncModeFromUrl]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref') || params.get('pt');
    if (refCode) {
      const pt = resolveCode(refCode);
      if (pt) {
        localStorage.setItem('activeReferralCode', pt.code);
      }
    }
    captureSalesRefFromUrl();
  }, [resolveCode]);

  const handleDevModeChange = (next: AppMode) => {
    navigateToMode(next);
    setMode(next);
  };

  const devNav = isDevEnvironment ? (
    <DevModeNavigation mode={mode} onModeChange={handleDevModeChange} />
  ) : null;
  const devPad = isDevEnvironment ? 'pt-12' : '';

  if (mode === 'customer') {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <CustomerApp />
        </div>
      </>
    );
  }

  if (mode === 'online-sales') {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <OnlineSalesProvider>
            <OnlineSalesApp />
          </OnlineSalesProvider>
        </div>
      </>
    );
  }

  if (mode === 'staff') {
    return (
      <>
        {devNav}
        <div className={`h-screen overflow-hidden ${devPad}`}>
          <StaffApp />
        </div>
      </>
    );
  }

  if (mode === 'pos') {
    return (
      <>
        {devNav}
        <div className={`h-screen overflow-hidden ${devPad}`}>
          <POSInterface />
        </div>
      </>
    );
  }

  if (mode === 'shipper') {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <ShipperApp />
        </div>
      </>
    );
  }

  if (mode === 'combo-ship') {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <ComboShipBoard />
        </div>
      </>
    );
  }

  if (mode === 'admin') {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <AdminProvider>
            <AdminShell />
          </AdminProvider>
        </div>
      </>
    );
  }

  return null;
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
                    <BranchProvider>
                      <AppContent />
                    </BranchProvider>
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
