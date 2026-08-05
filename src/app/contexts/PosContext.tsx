import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../utils/api';
import type { Employee } from '../types/employee';
import { isOnlineSalesPosition } from '../types/employee';

const SESSION_KEY = 'pos_session';
const DEVICE_BRANCH_KEY = 'pos_device_branch';
const startCashDoneKey = (shiftId: string) => `pos_startcash_done_${shiftId}`;

/** Nhân viên được dùng máy POS tại chi nhánh của mình */
const POS_POSITIONS = new Set(['cashier', 'bartender', 'manager', 'store_manager', 'server']);

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
  checkActiveShift: () => void;
  pendingStartCashShiftId: string | null;
  clearPendingStartCash: () => void;
  markStartCashDone: (shiftId: string) => void;
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
  const [pendingStartCashShiftId, setPendingStartCashShiftId] = useState<string | null>(null);

  const clearPendingStartCash = () => setPendingStartCashShiftId(null);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved && !api.getAuthToken()) {
      localStorage.removeItem(SESSION_KEY); // phiên cũ (trước khi có token) → buộc đăng nhập lại
    } else if (saved) {
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

  // Tự động check-in ca hiện hành + hỏi tiền mặt đầu ca (nếu ca đó chưa nhập trên máy này).
  // Tách riêng để dùng lại: gọi lúc đăng nhập VÀ mỗi khi mở/quay lại màn POS (checkActiveShift)
  // — nhờ vậy MỖI CA (sáng/trưa/tối) đều được hỏi quỹ đầu ca riêng, kể cả khi không đăng nhập lại
  // (máy để nguyên phiên từ ca trước).
  const syncShiftAndStartCash = async (employeeId: string, position: string, branchId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayShifts = (await api.fetchShifts({ employeeId, date: today })) as any[];
      // Ca nghỉ ("off") là 1 dòng giả chiếm trọn ngày (00:00-23:59) đánh dấu lịch nghỉ, không
      // phải ca làm thật — loại ra để nhân viên nghỉ không bị check-in nhầm.
      const notDone = (todayShifts || []).filter(
        (s) => s.status !== 'completed' && s.status !== 'rejected' && s.shiftType !== 'off'
      );
      // Store manager check-in được ca ở mọi chi nhánh
      const forBranch = position === 'store_manager'
        ? notDone
        : notDone.filter((s) => s.branch === branchId);

      const nowT = new Date();
      const currentHour = nowT.getHours();
      const nowMinutes = currentHour * 60 + nowT.getMinutes();
      const toMinutes = (t: string) => {
        const [h, m] = (t || '').split(':').map((x) => parseInt(x, 10));
        return (h || 0) * 60 + (m || 0);
      };
      const matchesNow = (s: any) => {
        const startHour = parseInt(s.startTime.split(':')[0], 10);
        const endHour = parseInt(s.endTime.split(':')[0], 10);
        if (endHour < startHour) return currentHour >= startHour || currentHour < endHour; // ca qua đêm
        return currentHour >= startHour && currentHour < endHour;
      };
      // Cho phép tự check-in SỚM tối đa 60' trước giờ vào ca (nhân viên tới sớm). TUYỆT ĐỐI không
      // tự check-in ca còn cách xa nhiều giờ — lỗi cũ (fallback "ca sớm nhất bất kể giờ") khiến
      // mở POS lúc 7h sáng lại check-in nhầm ca chiều 18h: giờ vào ca bị ghi 7h, ca tối bị kết
      // sớm nên mọi đơn bán 18–23h rớt khỏi ca (0 đơn).
      const CHECKIN_GRACE_MIN = 60;
      const startingSoon = (s: any) => {
        const diff = toMinutes(s.startTime) - nowMinutes;
        return diff >= 0 && diff <= CHECKIN_GRACE_MIN;
      };

      // Ưu tiên ca KHỚP GIỜ HIỆN TẠI (để mỗi ca mới bắt đầu đều được hỏi quỹ riêng), rồi tới ca
      // đang mở dở (đăng nhập lại giữa ca), cuối cùng là ca SẮP tới trong vòng 60'.
      const shiftToCheckIn =
        forBranch.find(matchesNow) ||
        forBranch.find((s) => s.status === 'in_progress') ||
        forBranch.find(startingSoon);

      if (!shiftToCheckIn) return;

      // Chỉ tự check-in nếu CHƯA có ca nào đang mở (tránh tạo 2 ca in_progress chồng nhau khi
      // ca trước chưa kết ca).
      if (
        shiftToCheckIn.status !== 'in_progress' &&
        !forBranch.some((s) => s.status === 'in_progress')
      ) {
        await api.shiftCheckIn(shiftToCheckIn.id, 'in');
      }
      // Chỉ hỏi tiền mặt đầu ca nếu ca này CHƯA từng được xác nhận/bỏ qua trên chính máy này —
      // tránh hỏi lặp mỗi lần tải lại trang.
      if (!localStorage.getItem(startCashDoneKey(shiftToCheckIn.id))) {
        setPendingStartCashShiftId((prev) => prev || shiftToCheckIn.id);
      }
    } catch (err) {
      console.error('syncShiftAndStartCash failed:', err);
    }
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

    // Máy POS đã được gán cố định 1 chi nhánh (deviceBranchId). Backend chỉ cho đăng nhập
    // nếu đó là chi nhánh chính hoặc chi nhánh hỗ trợ (secondaryBranches) của nhân viên,
    // nên phiên làm việc phải theo chi nhánh của máy — không phải chi nhánh gốc của nhân
    // viên — để nhân viên hỗ trợ ở chi nhánh khác đăng nhập đúng nơi họ đang làm việc.
    const sessionBranch = deviceBranchId || employee.branch;

    const sess = { ...toSession(employee), branchId: sessionBranch };
    setSession(sess);
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    localStorage.setItem('pos_branch', sess.branchId);

    await syncShiftAndStartCash(employee.id, employee.position, sessionBranch);
  };

  // Gọi lại khi mở/quay lại màn POS để bắt ca mới bắt đầu (không cần đăng nhập lại).
  const checkActiveShift = () => {
    if (session) {
      void syncShiftAndStartCash(session.employeeId, session.position, session.branchId);
    }
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('pos_branch');
    setPendingStartCashShiftId(null);
    api.clearAuthToken();
  };

  const markStartCashDone = (shiftId: string) => {
    localStorage.setItem(startCashDoneKey(shiftId), '1');
  };

  return (
    <PosContext.Provider value={{ session, isLoggedIn: !!session, isLoading, deviceBranchId, setDeviceBranchId, clearDeviceBranch, login, logout, checkActiveShift, pendingStartCashShiftId, clearPendingStartCash, markStartCashDone }}>
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error('usePos must be used within PosProvider');
  return ctx;
}
