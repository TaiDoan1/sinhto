import {
  LayoutDashboard,
  Store,
  Users,
  CreditCard,
  Monitor,
  Headphones,
  UserCircle,
  Truck,
  Bike,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react';
import { LANDING_IMAGES } from '../config/images';
import { navigateToMode, type AppMode } from '../utils/appMode';

type HubItem = {
  mode: AppMode;
  label: string;
  desc: string;
  icon: typeof Store;
  color: string; // text/icon color
  bg: string; // icon background
};

type HubGroup = { title: string; items: HubItem[] };

const GROUPS: HubGroup[] = [
  {
    title: 'Quản lý',
    items: [
      { mode: 'admin', label: 'Admin', desc: 'Toàn quyền quản trị', icon: LayoutDashboard, color: '#047857', bg: '#d1fae5' },
      { mode: 'store-manager', label: 'Cửa Hàng Trưởng', desc: 'Lịch · nhân sự · kho', icon: Store, color: '#0f766e', bg: '#ccfbf1' },
      { mode: 'hr', label: 'Nhân Sự & Lương', desc: 'Chấm công · bảng lương', icon: Users, color: '#4338ca', bg: '#e0e7ff' },
    ],
  },
  {
    title: 'Vận hành',
    items: [
      { mode: 'pos', label: 'POS', desc: 'Bán tại quầy', icon: CreditCard, color: '#c2410c', bg: '#ffedd5' },
      { mode: 'pos-customer-display', label: 'Màn Hình Khách', desc: 'Hiển thị tại quầy', icon: Monitor, color: '#334155', bg: '#e2e8f0' },
      { mode: 'online-sales', label: 'CSKH', desc: 'Chăm sóc khách hàng', icon: Headphones, color: '#0369a1', bg: '#e0f2fe' },
      { mode: 'staff', label: 'Nhân Viên', desc: 'Portal · check-in/out', icon: UserCircle, color: '#6d28d9', bg: '#ede9fe' },
      { mode: 'combo-ship', label: 'Giao Combo', desc: 'Giao combo hôm nay', icon: Truck, color: '#b45309', bg: '#fef3c7' },
      { mode: 'shipper', label: 'Shipper', desc: 'Giao hàng đơn lẻ', icon: Bike, color: '#be123c', bg: '#ffe4e6' },
    ],
  },
  {
    title: 'Khách hàng',
    items: [
      { mode: 'customer', label: 'Trang Khách', desc: 'Landing · đặt hàng', icon: ShoppingBag, color: '#15803d', bg: '#dcfce7' },
    ],
  },
];

/** Trang tổng hợp — gộp tất cả chức năng vào 1 nơi, bấm là vào, khỏi gõ đường dẫn.
 * Truy cập tại /menu (hoặc /he-thong). Bản thân trang chỉ là bảng điều hướng; mỗi tool vẫn
 * yêu cầu đăng nhập riêng như cũ. */
export function SystemHub() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <img src={LANDING_IMAGES.logo} alt="FitBlend" className="h-9 w-auto" />
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">Bảng Điều Khiển Hệ Thống</h1>
            <p className="text-xs text-slate-500">Chọn chức năng để vào</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5 px-1">{group.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => navigateToMode(item.mode)}
                    className="group text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 active:scale-[0.98] transition-all p-4"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: item.bg, color: item.color }}
                    >
                      <Icon className="w-5.5 h-5.5" style={{ width: 22, height: 22 }} />
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-800 text-sm sm:text-base leading-tight">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <p className="text-center text-[11px] text-slate-400 pt-2">
          FitBlend · mỗi chức năng yêu cầu đăng nhập riêng
        </p>
      </main>
    </div>
  );
}
