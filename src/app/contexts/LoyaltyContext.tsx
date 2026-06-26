import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../utils/api';
import { useSSE } from './SSEContext';
import { normalizePhoneVN } from '../utils/phone';
import {
  DEFAULT_LOYALTY_TIERS,
  DEFAULT_REDEEM_PROGRAMS,
  getTierForPoints,
  getProgramEligibility,
  normalizeRedeemProgram,
  type LoyaltyRedeemProgram,
  type LoyaltyTier,
  type LoyaltyVoucher,
  type BulkIssueVoucherResult,
} from '../types/loyalty';

export interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  points: number;
  createdAt: string;
}

export interface LoyaltyConfig {
  earnRate: number;
  redeemValue: number;
  tiers: LoyaltyTier[];
  redeemPrograms: LoyaltyRedeemProgram[];
}

interface LoyaltyContextType {
  customers: LoyaltyCustomer[];
  config: LoyaltyConfig;
  loading: boolean;
  activeCustomer: LoyaltyCustomer | null;
  setActiveCustomer: (customer: LoyaltyCustomer | null) => void;
  redeemPointsAmount: number;
  setRedeemPointsAmount: (amount: number) => void;
  selectedRedeemProgramId: string | null;
  setSelectedRedeemProgramId: (id: string | null) => void;
  activeVoucher: LoyaltyVoucher | null;
  setActiveVoucher: (voucher: LoyaltyVoucher | null) => void;
  applyVoucher: (voucher: LoyaltyVoucher) => void;
  clearRedeemSelection: () => void;
  loyaltyPromptCompleted: boolean;
  setLoyaltyPromptCompleted: (completed: boolean) => void;
  resetLoyalty: () => void;
  refreshCustomers: () => Promise<void>;
  lookupByPhone: (phone: string) => Promise<LoyaltyCustomer | null>;
  registerCustomer: (name: string, phone: string) => Promise<LoyaltyCustomer>;
  addPoints: (customerId: string, paidAmount: number) => Promise<LoyaltyCustomer>;
  spendPoints: (customerId: string, points: number) => Promise<LoyaltyCustomer>;
  manualAdjust: (customerId: string, points: number) => Promise<LoyaltyCustomer>;
  updateConfig: (config: Partial<Pick<LoyaltyConfig, 'earnRate' | 'redeemValue'>>) => Promise<void>;
  saveLoyaltySettings: (settings: Partial<LoyaltyConfig>) => Promise<void>;
  calcEarnedPoints: (paidAmount: number) => number;
  calcDiscount: (points: number) => number;
  calcProgramDiscount: (subtotal: number, programId: string | null) => number;
  getCustomerTier: (points: number) => LoyaltyTier;
  fetchVouchers: (params?: { phone?: string; programId?: string; status?: string }) => Promise<LoyaltyVoucher[]>;
  issueVoucher: (programId: string, phone: string, deductPoints?: boolean) => Promise<LoyaltyVoucher>;
  issueVouchersBulk: (programId: string, phones: string[], deductPoints?: boolean) => Promise<BulkIssueVoucherResult>;
  lookupVoucherByCode: (code: string) => Promise<LoyaltyVoucher>;
  markVoucherUsed: (code: string) => Promise<LoyaltyVoucher>;
  cancelVoucher: (id: string, refundPoints?: boolean) => Promise<LoyaltyVoucher>;
}

const defaultConfig: LoyaltyConfig = {
  earnRate: 1000,
  redeemValue: 1000,
  tiers: DEFAULT_LOYALTY_TIERS,
  redeemPrograms: DEFAULT_REDEEM_PROGRAMS,
};

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined);

