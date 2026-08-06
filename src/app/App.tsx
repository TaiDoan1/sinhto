import { useState, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./components/admin/Sidebar";
import { AdminLogin } from "./components/admin/AdminLogin";
import { BranchOverview } from "./components/admin/BranchOverview";
import { RevenueAnalytics } from "./components/admin/RevenueAnalytics";
import { HRManagement } from "./components/admin/HRManagement";
import { InventoryDashboard } from "./components/admin/InventoryDashboard";
import { CrossBranchInventory } from "./components/admin/CrossBranchInventory";
import { ShiftClosingBillSettings } from "./components/admin/ShiftClosingBillSettings";
import { POSInterface } from "./components/pos/POSInterface";
import { PosCustomerDisplay } from "./components/pos/PosCustomerDisplay";
import { StaffApp } from "./components/staff/StaffApp";
import { OnlineSalesApp } from "./components/online-sales/OnlineSalesApp";
import { OnlineSalesProvider } from "./contexts/OnlineSalesContext";
import { AdminProvider, useAdmin } from "./contexts/AdminContext";
import { CustomerApp } from "./components/customer/CustomerApp";
import { ComboShipBoard } from "./components/combo-ship/ComboShipBoard";
import { ShipperApp } from "./components/shipper/ShipperApp";
import { ProductManagement } from "./components/admin/ProductManagement";
import { MenuBookEditor } from "./components/admin/MenuBookEditor";
import { ComboManagement } from "./components/admin/ComboManagement";
import { ComboPackageTemplates } from "./components/admin/ComboPackageTemplates";
import { GiftCampaigns } from "./components/admin/GiftCampaigns";
import { OrderNotificationSettings } from "./components/admin/OrderNotificationSettings";
import { LoyaltyManagement } from "./components/admin/LoyaltyManagement";
import { StoreManagerApp } from "./components/admin/StoreManagerApp";
import { HrApp } from "./components/admin/HrApp";
import { CustomerCareManagement } from "./components/admin/CustomerCareManagement";
import { BackupData } from "./components/admin/BackupData";
import { OrderProvider } from "./contexts/OrderContext";
import { ComboProvider } from "./contexts/ComboContext";
import { InventoryProvider } from "./contexts/InventoryContext";
import { AffiliateProvider, useAffiliate } from "./contexts/AffiliateContext";
import { SSEProvider } from "./contexts/SSEContext";
import { MenuProvider } from "./contexts/MenuContext";
import { LoyaltyProvider } from "./contexts/LoyaltyContext";
import { EmployeeProvider } from "./contexts/EmployeeContext";
import { BranchProvider } from "./contexts/BranchContext";
import { ToastProvider } from "./contexts/ToastContext";
import { SplashScreen } from "./components/SplashScreen";
import { SystemHub } from "./components/SystemHub";
import { captureSalesRefFromUrl } from "./utils/salesRef";
import {
  type AppMode,
  getModeFromPath,
  navigateToMode,
  isDevEnvironment,
} from "./utils/appMode";

function DevModeNavigation({
  mode,
  onModeChange,
}: {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
}) {
  const items: { id: AppMode; label: string }[] = [
    { id: "menu", label: "🗂️ Menu" },
    { id: "customer", label: "🛒 Khách" },
    { id: "online-sales", label: "🛍️ CSKH" },
    { id: "staff", label: "👤 NV" },
    { id: "pos", label: "💳 POS" },
    { id: "combo-ship", label: "🚚 Giao Combo" },
    { id: "admin", label: "⚙️ Admin" },
    { id: "store-manager", label: "🏪 Cửa hàng trưởng" },
    { id: "hr", label: "🧑‍💼 Nhân Sự" },
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
              mode === item.id
                ? "bg-amber-500 text-white"
                : "bg-white text-gray-700"
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
  const [adminView, setAdminView] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      case "overview":
        return <BranchOverview />;
      case "analytics":
        return <RevenueAnalytics />;
      case "hr":
        return <HRManagement />;
      case "inventory":
        return <InventoryDashboard />;
      case "stock":
        return <CrossBranchInventory />;
      case "shift-bill":
        return <ShiftClosingBillSettings />;
      case "products":
        return <ProductManagement />;
      case "menu-book":
        return <MenuBookEditor />;
      case "combos":
        return <ComboManagement />;
      case "combo-packages":
        return <ComboPackageTemplates />;
      case "combo-ship":
        return <ComboShipBoard />;
      case "loyalty":
        return <LoyaltyManagement />;
      case "gift-campaigns":
        return <GiftCampaigns />;
      case "order-notification":
        return <OrderNotificationSettings />;
      case "online-sales":
        return <CustomerCareManagement />;
      case "backup":
        return <BackupData />;
      default:
        return <BranchOverview />;
    }
  };

  const handleViewChange = (view: string) => {
    setAdminView(view);
    setSidebarOpen(false); // Close sidebar on mobile after selecting
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="sm:hidden fixed top-4 left-4 z-50 p-2 bg-emerald-700 text-white rounded-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar - responsive */}
      <div
        className={`fixed inset-0 z-40 sm:relative sm:inset-auto transition-all ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        <Sidebar activeView={adminView} onViewChange={handleViewChange} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="sm:ml-64 p-4 sm:p-8 pt-16 sm:pt-8">{renderContent()}</div>
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
    window.addEventListener("popstate", syncModeFromUrl);
    return () => window.removeEventListener("popstate", syncModeFromUrl);
  }, [syncModeFromUrl]);

  // Cho phép "Thêm vào Màn hình chính" cài thành app riêng theo từng cổng (POS, Nhân viên...) —
  // mỗi cổng có icon/tên riêng trên màn hình chính thay vì chỉ có 1 app POS chung cho cả site.
  useEffect(() => {
    const manifestByMode: Partial<Record<AppMode, { href: string; title: string; icon: string; themeColor: string }>> = {
      pos: { href: "/manifest-pos.webmanifest", title: "FitBlend POS", icon: "/images/pos-icon.svg", themeColor: "#047857" },
      staff: { href: "/manifest-staff.webmanifest", title: "FitBlend Nhân Viên", icon: "/images/staff-icon.svg", themeColor: "#7c3aed" },
    };
    const config = manifestByMode[mode];
    if (!config) return;

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = config.href;

    let appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitle) {
      appleTitle = document.createElement("meta");
      appleTitle.name = "apple-mobile-web-app-title";
      document.head.appendChild(appleTitle);
    }
    appleTitle.content = config.title;

    let appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleTouchIcon) {
      appleTouchIcon = document.createElement("link");
      appleTouchIcon.rel = "apple-touch-icon";
      document.head.appendChild(appleTouchIcon);
    }
    appleTouchIcon.href = config.icon;

    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = config.icon;

    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = config.themeColor;

    document.title = config.title;
  }, [mode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref") || params.get("pt");
    if (refCode) {
      const pt = resolveCode(refCode);
      if (pt) {
        localStorage.setItem("activeReferralCode", pt.code);
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
  const devPad = isDevEnvironment ? "pt-12" : "";

  if (mode === "customer") {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <CustomerApp />
        </div>
      </>
    );
  }

  if (mode === "online-sales") {
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

  if (mode === "staff") {
    return (
      <>
        {devNav}
        <div className={`h-screen overflow-hidden ${devPad}`}>
          <StaffApp />
        </div>
      </>
    );
  }

  if (mode === "pos-customer-display") {
    return <PosCustomerDisplay />;
  }

  if (mode === "pos") {
    return (
      <>
        {devNav}
        <div className={`h-screen overflow-hidden ${devPad}`}>
          <POSInterface />
        </div>
      </>
    );
  }

  if (mode === "shipper") {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <ShipperApp />
        </div>
      </>
    );
  }

  if (mode === "combo-ship") {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <ComboShipBoard />
        </div>
      </>
    );
  }

  if (mode === "menu") {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <SystemHub />
        </div>
      </>
    );
  }

  if (mode === "admin") {
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

  if (mode === "store-manager") {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <AdminProvider>
            <StoreManagerApp />
          </AdminProvider>
        </div>
      </>
    );
  }

  if (mode === "hr") {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <AdminProvider>
            <HrApp />
          </AdminProvider>
        </div>
      </>
    );
  }

  return null;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <>
      <ToastProvider>
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
      </ToastProvider>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
    </>
  );
}
