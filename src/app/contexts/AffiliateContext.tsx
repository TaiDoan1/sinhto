import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../utils/api';

export interface PartnerPT {
  id: string;
  name: string;
  phone: string;
  code: string; // Referral code, e.g. ALEX99
  dateCreated: string;
  paidCommission: number; // in thousands (VND)
}

export interface ReferralTransaction {
  id: string;
  ptId: string;
  ptCode: string;
  orderId: string;
  customerName: string;
  comboName: string;
  price: number; // in thousands (VND), e.g. 725
  timestamp: string; // ISO string
}

interface PTMonthlyStats {
  combosCount: number;
  tier: 'starter' | 'pro' | 'elite';
  rate: number;
  revenue: number;
  commission: number;
}

interface AffiliateContextType {
  partners: PartnerPT[];
  transactions: ReferralTransaction[];
  addPartner: (name: string, phone: string, code: string) => boolean;
  addReferral: (code: string, orderId: string, customerName: string, comboName: string, price: number) => boolean;
  getPTMonthlyStats: (ptId: string, year: number, month: number) => PTMonthlyStats;
  getPTOverallStats: (ptId: string) => {
    totalRevenue: number;
    totalCommission: number;
    pendingCommission: number;
    paidCommission: number;
    allTimeCombos: number;
  };
  payCommission: (ptId: string, amount: number) => void;
  resolveCode: (code: string) => PartnerPT | undefined;
}

const AffiliateContext = createContext<AffiliateContextType | undefined>(undefined);

export function AffiliateProvider({ children }: { children: ReactNode }) {
  const [partners, setPartners] = useState<PartnerPT[]>([]);
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);

  // Load from backend on mount
  useEffect(() => {
    const loadData = () => {
      api.fetchPartners()
        .then(data => setPartners(data))
        .catch(err => console.error("Error fetching partners:", err));

      api.fetchReferrals()
        .then(data => setTransactions(data))
        .catch(err => console.error("Error fetching referrals:", err));
    };

    loadData();

    // Listen to real-time updates via SSE
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'PT_PARTNER_CREATED') {
          setPartners(prev => {
            if (prev.some(p => p.id === data.id)) return prev;
            return [...prev, data];
          });
        } else if (type === 'PT_PARTNER_UPDATED') {
          setPartners(prev => prev.map(p => p.id === data.id ? data : p));
        } else if (type === 'REFERRAL_CREATED') {
          setTransactions(prev => {
            if (prev.some(t => t.id === data.id)) return prev;
            return [data, ...prev];
          });
        }
      } catch (err) {
        console.error("SSE parse error in AffiliateContext", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Add a new PT Partner
  const addPartner = (name: string, phone: string, code: string) => {
    const uppercaseCode = code.trim().toUpperCase();
    const codeExists = partners.some(p => p.code === uppercaseCode);
    if (codeExists) return false;

    const newPartner: PartnerPT = {
      id: `PT-${String(partners.length + 1).padStart(3, '0')}`,
      name: name.trim(),
      phone: phone.trim(),
      code: uppercaseCode,
      dateCreated: new Date().toISOString(),
      paidCommission: 0
    };

    api.createPartner(newPartner)
      .then(data => {
        setPartners(prev => [...prev, data]);
      })
      .catch(err => console.error("Failed to save partner to backend:", err));

    return true;
  };

  // Add a new Referral Transaction when customer checks out
  const addReferral = (code: string, orderId: string, customerName: string, comboName: string, price: number) => {
    const uppercaseCode = code.trim().toUpperCase();
    const partner = partners.find(p => p.code === uppercaseCode);
    if (!partner) return false;

    const newTransaction: ReferralTransaction = {
      id: `REF-${Date.now()}`,
      ptId: partner.id,
      ptCode: partner.code,
      orderId,
      customerName,
      comboName,
      price,
      timestamp: new Date().toISOString()
    };

    api.createReferral(newTransaction)
      .then(data => {
        setTransactions(prev => [data, ...prev]);
      })
      .catch(err => console.error("Failed to save referral transaction to backend:", err));

    return true;
  };

  // Resolve referral code
  const resolveCode = (code: string) => {
    const uppercaseCode = code.trim().toUpperCase();
    return partners.find(p => p.code === uppercaseCode);
  };

  // Calculate stats for a given PT for a specific month and year
  const getPTMonthlyStats = (ptId: string, year: number, month: number): PTMonthlyStats => {
    const ptTransactions = transactions.filter(t => {
      if (t.ptId !== ptId) return false;
      const date = new Date(t.timestamp);
      return date.getFullYear() === year && date.getMonth() === month;
    });

    const count = ptTransactions.length;
    let tier: 'starter' | 'pro' | 'elite' = 'starter';
    let rate = 0.10;

    if (count >= 16) {
      tier = 'elite';
      rate = 0.20;
    } else if (count >= 6) {
      tier = 'pro';
      rate = 0.15;
    }

    const revenue = ptTransactions.reduce((sum, t) => sum + t.price, 0);
    const commission = revenue * rate;

    return {
      combosCount: count,
      tier,
      rate,
      revenue,
      commission
    };
  };

  // Calculate overall stats for a PT (accrued monthly totals)
  const getPTOverallStats = (ptId: string) => {
    const partner = partners.find(p => p.id === ptId);
    const paidCommission = partner ? partner.paidCommission : 0;

    const ptTransactions = transactions.filter(t => t.ptId === ptId);
    
    // Group transactions by month and year to apply correct dynamic rates per month
    const monthlyGroups: { [key: string]: ReferralTransaction[] } = {};
    ptTransactions.forEach(t => {
      const d = new Date(t.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyGroups[key]) monthlyGroups[key] = [];
      monthlyGroups[key].push(t);
    });

    let totalCommission = 0;
    let totalRevenue = 0;

    Object.values(monthlyGroups).forEach(group => {
      const count = group.length;
      let rate = 0.10;
      if (count >= 16) rate = 0.20;
      else if (count >= 6) rate = 0.15;

      const monthlyRevenue = group.reduce((sum, t) => sum + t.price, 0);
      totalRevenue += monthlyRevenue;
      totalCommission += monthlyRevenue * rate;
    });

    return {
      totalRevenue,
      totalCommission: Math.round(totalCommission * 10) / 10, // Round to 1 decimal place
      pendingCommission: Math.max(0, Math.round((totalCommission - paidCommission) * 10) / 10),
      paidCommission,
      allTimeCombos: ptTransactions.length
    };
  };

  // Pay out commission to a PT
  const payCommission = (ptId: string, amount: number) => {
    api.payPartnerCommission(ptId, amount)
      .then(() => {
        setPartners(prev => prev.map(p => p.id === ptId ? { ...p, paidCommission: p.paidCommission + amount } : p));
      })
      .catch(err => console.error("Failed to record commission payment:", err));
  };

  return (
    <AffiliateContext.Provider value={{
      partners,
      transactions,
      addPartner,
      addReferral,
      getPTMonthlyStats,
      getPTOverallStats,
      payCommission,
      resolveCode
    }}>
      {children}
    </AffiliateContext.Provider>
  );
}

export function useAffiliate() {
  const context = useContext(AffiliateContext);
  if (!context) {
    throw new Error('useAffiliate must be used within AffiliateProvider');
  }
  return context;
}
