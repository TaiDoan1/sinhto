import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../utils/api';
import type { Employee } from '../types/employee';
import { isOnlineSalesPosition } from '../types/employee';

const SESSION_KEY = 'pos_session';
const DEVICE_BRANCH_KEY = 'pos_device_branch';

/** Nhân viên được dùng máy POS tại chi nhánh của mình */
const POS_POSITIONS = new Set(['cashier', 'bartender', 'manager', 'server']);

export interface PosSession {
  employeeId: string;
  employeeName: string;
  username: string;
  branchId: string;
  position: string;
}

interface PosContextType {
  session: PosSession | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  deviceBranchId: string | null;
  setDeviceBranchId: (branchId: string) => void;
  clearDeviceBranch: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

function toSession(employee: Employee): PosSession {
  return {
    employeeId: employee.id,
    employeeName: employee.fullName,
    username: employee.username,
    branchId: employee.branch,
    position: employee.position,
  };
}

export function PosProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PosSession | null>(null);
  const [deviceBranchId, setDeviceBranchIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        setSession(JSON.parse(saved) as PosSession);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setDeviceBranchIdState(localStorage.getItem(DEVICE_BRANCH_KEY));
    setIsLoading(false);
  }, []);

  const setDeviceBranchId = (branchId: string) => {
    localStorage.setItem(DEVICE_BRANCH_KEY, branchId);
    setDeviceBranchIdState(branchId);
  };

  const clearDeviceBranch = () => {
    localStorage.removeItem(DEVICE_BRANCH_KEY);
    setDeviceBranchIdState(null);
  };

  const login = async (username: string, password: string) => {
    const employee = await api.employeeLogin(username.trim(), password, deviceBranchId || undefined);
    if (isOnlineSalesPosition(employee.position)) {
      throw new Error('Tài khoản CSKH — vui lòng đăng nhập tại cổng /cs');
    }
    if (!POS_POSITIONS.has(employee.position)) {
      throw new Error('Tài khoản không có quyền POS. Cần Thu ngân / Pha chế / Phục vụ / Quản lý CN.');
    }
    if (!employee.branch) {
      throw new Error('Tài khoản chưa gắn chi nhánh. Liên hệ Admin.');
    }
    const sess = toSession(employee);
    setSession(sess);
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    localStorage.setItem('pos_branch', sess.branchId);

    // Tu dong check-in vao ca hom nay (neu co) de khi dang xuat POS
    // luon tim duoc ca dang mo va hien man hinh ket ca.
    // Nhan vien co the co nhieu ca/ngay (VD ca sang + ca toi) nen phai
    // chon dung ca khop voi gio hien tai, khong chi lay ca dau tien tim thay.
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayShifts = (await api.fetchShifts({ employeeId: employee.id, date: today })) as any[];
      const eligible = (todayShifts || []).filter(
        (s) => s.status !== 'in_progress' && s.status !== 'completed' && s.status !== 'rejected'
      );

      const currentHour = new Date().getHours();
      const matchingNow = eligible.find((s) => {
        const startHour = parseInt(s.startTime.split(':')[0], 10);
        const endHour = parseInt(s.endTime.split(':')[0], 10);
        if (endHour < startHour) return currentHour >= startHour || currentHour < endHour; // ca qua dem
        return currentHour >= startHour && currentHour < endHour;
      });

      const shiftToCheckIn =
        matchingNow || [...eligible].sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

      if (shiftToCheckIn) {
        await api.shiftCheckIn(shiftToCheckIn.id, 'in');
      }
    } catch (err) {
      console.error('Auto check-in failed:', err);
    }
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('pos_branch');
  };

  return (
    <PosContext.Provider value={{ session, isLoggedIn: !!session, isLoading, deviceBranchId, setDeviceBranchId, clearDeviceBranch, login, logout }}>
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error('usePos must be used within PosProvider');
  return ctx;
}
