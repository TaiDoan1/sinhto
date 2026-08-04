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

    // Tu dong check-in vao ca hom nay (neu co) de khi dang xuat POS
    // luon tim duoc ca dang mo va hien man hinh ket ca.
    // Nhan vien co the co nhieu ca/ngay (VD ca sang + ca toi) nen phai
    // chon dung ca khop voi gio hien tai, khong chi lay ca dau tien tim thay.
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayShifts = (await api.fetchShifts({ employeeId: employee.id, date: today })) as any[];
      // Ca nghỉ ("off") là 1 dòng giả chiếm trọn ngày (00:00-23:59) để đánh dấu lịch nghỉ, không
      // phải ca làm thật — nếu không loại ra, nhân viên nghỉ vẫn bị tự động check-in nhầm vào đó.
      const notDone = (todayShifts || []).filter(
        (s) => s.status !== 'completed' && s.status !== 'rejected' && s.shiftType !== 'off'
      );

      // Store manager can check in shifts from any branch
      const forBranch = employee.position === 'store_manager'
        ? notDone
        : notDone.filter((s) => s.branch === sessionBranch);

      // Ca đang mở sẵn (in_progress) được ưu tiên — đây chính là ca của phiên đăng nhập lần
      // trước, có thể đăng nhập lại (tải lại trang, đóng app giữa chừng) TRƯỚC KHI kịp nhập
      // tiền mặt đầu ca. Nếu chỉ tìm ca "chưa bắt đầu" như trước, ca in_progress bị bỏ qua
      // hoàn toàn — nhân viên không bao giờ được hỏi lại tiền mặt đầu ca cho ca đó nữa.
      const alreadyOpen = forBranch.find((s) => s.status === 'in_progress');

      let shiftToCheckIn = alreadyOpen;
      if (!shiftToCheckIn) {
        const eligibleForBranch = forBranch.filter((s) => s.status !== 'in_progress');
        const currentHour = new Date().getHours();
        const matchingNow = eligibleForBranch.find((s) => {
          const startHour = parseInt(s.startTime.split(':')[0], 10);
          const endHour = parseInt(s.endTime.split(':')[0], 10);
          if (endHour < startHour) return currentHour >= startHour || currentHour < endHour; // ca qua dem
          return currentHour >= startHour && currentHour < endHour;
        });
        shiftToCheckIn =
          matchingNow || [...eligibleForBranch].sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
      }

      if (shiftToCheckIn) {
        if (shiftToCheckIn.status !== 'in_progress') {
          await api.shiftCheckIn(shiftToCheckIn.id, 'in');
        }
        // Chỉ hỏi lại tiền mặt đầu ca nếu ca này CHƯA từng được xác nhận (nộp hoặc bấm "Bỏ
        // qua") trên chính máy này — tránh hỏi lặp lại mỗi lần tải lại trang.
        if (!localStorage.getItem(startCashDoneKey(shiftToCheckIn.id))) {
          setPendingStartCashShiftId(shiftToCheckIn.id);
        }
      }
    } catch (err) {
      console.error('Auto check-in failed:', err);
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
    <PosContext.Provider value={{ session, isLoggedIn: !!session, isLoading, deviceBranchId, setDeviceBranchId, clearDeviceBranch, login, logout, pendingStartCashShiftId, clearPendingStartCash, markStartCashDone }}>
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error('usePos must be used within PosProvider');
  return ctx;
}
