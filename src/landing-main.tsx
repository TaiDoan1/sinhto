// Entry RIÊNG cho landing/khách hàng — CHỈ mount trải nghiệm khách (CustomerApp), KHÔNG import
// App.tsx (vốn kéo theo toàn bộ code admin/pos/staff). Nhờ vậy bundle landing không chứa một
// dòng code nào của hệ quản lý → F12 trên domain landing không lộ /admin, /pos hay logic quản lý.
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { CustomerApp } from "./app/components/customer/CustomerApp";
import { SplashScreen } from "./app/components/SplashScreen";
import { captureSalesRefFromUrl } from "./app/utils/salesRef";
import { ToastProvider } from "./app/contexts/ToastContext";
import { SSEProvider } from "./app/contexts/SSEContext";
import { MenuProvider } from "./app/contexts/MenuContext";
import { InventoryProvider } from "./app/contexts/InventoryContext";
import { OrderProvider } from "./app/contexts/OrderContext";
import { ComboProvider } from "./app/contexts/ComboContext";
import { AffiliateProvider } from "./app/contexts/AffiliateContext";
import { LoyaltyProvider } from "./app/contexts/LoyaltyContext";
import { EmployeeProvider } from "./app/contexts/EmployeeContext";
import { BranchProvider } from "./app/contexts/BranchContext";

function LandingRoot() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Bắt mã giới thiệu (?ref= / ?pt=) — lưu nguyên mã, server sẽ giải mã khi tạo đơn.
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref") || params.get("pt");
    if (refCode) localStorage.setItem("activeReferralCode", refCode);
    captureSalesRefFromUrl();
  }, []);

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
                          <CustomerApp />
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

createRoot(document.getElementById("root")!).render(<LandingRoot />);
