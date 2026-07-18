import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ClipboardList,
  Package,
  History,
  User,
  Users,
  Store,
  BookOpen,
  LogOut,
  Receipt,
  Printer,
} from 'lucide-react';
import { ProductGrid } from './ProductGrid';
import { ModifierModal } from './ModifierModal';
import { CheckoutPanel } from './CheckoutPanel';
import { MobileCheckoutModal } from './MobileCheckoutModal';
import { OrderQueue } from './OrderQueue';
import { OrderHistory } from './OrderHistory';
import { InventoryManagement } from './InventoryManagement';
import { MenuManagement } from './MenuManagement';
import { MacroTable } from './MacroTable';
import { CustomerComboHub } from '../combo/CustomerComboHub';
import { CustomComboBuilder } from '../customer/CustomComboBuilder';
import { PosProvider, usePos } from '../../contexts/PosContext';
import { PosLogin } from './PosLogin';
import { PosKioskOverlay, PosFullscreenButton } from './PosKioskOverlay';
import { PrinterSetupModal } from './PrinterSetupModal';
import { PosKioskProvider } from '../../hooks/usePosKiosk';
import { useBranchOrders } from '../../hooks/useBranchOrders';
import { useBranchCombos } from '../../hooks/useBranchCombos';
import { useBranches } from '../../contexts/BranchContext';

import { useInventory } from '../../contexts/InventoryContext';
import type { CartItem } from './ModifierModal';
import * as api from '../../utils/api';
import type { Shift } from '../admin/ShiftSchedule';
import { aggregateShiftItems, printShiftClosingReceipt } from '../../utils/posPrint';

type PosTab = 'products' | 'orders' | 'combos' | 'warehouse' | 'history' | 'admin' | 'macro';

const POS_TABS: {
  id: PosTab;
  label: string;
  icon: typeof ShoppingBag;
  badge?: 'orders' | 'combos';
}[] = [
  { id: 'products', label: 'Bán hàng', icon: ShoppingBag },
  { id: 'orders', label: 'Hàng đợi', icon: ClipboardList, badge: 'orders' },
  { id: 'combos', label: 'Combo', icon: Package, badge: 'combos' },
  { id: 'history', label: 'Lịch sử', icon: History },
  { id: 'warehouse', label: 'Kho', icon: Store },
  { id: 'admin', label: 'Thực đơn', icon: ClipboardList },
  { id: 'macro', label: 'Macro', icon: BookOpen },
];

