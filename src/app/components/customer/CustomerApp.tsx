'use client';
import { useState } from 'react';
import { ShoppingCart, ChevronRight, Package, X } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { CustomerCartPanel, type CartItem } from './CustomerCartPanel';
import { CustomerCheckout } from './CustomerCheckout';
import { CustomerOrderHistory } from './CustomerOrderHistory';
import { CustomerLanding } from './CustomerLanding';
import { SubscriptionCustomizerModal } from './SubscriptionCustomizerModal';
import { WholesalePackagesModal } from './WholesalePackagesModal';
import { useAffiliate } from '../../contexts/AffiliateContext';

// ─── Plan data ────────────────────────────────────────────────────────────────
export type PlanId = 'fat-loss' | 'muscle-build' | 'elite-mass';
export type Duration = 'weekly' | 'monthly' | 'quarterly';

export const PLANS = {
  'fat-loss': {
    id: 'fat-loss' as PlanId,
    icon: '🔥',
    name: 'Fat Loss Plan',
    subtitle: 'GIẢM MỠ · TONE DÁNG',
    specs: '360ml × 40g Protein · 7 ly/tuần',
    badge: 'STANDARD',
    badgeColor: '#e8740c',
    priceColor: '#e8740c',
    weekly:    { price: 498,   original: 553,   save: 55,   perCup: 71 },
    monthly:   { price: 2015,  original: 2370,  save: 355,  perCup: 67 },
    quarterly: { price: 5720,  original: 7150,  save: 1430, perCup: 63 },
    ctaColor: '#e8740c',
  },
  'muscle-build': {
    id: 'muscle-build' as PlanId,
    icon: '💪',
    name: 'Muscle Build Plan',
    subtitle: 'TĂNG CƠ · BEST VALUE',
    specs: '500ml × 60g Protein · 7 ly/tuần',
    badge: 'PHỔ BIẾN',
    badgeColor: '#22c55e',
    priceColor: '#4ade80',
    weekly:    { price: 725,   original: 805,   save: 80,   perCup: 103.5 },
    monthly:   { price: 2933,  original: 3450,  save: 517,  perCup: 98 },
    quarterly: { price: 8330,  original: 10400, save: 2070, perCup: 93 },
    ctaColor: '#166534',
  },
  'elite-mass': {
    id: 'elite-mass' as PlanId,
    icon: '🏆',
    name: 'Elite Mass Plan',
    subtitle: 'TĂNG CÂN · DÂN GYM PRO',
    specs: '700ml × 90g Protein · 7 ly/tuần',
    badge: 'FLAGSHIP',
    badgeColor: '#d97706',
    priceColor: '#fbbf24',
    weekly:    { price: 977,   original: 1085,  save: 108,  perCup: 139.5 },
    monthly:   { price: 3953,  original: 4650,  save: 697,  perCup: 132 },
    quarterly: { price: 11230, original: 14000, save: 2770, perCup: 125 },
    ctaColor: '#4f46e5',
  },
};

const PLAN_ORDER: PlanId[] = ['fat-loss', 'muscle-build', 'elite-mass'];

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('vi-VN').replace(/\./g, '.');
}

// ─── Wholesale account helpers ────────────────────────────────────────────────
export interface WholesaleAccount {
  id: string;
  customerName: string;
  customerPhone: string;
  packageName: string;
  totalCups: number;
  remainingCups: number;
  durationMonths: number;
  purchasedAt: string; // ISO
  expiresAt: string;   // ISO
  preferredProduct?: {
    id: string;
    name: string;
    image: string;
  };
  preferredProductSize?: string;
  preferredProductProtein?: number;
  branchId?: string;
  branchName?: string;
  redemptions: {
    date: string;
    flavor: string;
    redeemedBy: string;
  }[];
}

export function getWholesaleAccounts(): WholesaleAccount[] {
  try {
    return JSON.parse(localStorage.getItem('wholesale_accounts') || '[]');
  } catch {
    return [];
  }
}