export function LoyaltyProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [config, setConfig] = useState<LoyaltyConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [activeCustomer, setActiveCustomer] = useState<LoyaltyCustomer | null>(null);
  const [redeemPointsAmount, setRedeemPointsAmount] = useState(0);
  const [selectedRedeemProgramId, setSelectedRedeemProgramId] = useState<string | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<LoyaltyVoucher | null>(null);
  const [loyaltyPromptCompleted, setLoyaltyPromptCompleted] = useState(false);
  const { subscribe } = useSSE();

  const clearRedeemSelection = () => {
    setRedeemPointsAmount(0);
    setSelectedRedeemProgramId(null);
    setActiveVoucher(null);
  };

  const applyVoucher = (voucher: LoyaltyVoucher) => {
    const prog = voucher.program || config.redeemPrograms.find(p => p.id === voucher.programId);
    setActiveVoucher(voucher);
    setSelectedRedeemProgramId(voucher.programId);
    const pointsAtUse = voucher.pointsDeducted > 0 ? 0 : (prog?.pointsCost ?? 0);
    setRedeemPointsAmount(pointsAtUse);
  };

  const resetLoyalty = () => {
    setActiveCustomer(null);
    clearRedeemSelection();
    setLoyaltyPromptCompleted(false);
  };

  const refreshCustomers = async () => {
    try {
      const data = await api.fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const [earnRate, redeemValue, tiers, redeemPrograms] = await Promise.all([
        api.fetchSetting('loyaltyEarnRate').catch(() => defaultConfig.earnRate),
        api.fetchSetting('loyaltyRedeemValue').catch(() => defaultConfig.redeemValue),
        api.fetchSetting('loyaltyTiers').catch(() => defaultConfig.tiers),
        api.fetchSetting('loyaltyRedeemPrograms').catch(() => defaultConfig.redeemPrograms),
      ]);
      const normalizedPrograms = (redeemPrograms as Partial<LoyaltyRedeemProgram>[]).map(p =>
        normalizeRedeemProgram(p as LoyaltyRedeemProgram),
      );
      setConfig({
        earnRate: Number(earnRate),
        redeemValue: Number(redeemValue),
        tiers: tiers as LoyaltyTier[],
        redeemPrograms: normalizedPrograms,
      });
    } catch (err) {
      console.error('Failed to load loyalty config:', err);
    }
  };

  useEffect(() => {
    refreshCustomers();
    loadConfig();

    const unsubCreate = subscribe('CUSTOMER_CREATED', (c: LoyaltyCustomer) => {
      setCustomers(prev => {
        if (prev.some(x => x.id === c.id)) return prev;
        return [c, ...prev];
      });
    });

    const unsubUpdate = subscribe('CUSTOMER_UPDATED', (c: LoyaltyCustomer) => {
      setCustomers(prev => prev.map(x => x.id === c.id ? c : x));
      if (activeCustomer?.id === c.id) setActiveCustomer(c);
    });

    const unsubSetting = subscribe('SETTING_UPDATED', ({ key, value }: { key: string; value: unknown }) => {
      if (key === 'loyaltyEarnRate') setConfig(prev => ({ ...prev, earnRate: Number(value) }));
      if (key === 'loyaltyRedeemValue') setConfig(prev => ({ ...prev, redeemValue: Number(value) }));
      if (key === 'loyaltyTiers') setConfig(prev => ({ ...prev, tiers: value as LoyaltyTier[] }));
      if (key === 'loyaltyRedeemPrograms') {
        const normalized = (value as Partial<LoyaltyRedeemProgram>[]).map(p =>
          normalizeRedeemProgram(p as LoyaltyRedeemProgram),
        );
        setConfig(prev => ({ ...prev, redeemPrograms: normalized }));
      }
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubSetting();
    };
  }, [subscribe]);

  const lookupByPhone = async (phone: string): Promise<LoyaltyCustomer | null> => {
    const normalized = normalizePhoneVN(phone);
    if (!normalized) return null;
    const local = customers.find((c) => normalizePhoneVN(c.phone) === normalized);
    if (local) return local;
    try {
      return await api.fetchCustomerByPhone(normalized);
    } catch {
      return null;
    }
  };

  const registerCustomer = async (name: string, phone: string): Promise<LoyaltyCustomer> => {
    const created = await api.createCustomer({ name, phone: normalizePhoneVN(phone) });
    setCustomers(prev => [created, ...prev]);
    return created;
  };

  const addPoints = async (customerId: string, paidAmount: number): Promise<LoyaltyCustomer> => {
    const pointsToAdd = calcEarnedPoints(paidAmount);
    if (pointsToAdd <= 0) {
      const cur = customers.find(c => c.id === customerId);
      return cur!;
    }
    const updated = await api.earnPoints(customerId, pointsToAdd);
    setCustomers(prev => prev.map(c => c.id === customerId ? updated : c));
    return updated;
  };

  const spendPoints = async (customerId: string, points: number): Promise<LoyaltyCustomer> => {
    const updated = await api.redeemPoints(customerId, points);
    setCustomers(prev => prev.map(c => c.id === customerId ? updated : c));
    return updated;
  };

  const manualAdjust = async (customerId: string, points: number): Promise<LoyaltyCustomer> => {
    const updated = await api.updateCustomer(customerId, { points });
    setCustomers(prev => prev.map(c => c.id === customerId ? updated : c));
    return updated;
  };

  const updateConfig = async (newConfig: Partial<Pick<LoyaltyConfig, 'earnRate' | 'redeemValue'>>) => {
    const saves: Promise<unknown>[] = [];
    if (newConfig.earnRate !== undefined) {
      saves.push(api.saveSetting('loyaltyEarnRate', newConfig.earnRate));
      setConfig(prev => ({ ...prev, earnRate: newConfig.earnRate! }));
    }
    if (newConfig.redeemValue !== undefined) {
      saves.push(api.saveSetting('loyaltyRedeemValue', newConfig.redeemValue));
      setConfig(prev => ({ ...prev, redeemValue: newConfig.redeemValue! }));
    }
    await Promise.all(saves);
  };

  const saveLoyaltySettings = async (settings: Partial<LoyaltyConfig>) => {
    const saves: Promise<unknown>[] = [];
    const next = { ...config, ...settings };

    if (settings.earnRate !== undefined) saves.push(api.saveSetting('loyaltyEarnRate', settings.earnRate));
    if (settings.redeemValue !== undefined) saves.push(api.saveSetting('loyaltyRedeemValue', settings.redeemValue));
    if (settings.tiers !== undefined) saves.push(api.saveSetting('loyaltyTiers', settings.tiers));
    if (settings.redeemPrograms !== undefined) saves.push(api.saveSetting('loyaltyRedeemPrograms', settings.redeemPrograms));

    await Promise.all(saves);
    setConfig(next);
  };

  const calcEarnedPoints = (paidAmount: number): number => {
    return Math.floor(paidAmount / config.earnRate);
  };

  const calcDiscount = (points: number): number => {
    return points * config.redeemValue;
  };

  const calcProgramDiscount = (subtotal: number, programId: string | null): number => {
    if (!programId) return calcDiscount(redeemPointsAmount);
    const prog = config.redeemPrograms.find(p => p.id === programId && p.enabled);
    if (!prog) return 0;

    const points = activeVoucher?.pointsDeducted
      ? Math.max(activeCustomer?.points ?? 0, prog.pointsCost)
      : (activeCustomer?.points ?? 0);
    const { eligible } = getProgramEligibility(prog, { customerPoints: points, orderSubtotal: subtotal });
    if (!eligible) return 0;

    let discount = 0;
    if (prog.type === 'item_percent') {
      discount = Math.round(subtotal * prog.value / 100);
      if (prog.maxDiscountAmount != null) discount = Math.min(discount, prog.maxDiscountAmount);
    } else {
      discount = prog.value;
    }
    return Math.min(discount, subtotal);
  };

  const getCustomerTier = (points: number) => getTierForPoints(points, config.tiers);

  const fetchVouchers = (params?: { phone?: string; programId?: string; status?: string }) =>
    api.fetchLoyaltyVouchers(params);

  const issueVoucher = async (programId: string, phone: string, deductPoints = true) => {
    const voucher = await api.issueLoyaltyVoucher({ programId, phone, deductPoints });
    await refreshCustomers();
    if (activeCustomer?.phone === phone) {
      const updated = await api.fetchCustomerByPhone(phone);
      if (updated) setActiveCustomer(updated);
    }
    return voucher;
  };

  const issueVouchersBulk = async (programId: string, phones: string[], deductPoints = true) => {
    const result = await api.issueLoyaltyVouchersBulk({ programId, phones, deductPoints });
    await refreshCustomers();
    return result as BulkIssueVoucherResult;
  };

  const lookupVoucherByCode = (code: string) => api.lookupLoyaltyVoucher(code);

  const markVoucherUsed = async (code: string) => api.useLoyaltyVoucher(code);

  const cancelVoucher = async (id: string, refundPoints = true) => {
    const result = await api.cancelLoyaltyVoucher(id, refundPoints);
    await refreshCustomers();
    return result;
  };

  return (
    <LoyaltyContext.Provider value={{
      customers,
      config,
      loading,
      activeCustomer,
      setActiveCustomer,
      redeemPointsAmount,
      setRedeemPointsAmount,
      selectedRedeemProgramId,
      setSelectedRedeemProgramId,
      activeVoucher,
      setActiveVoucher,
      applyVoucher,
      clearRedeemSelection,
      loyaltyPromptCompleted,
      setLoyaltyPromptCompleted,
      resetLoyalty,
      refreshCustomers,
      lookupByPhone,
      registerCustomer,
      addPoints,
      spendPoints,
      manualAdjust,
      updateConfig,
      saveLoyaltySettings,
      calcEarnedPoints,
      calcDiscount,
      calcProgramDiscount,
      getCustomerTier,
      fetchVouchers,
      issueVoucher,
      issueVouchersBulk,
      lookupVoucherByCode,
      markVoucherUsed,
      cancelVoucher,
    }}>
      {children}
    </LoyaltyContext.Provider>
  );
}

export function useLoyalty() {
  const ctx = useContext(LoyaltyContext);
  if (!ctx) throw new Error('useLoyalty must be used within LoyaltyProvider');
  return ctx;
}
