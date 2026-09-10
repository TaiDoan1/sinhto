// Entry RIÊNG cho landing/khách hàng — CHỈ mount trải nghiệm khách (CustomerApp), KHÔNG import
// App.tsx (vốn kéo theo toàn bộ code admin/pos/staff). Nhờ vậy bundle landing không chứa một
// dòng code nào của hệ quản lý → F12 trên domain landing không lộ /admin, /pos hay logic quản lý.
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { CustomerApp } from "./app/components/customer/CustomerApp";
import { GrabFoodApp } from "./app/components/customer/GrabFoodApp";
import { CustomerProducts } from "./app/components/customer/CustomerProducts";
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
  // Bundle landing không dùng router của App.tsx, nên tự nhận path ở đây:
  // /dat-mon (và /order) → app đặt món kiểu Grab; /products (san-pham, huong-vi) → trang giới thiệu
  // sản phẩm; còn lại → landing/CustomerApp. Thêm ?view= để test khi dev không rewrite path.
  const _p = window.location.pathname;
  const _view = new URLSearchParams(window.location.search).get("view") || "";
  const isOrderPath = /^\/(dat-mon|order)(\/|$)/.test(_p) || _view === "order";
  const isProductsPath = /^\/(products|san-pham|huong-vi)(\/|$)/.test(_p) || _view === "products";

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
                          {isProductsPath ? (
                            <CustomerProducts />
                          ) : isOrderPath ? (
                            <GrabFoodApp />
                          ) : (
                            <CustomerApp />
                          )}
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
