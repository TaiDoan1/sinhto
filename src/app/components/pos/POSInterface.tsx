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
import { PosKioskOverlay } from './PosKioskOverlay';
import { useBranchOrders } from '../../hooks/useBranchOrders';
import { useBranchCombos } from '../../hooks/useBranchCombos';
import { BRANCH_LABELS } from '../../types/employee';

import { useInventory } from '../../contexts/InventoryContext';
import type { CartItem } from './ModifierModal';
import * as api from '../../utils/api';
import type { Shift } from '../admin/ShiftSchedule';

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
  const branchId = session?.branchId || '';
  const { orders } = useBranchOrders(branchId);
  const { getTodayDeliveries } = useBranchCombos(branchId);
  const { isWarehouseReady, loadForBranch } = useInventory();
  const [activeTab, setActiveTab] = useState<PosTab>('products');

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showMobileCheckout, setShowMobileCheckout] = useState(false);
  const [currentShifts, setCurrentShifts] = useState<Shift[]>([]);
  const [showStaffList, setShowStaffList] = useState(false);

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
    if (currentHour >= 6 && currentHour < 14) {
      return { type: 'morning', name: 'Ca Sáng', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (currentHour >= 14 && currentHour < 22) {
      return { type: 'afternoon', name: 'Ca Chiều', color: 'bg-emerald-100 text-blue-800' };
    }
    return { type: 'evening', name: 'Ca Tối', color: 'bg-emerald-100 text-emerald-800' };
  };

  const handleLogout = () => {
    if (confirm('Đăng xuất máy POS?')) {
      logout();
      setCart([]);
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
            {BRANCH_LABELS[branchId] || branchId} · {session.employeeName}
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
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 p-1.5 text-red-500 hover:bg-red-50 rounded-md"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex gap-0.5 px-1 pb-1 overflow-x-auto scrollbar-hide">
          {POS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.badge === 'orders' ? orders.length : tab.badge === 'combos' ? comboDueCount : 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pos-tab relative flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-700 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{tab.label}</span>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
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
              <CustomerComboHub variant="pos" branchId={branchId} className="p-2 h-full overflow-auto" />
            ) : activeTab === 'warehouse' ? (
              <InventoryManagement />
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
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col">
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
              }}
            />
          </div>
        </div>
      )}

      {showMobileCheckout && (
        <MobileCheckoutModal
          cart={cart}
          branchId={branchId}
          onClose={() => setShowMobileCheckout(false)}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
        />
      )}
    </div>
  );
}

export function POSInterface() {
  return (
    <PosProvider>
      <PosKioskOverlay>
        <POSInterfaceInner />
      </PosKioskOverlay>
    </PosProvider>
  );
}
