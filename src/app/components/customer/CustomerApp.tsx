'use client';
// Web khách = TRANG GIỚI THIỆU (CustomerLandingStory). Đặt ly lẻ → app Grab (/dat-mon);
// đặt combo → popup để lại SĐT cho CSKH tư vấn (ngay trong landing). File này chỉ còn giữ
// PLANS + helper wholesale mà GrabFoodApp / POS còn import.
import { CustomerLanding } from './CustomerLandingStory';
import * as api from '../../utils/api';

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

// ─── Web khách = trang giới thiệu ─────────────────────────────────────────────
export function CustomerApp() {
  return <CustomerLanding />;
}
