import { useState } from 'react';
import { useCombos, ComboSubscription } from '../../contexts/ComboContext';
import { Calendar, Phone, User, Play, Pause, CheckCircle, MapPin, Search, BarChart2, Coffee } from 'lucide-react';

const branches = [
  { id: 'CN1', name: 'Chi Nhánh 1 - Quận 1' },
  { id: 'CN2', name: 'Chi Nhánh 2 - Quận 3' },
  { id: 'CN3', name: 'Chi Nhánh 3 - Thủ Đức' },
];

export function ComboManagement() {
  const { combos, updateComboStatus, updateCombo } = useCombos();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const filteredCombos = combos.filter(c => {
    const matchesSearch = 
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerPhone.includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesBranch = branchFilter === 'all' || c.branchId === branchFilter;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const getBranchName = (id: string) => branches.find(b => b.id === id)?.name || id;

  // Stats calculation
  const totalSubscribers = combos.filter(c => c.status === 'active').length;
  const estimatedRevenue = combos
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + c.totalPrice, 0);

  const getStatusBadgeClass = (status: ComboSubscription['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'paused':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'completed':
        return 'bg-gray-150 text-gray-700 border-gray-350';
    }
  };

  const getStatusLabel = (status: ComboSubscription['status']) => {
    switch (status) {
      case 'active': return 'Đang chạy';
      case 'paused': return 'Tạm dừng';
      case 'completed': return 'Đã hoàn thành';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Gói Combo Đăng Ký</h1>
        <p className="text-gray-600 mt-1">Điều phối lịch trình giao, trạng thái kích hoạt, và phân phối chi nhánh phục vụ</p>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-600">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hội viên Combo Đang Chạy</p>
              <h3 className="text-3xl font-black text-gray-800 mt-1">{totalSubscribers} khách</h3>
            </div>
            <User className="w-10 h-10 text-emerald-600 opacity-40" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-600">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Doanh Thu Combo Ước Tính</p>
              <h3 className="text-3xl font-black text-emerald-700 mt-1">{estimatedRevenue.toLocaleString('vi-VN')}đ</h3>
            </div>
            <BarChart2 className="w-10 h-10 text-emerald-600 opacity-40" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tổng số gói combo đã bán</p>
              <h3 className="text-3xl font-black text-gray-800 mt-1">{combos.length} gói</h3>
            </div>
            <Coffee className="w-10 h-10 text-blue-600 opacity-40" />
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 rounded-xl shadow-md border space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
          <input
            type="text"
            placeholder="Tìm theo tên khách, sđt, mã gói..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {(['all', 'active', 'paused', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === status
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-md'
                  : 'bg-gray-50 text-gray-650 hover:bg-gray-100 border-gray-200'
              }`}
            >
              {status === 'all' ? 'Tất cả' : getStatusLabel(status as any)}
            </button>
          ))}
        </div>

        {/* Branch Filter */}
        <div>
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-650 bg-gray-50 focus:outline-none focus:border-emerald-600"
          >
            <option value="all">Tất cả chi nhánh</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Combos Subscriptions List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Mã gói</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Gói & Giá trị</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Lịch giao</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Chi nhánh phục vụ</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCombos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Chưa tìm thấy gói Combo nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredCombos.map(combo => (
                  <tr key={combo.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{combo.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-gray-900 text-sm">{combo.customerName}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{combo.customerPhone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">
                          {combo.comboType === 'weekly' ? 'Combo Tuần' : 'Combo Tháng'}
                        </span>
                        <span className="text-xs text-emerald-700 font-extrabold mt-0.5">{combo.totalPrice.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs text-gray-600">
                        <span className="font-semibold">Bắt đầu: {new Date(combo.startDate).toLocaleDateString('vi-VN')}</span>
                        <span className="mt-0.5">Thứ giao: {combo.deliveryDays.map(d => d === 0 ? 'CN' : `T${d + 1}`).join(', ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <select
                          value={combo.branchId}
                          onChange={e => updateCombo(combo.id, { branchId: e.target.value })}
                          className="px-2 py-1 border rounded-lg text-xs font-semibold focus:outline-none"
                        >
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(combo.status)}`}>
                        {getStatusLabel(combo.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {combo.status === 'active' ? (
                          <button
                            onClick={() => updateComboStatus(combo.id, 'paused')}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 p-1.5 rounded-lg border border-amber-200 flex items-center gap-1 text-xs font-bold"
                            title="Tạm dừng gói"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Tạm dừng</span>
                          </button>
                        ) : combo.status === 'paused' ? (
                          <button
                            onClick={() => updateComboStatus(combo.id, 'active')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded-lg border border-emerald-200 flex items-center gap-1 text-xs font-bold"
                            title="Kích hoạt lại gói"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Kích hoạt</span>
                          </button>
                        ) : null}

                        {combo.status !== 'completed' && (
                          <button
                            onClick={() => updateComboStatus(combo.id, 'completed')}
                            className="bg-gray-50 hover:bg-gray-150 text-gray-700 p-1.5 rounded-lg border border-gray-250 flex items-center gap-1 text-xs font-bold"
                            title="Hoàn thành gói"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Hoàn thành</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
