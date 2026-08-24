import { useState, useEffect, useMemo } from 'react';
import {
  Users, Phone, Search, ArrowRightLeft, UserPlus, Package, Loader2,
  CheckCircle2, Pause, Play, Edit3, X,
} from 'lucide-react';
import { useCombos, ComboSubscription } from '../../contexts/ComboContext';
import * as api from '../../utils/api';
import type { CustomerCareAssignment } from '../../types/customerCare';
import { usePagination, Pager } from '../common/Pagination';
import type { TeamStat } from '../../types/onlineSales';
import type { Employee } from '../../types/employee';
import { POSITION_LABELS, isOnlineSalesPosition } from '../../types/employee';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ chốt',
  active: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
};

export function CustomerCareManagement() {
  const { combos, updateCombo, updateComboStatus, refreshCombos } = useCombos();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<CustomerCareAssignment[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ phone: '', name: '', staffId: '', notes: '' });

  // Nhập khách cũ HÀNG LOẠT + tích nhiều CSKH được thấy
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkStaffIds, setBulkStaffIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Mỗi dòng: "SĐT, Tên, ghi chú" (hoặc cách nhau bởi tab). Tách linh hoạt dấu phẩy/tab.
  const parseBulkCustomers = (text: string) =>
    text.split('\n').map((line) => {
      const parts = line.split(/[,\t]/).map((s) => s.trim());
      const phone = (parts.find((p) => /\d{6,}/.test(p)) || parts[0] || '').trim();
      const name = (parts.find((p) => p && p !== phone) || '').trim();
      const note = parts.slice(2).join(', ');
      return { phone, name, note };
    }).filter((c) => c.phone || c.name);

  const handleBulkImport = async () => {
    const customers = parseBulkCustomers(bulkText);
    if (customers.length === 0) { alert('Chưa nhập khách nào (mỗi dòng 1 khách: SĐT, Tên)'); return; }
    if (bulkStaffIds.length === 0) { alert('Chưa tích CSKH nào được thấy'); return; }
    setBulkSaving(true);
    try {
      const { added } = await api.bulkAddCustomerLeads(customers, bulkStaffIds);
      alert(`Đã thêm ${added} khách cũ cho ${bulkStaffIds.length} CSKH.`);
      setBulkText(''); setBulkStaffIds([]); setShowBulkForm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nhập khách cũ thất bại');
    } finally {
      setBulkSaving(false);
    }
  };

  const [transferTarget, setTransferTarget] = useState<CustomerCareAssignment | null>(null);
  const [transferStaffId, setTransferStaffId] = useState('');

  const [editCombo, setEditCombo] = useState<ComboSubscription | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);

  const csStaff = useMemo(
    () => employees.filter((e) => isOnlineSalesPosition(e.position)),
    [employees]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [empsResult, assignsResult, statsResult] = await Promise.allSettled([
        api.fetchEmployees(),
        api.fetchCareAssignments(),
        api.fetchOnlineSalesTeamStats(),
      ]);
      if (empsResult.status === 'fulfilled') setEmployees(empsResult.value);
      if (assignsResult.status === 'fulfilled') setAssignments(assignsResult.value);
      if (statsResult.status === 'fulfilled') setTeamStats(statsResult.value);
      try {
        await refreshCombos();
      } catch (err) {
        console.error('Failed to refresh combos:', err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const staffCombos = useMemo(() => {
    if (!selectedStaffId) return [];
    return combos.filter((c) => c.careStaffId === selectedStaffId);
  }, [combos, selectedStaffId]);

  const staffCustomers = useMemo(() => {
    if (!selectedStaffId) return [];
    const q = search.toLowerCase();
    return assignments
      .filter((a) => a.careStaffId === selectedStaffId)
      .filter(
        (a) =>
          !q ||
          a.customerName.toLowerCase().includes(q) ||
          a.customerPhone.includes(q)
      );
  }, [assignments, selectedStaffId, search]);

  const { pageItems: pagedStaffCustomers, ...custPager } = usePagination(staffCustomers, 20, `${selectedStaffId}|${search}`);
  const { pageItems: pagedStaffCombos, ...comboPager } = usePagination(staffCombos, 20, selectedStaffId);

  const pendingCombos = combos.filter((c) => c.status === 'pending');

  const getStaffStats = (staffId: string) => {
    const customerCount = assignments.filter((a) => a.careStaffId === staffId).length;
    const comboCount = combos.filter((c) => c.careStaffId === staffId && c.status === 'active').length;
    return { customerCount, comboCount };
  };

  const handleAssign = async () => {
    const staff = csStaff.find((s) => s.id === assignForm.staffId);
    if (!staff || !assignForm.phone.trim()) {
      alert('Vui lòng nhập SĐT và chọn nhân viên CS');
      return;
    }
    try {
      await api.assignCustomerCare({
        customerPhone: assignForm.phone.trim(),
        customerName: assignForm.name.trim(),
        careStaffId: staff.id,
        careStaffName: staff.fullName,
        assignedBy: 'admin',
        notes: assignForm.notes,
      });
      setShowAssignForm(false);
      setAssignForm({ phone: '', name: '', staffId: '', notes: '' });
      const assigns = await api.fetchCareAssignments();
      setAssignments(assigns);
      await refreshCombos();
      alert('Đã phân bổ khách hàng thành công');
    } catch {
      alert('Phân bổ thất bại');
    }
  };

  const handleTransfer = async () => {
    if (!transferTarget || !transferStaffId) return;
    const staff = csStaff.find((s) => s.id === transferStaffId);
    if (!staff) return;
    try {
      await api.transferCustomerCare(transferTarget.customerPhone, {
        careStaffId: staff.id,
        careStaffName: staff.fullName,
        assignedBy: 'admin',
      });
      setTransferTarget(null);
      setTransferStaffId('');
      const assigns = await api.fetchCareAssignments();
      setAssignments(assigns);
      await refreshCombos();
      alert(`Đã chuyển ${transferTarget.customerName} cho ${staff.fullName}`);
    } catch {
      alert('Chuyển nhượng thất bại');
    }
  };

  const handleSaveComboEdit = async () => {
    if (!editCombo) return;
    try {
      await updateCombo(editCombo.id, { notes: editNotes, deliveryAddress: editCombo.deliveryAddress });
      setEditCombo(null);
    } catch {
      alert('Cập nhật thất bại');
    }
  };

  const selectedStaff = csStaff.find((s) => s.id === selectedStaffId);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Chăm Sóc Khách Hàng</h1>
          <p className="text-gray-600 mt-1">
            Quản lý nhân viên chăm sóc khách hàng — phân bổ khách, theo dõi combo và chuyển nhượng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulkForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-50"
          >
            <Users className="w-4 h-4" />
            Nhập khách cũ (hàng loạt)
          </button>
          <button
            type="button"
            onClick={() => setShowAssignForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700"
          >
            <UserPlus className="w-4 h-4" />
            Phân bổ khách
          </button>
        </div>
      </div>

      {showBulkForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg">Nhập khách cũ hàng loạt</h3>
              <button type="button" onClick={() => setShowBulkForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Danh sách khách — mỗi dòng 1 khách</label>
                <p className="text-xs text-gray-500 mb-2">Định dạng: <b>SĐT, Tên, ghi chú</b> (cách nhau bởi dấu phẩy hoặc tab). Có thể dán từ Excel/Sheet.</p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={7}
                  placeholder={'0901234567, Nguyễn Văn A, khách quen\n0912345678, Trần Thị B'}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">Nhận diện: {parseBulkCustomers(bulkText).length} khách</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-gray-700">CSKH được thấy các khách này <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => setBulkStaffIds(bulkStaffIds.length === csStaff.length ? [] : csStaff.map((s) => s.id))}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    {bulkStaffIds.length === csStaff.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-2">
                  {csStaff.length === 0 && <div className="text-xs text-gray-400 italic p-2">Chưa có nhân viên CSKH</div>}
                  {csStaff.map((s) => {
                    const checked = bulkStaffIds.includes(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setBulkStaffIds((prev) => checked ? prev.filter((x) => x !== s.id) : [...prev, s.id])}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${checked ? 'bg-emerald-50 border border-emerald-300' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}`}
                      >
                        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300'}`}>{checked && '✓'}</span>
                        <span className="font-medium text-gray-800">{s.fullName}</span>
                        <span className="text-xs text-gray-400 ml-auto">{POSITION_LABELS[s.position] || s.position}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-1">Đã chọn {bulkStaffIds.length} CSKH</p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button type="button" onClick={() => setShowBulkForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold">Hủy</button>
              <button type="button" onClick={handleBulkImport} disabled={bulkSaving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold">
                {bulkSaving ? 'Đang nhập...' : 'Nhập & phân bổ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team KPI */}
      {teamStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-800">KPI team tháng này</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="px-5 py-3">Nhân viên</th>
                  <th className="px-3 py-3">Doanh thu</th>
                  <th className="px-3 py-3">Combo</th>
                  <th className="px-3 py-3">Lead</th>
                  <th className="px-3 py-3">Khách</th>
                  <th className="px-5 py-3">Chờ chốt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teamStats.map((s) => (
                  <tr key={s.staffId} className="hover:bg-emerald-50/30">
                    <td className="px-5 py-3">
                      <p className="font-bold text-gray-900">{s.fullName}</p>
                      <p className="text-xs text-gray-400">@{s.username}</p>
                    </td>
                    <td className="px-3 py-3 font-bold text-emerald-700">{s.revenueMonth.toLocaleString('vi-VN')}đ</td>
                    <td className="px-3 py-3">{s.comboCount}</td>
                    <td className="px-3 py-3">{s.leadCount}</td>
                    <td className="px-3 py-3">{s.customerCount}</td>
                    <td className="px-5 py-3">
                      {s.pendingClaims > 0 ? (
                        <span className="text-amber-700 font-bold">{s.pendingClaims}</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending combos alert */}
      {pendingCombos.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendingCombos.length} combo</strong> đang chờ NV CSKH chốt — khách đặt online chưa được gán.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* CS Staff list */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Nhân viên CSKH ({csStaff.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
            {csStaff.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">
                Chưa có NV CSKH. Tạo tài khoản với chức vụ &quot;Chăm Sóc Khách Hàng&quot; trong mục Nhân Sự.
              </p>
            ) : (
              csStaff.map((staff) => {
                const stats = getStaffStats(staff.id);
                const isSelected = selectedStaffId === staff.id;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`w-full text-left px-5 py-4 hover:bg-emerald-50 transition-colors ${
                      isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''
                    }`}
                  >
                    <p className="font-bold text-gray-900">{staff.fullName}</p>
                    <p className="text-xs text-gray-500">{staff.employeeId} · {staff.username}</p>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-emerald-700 font-semibold">{stats.customerCount} khách</span>
                      <span className="text-blue-700 font-semibold">{stats.comboCount} combo active</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedStaffId ? (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-400">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-semibold text-lg">Chọn nhân viên CSKH để xem chi tiết</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                <h3 className="font-bold text-xl text-gray-800">{selectedStaff?.fullName}</h3>
                <p className="text-sm text-gray-500">
                  {POSITION_LABELS[selectedStaff?.position || ''] || POSITION_LABELS.cskh}
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Tìm khách hàng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                />
              </div>

              {/* Customers */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 font-bold text-gray-700">
                  Khách hàng được phân bổ ({staffCustomers.length})
                </div>
                {staffCustomers.length === 0 ? (
                  <p className="p-5 text-sm text-gray-400">Chưa có khách được gán</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {pagedStaffCustomers.map((a) => (
                      <div key={a.id} className="px-5 py-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{a.customerName || 'Khách hàng'}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> {a.customerPhone}
                          </p>
                          {a.notes && <p className="text-xs text-gray-400 mt-1">{a.notes}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setTransferTarget(a); setTransferStaffId(''); }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold shrink-0"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Chuyển
                        </button>
                      </div>
                    ))}
                    <Pager {...custPager} onPage={custPager.setPage} unit="khách" className="px-5" />
                  </div>
                )}
              </div>

              {/* Combos */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 font-bold text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Combo đang quản lý ({staffCombos.length})
                </div>
                {staffCombos.length === 0 ? (
                  <p className="p-5 text-sm text-gray-400">Chưa có combo</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {pagedStaffCombos.map((combo) => (
                      <div key={combo.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{combo.planName || combo.id}</p>
                            <p className="text-sm text-gray-600">{combo.customerName} · {combo.customerPhone}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {combo.totalPrice.toLocaleString('vi-VN')}đ · {STATUS_LABEL[combo.status]}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => { setEditCombo(combo); setEditNotes(combo.notes || ''); }}
                              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {combo.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => updateComboStatus(combo.id, 'paused')}
                                className="p-2 rounded-lg bg-amber-50 text-amber-700"
                                title="Tạm dừng"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                            )}
                            {combo.status === 'paused' && (
                              <button
                                type="button"
                                onClick={() => updateComboStatus(combo.id, 'active')}
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-700"
                                title="Tiếp tục"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Pager {...comboPager} onPage={comboPager.setPage} unit="combo" className="px-5" />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Assign modal */}
      {showAssignForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Phân bổ khách hàng</h3>
              <button type="button" onClick={() => setShowAssignForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <input
              placeholder="Số điện thoại *"
              value={assignForm.phone}
              onChange={(e) => setAssignForm({ ...assignForm, phone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border text-sm"
            />
            <input
              placeholder="Tên khách hàng"
              value={assignForm.name}
              onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border text-sm"
            />
            <select
              value={assignForm.staffId}
              onChange={(e) => setAssignForm({ ...assignForm, staffId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border text-sm"
            >
              <option value="">Chọn nhân viên CS *</option>
              {csStaff.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
            <textarea
              placeholder="Ghi chú (tuỳ chọn)"
              value={assignForm.notes}
              onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border text-sm h-20 resize-none"
            />
            <button
              type="button"
              onClick={handleAssign}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold"
            >
              Xác nhận phân bổ
            </button>
          </div>
        </div>
      )}

      {/* Transfer modal */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Chuyển nhượng khách</h3>
              <button type="button" onClick={() => setTransferTarget(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600">
              Chuyển <strong>{transferTarget.customerName}</strong> ({transferTarget.customerPhone}) sang nhân viên CS khác. Tất cả combo active/pending sẽ được chuyển theo.
            </p>
            <select
              value={transferStaffId}
              onChange={(e) => setTransferStaffId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border text-sm"
            >
              <option value="">Chọn nhân viên nhận *</option>
              {csStaff.filter((s) => s.id !== transferTarget.careStaffId).map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleTransfer}
              disabled={!transferStaffId}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
            >
              Xác nhận chuyển
            </button>
          </div>
        </div>
      )}

      {/* Edit combo modal */}
      {editCombo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Chỉnh sửa combo</h3>
              <button type="button" onClick={() => setEditCombo(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm font-semibold text-gray-700">{editCombo.planName} — {editCombo.customerName}</p>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Địa chỉ giao</label>
              <textarea
                value={editCombo.deliveryAddress || ''}
                onChange={(e) => setEditCombo({ ...editCombo, deliveryAddress: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 rounded-xl border text-sm h-20 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Ghi chú CS</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 rounded-xl border text-sm h-20 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveComboEdit}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