function POSInterfaceInner() {
  const { session, isLoggedIn, isLoading, logout } = usePos();
  const { branchLabel } = useBranches();
  const branchId = session?.branchId || '';
  const { orders, history } = useBranchOrders(branchId);
  const { getTodayDeliveries, notifications, markNotificationAsRead } = useBranchCombos(branchId);
  const branchComboAlerts = notifications.filter((n) => n.branchId === branchId && !n.isRead);
  const { isWarehouseReady, loadForBranch } = useInventory();
  const [activeTab, setActiveTab] = useState<PosTab>('products');

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showMobileCheckout, setShowMobileCheckout] = useState(false);
  const [currentShifts, setCurrentShifts] = useState<Shift[]>([]);
  const [showStaffList, setShowStaffList] = useState(false);
  const [closingShift, setClosingShift] = useState<Shift | null>(null);
  const [closingSubmitting, setClosingSubmitting] = useState(false);
  const [showPrinterSetup, setShowPrinterSetup] = useState(false);

  useEffect(() => {
    if (branchId) {
      loadForBranch(branchId);
      loadCurrentShifts();
      const interval = setInterval(loadCurrentShifts, 60000);
      return () => clearInterval(interval);
    }
  }, [branchId, loadForBranch]);

  const getCurrentShiftType = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour < 12) {
      return { type: 'morning', name: 'Ca Sáng', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (currentHour >= 12 && currentHour < 14) {
      return { type: 'noon', name: 'Ca Trưa', color: 'bg-orange-100 text-orange-800' };
    }
    if (currentHour >= 14 && currentHour < 18) {
      return { type: 'afternoon', name: 'Ca Chiều', color: 'bg-emerald-100 text-blue-800' };
    }
    if (currentHour >= 18 && currentHour < 23) {
      return { type: 'evening', name: 'Ca Tối', color: 'bg-purple-100 text-purple-800' };
    }
    return { type: 'off', name: 'Ngoài giờ ca', color: 'bg-gray-100 text-gray-600' };
  };

  // Kết ca: kiểm tra ca đang mở, bắt buộc chốt doanh thu/đơn trước khi đăng xuất.
  const handleEndShift = async () => {
    if (!session) return;
    try {
      const activeShifts = (await api.fetchShifts({
        employeeId: session.employeeId,
        status: 'in_progress',
      })) as Shift[];
      if (activeShifts.length > 0) {
        setClosingShift(activeShifts[0]);
        return;
      }
    } catch (err) {
      console.error('Failed to check active shift:', err);
    }
    if (confirm('Đăng xuất máy POS?')) {
      logout();
      setCart([]);
    }
  };

  // Thoát: đăng xuất thẳng về màn hình đăng nhập, không kết ca (VD: đổi người dùng máy nhanh).
  const handleExit = () => {
    if (confirm('Thoát khỏi máy POS? (Không kết ca — quay lại màn hình đăng nhập)')) {
      logout();
      setCart([]);
      setClosingShift(null);
    }
  };

  const shiftClosingSummary = closingShift
    ? (() => {
        const shiftOrders = [...orders, ...history].filter((o) => o.shiftId === closingShift.id);
        return {
          count: shiftOrders.length,
          total: shiftOrders.reduce((sum, o) => sum + (o.total || 0), 0),
          items: aggregateShiftItems(shiftOrders),
        };
      })()
    : null;

  const handlePrintClosingBill = () => {
    if (!closingShift || !shiftClosingSummary) return;
    printShiftClosingReceipt({
      employeeName: closingShift.employeeName,
      startTime: closingShift.startTime,
      endTime: closingShift.endTime,
      checkIn: closingShift.checkIn ? new Date(closingShift.checkIn) : undefined,
      checkOut: new Date(),
      items: shiftClosingSummary.items,
      orderCount: shiftClosingSummary.count,
      totalRevenue: shiftClosingSummary.total,
    });
  };

  const handleConfirmClosing = async () => {
    if (!closingShift) return;
    setClosingSubmitting(true);
    try {
      await api.shiftCheckIn(closingShift.id, 'out');
      logout();
      setCart([]);
      setClosingShift(null);
    } catch (err) {
      alert('Kết ca thất bại. Vui lòng thử lại.');
    } finally {
      setClosingSubmitting(false);
    }
  };

  const loadCurrentShifts = async () => {
    if (!branchId) return;

    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    try {
      const shifts = (await api.fetchShifts({ branch: branchId, date: today })) as Shift[];
      const todayShifts = shifts.filter((shift) => {
        const startHour = parseInt(shift.startTime.split(':')[0], 10);
        const endHour = parseInt(shift.endTime.split(':')[0], 10);
        if (endHour < startHour) {
          return currentHour >= startHour || currentHour < endHour;
        }
        return currentHour >= startHour && currentHour < endHour;
      });
      setCurrentShifts(todayShifts);
    } catch (err) {
      console.error('Failed to load shifts for POS:', err);
      setCurrentShifts([]);
    }
  };

  const handleAddToCart = (item: CartItem) => {
    setCart([...cart, item]);
  };

  // Combo tại quầy đã thu tiền ngay (nằm chung giỏ hàng) — nhưng vẫn phải tạo
  // ra 1 gói combo subscription thật (giống bên CSKH) để sinh lịch giao hàng ngày.
  const handleCreateComboSubscription = async (combo: any) => {
    const raw = combo.rawComboData || {};
    const duration = raw.duration || 'monthly';
    const startIso = raw.startDate ? new Date(raw.startDate).toISOString() : new Date().toISOString();
    try {
      await api.createComboSubscription({
        customerName: combo.customerName || raw.customerName || '',
        customerPhone: combo.customerPhone || raw.customerPhone || '',
        deliveryAddress: raw.deliveryAddress || '',
        planName: combo.name,
        comboType: duration === 'weekly' ? 'weekly' : 'monthly',
        comboDuration: duration,
        startDate: startIso,
        nextDelivery: startIso,
        deliveryDays: [1, 2, 3, 4, 5],
        items: raw,
        totalPrice: combo.price,
        status: 'active',
        branchId,
        deliveryTime: raw.deliveryTime || '08:00',
        staff: `POS - ${session?.employeeName || ''}`,
        careStaffId: session?.employeeId,
        careStaffName: session?.employeeName,
      });
    } catch (err) {
      console.error('Tạo combo subscription từ POS thất bại:', err);
    }
  };

  const handleRemoveItem = (index: number) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const comboDueCount = getTodayDeliveries(branchId).length;

  if (isLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-emerald-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn || !session) {
    return <PosLogin />;
  }

  return (
    <div className="pos-shell flex flex-col h-dvh max-h-dvh overflow-hidden bg-gray-100">
      {/* Header gọn 2 hàng — tối ưu 1280×800 */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="font-bold text-emerald-800 pos-header-brand shrink-0">FitBlend POS</div>
          <div className="flex-1 min-w-0 pos-header-meta text-gray-500 truncate">
            {branchLabel(branchId) || branchId} · {session.employeeName}
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowStaffList(!showStaffList)}
              className="pos-staff-btn flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-md text-emerald-800"
            >
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold">{currentShifts.length}</span>
            </button>
            {showStaffList && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 w-64">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-gray-800">Ca đang làm</h3>
                  <button type="button" onClick={() => setShowStaffList(false)} className="text-gray-400">
                    ✕
                  </button>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${getCurrentShiftType().color}`}
                >
                  {getCurrentShiftType().name}
                </span>
                {currentShifts.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 text-center">Chưa có ca</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {currentShifts.map((shift) => (
                      <div key={shift.id} className="flex items-center gap-2 p-1.5 bg-emerald-50 rounded text-xs">
                        <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                          {shift.employeeName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{shift.employeeName}</div>
                          <div className="text-gray-500">
                            {shift.startTime}-{shift.endTime}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <PosFullscreenButton />
          <button
            type="button"
            onClick={() => setShowPrinterSetup(true)}
            className="shrink-0 p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
            title="Kết nối máy in USB"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleEndShift}
            className="shrink-0 p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md"
            title="Kết ca"
          >
            <Receipt className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleExit}
            className="shrink-0 p-1.5 text-red-500 hover:bg-red-50 rounded-md"
            title="Thoát (không kết ca)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {showPrinterSetup && <PrinterSetupModal onClose={() => setShowPrinterSetup(false)} />}

        <nav className="pos-tab-bar flex gap-1.5 px-2 py-2 overflow-x-auto scrollbar-hide">
          {POS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.badge === 'orders' ? orders.length : tab.badge === 'combos' ? comboDueCount : 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pos-tab relative flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-base transition-colors min-h-[48px] ${
                  activeTab === tab.id
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 bg-gray-50'
                }`}
              >
                <Icon className="w-6 h-6 shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {!isWarehouseReady && (
        <div className="pos-warehouse-banner shrink-0 mx-1 mt-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs font-medium">
          ⚠️ Chưa nhập kho — không thể bán. Admin: Chi nhánh → Tồn Kho → Nhập kho.
        </div>
      )}

      {branchComboAlerts.length > 0 && (
        <div className="shrink-0 mx-1 mt-1 space-y-1">
          {branchComboAlerts.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded text-purple-900 text-xs font-semibold"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Package className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">🔔 {n.message}</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('combos');
                    markNotificationAsRead(n.id);
                  }}
                  className="px-2 py-1 rounded bg-purple-600 text-white text-xs font-bold"
                >
                  Xem
                </button>
                <button
                  type="button"
                  onClick={() => markNotificationAsRead(n.id)}
                  className="px-2 py-1 rounded border border-purple-300 text-purple-700 text-xs font-bold"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nội dung chính — luôn 2 cột từ 1024px (gồm 1280×800) */}
      <div className="flex-1 flex min-h-0 overflow-hidden p-1 gap-1">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'products' ? (
              selectedProduct && selectedProduct.category !== 'combo' ? (
                <ModifierModal
                  product={selectedProduct}
                  onClose={() => setSelectedProduct(null)}
                  onAddToCart={handleAddToCart}
                />
              ) : (
                <ProductGrid onProductClick={setSelectedProduct} />
              )
            ) : activeTab === 'orders' ? (
              <OrderQueue branchId={branchId} />
            ) : activeTab === 'combos' ? (
              <CustomerComboHub variant="pos" branchId={branchId} className="p-2 h-full min-h-0 overflow-hidden" />
            ) : activeTab === 'warehouse' ? (
              <InventoryManagement branchId={branchId} />
            ) : activeTab === 'admin' ? (
              <MenuManagement />
            ) : activeTab === 'macro' ? (
              <MacroTable />
            ) : (
              <OrderHistory branchId={branchId} />
            )}
          </div>
        </div>

        {activeTab === 'products' && (
          <div className="hidden min-[1024px]:flex w-[380px] shrink-0 min-h-0 pos-checkout">
            <CheckoutPanel
              cart={cart}
              branchId={branchId}
              currentShifts={currentShifts}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
            />
          </div>
        )}
      </div>

      {/* Giỏ hàng mobile — chỉ khi màn hẹp */}
      {cart.length > 0 && (
        <div className="min-[1024px]:hidden shrink-0 p-2 bg-white border-t">
          <button
            type="button"
            onClick={() => setShowMobileCheckout(true)}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-bold flex items-center justify-between px-4"
          >
            <span>Giỏ ({cart.length})</span>
            <span>{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString('vi-VN')}đ</span>
          </button>
        </div>
      )}

      {selectedProduct && selectedProduct.category === 'combo' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-black/60">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden h-[95dvh] flex flex-col">
            <CustomComboBuilder
              isPOS={true}
              onClose={() => setSelectedProduct(null)}
              onAddToCart={(combo) => {
                handleAddToCart({
                  productId: `combo-${Date.now()}`,
                  productName: combo.name,
                  name: combo.name,
                  size: '',
                  protein: 0,
                  toppings: combo.toppings,
                  price: combo.price,
                  quantity: 1,
                  isCustomCombo: true,
                  rawComboData: combo.rawComboData,
                });
                setSelectedProduct(null);
                handleCreateComboSubscription(combo);
              }}
            />
          </div>
        </div>
      )}

      {showMobileCheckout && (
        <MobileCheckoutModal
          cart={cart}
          branchId={branchId}
          currentShifts={currentShifts}
          onClose={() => setShowMobileCheckout(false)}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
        />
      )}

      {closingShift && shiftClosingSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <LogOut className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Kết ca trước khi đăng xuất</h3>
            <p className="text-sm text-gray-500 mb-4">
              {closingShift.startTime} - {closingShift.endTime}
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Số đơn đã bán</span>
                <span className="font-bold text-gray-900">{shiftClosingSummary.count} đơn</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Doanh thu</span>
                <span className="font-bold text-emerald-700">
                  {shiftClosingSummary.total.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {shiftClosingSummary.items.length > 0 && (
              <div className="text-left mt-4">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Sản phẩm đã bán</p>
                <div className="bg-gray-50 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                  {shiftClosingSummary.items.map((it) => (
                    <div key={it.productName} className="flex justify-between text-xs">
                      <span className="text-gray-700">{it.productName} x{it.quantity}</span>
                      <span className="text-gray-500">{it.revenue.toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrintClosingBill}
              className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm"
            >
              🖨️ In bill kết ca
            </button>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setClosingShift(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={closingSubmitting}
                onClick={handleConfirmClosing}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white py-3 rounded-xl font-bold"
              >
                {closingSubmitting ? 'Đang kết ca...' : 'Xác nhận kết ca'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function POSInterface() {
  return (
    <PosProvider>
      <PosKioskProvider>
        <PosKioskOverlay>
          <POSInterfaceInner />
        </PosKioskOverlay>
      </PosKioskProvider>
    </PosProvider>
  );
}
