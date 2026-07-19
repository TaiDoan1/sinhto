import { useState, useEffect, useRef } from 'react';
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
  Banknote,
  MonitorSmartphone,
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
import { postCustomerDisplayState, openCustomerDisplayWindow } from '../../hooks/useCustomerDisplayChannel';
import {
  buildShiftClosingReceiptData,
  printShiftClosingReceipt,
  DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE,
  type ShiftClosingBillTemplate,
} from '../../utils/posPrint';

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
  const { session, isLoggedIn, isLoading, logout, pendingStartCashShiftId, clearPendingStartCash } = usePos();
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
  const [startCashInput, setStartCashInput] = useState('0');
  const [startCashSubmitting, setStartCashSubmitting] = useState(false);
  const [showCashMovement, setShowCashMovement] = useState(false);
  const [cashMoveType, setCashMoveType] = useState<'in' | 'out'>('in');
  const [cashMoveAmount, setCashMoveAmount] = useState('');
  const [cashMoveNote, setCashMoveNote] = useState('');
  const [cashMoveSubmitting, setCashMoveSubmitting] = useState(false);
  const [cashMoveHistory, setCashMoveHistory] = useState<api.ShiftCashMovement[]>([]);
  const [cashMoveHistoryLoading, setCashMoveHistoryLoading] = useState(false);
  const [activeCashShiftId, setActiveCashShiftId] = useState<string | null>(null);
  const [closingCashMovements, setClosingCashMovements] = useState<api.ShiftCashMovement[]>([]);
  const [closingShiftOrders, setClosingShiftOrders] = useState<any[] | null>(null);
  const [billTemplate, setBillTemplate] = useState<ShiftClosingBillTemplate>(DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE);
  const [actualCashInput, setActualCashInput] = useState('');
  const [noActiveShiftNotice, setNoActiveShiftNotice] = useState(false);
  const [customerDisplayOpen, setCustomerDisplayOpen] = useState(false);
  const customerDisplayWinRef = useRef<Window | null>(null);

  useEffect(() => {
    if (branchId) {
      loadForBranch(branchId);
      loadCurrentShifts();
      const interval = setInterval(loadCurrentShifts, 60000);
      return () => clearInterval(interval);
    }
  }, [branchId, loadForBranch]);

  // Báo màn hình khách (nếu đang mở) biết chi nhánh hiện tại — trước khi có giỏ hàng gì để hiện.
  useEffect(() => {
    if (branchId) {
      postCustomerDisplayState({ stage: 'idle', branchId, items: [], subtotal: 0, discount: 0, total: 0, updatedAt: Date.now() });
    }
  }, [branchId]);

  // Theo dõi cửa sổ màn hình khách tự đóng (VD: nhân viên bấm X) để icon toggle luôn phản ánh đúng trạng thái.
  useEffect(() => {
    const interval = setInterval(() => {
      if (customerDisplayWinRef.current && customerDisplayWinRef.current.closed) {
        customerDisplayWinRef.current = null;
        setCustomerDisplayOpen(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleCustomerDisplay = async () => {
    if (customerDisplayWinRef.current && !customerDisplayWinRef.current.closed) {
      customerDisplayWinRef.current.close();
      customerDisplayWinRef.current = null;
      setCustomerDisplayOpen(false);
      return;
    }
    const win = await openCustomerDisplayWindow();
    customerDisplayWinRef.current = win;
    setCustomerDisplayOpen(!!win);
  };

  useEffect(() => {
    if (!closingShift) {
      setClosingCashMovements([]);
      setClosingShiftOrders(null);
      setActualCashInput('');
      return;
    }
    api.fetchCashMovements(closingShift.id).then(setClosingCashMovements).catch(() => setClosingCashMovements([]));
    api
      .fetchSetting('shiftClosingBillTemplate')
      .then((v: any) => {
        if (v && typeof v === 'object') setBillTemplate({ ...DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE, ...v });
      })
      .catch(() => setBillTemplate(DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE));
    // Lấy trực tiếp từ server theo shiftId thay vì lọc cache orders/history của tab — cache này chỉ
    // đồng bộ qua SSE, nếu tab mất kết nối SSE dù chỉ 1 lần trong ca (rớt mạng, tab bị trình duyệt
    // tạm dừng khi chuyển nền...) thì các đơn tạo/hoàn tất trong lúc mất kết nối sẽ biến mất khỏi
    // cache mãi mãi, khiến bill kết ca hiện sai (thiếu đơn/doanh thu) dù server vẫn lưu đủ.
    api
      .fetchOrders({ shiftId: closingShift.id })
      .then(setClosingShiftOrders)
      .catch(() => setClosingShiftOrders(null));
  }, [closingShift]);

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
    setNoActiveShiftNotice(true);
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
        const shiftOrders =
          closingShiftOrders ?? [...orders, ...history].filter((o) => o.shiftId === closingShift.id);
        const actualCash = actualCashInput.trim() === '' ? undefined : Number(actualCashInput);
        return buildShiftClosingReceiptData(
          closingShift,
          shiftOrders,
          closingCashMovements,
          billTemplate,
          actualCash
        );
      })()
    : null;

  const handlePrintClosingBill = () => {
    if (!shiftClosingSummary) return;
    printShiftClosingReceipt(shiftClosingSummary);
  };

  const handleConfirmClosing = async () => {
    if (!closingShift) return;
    if (actualCashInput.trim() === '' || Number.isNaN(Number(actualCashInput))) {
      alert('Vui lòng nhập số tiền mặt thực tế đếm được.');
      return;
    }
    setClosingSubmitting(true);
    try {
      await api.shiftCheckIn(closingShift.id, 'out', undefined, { endCashActual: Number(actualCashInput) });
      logout();
      setCart([]);
      setClosingShift(null);
    } catch (err) {
      alert('Kết ca thất bại. Vui lòng thử lại.');
    } finally {
      setClosingSubmitting(false);
    }
  };

  const handleSubmitStartCash = async () => {
    if (!pendingStartCashShiftId) return;
    setStartCashSubmitting(true);
    try {
      await api.shiftCheckIn(pendingStartCashShiftId, 'in', undefined, {
        startCash: Number(startCashInput) || 0,
      });
    } catch (err) {
      console.error('Lưu tiền mặt đầu ca thất bại:', err);
    } finally {
      setStartCashSubmitting(false);
      setStartCashInput('0');
      clearPendingStartCash();
    }
  };

  const loadCashMoveHistory = async (shiftId: string) => {
    setCashMoveHistoryLoading(true);
    try {
      const movements = await api.fetchCashMovements(shiftId);
      setCashMoveHistory(movements);
    } catch (err) {
      setCashMoveHistory([]);
    } finally {
      setCashMoveHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!showCashMovement || !session) return;
    let cancelled = false;
    (async () => {
      try {
        const activeShifts = (await api.fetchShifts({
          employeeId: session.employeeId,
          status: 'in_progress',
        })) as Shift[];
        if (cancelled) return;
        const shiftId = activeShifts[0]?.id || null;
        setActiveCashShiftId(shiftId);
        if (shiftId) await loadCashMoveHistory(shiftId);
        else setCashMoveHistory([]);
      } catch (err) {
        if (!cancelled) setCashMoveHistory([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showCashMovement, session]);

  const handleAddCashMovement = async () => {
    if (!session) return;
    const amount = Number(cashMoveAmount);
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    setCashMoveSubmitting(true);
    try {
      let shiftId = activeCashShiftId;
      if (!shiftId) {
        const activeShifts = (await api.fetchShifts({
          employeeId: session.employeeId,
          status: 'in_progress',
        })) as Shift[];
        shiftId = activeShifts[0]?.id || null;
        setActiveCashShiftId(shiftId);
      }
      if (!shiftId) {
        alert('Không tìm thấy ca đang mở để ghi thu/chi.');
        return;
      }
      await api.addCashMovement(shiftId, {
        type: cashMoveType,
        amount,
        note: cashMoveNote.trim() || undefined,
        createdBy: session.employeeName,
      });
      setCashMoveAmount('');
      setCashMoveNote('');
      setCashMoveType('in');
      await loadCashMoveHistory(shiftId);
    } catch (err) {
      alert('Ghi thu/chi thất bại. Vui lòng thử lại.');
    } finally {
      setCashMoveSubmitting(false);
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
          <div className="pos-header-meta text-gray-500 truncate shrink-0 max-w-[180px]">
            {branchLabel(branchId) || branchId} · {session.employeeName}
          </div>

          <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setShowCashMovement(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-bold shrink-0"
            >
              <Banknote className="w-4 h-4" />
              Thu/Chi
            </button>
            <button
              type="button"
              onClick={handleEndShift}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shrink-0"
            >
              <Receipt className="w-4 h-4" />
              Kết ca
            </button>
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
            onClick={handleToggleCustomerDisplay}
            className={`shrink-0 p-1.5 rounded-md flex items-center gap-1 ${
              customerDisplayOpen
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={customerDisplayOpen ? 'Tắt màn hình khách' : 'Bật màn hình khách (monitor thứ 2)'}
          >
            <MonitorSmartphone className="w-4 h-4" />
            <span
              className={`w-1.5 h-1.5 rounded-full ${customerDisplayOpen ? 'bg-emerald-500' : 'bg-gray-300'}`}
            />
          </button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center my-4">
            <LogOut className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Kết ca trước khi đăng xuất</h3>
            <p className="text-sm text-gray-500 mb-4">
              {closingShift.startTime} - {closingShift.endTime}
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Số đơn đã bán</span>
                <span className="font-bold text-gray-900">{shiftClosingSummary.orderCount} đơn</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Doanh thu</span>
                <span className="font-bold text-emerald-700">
                  {shiftClosingSummary.totalRevenue.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3 text-left space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 mb-1">Đối chiếu tiền mặt</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Tiền mặt đầu ca</span>
                <span className="font-semibold text-gray-800">{shiftClosingSummary.startCash.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Doanh thu tiền mặt</span>
                <span className="font-semibold text-gray-800">{shiftClosingSummary.breakdown.cash.toLocaleString('vi-VN')}đ</span>
              </div>
              {shiftClosingSummary.cashIn > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Thu vào khác</span>
                  <span className="font-semibold text-gray-800">+{shiftClosingSummary.cashIn.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              {shiftClosingSummary.cashOut > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Chi ra</span>
                  <span className="font-semibold text-gray-800">-{shiftClosingSummary.cashOut.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1 border-t border-amber-200">
                <span className="text-gray-600 font-semibold">Dự kiến</span>
                <span className="font-bold text-gray-900">{shiftClosingSummary.expectedCash.toLocaleString('vi-VN')}đ</span>
              </div>

              <label className="block text-xs font-semibold text-gray-700 mt-2">Tiền mặt thực tế đếm được *</label>
              <input
                type="number"
                inputMode="decimal"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                placeholder="Nhập số tiền..."
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-semibold"
              />
              {actualCashInput.trim() !== '' && !Number.isNaN(Number(actualCashInput)) && (
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-gray-600 font-semibold">Chênh lệch</span>
                  <span className={`font-bold ${shiftClosingSummary.cashDiscrepancy < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {shiftClosingSummary.cashDiscrepancy >= 0 ? '+' : ''}
                    {shiftClosingSummary.cashDiscrepancy.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
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

      {pendingStartCashShiftId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <Banknote className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Tiền mặt đầu ca</h3>
            <p className="text-sm text-gray-500 mb-4">Nhập số tiền mặt có trong ngăn kéo lúc bắt đầu ca</p>
            <input
              type="number"
              inputMode="decimal"
              value={startCashInput}
              onChange={(e) => setStartCashInput(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-center text-lg font-bold"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setStartCashInput('0');
                  clearPendingStartCash();
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                disabled={startCashSubmitting}
                onClick={handleSubmitStartCash}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold"
              >
                {startCashSubmitting ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {noActiveShiftNotice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <Receipt className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Không tìm thấy ca đang mở</h3>
            <p className="text-sm text-gray-500 mb-4">
              Bạn chưa vào ca (chưa check-in) nên không có gì để kết ca. Đăng nhập lại để tự động vào ca, hoặc đăng xuất luôn nếu không cần kết ca.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNoActiveShiftNotice(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoActiveShiftNotice(false);
                  logout();
                  setCart([]);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold"
              >
                Đăng xuất luôn
              </button>
            </div>
          </div>
        </div>
      )}

      {showCashMovement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Ghi thu/chi tiền mặt</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCashMovement(false);
                  setCashMoveAmount('');
                  setCashMoveNote('');
                  setCashMoveType('in');
                }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="shrink-0">
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setCashMoveType('in')}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm ${cashMoveType === 'in' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Thu vào
                </button>
                <button
                  type="button"
                  onClick={() => setCashMoveType('out')}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm ${cashMoveType === 'out' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Chi ra
                </button>
              </div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số tiền</label>
              <input
                type="number"
                inputMode="decimal"
                value={cashMoveAmount}
                onChange={(e) => setCashMoveAmount(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold mb-3"
                autoFocus
              />
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú (không bắt buộc)</label>
              <input
                type="text"
                value={cashMoveNote}
                onChange={(e) => setCashMoveNote(e.target.value)}
                placeholder="VD: đổi tiền lẻ..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
              />
              <button
                type="button"
                disabled={cashMoveSubmitting}
                onClick={handleAddCashMovement}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold mb-4"
              >
                {cashMoveSubmitting ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>

            <div className="shrink-0 flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">Lịch sử ca này</p>
              {cashMoveHistory.length > 0 && (
                <p className="text-xs text-gray-500">
                  <span className="text-emerald-700 font-semibold">
                    +{cashMoveHistory.filter((m) => m.type === 'in').reduce((s, m) => s + m.amount, 0).toLocaleString('vi-VN')}đ
                  </span>
                  {' · '}
                  <span className="text-red-600 font-semibold">
                    -{cashMoveHistory.filter((m) => m.type === 'out').reduce((s, m) => s + m.amount, 0).toLocaleString('vi-VN')}đ
                  </span>
                </p>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50">
              {cashMoveHistoryLoading ? (
                <p className="text-xs text-gray-400 text-center py-6">Đang tải...</p>
              ) : cashMoveHistory.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Chưa có khoản thu/chi nào trong ca này</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {[...cashMoveHistory]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((m) => (
                      <div key={m.id} className="flex items-start justify-between gap-2 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <span
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${
                              m.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {m.type === 'in' ? 'Thu vào' : 'Chi ra'}
                          </span>
                          {m.note && <div className="text-gray-600 text-xs mt-0.5 truncate">{m.note}</div>}
                          <div className="text-gray-400 text-[11px] mt-0.5">
                            {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {m.createdBy ? ` · ${m.createdBy}` : ''}
                          </div>
                        </div>
                        <span className={`font-bold shrink-0 ${m.type === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>
                          {m.type === 'in' ? '+' : '-'}
                          {m.amount.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    ))}
                </div>
              )}
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
