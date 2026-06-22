import { useState, useEffect } from 'react';
import { ShoppingBag, ClipboardList, Package, History, User, Users, Store, BookOpen } from 'lucide-react';
import { ProductGrid } from './ProductGrid';
import { ModifierModal } from './ModifierModal';
import { CheckoutPanel } from './CheckoutPanel';
import { MobileCheckoutModal } from './MobileCheckoutModal';
import { OrderQueue } from './OrderQueue';
import { ComboManagement } from './ComboManagement';
import { OrderHistory } from './OrderHistory';
import { InventoryManagement } from './InventoryManagement';
import { MenuManagement } from './MenuManagement';
import { MacroTable } from './MacroTable';
import { ComboDashboard } from './ComboDashboard';
import { CustomComboBuilder } from '../customer/CustomComboBuilder';

import { useOrders } from '../../contexts/OrderContext';
import { useCombos } from '../../contexts/ComboContext';
import { useInventory } from '../../contexts/InventoryContext';
import type { CartItem } from './ModifierModal';
import * as api from '../../utils/api';
import type { Shift } from '../admin/ShiftSchedule';

const branches = [
  { id: 'CN1', name: 'Chi Nhánh 1 - Quận 1' },
  { id: 'CN2', name: 'Chi Nhánh 2 - Quận 3' },
  { id: 'CN3', name: 'Chi Nhánh 3 - Thủ Đức' },
];

