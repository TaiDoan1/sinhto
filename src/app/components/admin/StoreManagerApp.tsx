import { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { AdminLogin } from './AdminLogin';

type StoreManagerView = 'overview' | 'team' | 'inventory' | 'sales';

export function StoreManagerApp() {
  const { adminUser, isLoggedIn, isLoading, logout } = useAdmin();
  const [activeView, setActiveView] = useState<StoreManagerView>('overview');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) return <AdminLogin />;

  const cards: Array<{ id: StoreManagerView; title: string; description: string; emoji: string }> = [
    { id: 'overview', title: 'Tổng quan', description: 'Xem tình hình hoạt động hôm nay', emoji: '📊' },
    { id: 'team', title: 'Nhân sự', description: 'Theo dõi nhân viên và lịch làm việc', emoji: '👥' },
    { id: 'inventory', title: 'Kho hàng', description: 'Kiểm tra tồn kho và nhập xuất', emoji: '📦' },
    { id: 'sales', title: 'Doanh thu', description: 'Theo dõi doanh số và hiệu suất', emoji: '💰' },
  ];

  const stats = [
    { label: 'Nhân viên đang làm', value: '18', hint: 'Đang hoạt động' },
    { label: 'Tồn kho cảnh báo', value: '6', hint: 'Cần bổ sung' },
    { label: 'Doanh thu hôm nay', value: '34.2M', hint: 'Tăng 8%' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-100">Cửa hàng trưởng</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Bảng điều khiển vận hành</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50 sm:text-base">
                Quản lý nhân sự, kho hàng, lịch làm việc và doanh thu ở một nơi riêng biệt, dễ nhìn và dễ thao tác.
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-sm text-emerald-100">Xin chào</p>
              <p className="text-lg font-bold">{adminUser?.fullName || 'Cửa hàng trưởng'}</p>
              <p className="text-sm text-emerald-100">{adminUser?.branch || 'Chi nhánh'}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{item.value}</p>
              <p className="mt-1 text-sm text-emerald-600">{item.hint}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveView(card.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  activeView === card.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-transparent bg-slate-50 hover:border-emerald-200 hover:bg-white'
                }`}
              >
                <div className="text-2xl">{card.emoji}</div>
                <div className="mt-2 font-semibold text-slate-900">{card.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-500">{card.description}</div>
              </button>
            ))}

            <button
              type="button"
              onClick={logout}
              className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm font-semibold text-red-700"
            >
              Đăng xuất
            </button>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            {activeView === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Tổng quan vận hành</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Đây là góc nhìn nhanh để cửa hàng trưởng nắm được hoạt động trong ngày.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-sm text-emerald-700">Đơn hàng hôm nay</p>
                    <p className="mt-2 text-3xl font-black text-emerald-900">142</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-sm text-amber-700">Ca làm sắp tới</p>
                    <p className="mt-2 text-3xl font-black text-amber-900">5</p>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'team' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900">Nhân sự & lịch làm</h2>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-800">Lịch làm việc hôm nay</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>• 08:00 - 14:00: Thu ngân</li>
                    <li>• 10:00 - 18:00: Pha chế</li>
                    <li>• 14:00 - 22:00: Phục vụ</li>
                  </ul>
                </div>
              </div>
            )}

            {activeView === 'inventory' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900">Kho hàng</h2>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-800">Mặt hàng cần bổ sung</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>• Sữa hạt</li>
                    <li>• Trân châu</li>
                    <li>• Đường</li>
                  </ul>
                </div>
              </div>
            )}

            {activeView === 'sales' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900">Doanh thu & hiệu suất</h2>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-800">Hiệu quả bán hàng</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Doanh thu đang tăng tốt, đặc biệt ở khung giờ chiều và cuối tuần.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
