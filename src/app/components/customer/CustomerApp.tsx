'use client';
import { useState, useEffect } from 'react';
import { ShoppingCart, ChevronRight, Package, X } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { useCombos } from '../../contexts/ComboContext';
import { CustomerCartPanel, type CartItem } from './CustomerCartPanel';
import { CustomerCheckout } from './CustomerCheckout';
import { CustomerOrderHistory } from './CustomerOrderHistory';
import { CustomerLanding } from './CustomerLanding';
import { SubscriptionCustomizerModal } from './SubscriptionCustomizerModal';
import { WholesalePackagesModal } from './WholesalePackagesModal';
import { useAffiliate } from '../../contexts/AffiliateContext';
import { CustomerProductGrid, type CustomerProduct } from './CustomerProductGrid';
import { CustomerModifierModal } from './CustomerModifierModal';
import * as api from '../../utils/api';
import { buildComboPayloadFromRaw } from '../../utils/comboUtils';

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
  const oldAccounts = getWholesaleAccounts();
  localStorage.setItem('wholesale_accounts', JSON.stringify(accounts));
  
  // Find which account changed and sync to backend
  accounts.forEach(acc => {
    const oldAcc = oldAccounts.find(o => o.id === acc.id);
    if (!oldAcc || oldAcc.remainingCups !== acc.remainingCups || oldAcc.redemptions.length !== acc.redemptions.length) {
      api.updateWholesale(acc.id, acc.remainingCups, acc.redemptions)
        .catch(err => console.error("Failed to sync wholesale account update to backend:", err));
    }
  });
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
  localStorage.setItem('wholesale_accounts', JSON.stringify(accounts));
  
  // Save to backend database
  api.createWholesale(newAccount)
    .catch(err => console.error("Failed to register wholesale account on backend:", err));

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
      style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
    >
      {/* Top info section */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
          <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase" style={{ color: plan.priceColor, opacity: 0.9 }}>
            {plan.subtitle}
          </p>
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-3 py-0.5 sm:py-1 rounded-full" style={{ background: plan.badgeColor, color: '#fff' }}>
            {plan.badge}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 mb-0.5">
          <span className="text-2xl sm:text-3xl">{plan.icon}</span>
          <h3 className="text-lg sm:text-[22px] font-black text-zinc-900 leading-tight">{plan.name}</h3>
        </div>
        <p className="text-[12px] sm:text-[13px] text-zinc-500 font-medium">{plan.specs}</p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />

      {/* Price section */}
      <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3" style={{ background: 'rgba(0,0,0,0.02)' }}>
        <div>
          <p className="text-[13px] font-bold line-through" style={{ color: 'rgba(0,0,0,0.35)' }}>
            {fmt(p.original)}k
          </p>
          <p className="text-[32px] sm:text-[36px] font-black leading-none" style={{ color: plan.priceColor }}>
            {fmt(p.price)}<span className="text-[20px] sm:text-[22px]">k</span>
          </p>
          <p className="text-[12px] text-zinc-500 font-medium mt-0.5">
            = {p.perCup}k/ly · Freeship
          </p>
        </div>
        <div className="self-start sm:self-auto px-4 py-2 rounded-full text-[12px] sm:text-[13px] font-bold text-white whitespace-nowrap" style={{ background: plan.ctaColor }}>
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
    <div className="flex gap-1.5 sm:gap-2 px-3 sm:px-4">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="flex-1 py-2.5 sm:py-3 rounded-xl sm:rounded-[14px] text-[10px] sm:text-[11px] font-black uppercase tracking-wide transition-all"
          style={active === t.key
            ? { background: 'transparent', border: '1.5px solid #d97706', color: '#d97706' }
            : { background: 'rgba(0,0,0,0.05)', border: '1.5px solid transparent', color: 'rgba(0,0,0,0.6)' }
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
  const { addOrder } = useOrders();
  const { addCombo } = useCombos();
  const { resolveCode, addReferral } = useAffiliate();
  const activeReferralCode = localStorage.getItem('activeReferralCode');
  const referringPT = activeReferralCode ? resolveCode(activeReferralCode) : null;

  // Sync wholesale accounts on mount & via SSE
  useEffect(() => {
    api.fetchWholesale()
      .then(accounts => {
        localStorage.setItem('wholesale_accounts', JSON.stringify(accounts));
      })
      .catch(err => console.error("Failed to fetch wholesale accounts:", err));

    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'WHOLESALE_UPDATED') {
          const accounts = getWholesaleAccounts();
          const exists = accounts.some(a => a.id === data.id);
          const updated = exists 
            ? accounts.map(a => a.id === data.id ? data : a)
            : [...accounts, data];
          localStorage.setItem('wholesale_accounts', JSON.stringify(updated));
        }
      } catch (err) {
        console.error("SSE parse error in CustomerApp wholesale sync", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const [showWelcome, setShowWelcome] = useState(true);
  const [viewMode, setViewMode] = useState<'combos' | 'retail'>('combos');
  const [selectedRetailProduct, setSelectedRetailProduct] = useState<CustomerProduct | null>(null);
  const [duration, setDuration] = useState<Duration>('monthly');
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

  const placeOrder = async (form: { name: string; phone: string; address: string; paymentMethod: string }) => {
    const orderId = `ORD-${Date.now()}`;
    await addOrder({
      customerName: form.name, customerPhone: form.phone, deliveryAddress: form.address,
      items: cart, total: cartTotal, status: 'pending',
      paymentMethod: form.paymentMethod as 'cash' | 'transfer', source: 'mobile',
      branchId: 'CN1', staff: 'Online', paidAt: new Date(),
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
          branchId: item.rawComboData.branchId,
          branchName: item.rawComboData.branchName,
        });
      } else if (item.isCustomCombo && item.rawComboData) {
        const raw = item.rawComboData;
        try {
          await addCombo(buildComboPayloadFromRaw(raw, {
            orderId,
            customerName: form.name,
            customerPhone: form.phone,
            deliveryAddress: form.address,
            totalPrice: item.price,
            branchId: 'CN1',
            staff: 'Online',
            status: 'pending',
            planName: raw.name || item.name,
          }));
        } catch (err) {
          console.error('Failed to create combo subscription:', err);
        }
      }
    }

    // Record PT affiliate if active
    if (activeReferralCode) {
      cart.forEach(item => {
        if (item.isCustomCombo) {
          addReferral(activeReferralCode, orderId, form.name, item.name, item.price);
        }
      });
    }

    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    alert('🎉 Đặt hàng thành công! Nhân viên CS sẽ liên hệ xác nhận combo.');
  };

  // ── Landing ──────────────────────────────────────────────────────────────────
  if (showWelcome) {
    return (
      <>
        <CustomerLanding
          onGetStarted={() => {
            setShowWelcome(false);
            setViewMode('combos');
          }}
          onGoToRetail={() => {
            setShowWelcome(false);
            setViewMode('retail');
          }}
          onSelectDuration={(d) => {
            setShowWelcome(false);
            setViewMode('combos');
            setDuration(d);
          }}
          onSelectCombo={(planId) => {
            setShowWelcome(false);
            setViewMode('combos');
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
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto w-full" style={{ background: '#ffffff' }}>

      {/* Header */}
      <header className="flex-shrink-0 z-20 flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 border-b border-zinc-100 pt-[max(0.75rem,env(safe-area-inset-top))]" style={{ background: '#ffffff' }}>
        <button onClick={() => setShowWelcome(true)} className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-white text-base sm:text-lg shrink-0" style={{ background: '#00b14f' }}>F</div>
          <span className="text-zinc-900 font-black text-base sm:text-lg tracking-tight truncate">FITBLEND</span>
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setShowWholesaleModal(true)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#b45309', border: '1px solid rgba(251,191,36,0.2)' }}
          >
            <span className="sm:hidden">👑 </span>Mua Sỉ
          </button>
          <button onClick={() => setIsOrdersOpen(true)} className="p-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.05)' }}>
            <Package className="w-5 h-5 text-zinc-700" />
          </button>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="flex-shrink-0 px-3 sm:px-4 pt-2.5 sm:pt-3 pb-2 border-b border-zinc-100" style={{ background: '#ffffff' }}>
        <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
          <button
            onClick={() => setViewMode('combos')}
            className={`flex-1 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-wider transition-all leading-tight px-1 ${
              viewMode === 'combos'
                ? 'bg-[#00b14f] text-white shadow-md'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span className="sm:hidden">📦 Combo</span>
            <span className="hidden sm:inline">📦 Đặt Combo Tuần/Tháng</span>
          </button>
          <button
            onClick={() => setViewMode('retail')}
            className={`flex-1 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-wider transition-all leading-tight px-1 ${
              viewMode === 'retail'
                ? 'bg-[#00b14f] text-white shadow-md'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span className="sm:hidden">🥤 Mua lẻ</span>
            <span className="hidden sm:inline">🥤 Mua Lẻ Từng Ly</span>
          </button>
        </div>
      </div>

      {/* Content area — fills remaining space, each view scrolls independently */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* Referral banner — shown in both tabs */}
        {referringPT && (
          <div className="mx-4 mt-3 mb-1 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between flex-shrink-0">
            <div>
              <div className="text-emerald-700 text-[10px] font-black uppercase tracking-wider">Mã giới thiệu đã áp dụng</div>
              <p className="text-zinc-800 text-xs font-semibold mt-0.5">Bạn được giới thiệu bởi PT <span className="text-emerald-700 font-bold">{referringPT.name}</span></p>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('activeReferralCode');
                window.location.reload();
              }}
              className="text-[10px] text-zinc-500 hover:text-zinc-800 font-bold underline"
            >
              Hủy
            </button>
          </div>
        )}

        {/* Combos view: scrollable column */}
        {viewMode === 'combos' && (
          <div className="flex-1 overflow-y-auto pb-20 sm:pb-28" style={{ scrollbarWidth: 'none' }}>
            <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
              <p className="text-zinc-400 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-0.5 sm:mb-1 hidden sm:block">CÀNG MUA NHIỀU – TIẾT KIỆM CÀNG LỚN</p>
              <h1 className="text-zinc-900 text-xl sm:text-[26px] font-black leading-tight">
                Combo <span style={{ color: '#00b14f' }}>Tuần · Tháng · Quý</span>
              </h1>
              <p className="text-zinc-500 text-[12px] sm:text-[13px] mt-0.5">Giao tươi mỗi sáng · Freeship</p>
            </div>

            <div className="mb-3 sm:mb-4">
              <DurationTabs active={duration} onChange={setDuration} />
            </div>

            <div className="px-3 sm:px-4 space-y-3 sm:space-y-4">
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
              className="mx-3 sm:mx-4 mt-4 sm:mt-6 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] rounded-2xl sm:rounded-[20px] p-3.5 sm:p-5 text-left active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.05) 0%, rgba(99,102,241,0.05) 100%)', border: '1px solid rgba(251,191,36,0.15)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#b45309' }}>👑 MUA SỈ</p>
                  <p className="text-zinc-900 font-black text-[14px] sm:text-[16px] leading-tight truncate">Mua 10–50 ly, lấy dần</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
              </div>
            </button>

            <div className="hidden sm:block mx-4 mt-4 mb-4 rounded-[20px] p-5" style={{ background: 'rgba(0,177,79,0.03)', border: '1px solid rgba(0,177,79,0.08)' }}>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { pct: '-10%', label: 'Gói Tuần', sub: '7 ly · Freeship', bg: 'rgba(34,197,94,0.08)', text: '#166534' },
                  { pct: '-15%', label: 'Gói Tháng', sub: '30 ly + 🎁 Quà', bg: 'rgba(217,119,6,0.08)', text: '#9a3412' },
                  { pct: '-20%', label: 'Gói Quý 🔥', sub: '90 ly + 🎁 VIP', bg: 'rgba(99,102,241,0.08)', text: '#3730a3', best: true },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl p-3 text-center" style={{ background: item.bg, border: (item as any).best ? '1px solid rgba(99,102,241,0.2)' : 'none' }}>
                    <p className="font-black text-[20px]" style={{ color: item.text }}>{item.pct}</p>
                    <p className="text-zinc-800 text-[11px] font-bold mt-0.5">{item.label}</p>
                    <p className="text-zinc-500 text-[10px] mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Retail view: CustomerProductGrid manages its own scroll via h-full */}
        {viewMode === 'retail' && (
          <div className="flex-1 overflow-hidden">
            <CustomerProductGrid
              onProductClick={(product) => setSelectedRetailProduct(product)}
              onComboClick={() => setViewMode('combos')}
            />
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && !isCartOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 px-3 sm:px-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-w-lg mx-auto"
          onClick={() => setIsCartOpen(true)}
        >
          <div className="rounded-2xl p-4 shadow-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" style={{ background: '#00b14f' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-white" />
                <span className="absolute -top-2 -right-2 bg-white text-[#00b14f] text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{cartCount}</span>
              </div>
              <div>
                <p className="text-[10px] text-white/80 font-medium">Tổng thanh toán</p>
                <p className="font-extrabold text-lg leading-none text-white">{cartTotal.toLocaleString('vi-VN')}đ</p>
              </div>
            </div>
            <div className="bg-white text-[#00b14f] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1">
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

      {/* Customer Retail Modifier Modal */}
      {selectedRetailProduct && (
        <CustomerModifierModal
          product={selectedRetailProduct}
          onClose={() => setSelectedRetailProduct(null)}
          onAdd={(item) => {
            handleAddToCart({
              productId: item.id,
              productName: item.name,
              name: item.name,
              size: item.size,
              protein: item.protein,
              toppings: item.toppings,
              price: item.price,
              quantity: 1,
              isCustomCombo: false
            });
            setSelectedRetailProduct(null);
          }}
        />
      )}
    </div>
  );
}
