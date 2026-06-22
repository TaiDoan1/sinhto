import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../utils/api';
import type { Employee } from '../types/employee';

const SESSION_KEY = 'admin_session';
const ALLOWED_POSITIONS = new Set(['manager']);

interface AdminContextType {
  adminUser: Employee | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const user = JSON.parse(saved) as Employee;
        if (ALLOWED_POSITIONS.has(user.position)) {
          setAdminUser(user);
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
    if (!ALLOWED_POSITIONS.has(employee.position)) {
      throw new Error('Tài khoản không có quyền Admin. Cần chức vụ Quản lý chi nhánh.');
    }
    setAdminUser(employee);
    localStorage.setItem(SESSION_KEY, JSON.stringify(employee));
  };

  const logout = () => {
    setAdminUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AdminContext.Provider value={{ adminUser, isLoggedIn: !!adminUser, isLoading, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
