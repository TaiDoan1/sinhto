import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../utils/api';
import type { Employee } from '../types/employee';
import { isOnlineSalesPosition } from '../types/employee';

const SESSION_KEY = 'online_sales_session';

interface OnlineSalesContextType {
  activeEmployee: Employee | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const OnlineSalesContext = createContext<OnlineSalesContextType | undefined>(undefined);

export function OnlineSalesProvider({ children }: { children: ReactNode }) {
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const emp = JSON.parse(saved) as Employee;
        if (isOnlineSalesPosition(emp.position)) {
          setActiveEmployee(emp);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const employee = await api.employeeLogin(username.trim(), password);
    if (!employee?.id || !employee?.position) {
      throw new Error('Phản hồi máy chủ không hợp lệ. Hãy restart backend (npm run dev).');
    }
    if (!isOnlineSalesPosition(employee.position)) {
      throw new Error('Tài khoản này không thuộc bộ phận Bán Hàng Online. Vui lòng dùng cổng Nhân Viên.');
    }
    setActiveEmployee(employee);
    localStorage.setItem(SESSION_KEY, JSON.stringify(employee));
  };

  const logout = () => {
    setActiveEmployee(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <OnlineSalesContext.Provider
      value={{
        activeEmployee,
        isLoggedIn: !!activeEmployee,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </OnlineSalesContext.Provider>
  );
}

export function useOnlineSales() {
  const ctx = useContext(OnlineSalesContext);
  if (!ctx) throw new Error('useOnlineSales must be used within OnlineSalesProvider');
  return ctx;
}
