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
import { ComboManagement } from "./components/admin/ComboManagement";
import { LoyaltyManagement } from "./components/admin/LoyaltyManagement";
import { StoreManagerApp } from "./components/admin/StoreManagerApp";
import { CustomerCareManagement } from "./components/admin/CustomerCareManagement";
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
    { id: "customer", label: "🛒 Khách" },
    { id: "online-sales", label: "🛍️ CSKH" },
    { id: "staff", label: "👤 NV" },
    { id: "pos", label: "💳 POS" },
    { id: "combo-ship", label: "🚚 Giao Combo" },
    { id: "admin", label: "⚙️ Admin" },
    { id: "store-manager", label: "🏪 Cửa hàng trưởng" },
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

function ModeSelectionScreen({
  onSelectMode,
}: {
  onSelectMode: (mode: AppMode) => void;
}) {
  const cards: Array<{ mode: AppMode; title: string; description: string }> = [
    {
      mode: "admin",
      title: "Admin",
      description: "Quản lý cửa hàng, kho, doanh thu và nhân sự",
    },
    {
      mode: "store-manager",
      title: "Cửa hàng trưởng",
      description: "Đi tới màn hình riêng dành cho cửa hàng trưởng",
    },
    {
      mode: "online-sales",
      title: "Chăm sóc khách hàng",
      description: "Xử lý đơn, phản hồi và chăm sóc khách hàng",
    },
    {
      mode: "pos",
      title: "POS",
      description: "Thu ngân, tạo đơn và thanh toán nhanh",
    },
    {
      mode: "staff",
      title: "Nhân viên",
      description: "Giao diện vận hành cho nhân viên",
    },
    { mode: "shipper", title: "Shipper", description: "Theo dõi và giao hàng" },
    {
      mode: "combo-ship",
      title: "Giao combo",
      description: "Quản lý đơn giao combo",
    },
    {
      mode: "customer",
      title: "Khách hàng",
      description: "Trải nghiệm mua hàng cho khách",
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ecfeff_45%,#fff7ed_100%)] p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-[32px] border border-emerald-100 bg-white/80 p-8 text-center shadow-[0_20px_60px_-25px_rgba(16,185,129,0.35)] backdrop-blur">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-700">
            FitBlend
          </p>
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">
            Chọn chức năng để bắt đầu
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Mỗi thẻ dưới đây sẽ mở đúng màn hình tương ứng, giúp bạn truy cập
            nhanh hơn và đẹp mắt hơn.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <button
              key={`${card.title}-${card.mode}`}
              type="button"
              onClick={() => onSelectMode(card.mode)}
              className="group rounded-[24px] border border-emerald-100 bg-white/90 p-6 text-left shadow-[0_16px_45px_-24px_rgba(15,23,42,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_24px_65px_-24px_rgba(16,185,129,0.45)]"
            >
              <div className="mb-4 h-2 w-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
              <h2 className="text-xl font-bold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {card.description}
              </p>
              <div className="mt-5 inline-flex items-center text-sm font-semibold text-emerald-700 transition group-hover:translate-x-1">
                Mở ngay
                <span className="ml-2">→</span>
              </div>
            </button>
          ))}
        </div>
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
      case "combos":
        return <ComboManagement />;
      case "combo-ship":
        return <ComboShipBoard />;
      case "loyalty":
        return <LoyaltyManagement />;
      case "online-sales":
        return <CustomerCareManagement />;
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

  const handleModeSelect = (nextMode: AppMode) => {
    navigateToMode(nextMode);
    setMode(nextMode);
  };

  if (window.location.pathname === "/" && mode === "customer") {
    return (
      <>
        {devNav}
        <div className={devPad}>
          <ModeSelectionScreen onSelectMode={handleModeSelect} />
        </div>
      </>
    );
  }

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

  return null;
}

export default function App() {
  return (
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
  );
}
