'use client';
import { useState, useEffect } from 'react';
import { ShoppingCart, ChevronRight, Package, MapPin, ChevronDown, CheckCircle2, X, Star, Clock, Crown } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { useCombos } from '../../contexts/ComboContext';
import { useAffiliate } from '../../contexts/AffiliateContext';
import { useBranches } from '../../contexts/BranchContext';
import * as api from '../../utils/api';
import { buildComboPayloadFromRaw } from '../../utils/comboUtils';
import { CustomerCartPanel, type CartItem } from './CustomerCartPanel';
import { CustomerCheckout } from './CustomerCheckout';
import { CustomerOrderHistory } from './CustomerOrderHistory';
import { CustomerModifierModal } from './CustomerModifierModal';
import { SubscriptionCustomizerModal } from './SubscriptionCustomizerModal';
import { WholesalePackagesModal } from './WholesalePackagesModal';
import { GrabMenu } from './GrabMenu';
import type { CustomerProduct } from './CustomerProductGrid';
import { PLANS, type PlanId, registerWholesaleAccount, getWholesaleAccounts } from './CustomerApp';

export function GrabFoodApp() {
  const { addOrder } = useOrders();
  const { addCombo } = useCombos();
  const { resolveCode, addReferral } = useAffiliate();
  const { activeBranches, branchLabel } = useBranches();
  const activeReferralCode = localStorage.getItem('activeReferralCode');
  const referringPT = activeReferralCode ? resolveCode(activeReferralCode) : null;

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(15000);
  const selectedBranch = activeBranches.find((b) => b.id === selectedBranchId);
  const [search, setSearch] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [selectedRetailProduct, setSelectedRetailProduct] = useState<CustomerProduct | null>(null);
  const [activePlanId, setActivePlanId] = useState<PlanId | null>(null);
  const [showWholesaleModal, setShowWholesaleModal] = useState(false);

  useEffect(() => {
    if (!selectedBranchId && activeBranches.length) setSelectedBranchId(activeBranches[0].id);
  }, [activeBranches, selectedBranchId]);

  useEffect(() => {
    api.fetchSetting('customerDeliveryFee')
      .then((v) => { const n = Number(v); if (!Number.isNaN(n)) setDeliveryFee(n); })
      .catch(() => {});
  }, []);

  // Đồng bộ gói sỉ (dùng cho tra cứu ở màn Đơn hàng).
  useEffect(() => {
    api.fetchWholesale().then((accs) => localStorage.setItem('wholesale_accounts', JSON.stringify(accs))).catch(() => {});
  }, []);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleAddToCart = (item: Omit<CartItem, 'cartItemId'>) => {
    const cartItemId = Math.random().toString(36).slice(2, 11);
    setCart((prev) => [...prev, { ...item, cartItemId }]);
    setActivePlanId(null);
    setShowWholesaleModal(false);
    setIsCartOpen(true);
  };
  const updateQuantity = (id: string, delta: number) =>
    setCart((prev) => prev.map((i) => (i.cartItemId === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)));
  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.cartItemId !== id));

  const placeOrder = async (form: {
    name: string; phone: string; address: string; paymentMethod: string;
    branchId?: string; deliveryType?: 'delivery' | 'pickup'; shipFee?: number;
  }) => {
    const orderId = `ORD-${Date.now()}`;
    const branchId = form.branchId || selectedBranchId || 'CN1';
    const deliveryType = form.deliveryType || 'delivery';
    const shipFee = form.shipFee || 0;
    await addOrder({
      customerName: form.name, customerPhone: form.phone, deliveryAddress: form.address,
      items: cart, total: cartTotal, shipFee, status: 'pending',
      paymentMethod: form.paymentMethod as 'cash' | 'transfer', source: 'mobile',
      branchId, deliveryType, staff: 'Online', paidAt: new Date(),
    });

    for (const item of cart) {
      if (item.rawComboData?.isWholesaleCombo) {
        registerWholesaleAccount({
          customerName: item.rawComboData.customerName || form.name,
          customerPhone: item.rawComboData.customerPhone || form.phone,
          packageName: item.rawComboData.packageName,
          totalCups: item.rawComboData.totalCups,
          durationMonths: item.rawComboData.durationMonths,
          preferredProduct: item.rawComboData.preferredProduct,
          preferredProductSize: item.rawComboData.preferredProductSize,
          preferredProductProtein: item.rawComboData.preferredProductProtein,
          branchId: item.rawComboData.branchId || branchId,
          branchName: item.rawComboData.branchName,
        });
      } else if (item.isCustomCombo && item.rawComboData) {
        const raw = item.rawComboData;
        try {
          await addCombo(buildComboPayloadFromRaw(raw, {
            orderId, customerName: form.name, customerPhone: form.phone, deliveryAddress: form.address,
            totalPrice: item.price, branchId, staff: 'Online', status: 'pending', planName: raw.name || item.name,
          }));
        } catch (err) { console.error('Failed to create combo subscription:', err); }
      }
    }

    if (activeReferralCode) {
      cart.forEach((item) => { if (item.isCustomCombo) addReferral(activeReferralCode, orderId, form.name, item.name, item.price); });
    }

    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    alert('🎉 Đặt hàng thành công! Bạn có thể theo dõi đơn ở mục "Đơn hàng".');
  };

  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto w-full bg-zinc-50">
      {/* Header */}
      <header className="shrink-0 z-20 bg-white border-b border-zinc-100 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-lg shrink-0" style={{ background: '#00b14f' }}>F</div>
            <span className="text-zinc-900 font-black text-lg tracking-tight truncate">FitBlend</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowWholesaleModal(true)} className="px-2.5 py-2 rounded-xl text-[11px] font-black uppercase flex items-center gap-1" style={{ background: 'rgba(251,191,36,0.12)', color: '#b45309' }}>
              <Crown className="w-3.5 h-3.5" /> Mua sỉ
            </button>
            <button onClick={() => setIsOrdersOpen(true)} className="p-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.05)' }}>
              <Package className="w-5 h-5 text-zinc-700" />
            </button>
          </div>
        </div>

        {/* Branch bar (chọn cửa hàng giống Grab) */}
        <button onClick={() => setBranchPickerOpen(true)} className="w-full flex items-center gap-2.5 px-4 py-2.5 border-t border-zinc-100 text-left active:bg-zinc-50">
          <MapPin className="w-4 h-4 shrink-0" style={{ color: '#00b14f' }} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Giao / lấy tại</p>
            <p className="text-[13px] font-black text-zinc-900 truncate leading-tight">{selectedBranch ? selectedBranch.name : 'Chọn chi nhánh'}</p>
          </div>
          <ChevronDown className="w-5 h-5 shrink-0 text-zinc-400" />
        </button>
      </header>

      {/* Store hero */}
      <div className="shrink-0 bg-white px-4 pt-3 pb-2">
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#00b14f,#059f6f)' }}>
          <h1 className="text-xl font-black leading-tight">FitBlend — Sinh tố Protein</h1>
          <p className="text-[12px] text-white/80 mt-0.5">{selectedBranch ? branchLabel(selectedBranch.id) || selectedBranch.name : 'Giao nhanh · Tươi mỗi ngày'}</p>
          <div className="flex items-center gap-3 mt-2 text-[12px] font-semibold">
            <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-white" /> 4.9</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 15–25 phút</span>
            <span>· Freeship khi tự lấy</span>
          </div>
        </div>
        {referringPT && (
          <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between">
            <p className="text-[12px] text-zinc-700">Được giới thiệu bởi <b className="text-emerald-700">{referringPT.name}</b></p>
            <button onClick={() => { localStorage.removeItem('activeReferralCode'); window.location.reload(); }} className="text-[11px] text-zinc-400 underline">Hủy</button>
          </div>
        )}
      </div>

      {/* Menu (Grab-style) */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <GrabMenu
          search={search}
          onSearchChange={setSearch}
          onProductClick={(p) => setSelectedRetailProduct(p)}
          onSelectCombo={(id) => setActivePlanId(id)}
        />
      </div>

      {/* Floating cart */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-w-lg mx-auto" onClick={() => setIsCartOpen(true)}>
          <div className="rounded-2xl p-4 shadow-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" style={{ background: '#00b14f' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-white" />
                <span className="absolute -top-2 -right-2 bg-white text-[#00b14f] text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{cartCount}</span>
              </div>
              <div>
                <p className="text-[10px] text-white/80 font-medium">Giỏ hàng</p>
                <p className="font-extrabold text-lg leading-none text-white">{cartTotal.toLocaleString('vi-VN')}đ</p>
              </div>
            </div>
            <div className="bg-white text-[#00b14f] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1">Xem giỏ <ChevronRight className="w-4 h-4" /></div>
          </div>
        </div>
      )}

      <CustomerCartPanel cart={cart} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onUpdateQty={updateQuantity} onRemove={removeItem} onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} onEditCombo={() => {}} />

      {isCheckoutOpen && (
        <CustomerCheckout total={cartTotal} initialBranchId={selectedBranchId} deliveryFee={deliveryFee} onClose={() => setIsCheckoutOpen(false)} onPlaceOrder={placeOrder} />
      )}

      <CustomerOrderHistory isOpen={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} />

      {selectedRetailProduct && (
        <CustomerModifierModal
          product={selectedRetailProduct}
          onClose={() => setSelectedRetailProduct(null)}
          onAdd={(item) => {
            handleAddToCart({
              productId: item.id, productName: item.name, name: item.name,
              size: item.size, protein: item.protein, toppings: item.toppings,
              price: item.price, quantity: 1, isCustomCombo: false,
            });
            setSelectedRetailProduct(null);
          }}
        />
      )}

      {activePlanId && (
        <SubscriptionCustomizerModal planId={activePlanId} onClose={() => setActivePlanId(null)} onAddToCart={handleAddToCart} />
      )}

      <WholesalePackagesModal isOpen={showWholesaleModal} onClose={() => setShowWholesaleModal(false)} onAddToCart={handleAddToCart} />

      {/* Branch picker */}
      {branchPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} onClick={() => setBranchPickerOpen(false)}>
          <div className="w-full max-w-lg sm:rounded-[2rem] rounded-t-[2rem] overflow-hidden bg-white" style={{ maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
              <h2 className="text-[17px] font-black text-zinc-900 flex items-center gap-2"><MapPin className="w-5 h-5" style={{ color: '#00b14f' }} /> Chọn chi nhánh</h2>
              <button onClick={() => setBranchPickerOpen(false)} className="p-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.05)' }}><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <div className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: '60vh', scrollbarWidth: 'none' }}>
              {activeBranches.map((b) => (
                <button key={b.id} onClick={() => { setSelectedBranchId(b.id); setBranchPickerOpen(false); }}
                  className="w-full flex items-center justify-between p-4 rounded-[16px] text-left"
                  style={selectedBranchId === b.id ? { background: 'rgba(0,177,79,0.06)', border: '1.5px solid rgba(0,177,79,0.35)' } : { background: '#f9f9fb', border: '1.5px solid rgba(0,0,0,0.05)' }}>
                  <div className="min-w-0">
                    <p className="font-black text-[14px]" style={{ color: selectedBranchId === b.id ? '#00b14f' : 'rgba(0,0,0,0.85)' }}>{b.name}</p>
                    <p className="text-[12px] mt-0.5 truncate text-zinc-400">{b.address}</p>
                  </div>
                  {selectedBranchId === b.id && <CheckCircle2 className="w-5 h-5 shrink-0 ml-2" style={{ color: '#00b14f' }} />}
                </button>
              ))}
              {activeBranches.length === 0 && <p className="text-center text-sm text-zinc-400 py-8">Chưa có chi nhánh.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
