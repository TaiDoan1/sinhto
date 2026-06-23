import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../utils/api';
import type { Employee } from '../types/employee';
import { isOnlineSalesPosition } from '../types/employee';

const SESSION_KEY = 'pos_session';

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
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const employee = await api.employeeLogin(username.trim(), password);
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
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('pos_branch');
  };

  return (
    <PosContext.Provider value={{ session, isLoggedIn: !!session, isLoading, login, logout }}>
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error('usePos must be used within PosProvider');
  return ctx;
}