export function saveWholesaleAccounts(accounts: WholesaleAccount[]) {
  localStorage.setItem('wholesale_accounts', JSON.stringify(accounts));
}

export function registerWholesaleAccount(data: {
  customerName: string;
  customerPhone: string;
  packageName: string;
  totalCups: number;
  durationMonths: number;
  preferredProduct?: { id: string; name: string; image: string };
  preferredProductSize?: string;
  preferredProductProtein?: number;
  branchId?: string;
  branchName?: string;
}): WholesaleAccount {
  const accounts = getWholesaleAccounts();
  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + data.durationMonths);

  const newAccount: WholesaleAccount = {
    id: `WS-${Date.now()}`,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    packageName: data.packageName,
    totalCups: data.totalCups,
    remainingCups: data.totalCups,
    durationMonths: data.durationMonths,
    purchasedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    preferredProduct: data.preferredProduct,
    preferredProductSize: data.preferredProductSize,
    preferredProductProtein: data.preferredProductProtein,
    branchId: data.branchId,
    branchName: data.branchName,
    redemptions: [],
  };

  accounts.push(newAccount);
  saveWholesaleAccounts(accounts);
  return newAccount;
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, duration, onSelect }: {
  plan: typeof PLANS['fat-loss'];
  duration: Duration;
  onSelect: () => void;
}) {
  const p = plan[duration];
  const savingsLabel = `✦ Tiết kiệm ${fmt(p.save)}k`;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-[20px] overflow-hidden transition-transform active:scale-[0.98]"
      style={{ background: 'linear-gradient(180deg, #162d1c 0%, #0f2016 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Top info section */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: plan.priceColor, opacity: 0.8 }}>
            {plan.subtitle}
          </p>
          <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: plan.badgeColor, color: '#fff' }}>
            {plan.badge}
          </span>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">{plan.icon}</span>
          <h3 className="text-[22px] font-black text-white leading-tight">{plan.name}</h3>
        </div>
        <p className="text-[13px] text-white/45 font-medium">{plan.specs}</p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* Price section */}
      <div className="px-5 py-4 flex items-end justify-between" style={{ background: 'rgba(0,0,0,0.15)' }}>
        <div>
          <p className="text-[13px] font-bold line-through" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {fmt(p.original)}k
          </p>
          <p className="text-[36px] font-black leading-none" style={{ color: plan.priceColor }}>
            {fmt(p.price)}<span className="text-[22px]">k</span>
          </p>
          <p className="text-[12px] text-white/45 font-medium mt-0.5">
            = {p.perCup}k/ly · Freeship
          </p>
        </div>
        <div className="px-4 py-2 rounded-full text-[13px] font-bold text-white" style={{ background: plan.ctaColor }}>
          {savingsLabel}
        </div>
      </div>
    </button>
  );
}