export function POSInterface() {
  const { orders } = useOrders();
  const { getTodayDeliveries } = useCombos();
  const { isWarehouseReady } = useInventory();
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'combos' | 'warehouse' | 'history' | 'admin' | 'macro'>('products');

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showMobileCheckout, setShowMobileCheckout] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [currentShifts, setCurrentShifts] = useState<Shift[]>([]);
  const [showStaffList, setShowStaffList] = useState(false);

  useEffect(() => {
    // Load saved branch from localStorage
    const savedBranch = localStorage.getItem('pos_branch');
    if (savedBranch) {
      setSelectedBranch(savedBranch);
    }
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadCurrentShifts();
      const interval = setInterval(loadCurrentShifts, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [selectedBranch]);

  const getCurrentShiftType = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour < 14) {
      return { type: 'morning', name: 'Ca Sáng', color: 'bg-yellow-100 text-yellow-800' };
    } else if (currentHour >= 14 && currentHour < 22) {
      return { type: 'afternoon', name: 'Ca Chiều', color: 'bg-emerald-100 text-blue-800' };
    } else {
      return { type: 'evening', name: 'Ca Tối', color: 'bg-emerald-100 text-emerald-800' };
    }
  };

  const handleBranchLogin = (branchId: string) => {
    setSelectedBranch(branchId);
    localStorage.setItem('pos_branch', branchId);
  };

  const handleLogout = () => {
    if (confirm('Đăng xuất khỏi chi nhánh này?')) {
      setSelectedBranch(null);
      localStorage.removeItem('pos_branch');
      setCart([]);
    }
  };

  const loadCurrentShifts = async () => {
    if (!selectedBranch) return;

    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    try {
      const shifts = (await api.fetchShifts({ branch: selectedBranch, date: today })) as Shift[];
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

  // Branch Login Screen
  if (!selectedBranch) {
    return (
      <div className="h-screen bg-gradient-to-br from-emerald-600 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">FitBlend POS</h1>
            <p className="text-gray-600">Chọn chi nhánh để bắt đầu</p>
          </div>

          <div className="space-y-3">
            {branches.map(branch => (
              <button
                key={branch.id}
                onClick={() => handleBranchLogin(branch.id)}
                className="w-full p-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <Store className="w-6 h-6" />
                {branch.name}
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
            <p className="text-center text-sm text-gray-600">
              <span className="font-semibold">Lưu ý:</span> Máy POS sẽ được cố định với chi nhánh đã chọn
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-emerald-50 to-emerald-50 p-2 sm:p-4 overflow-hidden relative">
      <div className="bg-white rounded-xl shadow-xl h-full p-3 sm:p-4 flex flex-col">
        {/* Header */}
        <div className="mb-2 sm:mb-3 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex-shrink-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">FitBlend POS</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs sm:text-sm text-gray-600 font-semibold">
                {branches.find(b => b.id === selectedBranch)?.name}
              </p>
              <button
                onClick={handleLogout}
                className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded-md font-semibold transition-colors flex items-center gap-1"
                title="Đăng xuất chi nhánh"
              >
                Đổi
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-1 flex justify-center">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-shrink-0 flex items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-semibold transition-all text-xs sm:text-sm border-b-2 ${
                  activeTab === 'products'
                    ? 'border-emerald-700 text-emerald-700 bg-emerald-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="whitespace-nowrap">Sản Phẩm</span>
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-shrink-0 flex items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-semibold transition-all relative text-xs sm:text-sm border-b-2 ${
                  activeTab === 'orders'
                    ? 'border-emerald-700 text-emerald-700 bg-emerald-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="whitespace-nowrap">Hàng Đợi</span>
                {orders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shadow-md">
                    {orders.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('combos')}
                className={`flex-shrink-0 flex items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-semibold transition-all relative text-xs sm:text-sm border-b-2 ${
                  activeTab === 'combos'
                    ? 'border-emerald-700 text-emerald-700 bg-emerald-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="whitespace-nowrap">Combo</span>
                {getTodayDeliveries().length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-md animate-pulse">
                    {getTodayDeliveries().length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-shrink-0 flex items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-semibold transition-all text-xs sm:text-sm border-b-2 ${
                  activeTab === 'history'
                    ? 'border-emerald-700 text-emerald-700 bg-emerald-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="whitespace-nowrap">Lịch Sử</span>
              </button>
              <button
                onClick={() => setActiveTab('warehouse')}
                className={`flex-shrink-0 flex items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-semibold transition-all text-xs sm:text-sm border-b-2 ${
                  activeTab === 'warehouse'
                    ? 'border-emerald-700 text-emerald-700 bg-emerald-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="whitespace-nowrap">Kho</span>
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-shrink-0 flex items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-semibold transition-all text-xs sm:text-sm border-b-2 ${
                  activeTab === 'admin'
                    ? 'border-emerald-700 text-emerald-700 bg-emerald-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                <span className="whitespace-nowrap">Thực đơn</span>
              </button>
              <button
                onClick={() => setActiveTab('macro')}
                className={`flex-shrink-0 flex items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-semibold transition-all text-xs sm:text-sm border-b-2 ${
                  activeTab === 'macro'
                    ? 'border-emerald-700 text-emerald-700 bg-emerald-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                <span className="whitespace-nowrap">Macro</span>
              </button>
            </div>

          </div>

          <div className="text-right flex-shrink-0 relative">
            <button
              onClick={() => setShowStaffList(!showStaffList)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-100 hover:bg-blue-200 rounded-lg transition-colors"
            >
              <Users className="w-4 h-4 text-emerald-700" />
              <div className="text-left">
                <div className="text-xs text-gray-600">Nhân viên</div>
                <div className="text-sm font-bold text-emerald-700">{currentShifts.length} người</div>
              </div>
            </button>

            {showStaffList && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border-2 border-blue-200 p-4 z-50 min-w-[280px] transition-all transform origin-top-right">
                <div className="mb-3 pb-3 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">Nhân viên đang làm</h3>
                    <button
                      onClick={() => setShowStaffList(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCurrentShiftType().color}`}>
                      {getCurrentShiftType().name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
                {currentShifts.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có nhân viên đăng ký ca</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {currentShifts.map(shift => (
                      <div key={shift.id} className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg">
                        <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                          {shift.employeeName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 text-sm truncate">
                            {shift.employeeName}
                          </div>
                          <div className="text-xs text-gray-600">
                            {shift.startTime} - {shift.endTime}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!isWarehouseReady && (
          <div className="mb-2 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-sm font-semibold flex-shrink-0">
            ⚠️ Chưa nhập kho — không thể bán hàng. Admin vào <strong>Kho Hàng → Nhập kho</strong> trước.
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-hidden">
          {/* Left Panel */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Content Area */}
            <div className="flex-1 overflow-hidden min-h-0">
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
                <OrderQueue />
              ) : activeTab === 'combos' ? (
                <ComboDashboard />
              ) : activeTab === 'warehouse' ? (
                <InventoryManagement />
              ) : activeTab === 'admin' ? (
                <MenuManagement />
              ) : activeTab === 'macro' ? (
                <MacroTable />
              ) : (
                <OrderHistory />
              )}

            </div>
          </div>

          {/* Right Panel - Checkout */}
          {activeTab === 'products' && (
            <div className="hidden lg:block lg:w-[350px] xl:w-[400px] flex-shrink-0">
              <CheckoutPanel
                cart={cart}
                branchId={selectedBranch}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
              />
            </div>
          )}
        </div>

        {/* Mobile Checkout Button */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
            <button
              onClick={() => setShowMobileCheckout(true)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold shadow-2xl flex items-center justify-between px-6 active:scale-95 transition-transform"
            >
              <span className="text-lg">Giỏ hàng ({cart.length})</span>
              <span className="text-lg">
                {cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString('vi-VN')}đ
              </span>
            </button>
          </div>
        )}
      </div>

      {selectedProduct && selectedProduct.category === 'combo' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden h-[90vh] flex flex-col">
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
                  rawComboData: combo.rawComboData
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
          branchId={selectedBranch || 'CN1'}
          onClose={() => setShowMobileCheckout(false)}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
        />
      )}
    </div>
  );
}
