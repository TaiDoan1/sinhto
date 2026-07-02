import { useState } from 'react';
import { useCombos } from '../../contexts/ComboContext';
import { useAdmin } from '../../contexts/AdminContext';
import { CustomerComboHub } from '../combo/CustomerComboHub';
import { Coffee, Truck } from 'lucide-react';
import { useBranches } from '../../contexts/BranchContext';

export function ComboManagement() {
  const { activeBranches } = useBranches();
  const branches = [
    { id: 'all', name: 'Tất cả chi nhánh' },
    ...activeBranches.map((b) => ({ id: b.id, name: b.name })),
  ];
  const { combos, getTodayDeliveries } = useCombos();
  const { adminUser } = useAdmin();
  const [branchFilter, setBranchFilter] = useState('all');

  const pendingCount = combos.filter((c) => c.status === 'pending').length;
  const activeCount = combos.filter((c) => c.status === 'active').length;
  const todayCount = getTodayDeliveries(branchFilter === 'all' ? undefined : branchFilter).length;
  const revenue = combos.filter((c) => c.status === 'active').reduce((s, c) => s + c.totalPrice, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Coffee className="w-8 h-8 text-emerald-600" />
            Quản Lý Combo Khách Hàng
          </h1>
          <p className="text-gray-600 mt-1">Chốt đơn, theo dõi tiến độ, giao hàng — thay nhóm Zalo</p>
        </div>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-4 py-2 border rounded-xl text-sm font-bold bg-white"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-amber-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Chờ chốt</p>
          <p className="text-2xl font-black text-amber-700">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-emerald-600">
          <p className="text-xs font-bold text-gray-400 uppercase">Đang chạy</p>
          <p className="text-2xl font-black text-gray-800">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-600">
          <p className="text-xs font-bold text-gray-400 uppercase">Giao hôm nay</p>
          <p className="text-2xl font-black text-blue-700">{todayCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-emerald-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Doanh thu active</p>
          <p className="text-lg font-black text-emerald-700">{revenue.toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-900">
        <Truck className="w-4 h-4 shrink-0" />
        Giao hàng chi tiết từng chi nhánh: Admin → Tổng quan chi nhánh → tab <strong>Lịch Giao Combo</strong>
        hoặc <a href="/ship-combo" className="font-bold underline">/ship-combo</a>
      </div>

      <CustomerComboHub
        variant="admin"
        branchId={branchFilter === 'all' ? undefined : branchFilter}
        claimAs={adminUser ? { id: adminUser.id, name: adminUser.fullName } : null}
        title="Danh sách combo khách hàng"
      />
    </div>
  );
}