// ─── Duration Tab Bar ─────────────────────────────────────────────────────────
function DurationTabs({ active, onChange }: { active: Duration; onChange: (d: Duration) => void }) {
  const tabs: { key: Duration; label: string }[] = [
    { key: 'weekly',    label: 'TUẦN –10%' },
    { key: 'monthly',   label: 'THÁNG –15%' },
    { key: 'quarterly', label: '🔥 QUÝ –20%' },
  ];
  return (
    <div className="flex gap-2 px-4">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="flex-1 py-3 rounded-[14px] text-[11px] font-black uppercase tracking-wider transition-all"
          style={active === t.key
            ? { background: 'transparent', border: '1.5px solid #d97706', color: '#d97706' }
            : { background: 'rgba(255,255,255,0.06)', border: '1.5px solid transparent', color: 'rgba(255,255,255,0.45)' }
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main CustomerApp ─────────────────────────────────────────────────────────
export function CustomerApp() {
  const { addOrder, orders } = useOrders();
  const { resolveCode, addReferral } = useAffiliate();
  const activeReferralCode = localStorage.getItem('activeReferralCode');
  const referringPT = activeReferralCode ? resolveCode(activeReferralCode) : null;

  const [showWelcome, setShowWelcome] = useState(true);
  const [duration, setDuration] = useState<Duration>('quarterly');
  const [activePlanId, setActivePlanId] = useState<PlanId | null>(null);
  const [showWholesaleModal, setShowWholesaleModal] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleAddToCart = (item: Omit<CartItem, 'cartItemId'>) => {
    const cartItemId = Math.random().toString(36).substr(2, 9);
    setCart(prev => [...prev, { ...item, cartItemId }]);
    setActivePlanId(null);
    setShowWholesaleModal(false);
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) =>
    setCart(prev => prev.map(i => i.cartItemId === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.cartItemId !== id));

  const placeOrder = (form: { name: string; phone: string; address: string; paymentMethod: string }) => {
    const nextOrderId = `ORD-${String(orders.length + 1).padStart(3, '0')}`;
    addOrder({
      customerName: form.name, customerPhone: form.phone, deliveryAddress: form.address,
      items: cart, total: cartTotal, status: 'pending', time: new Date(),
      paymentMethod: form.paymentMethod as any, source: 'mobile',
      branchId: 'CN1', staff: 'Online', paidAt: new Date()
    });

    // Register wholesale accounts for any wholesale items in cart
    cart.forEach(item => {
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
          branchId: item.rawComboData.branchId,
          branchName: item.rawComboData.branchName,
        });
      }
    });

    // Record PT affiliate if active
    if (activeReferralCode) {
      cart.forEach(item => {
        if (item.isCustomCombo) {
          addReferral(activeReferralCode, nextOrderId, form.name, item.name, item.price);
        }
      });
    }

    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    alert('🎉 Đặt hàng thành công! Cảm ơn bạn.');
  };

  // ── Landing ──────────────────────────────────────────────────────────────────
  if (showWelcome) {
    return (
      <>
        <CustomerLanding
          onGetStarted={() => setShowWelcome(false)}
          onSelectCombo={(planId) => {
            setShowWelcome(false);
            setActivePlanId(planId as PlanId);
          }}
          onOpenWholesale={() => setShowWholesaleModal(true)}
        />
        {showWholesaleModal && (
          <WholesalePackagesModal
            isOpen={showWholesaleModal}
            onClose={() => setShowWholesaleModal(false)}
            onAddToCart={handleAddToCart}
          />
        )}
      </>
    );
  }

  // ── Main App ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0d1f10' }}>

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-4" style={{ background: '#0d1f10' }}>
        <button onClick={() => setShowWelcome(true)} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[#0d1f10] text-lg" style={{ background: '#4ade80' }}>F</div>
          <span className="text-white font-black text-lg tracking-tight">FITBLEND</span>
        </button>
        <div className="flex items-center gap-2">
          {/* Wholesale button in header */}
          <button
            onClick={() => setShowWholesaleModal(true)}
            className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
            style={{ background: 'rgba(255,215,0,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
          >
            👑 Mua Sỉ
          </button>
          <button onClick={() => setIsOrdersOpen(true)} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Package className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* Referral banner */}
        {referringPT && (
          <div className="mx-4 mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-emerald-400 text-[10px] font-black uppercase tracking-wider">Mã giới thiệu đã áp dụng</div>
              <p className="text-white text-xs font-semibold mt-0.5">Bạn được giới thiệu bởi PT <span className="text-emerald-400 font-bold">{referringPT.name}</span></p>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('activeReferralCode');
                window.location.reload();
              }}
              className="text-[10px] text-white/50 hover:text-white font-bold underline"
            >
              Hủy
            </button>
          </div>
        )}

        {/* Title */}
        <div className="px-4 pb-5 pt-1">
          <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em] mb-1">CÀNG MUA NHIỀU – TIẾT KIỆM CÀNG LỚN</p>
          <h1 className="text-white text-[28px] font-black leading-tight">
            Combo <span style={{ color: '#4ade80' }}>Tuần · Tháng · Quý</span>
          </h1>
          <p className="text-white/40 text-[13px] mt-1">Chọn vị từng ngày · Giao tươi mỗi sáng · Freeship</p>
        </div>

        {/* Duration Tabs */}
        <div className="mb-5">
          <DurationTabs active={duration} onChange={setDuration} />
        </div>

        {/* Plan Cards */}
        <div className="px-4 space-y-4">
          {PLAN_ORDER.map(pid => (
            <PlanCard
              key={pid}
              plan={PLANS[pid]}
              duration={duration}
              onSelect={() => setActivePlanId(pid)}
            />
          ))}
        </div>

        {/* Wholesale promo banner */}
        <button
          onClick={() => setShowWholesaleModal(true)}
          className="mx-4 mt-6 w-[calc(100%-2rem)] rounded-[20px] p-5 text-left active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(99,102,241,0.08) 100%)', border: '1px solid rgba(251,191,36,0.2)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#fbbf24' }}>👑 MUA SỈ PREPAID</p>
              <p className="text-white font-black text-[16px] leading-tight">Mua 10–50 ly, lấy dần</p>
              <p className="text-white/40 text-[12px] mt-0.5">Tiết kiệm lên đến 40% · Tra cứu bằng SĐT</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30" />
          </div>
        </button>

        {/* Discount info block */}
        <div className="mx-4 mt-4 rounded-[20px] p-5" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.12)' }}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { pct: '-10%', label: 'Gói Tuần', sub: '7 ly · Freeship', bg: 'rgba(34,197,94,0.15)' },
              { pct: '-15%', label: 'Gói Tháng', sub: '30 ly + 🎁 Quà', bg: 'rgba(217,119,6,0.15)' },
              { pct: '-20%', label: 'Gói Quý 🔥', sub: '90 ly + 🎁 Quà VIP', bg: 'rgba(99,102,241,0.2)', best: true },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl p-3 text-center" style={{ background: item.bg, border: (item as any).best ? '1px solid rgba(99,102,241,0.4)' : 'none' }}>
                <p className="text-white font-black text-[20px]">{item.pct}</p>
                <p className="text-white/80 text-[11px] font-bold mt-0.5">{item.label}</p>
                <p className="text-white/40 text-[10px] mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-5 left-4 right-4 z-30" onClick={() => setIsCartOpen(true)}>
          <div className="rounded-2xl p-4 shadow-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" style={{ background: '#22c55e' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-[#0d1f10]" />
                <span className="absolute -top-2 -right-2 bg-[#0d1f10] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{cartCount}</span>
              </div>
              <div>
                <p className="text-[10px] text-[#0d1f10]/60 font-medium">Tổng thanh toán</p>
                <p className="font-extrabold text-lg leading-none text-[#0d1f10]">{cartTotal.toLocaleString('vi-VN')}đ</p>
              </div>
            </div>
            <div className="bg-[#0d1f10] text-[#22c55e] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1">
              Xem giỏ <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Cart Panel */}
      <CustomerCartPanel
        cart={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQty={updateQuantity}
        onRemove={removeItem}
        onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
        onEditCombo={() => {}}
      />

      {/* Checkout */}
      {isCheckoutOpen && (
        <CustomerCheckout total={cartTotal} onClose={() => setIsCheckoutOpen(false)} onPlaceOrder={placeOrder} />
      )}

      {/* Order History (with wholesale lookup tab) */}
      <CustomerOrderHistory isOpen={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} />

      {/* Plan Detail Modal */}
      {activePlanId && (
        <SubscriptionCustomizerModal
          planId={activePlanId}
          onClose={() => setActivePlanId(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Wholesale Packages Modal */}
      <WholesalePackagesModal
        isOpen={showWholesaleModal}
        onClose={() => setShowWholesaleModal(false)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
