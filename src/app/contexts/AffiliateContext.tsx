import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

// Helper to get dates in the current month for mock transactions
const getCurrentMonthDateStr = (dayOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  return d.toISOString();
};

const defaultPartners: PartnerPT[] = [
  { id: 'PT-001', name: 'Coach Alex', phone: '0987654321', code: 'ALEX99', dateCreated: '2026-01-10T08:00:00Z', paidCommission: 500 },
  { id: 'PT-002', name: 'Coach Elena', phone: '0912345678', code: 'ELENA88', dateCreated: '2026-02-15T09:30:00Z', paidCommission: 1500 },
  { id: 'PT-003', name: 'Coach Kevin', phone: '0933334444', code: 'KEVIN77', dateCreated: '2026-03-01T10:00:00Z', paidCommission: 4500 }
];

const defaultTransactions: ReferralTransaction[] = [
  // Coach Alex (3 transactions this month -> STARTER tier: 10%)
  { id: 'REF-001', ptId: 'PT-001', ptCode: 'ALEX99', orderId: 'ORD-101', customerName: 'Hoàng Anh', comboName: 'Muscle Build (Tuần)', price: 725, timestamp: getCurrentMonthDateStr(1) },
  { id: 'REF-002', ptId: 'PT-001', ptCode: 'ALEX99', orderId: 'ORD-102', customerName: 'Lê Nam', comboName: 'Fat Loss Plan (Tuần)', price: 498, timestamp: getCurrentMonthDateStr(3) },
  { id: 'REF-003', ptId: 'PT-001', ptCode: 'ALEX99', orderId: 'ORD-103', customerName: 'Phạm Bình', comboName: 'Muscle Build (Tháng)', price: 2933, timestamp: getCurrentMonthDateStr(5) },

  // Coach Elena (10 transactions this month -> PRO tier: 15%)
  { id: 'REF-101', ptId: 'PT-002', ptCode: 'ELENA88', orderId: 'ORD-201', customerName: 'Trần Minh', comboName: 'Muscle Build (Tuần)', price: 725, timestamp: getCurrentMonthDateStr(1) },
  { id: 'REF-102', ptId: 'PT-002', ptCode: 'ELENA88', orderId: 'ORD-202', customerName: 'Nguyễn Vy', comboName: 'Fat Loss Plan (Tháng)', price: 2015, timestamp: getCurrentMonthDateStr(2) },
  { id: 'REF-103', ptId: 'PT-002', ptCode: 'ELENA88', orderId: 'ORD-203', customerName: 'Đặng Tuấn', comboName: 'Elite Mass (Tuần)', price: 977, timestamp: getCurrentMonthDateStr(4) },
  { id: 'REF-104', ptId: 'PT-002', ptCode: 'ELENA88', orderId: 'ORD-204', customerName: 'Lâm Hoàng', comboName: 'Muscle Build (Tuần)', price: 725, timestamp: getCurrentMonthDateStr(6) },
  { id: 'REF-105', ptId: 'PT-002', ptCode: 'ELENA88', orderId: 'ORD-205', customerName: 'Đỗ Quyên', comboName: 'Fat Loss Plan (Tuần)', price: 498, timestamp: getCurrentMonthDateStr(7) },
  { id: 'REF-106', ptId: 'PT-002', ptCode: 'ELENA88', orderId: 'ORD-206', customerName: 'Phùng Khoa', comboName: 'Muscle Build (Tháng)', price: 2933, timestamp: getCurrentMonthDateStr(9) },
  { id: 'REF-107', ptId: 'PT-002', ptCode: 'ELENA88', orderId: 'ORD-207', customerName: 'Vũ Sơn', comboName: 'Elite Mass (Tháng)', price: 3953, timestamp: getCurrentMonthDateStr(10) },
  { id: 'REF-108', ptId: 'PT-002', ptCode: 'ELENA88', orderId: 'ORD-208', customerName: 'Ngô Thu', comboName: 'Muscle Build (Tuần)', price: 725, timestamp: getCurrentMonthDateStr(12) },
  { id: 'REF-109', ptId: 'PT-002', ptCode: 'ELENA88', orderId: 'ORD-209', customerName: 'Bùi Đức', comboName: 'Fat Loss Plan (Tuần)', price: 498, timestamp: getCurrentMonthDateStr(14) },
  { id: 'REF-110', ptId: 'PT-002', ptCode: 'ELENA88', orderId: 'ORD-210', customerName: 'Hồ Nghĩa', comboName: 'Muscle Build (Quý)', price: 8330, timestamp: getCurrentMonthDateStr(15) },

  // Coach Kevin (20 transactions this month -> ELITE tier: 20%)
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `REF-20${i}`,
    ptId: 'PT-003',
    ptCode: 'KEVIN77',
    orderId: `ORD-30${i}`,
    customerName: `Khách hàng ${i + 1}`,
    comboName: i % 2 === 0 ? 'Muscle Build (Tháng)' : 'Muscle Build (Tuần)',
    price: i % 2 === 0 ? 2933 : 725,
    timestamp: getCurrentMonthDateStr(i)
  }))
];

export function AffiliateProvider({ children }: { children: ReactNode }) {
  const [partners, setPartners] = useState<PartnerPT[]>([]);
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedPartners = localStorage.getItem('affiliatePartners');
    const savedTransactions = localStorage.getItem('affiliateTransactions');

    if (savedPartners) {
      setPartners(JSON.parse(savedPartners));
    } else {
      localStorage.setItem('affiliatePartners', JSON.stringify(defaultPartners));
      setPartners(defaultPartners);
    }

    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    } else {
      localStorage.setItem('affiliateTransactions', JSON.stringify(defaultTransactions));
      setTransactions(defaultTransactions);
    }
  }, []);

  // Save to localStorage helper
  const savePartners = (updatedPartners: PartnerPT[]) => {
    setPartners(updatedPartners);
    localStorage.setItem('affiliatePartners', JSON.stringify(updatedPartners));
  };

  const saveTransactions = (updatedTransactions: ReferralTransaction[]) => {
    setTransactions(updatedTransactions);
    localStorage.setItem('affiliateTransactions', JSON.stringify(updatedTransactions));
  };

  // Add a new PT Partner
  const addPartner = (name: string, phone: string, code: string) => {
    const uppercaseCode = code.trim().toUpperCase();
    // Check if code is unique
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

    savePartners([...partners, newPartner]);
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

    saveTransactions([newTransaction, ...transactions]);
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
    const updated = partners.map(p => {
      if (p.id === ptId) {
        return {
          ...p,
          paidCommission: p.paidCommission + amount
        };
      }
      return p;
    });
    savePartners(updated);
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
