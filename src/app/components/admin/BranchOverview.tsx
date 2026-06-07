import { DollarSign, Users, ShoppingBag, TrendingUp, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { BranchDetail } from './BranchDetail';
import { useOrders } from '../../contexts/OrderContext';

interface BranchData {
  id: string;
  name: string;
  activeStaff: string[];
  trend: number;
}

const mockBranches: BranchData[] = [
  {
    id: 'CN1',
    name: 'Chi Nhánh 1 - Quận 1',
    activeStaff: ['Nguyễn Văn An', 'Trần Thị Bình'],
    trend: 0
  },
];

export function BranchOverview() {
  const { orders } = useOrders();
  const [branches] = useState<BranchData[]>(mockBranches);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate revenue and order count from orders
  const getBranchStats = (branchId: string) => {
    const branchOrders = orders.filter(o => o.branchId === branchId);
    return {
      revenue: branchOrders.reduce((sum, o) => sum + o.total, 0),
      orderCount: branchOrders.length
    };
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;

  if (selectedBranch) {
    return (
      <BranchDetail
        branchId={selectedBranch.id}
        branchName={selectedBranch.name}
        onBack={() => setSelectedBranch(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Tổng Quan Chi Nhánh</h1>
          <p className="text-gray-600 mt-1">Cập nhật lúc: {currentTime.toLocaleTimeString('vi-VN')}</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white rounded-lg shadow-md px-6 py-4">
            <div className="text-sm text-gray-600">Tổng Doanh Thu Hôm Nay</div>
            <div className="text-2xl font-bold text-green-600">
              {totalRevenue.toLocaleString('vi-VN')}đ
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md px-6 py-4">
            <div className="text-sm text-gray-600">Tổng Đơn Hàng</div>
            <div className="text-2xl font-bold text-emerald-700">{totalOrders}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        {branches.map(branch => {
          const stats = getBranchStats(branch.id);
          return (
            <button
              key={branch.id}
              onClick={() => setSelectedBranch(branch)}
              className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-emerald-600 hover:shadow-xl hover:scale-[1.02] transition-all text-left cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-800">{branch.name}</h3>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-500">{branch.id}</span>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                  branch.trend >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  <TrendingUp className={`w-4 h-4 ${branch.trend < 0 ? 'rotate-180' : ''}`} />
                  {Math.abs(branch.trend)}%
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-gray-600">Doanh Thu</span>
                  </div>
                  <div className="text-lg font-bold text-green-700">
                    {(stats.revenue / 1000000).toFixed(1)}M
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs text-gray-600">Đơn Hàng</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-800">{stats.orderCount}</div>
                </div>

              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-gray-600">Nhân Viên</span>
                </div>
                <div className="text-lg font-bold text-emerald-700">{branch.activeStaff.length}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Nhân viên đang làm việc:
              </div>
              <div className="flex flex-wrap gap-2">
                {branch.activeStaff.map((staff, idx) => (
                  <span
                    key={idx}
                    className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium"
                  >
                    {staff}
                  </span>
                ))}
              </div>
            </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
