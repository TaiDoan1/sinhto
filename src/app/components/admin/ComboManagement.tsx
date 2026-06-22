import { useState } from 'react';
import { useCombos, ComboSubscription } from '../../contexts/ComboContext';
import { useAdmin } from '../../contexts/AdminContext';
import { normalizeComboItems } from '../../utils/comboUtils';
import {
  Calendar, Phone, User, Play, Pause, CheckCircle, MapPin, Search, BarChart2, Coffee,
  Truck, Clock, AlertCircle,
} from 'lucide-react';

const branches = [
  { id: 'CN1', name: 'Chi Nhánh 1 - Quận 1' },
  { id: 'CN2', name: 'Chi Nhánh 2 - Quận 3' },
  { id: 'CN3', name: 'Chi Nhánh 3 - Thủ Đức' },
];

export function ComboManagement() {
  const { combos, updateComboStatus, updateCombo, claimCombo, getTodayDeliveries } = useCombos();
  const { adminUser } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'paused' | 'completed'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const todayAll = getTodayDeliveries();
  const todayFiltered = branchFilter === 'all' ? todayAll : getTodayDeliveries(branchFilter);
  const pendingCount = combos.filter((c) => c.status === 'pending').length;

  const filteredCombos = combos.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerPhone.includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.planName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesBranch = branchFilter === 'all' || c.branchId === branchFilter;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name || id;

  const totalSubscribers = combos.filter((c) => c.status === 'active').length;
  const estimatedRevenue = combos
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + c.totalPrice, 0);

  const handleClaim = async (comboId: string) => {
    if (!adminUser) {
      alert('Cần đăng nhập Admin để chốt combo.');
      return;
    }
    setClaimingId(comboId);
    try {
      await claimCombo(comboId, adminUser.id, adminUser.fullName);
      alert('Đã chốt combo thành công!');
    } catch (err) {
      console.error(err);
      alert('Chốt combo thất bại.');
    } finally {
      setClaimingId(null);
    }
  };

  const getStatusBadgeClass = (status: ComboSubscription['status']) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'paused': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: ComboSubscription['status']) => {
    switch (status) {
      case 'pending': return 'Chờ chốt';
      case 'active': return 'Đang chạy';
      case 'paused': return 'Tạm dừng';
      case 'completed': return 'Hoàn thành';
    }
  };

  const formatItemsSummary = (combo: ComboSubscription) => {
    const items = normalizeComboItems(combo.items);
    if (!items.length) return '—';
    return items.slice(0, 3).map((i) => i.productName).join(', ') + (items.length > 3 ? '...' : '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Gói Combo</h1>
        <p className="text-gray-600 mt-1">Chốt đơn, theo dõi lịch giao, tạm dừng và phân chi nhánh</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-amber-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Chờ chốt</p>
          <h3 className="text-2xl font-black text-amber-700 mt-1">{pendingCount}</h3>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-emerald-600">
          <p className="text-xs font-bold text-gray-400 uppercase">Đang chạy</p>
          <h3 className="text-2xl font-black text-gray-800 mt-1">{totalSubscribers}</h3>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-600">
          <p className="text-xs font-bold text-gray-400 uppercase">Giao hôm nay</p>
          <h3 className="text-2xl font-black text-blue-700 mt-1">{todayFiltered.length}</h3>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-emerald-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Doanh thu active</p>
          <h3 className="text-xl font-black text-emerald-700 mt-1">{estimatedRevenue.toLocaleString('vi-VN')}đ</h3>
        </div>
      </div>

      {/* Giao hôm nay */}
      {todayFiltered.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <h2 className="font-bold text-emerald-900 flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5" />
            Cần giao hôm nay ({todayFiltered.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayFiltered.map((c) => (
              <div key={c.id} className="bg-white rounded-lg p-3 border border-emerald-100 text-sm">
                <div className="font-bold text-gray-900">{c.customerName}</div>
                <div className="text-gray-500 text-xs">{c.customerPhone} · {getBranchName(c.branchId)}</div>
                <div className="text-emerald-800 font-semibold mt-1">{c.planName || formatItemsSummary(c)}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-emerald-700 mt-2">Vào Chi nhánh → tab Combo để xác nhận giao & trừ kho</p>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>{pendingCount} combo chờ chốt</strong> — từ web/POS. Bấm &quot;Chốt combo&quot; để kích hoạt và gán CS phụ trách.
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-md border space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm tên, SĐT, mã gói, tên gói..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:border-emerald-600"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'active', 'paused', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                statusFilter === status
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {status === 'all' ? 'Tất cả' : getStatusLabel(status as ComboSubscription['status'])}
            </button>
          ))}
        </div>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-4 py-2 border rounded-xl text-xs font-bold bg-gray-50"
        >
          <option value="all">Tất cả chi nhánh</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Mã / Gói</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Khách hàng</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Vị / Lịch</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Chi nhánh</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCombos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Chưa có combo phù hợp
                  </td>
                </tr>
              ) : (
                filteredCombos.map((combo) => (
                  <tr key={combo.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="text-xs font-mono text-gray-500">{combo.id}</div>
                      <div className="font-bold text-sm text-gray-900">{combo.planName || 'Combo FitBlend'}</div>
                      <div className="text-xs text-emerald-700 font-semibold">{combo.totalPrice.toLocaleString('vi-VN')}đ</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm">{combo.customerName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />{combo.customerPhone}
                      </div>
                      {combo.careStaffName && (
                        <div className="text-[11px] text-gray-400 mt-0.5">CS: {combo.careStaffName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px]">
                      <div className="truncate" title={formatItemsSummary(combo)}>{formatItemsSummary(combo)}</div>
                      <div className="flex items-center gap-1 mt-1 text-gray-400">
                        <Calendar className="w-3 h-3" />
                        Giao: {combo.deliveryDays.map((d) => (d === 0 ? 'CN' : `T${d + 1}`)).join(', ')}
                      </div>
                      {combo.lastDeliveredAt && (
                        <div className="flex items-center gap-1 mt-0.5 text-emerald-600">
                          <Clock className="w-3 h-3" />
                          Giao gần nhất: {new Date(combo.lastDeliveredAt).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={combo.branchId}
                        onChange={(e) => updateCombo(combo.id, { branchId: e.target.value })}
                        className="px-2 py-1 border rounded-lg text-xs font-semibold"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.id}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(combo.status)}`}>
                        {getStatusLabel(combo.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {combo.status === 'pending' && (
                          <button
                            onClick={() => handleClaim(combo.id)}
                            disabled={claimingId === combo.id}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"
                          >
                            {claimingId === combo.id ? '...' : 'Chốt combo'}
                          </button>
                        )}
                        {combo.status === 'active' && (
                          <button
                            onClick={() => updateComboStatus(combo.id, 'paused')}
                            className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Pause className="w-3 h-3" /> Tạm dừng
                          </button>
                        )}
                        {combo.status === 'paused' && (
                          <button
                            onClick={() => updateComboStatus(combo.id, 'active')}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" /> Kích hoạt
                          </button>
                        )}
                        {combo.status !== 'completed' && (
                          <button
                            onClick={() => updateComboStatus(combo.id, 'completed')}
                            className="bg-gray-50 text-gray-600 border px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" /> Xong
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
