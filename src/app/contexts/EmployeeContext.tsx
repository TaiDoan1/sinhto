import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as api from '../utils/api';
import { useSSE } from './SSEContext';
import type { Employee, WorkShift, ProfileFieldConfig } from '../types/employee';
import { DEFAULT_PROFILE_FIELDS } from '../types/employee';

const SESSION_KEY = 'staff_session';

interface EmployeeContextType {
  activeEmployee: Employee | null;
  isLoggedIn: boolean;
  profileFields: ProfileFieldConfig[];
  myShifts: WorkShift[];
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Employee>) => Promise<void>;
  refreshShifts: () => Promise<void>;
  requestShift: (date: string, templateId: string) => Promise<void>;
  checkIn: (shiftId: string) => Promise<void>;
  checkOut: (shiftId: string) => Promise<void>;
  saveProfileFields: (fields: ProfileFieldConfig[]) => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const { subscribe } = useSSE();
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [profileFields, setProfileFields] = useState<ProfileFieldConfig[]>(DEFAULT_PROFILE_FIELDS);
  const [myShifts, setMyShifts] = useState<WorkShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshShifts = useCallback(async () => {
    if (!activeEmployee) return;
    try {
      const shifts = await api.fetchShifts({ employeeId: activeEmployee.id });
      setMyShifts(shifts);
    } catch (err) {
      console.error('Failed to load shifts:', err);
    }
  }, [activeEmployee]);

  useEffect(() => {
    api.fetchSetting('employee_profile_fields')
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setProfileFields(data);
      })
      .catch(() => {});

    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const emp = JSON.parse(saved);
        setActiveEmployee(emp);
      } catch { localStorage.removeItem(SESSION_KEY); }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (activeEmployee) refreshShifts();
  }, [activeEmployee, refreshShifts]);

  useEffect(() => {
    const unsub = subscribe('SHIFT_CREATED', (data: WorkShift) => {
      if (activeEmployee && data.employeeId === activeEmployee.id) {
        setMyShifts(prev => prev.some(s => s.id === data.id) ? prev : [...prev, data]);
      }
    });
    const unsub2 = subscribe('SHIFT_UPDATED', (data: WorkShift) => {
      if (activeEmployee && data.employeeId === activeEmployee.id) {
        setMyShifts(prev => prev.map(s => s.id === data.id ? data : s));
      }
    });
    const unsub3 = subscribe('SHIFT_DELETED', (data: { id: string }) => {
      setMyShifts(prev => prev.filter(s => s.id !== data.id));
    });
    const unsub4 = subscribe('EMPLOYEE_UPDATED', (data: Employee) => {
      if (activeEmployee && data.id === activeEmployee.id) {
        setActiveEmployee(data);
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      }
    });
    return () => { unsub(); unsub2(); unsub3(); unsub4(); };
  }, [subscribe, activeEmployee]);

  const login = async (username: string, password: string) => {
    const employee = await api.employeeLogin(username, password);
    setActiveEmployee(employee);
    localStorage.setItem(SESSION_KEY, JSON.stringify(employee));
  };

  const logout = () => {
    setActiveEmployee(null);
    setMyShifts([]);
    localStorage.removeItem(SESSION_KEY);
  };

  const updateProfile = async (updates: Partial<Employee>) => {
    if (!activeEmployee) return;
    const updated = await api.saveEmployee({ ...activeEmployee, ...updates });
    setActiveEmployee(updated);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  };

  const requestShift = async (date: string, templateId: string) => {
    if (!activeEmployee) return;
    const templates: Record<string, { start: string; end: string }> = {
      morning: { start: '06:00', end: '14:00' },
      afternoon: { start: '14:00', end: '22:00' },
      evening: { start: '22:00', end: '06:00' },
    };
    const tpl = templates[templateId] || templates.morning;
    const shift: Partial<WorkShift> = {
      employeeId: activeEmployee.id,
      employeeName: activeEmployee.fullName,
      branch: activeEmployee.branch,
      date,
      shiftType: templateId,
      startTime: tpl.start,
      endTime: tpl.end,
      status: 'pending',
      requestedBy: 'employee',
    };
    await api.saveShift(shift);
    await refreshShifts();
  };

  const checkIn = async (shiftId: string) => {
    await api.shiftCheckIn(shiftId, 'in');
    await refreshShifts();
  };

  const checkOut = async (shiftId: string) => {
    await api.shiftCheckIn(shiftId, 'out');
    await refreshShifts();
  };

  const saveProfileFields = async (fields: ProfileFieldConfig[]) => {
    await api.saveSetting('employee_profile_fields', fields);
    setProfileFields(fields);
  };

  return (
    <EmployeeContext.Provider value={{
      activeEmployee,
      isLoggedIn: !!activeEmployee,
      profileFields,
      myShifts,
      isLoading,
      login,
      logout,
      updateProfile,
      refreshShifts,
      requestShift,
      checkIn,
      checkOut,
      saveProfileFields,
    }}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee() {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error('useEmployee must be used within EmployeeProvider');
  return ctx;
}
