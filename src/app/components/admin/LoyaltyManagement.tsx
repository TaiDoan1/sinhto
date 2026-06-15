import { useState, useEffect } from 'react';
import { useLoyalty } from '../../contexts/LoyaltyContext';
import {
  Award, Search, Edit3, Save, Plus, Trash2, Users, Settings2,
  Star, Gift, Check, X, Sparkles, ShieldAlert, Calendar, ShoppingBag, Info, Ticket, List
} from 'lucide-react';
import {
  DEFAULT_LOYALTY_TIERS,
  createEmptyRedeemProgram,
  getProgramTypeLabel,
  formatProgramValue,
  formatProgramPeriod,
  isProgramInPeriod,
  type LoyaltyTier,
  type LoyaltyRedeemProgram,
  type RedeemProgramType,
} from '../../types/loyalty';
import { IssueVoucherModal, VoucherListModal } from './LoyaltyVoucherModals';

type AdminTab = 'config' | 'members';

export function LoyaltyManagement() {
  const { customers, config, loading, manualAdjust, saveLoyaltySettings, getCustomerTier } = useLoyalty();
  const [tab, setTab] = useState<AdminTab>('config');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [earnRate, setEarnRate] = useState(config.earnRate);
  const [tiers, setTiers] = useState<LoyaltyTier[]>(config.tiers);
  const [programs, setPrograms] = useState<LoyaltyRedeemProgram[]>(config.redeemPrograms);

  const [searchTerm, setSearchTerm] = useState('');
  const [adjustingCust, setAdjustingCust] = useState<any>(null);
  const [adjustPoints, setAdjustPoints] = useState(0);
  const [editingProgram, setEditingProgram] = useState<LoyaltyRedeemProgram | null>(null);
  const [issuingForProgram, setIssuingForProgram] = useState<LoyaltyRedeemProgram | null>(null);
  const [listingForProgram, setListingForProgram] = useState<LoyaltyRedeemProgram | null>(null);

  useEffect(() => {
    setEarnRate(config.earnRate);
    setTiers(config.tiers);
    setPrograms(config.redeemPrograms);
  }, [config]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await saveLoyaltySettings({ earnRate, tiers, redeemPrograms: programs });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
      alert('Lưu cấu hình thất bại');
    } finally {
      setSaving(false);
    }
  };

  const updateTier = (id: string, field: keyof LoyaltyTier, value: string | number | null) => {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const toggleProgram = (id: string) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const saveProgram = (prog: LoyaltyRedeemProgram) => {
    setPrograms(prev => {
      const exists = prev.some(p => p.id === prog.id);
      return exists ? prev.map(p => p.id === prog.id ? prog : p) : [...prev, prog];
    });
    setEditingProgram(null);
  };

  const deleteProgram = (id: string) => {
    if (!confirm('Xóa chương trình đổi điểm này?')) return;
    setPrograms(prev => prev.filter(p => p.id !== id));
  };

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingCust) return;
    try {
      await manualAdjust(adjustingCust.id, adjustPoints);
      setAdjustingCust(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Award className="w-7 h-7 text-emerald-600" />
            Quản Lý Tích Điểm
          </h2>
          <p className="text-sm text-gray-500 mt-1">Cấu hình hạng thành viên, chương trình đổi điểm và danh sách khách hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setTab('config')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'config' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}
            >
              <Settings2 className="w-4 h-4" /> Cấu hình
            </button>
            <button
              onClick={() => setTab('members')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'members' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}
            >
              <Users className="w-4 h-4" /> Thành viên ({customers.length})
            </button>
          </div>
          {tab === 'config' && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Đang lưu...' : saved ? 'Đã lưu!' : 'Lưu cấu hình'}
            </button>
          )}
        </div>
      </div>

      {tab === 'config' ? (
        <div className="space-y-6">
          {/* Earn Rate */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">💵</div>
              <div>
                <h3 className="font-bold text-gray-800">Quy đổi điểm thưởng</h3>
                <p className="text-xs text-gray-500">Mức chi tiêu để khách nhận điểm</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-6 border border-emerald-100">
                <div className="text-center">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Mức giá quy đổi</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={earnRate}
                      onChange={e => setEarnRate(Number(e.target.value))}
                      className="w-36 text-center text-2xl font-black text-emerald-800 border-2 border-emerald-200 rounded-xl py-3 focus:outline-none focus:border-emerald-500 bg-white"
                    />
                    <span className="text-sm font-bold text-gray-500">VNĐ</span>
                  </div>
                </div>
                <div className="text-3xl font-black text-gray-300">=</div>
                <div className="text-center">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Điểm quy đổi</label>
                  <div className="flex items-center gap-2">
                    <div className="w-20 text-center text-2xl font-black text-blue-800 bg-white border-2 border-blue-200 rounded-xl py-3">1</div>
                    <span className="text-sm font-bold text-gray-500">điểm</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">
                Khách chi <strong className="text-emerald-700">{earnRate.toLocaleString('vi-VN')}đ</strong> → nhận <strong className="text-blue-700">1 điểm</strong>
              </p>
            </div>
          </section>

          {/* Membership Tiers */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Cấu hình hạng thành viên</h3>
                  <p className="text-xs text-gray-500">Thiết lập ngưỡng điểm cho từng hạng</p>
                </div>
              </div>
              <button
                onClick={() => setTiers(DEFAULT_LOYALTY_TIERS)}
                className="text-xs text-gray-500 hover:text-emerald-600 font-semibold"
              >
                Đặt lại mặc định
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tiers.map(tier => (
                <div key={tier.id} className={`rounded-2xl bg-gradient-to-br ${tier.gradient} p-4 text-white shadow-lg relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl">{tier.emoji}</div>
                    </div>
                    <input
                      value={tier.name}
                      onChange={e => updateTier(tier.id, 'name', e.target.value)}
                      className="w-full bg-white/20 backdrop-blur text-white font-bold text-lg rounded-lg px-2 py-1 mb-1 placeholder-white/60 border border-white/20 focus:outline-none focus:bg-white/30"
                    />
                    <input
                      value={tier.subtitle}
                      onChange={e => updateTier(tier.id, 'subtitle', e.target.value)}
                      className="w-full bg-transparent text-white/80 text-xs rounded px-2 py-0.5 mb-3 border-0 focus:outline-none focus:bg-white/10"
                    />
                    {tier.autoAbovePrevious ? (
                      <div className="bg-white/20 rounded-xl px-3 py-2 text-xs font-medium backdrop-blur">
                        Tự động áp dụng khi vượt điểm hạng trước
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2 backdrop-blur">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase opacity-75 block">Từ</label>
                          <input
                            type="number"
                            min={0}
                            value={tier.minPoints}
                            onChange={e => updateTier(tier.id, 'minPoints', Number(e.target.value))}
                            className="w-full bg-white/30 rounded px-2 py-1 text-sm font-bold text-white border-0 focus:outline-none focus:ring-1 focus:ring-white/50"
                          />
                        </div>
                        <span className="text-white/60 pt-4">—</span>
                        <div className="flex-1">
                          <label className="text-[10px] uppercase opacity-75 block">Đến</label>
                          <input
                            type="number"
                            min={0}
                            value={tier.maxPoints ?? ''}
                            onChange={e => updateTier(tier.id, 'maxPoints', e.target.value ? Number(e.target.value) : null)}
                            placeholder="∞"
                            className="w-full bg-white/30 rounded px-2 py-1 text-sm font-bold text-white border-0 focus:outline-none focus:ring-1 focus:ring-white/50"
                          />
                        </div>
                        <span className="text-[10px] opacity-75 pt-4 whitespace-nowrap">điểm</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Redeem Programs */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Chương trình đổi điểm thành viên</h3>
                  <p className="text-xs text-gray-500">Quản lý quà tặng / voucher đổi bằng điểm</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProgram(createEmptyRedeemProgram())}
                className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Thêm chương trình
              </button>
            </div>
            <div className="px-6 pb-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-900">
                <Info className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Gợi ý cấu hình chương trình</p>
                  <ul className="text-xs text-blue-800/90 space-y-0.5 list-disc list-inside">
                    <li>Đặt <strong>đơn tối thiểu</strong> cao hơn giá trị voucher để tránh lỗ (VD: voucher 30k → đơn từ 50k)</li>
                    <li>Dùng <strong>thời gian áp dụng</strong> cho khuyến mãi theo mùa (Tết, Black Friday…)</li>
                    <li>Với giảm %, nên đặt <strong>trần giảm tối đa</strong> để kiểm soát chi phí</li>
                    <li>Chương trình hết hạn hoặc chưa đến ngày sẽ tự ẩn ở POS</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {programs.map(prog => {
                const inPeriod = isProgramInPeriod(prog);
                return (
                <div
                  key={prog.id}
                  className={`relative rounded-2xl border-2 p-4 transition-all ${
                    prog.enabled && inPeriod ? 'border-blue-200 bg-white shadow-sm' : 'border-gray-100 bg-gray-50 opacity-70'
                  }`}
                >
                  {!inPeriod && (
                    <span className="absolute top-3 right-14 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      Hết hạn
                    </span>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      prog.type === 'shipping'
                        ? 'bg-sky-100 text-sky-700'
                        : prog.type === 'item_percent'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {getProgramTypeLabel(prog.type)}
                    </span>
                    <button
                      onClick={() => toggleProgram(prog.id)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${prog.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prog.enabled ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-md">
                      FB
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{prog.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prog.description}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-gray-500">Điểm:</span>
                          <strong className="text-gray-800">{prog.pointsCost.toLocaleString()}</strong>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Gift className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-gray-500">Giá trị:</span>
                          <strong className="text-emerald-700">{formatProgramValue(prog)}</strong>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {prog.minOrderAmount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                            <ShoppingBag className="w-3 h-3" />
                            Đơn từ {prog.minOrderAmount.toLocaleString('vi-VN')}đ
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          <Calendar className="w-3 h-3" />
                          {formatProgramPeriod(prog)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setIssuingForProgram(prog)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-violet-600 hover:bg-violet-50 py-2 rounded-lg transition-colors"
                    >
                      <Ticket className="w-3.5 h-3.5" /> Cấp mã
                    </button>
                    <button
                      onClick={() => setListingForProgram(prog)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition-colors"
                    >
                      <List className="w-3.5 h-3.5" /> Danh sách mã
                    </button>
                    <button
                      onClick={() => setEditingProgram({ ...prog })}
                      className="flex items-center justify-center gap-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteProgram(prog.id)}
                      className="flex items-center justify-center gap-1 text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        /* Members Tab */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-bold text-gray-800">Danh Sách Thành Viên ({filteredCustomers.length})</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc SĐT..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang tải...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Không tìm thấy khách hàng.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b">
                    <th className="px-6 py-4">Khách hàng</th>
                    <th className="px-6 py-4">SĐT</th>
                    <th className="px-6 py-4">Hạng</th>
                    <th className="px-6 py-4">Điểm</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredCustomers.map(customer => {
                    const tier = getCustomerTier(customer.points);
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-semibold">{customer.name}</td>
                        <td className="px-6 py-4 font-mono text-gray-600">{customer.phone}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${tier.gradient} text-white`}>
                            {tier.emoji} {tier.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                            {customer.points} điểm
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => { setAdjustingCust(customer); setAdjustPoints(customer.points); }}
                            className="text-emerald-600 hover:underline font-semibold inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-4 h-4" /> Điều chỉnh
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Program Modal */}
      {editingProgram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Chỉnh sửa chương trình</h3>
              <button onClick={() => setEditingProgram(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); saveProgram(editingProgram); }} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Loại chương trình</label>
                <select
                  value={editingProgram.type}
                  onChange={e => setEditingProgram({ ...editingProgram, type: e.target.value as RedeemProgramType })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="shipping">Mã giảm phí ship</option>
                  <option value="item_vnd">Mã giảm giá món (VNĐ)</option>
                  <option value="item_percent">Mã giảm giá món (%)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Tên chương trình</label>
                <input
                  value={editingProgram.title}
                  onChange={e => setEditingProgram({ ...editingProgram, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Mô tả</label>
                <textarea
                  value={editingProgram.description}
                  onChange={e => setEditingProgram({ ...editingProgram, description: e.target.value })}
                  rows={2}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Điểm quy đổi</label>
                  <input
                    type="number"
                    min={1}
                    value={editingProgram.pointsCost}
                    onChange={e => setEditingProgram({ ...editingProgram, pointsCost: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-center"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Giá trị {editingProgram.type === 'item_percent' ? '(%)' : '(VNĐ)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingProgram.value}
                    onChange={e => setEditingProgram({ ...editingProgram, value: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-center"
                    required
                  />
                </div>
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
                <p className="text-xs font-bold text-violet-800 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Điều kiện áp dụng
                </p>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Đơn hàng tối thiểu (VNĐ)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editingProgram.minOrderAmount}
                    onChange={e => setEditingProgram({ ...editingProgram, minOrderAmount: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-400 bg-white"
                    placeholder="0 = không giới hạn"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Khách chỉ đổi được khi tổng đơn đạt mức này trở lên</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Từ ngày</label>
                    <input
                      type="date"
                      value={editingProgram.validFrom ?? ''}
                      onChange={e => setEditingProgram({ ...editingProgram, validFrom: e.target.value || null })}
                      className="w-full mt-1 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-400 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Đến ngày</label>
                    <input
                      type="date"
                      value={editingProgram.validTo ?? ''}
                      onChange={e => setEditingProgram({ ...editingProgram, validTo: e.target.value || null })}
                      className="w-full mt-1 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-400 bg-white text-sm"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">Để trống ngày = không giới hạn thời gian</p>
                {editingProgram.type === 'item_percent' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Trần giảm tối đa (VNĐ)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={editingProgram.maxDiscountAmount ?? ''}
                      onChange={e => setEditingProgram({
                        ...editingProgram,
                        maxDiscountAmount: e.target.value ? Number(e.target.value) : null,
                      })}
                      className="w-full mt-1 px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-400 bg-white"
                      placeholder="Không giới hạn"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingProgram(null)} className="flex-1 bg-gray-100 py-2.5 rounded-xl font-semibold text-sm">
                  Hủy
                </button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-sm">
                  Lưu chương trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      {adjustingCust && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Điều chỉnh điểm</h3>
            <p className="text-sm text-gray-500 mb-4">
              {adjustingCust.name} ({adjustingCust.phone})
            </p>
            <form onSubmit={handleAdjustPoints} className="space-y-4">
              <input
                type="number"
                min={0}
                value={adjustPoints}
                onChange={e => setAdjustPoints(Number(e.target.value))}
                className="w-full px-3 py-3 border rounded-xl text-center text-2xl font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                required
              />
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2 text-xs text-amber-800">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                Thay đổi trực tiếp sẽ ảnh hưởng lịch sử tích lũy tự động.
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setAdjustingCust(null)} className="flex-1 bg-gray-100 py-2.5 rounded-xl font-semibold text-sm">Hủy</button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-sm">Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {issuingForProgram && (
        <IssueVoucherModal program={issuingForProgram} onClose={() => setIssuingForProgram(null)} />
      )}
      {listingForProgram && (
        <VoucherListModal program={listingForProgram} onClose={() => setListingForProgram(null)} />
      )}
    </div>
  );
}
