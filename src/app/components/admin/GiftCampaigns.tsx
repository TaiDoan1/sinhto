import { useState, useEffect } from 'react';
import { Gift, Plus, Save, Loader2, CheckCircle, Trash2, Pencil, Eye, EyeOff, X, Users, Percent, Coins } from 'lucide-react';
import * as api from '../../utils/api';
import type { GiftCampaign, GiftRedemption, GiftRewardType, GiftApplyMode } from '../../utils/api';
import { useBranches } from '../../contexts/BranchContext';
import { usePagination, Pager } from '../common/Pagination';

const SIZE_OPTIONS = ['250ml', '360ml', '500ml', '700ml'];
const PROTEIN_OPTIONS = [20, 40];

interface EditingCampaign {
  id: string;
  name: string;
  branchIds: string[]; // ['ALL'] = tất cả, hoặc danh sách id chi nhánh
  rewardType: GiftRewardType;
  giftSize: string;
  giftProtein: number;
  discountPercent: number;
  discountAmount: number;
  applyMode: GiftApplyMode;
  totalLimit: number;
}

function emptyCampaign(): EditingCampaign {
  return {
    id: '',
    name: '',
    branchIds: [],
    rewardType: 'gift',
    giftSize: '360ml',
    giftProtein: 20,
    discountPercent: 10,
    discountAmount: 10000,
    applyMode: 'phone',
    totalLimit: 1000,
  };
}

const REWARD_META: Record<GiftRewardType, { label: string; icon: typeof Gift }> = {
  gift: { label: 'Tặng ly', icon: Gift },
  percent: { label: 'Giảm %', icon: Percent },
  amount: { label: 'Giảm tiền', icon: Coins },
};

/**
 * Chương trình khuyến mãi — tặng ly HOẶC giảm %/giảm số tiền, áp cho nhiều chi nhánh (hoặc tất cả).
 * Chế độ áp dụng: "theo SĐT" (mỗi khách 1 lần, giới hạn số lượt) hoặc "áp mọi đơn" (khuyến mãi chung).
 */
export function GiftCampaigns() {
  const { activeBranches, branchLabel } = useBranches();
  const [campaigns, setCampaigns] = useState<GiftCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<EditingCampaign | null>(null);
  const [viewingRedemptions, setViewingRedemptions] = useState<GiftCampaign | null>(null);
  const [redemptions, setRedemptions] = useState<GiftRedemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const { pageItems: pagedRedemptions, ...redemptionPager } = usePagination(redemptions, 20, viewingRedemptions?.id);

  const load = () => {
    api.fetchGiftCampaigns().then(setCampaigns).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const allSelected = (c: { branchIds?: string[] }) => (c.branchIds || []).includes('ALL');
  const branchesText = (c: GiftCampaign) =>
    allSelected(c) ? 'Tất cả chi nhánh' : (c.branchIds.map((b) => branchLabel(b) || b).join(', ') || '—');
  const rewardText = (c: GiftCampaign) =>
    c.rewardType === 'percent' ? `Giảm ${c.discountPercent}%`
      : c.rewardType === 'amount' ? `Giảm ${c.discountAmount.toLocaleString('vi-VN')}đ`
        : `Tặng ly ${c.giftSize} · ${c.giftProtein}g`;

  const handleToggleActive = async (c: GiftCampaign) => {
    const updated = await api.updateGiftCampaign(c.id, { active: !c.active });
    setCampaigns((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
  };

  const handleViewRedemptions = (c: GiftCampaign) => {
    setViewingRedemptions(c);
    setLoadingRedemptions(true);
    api.fetchGiftRedemptions(c.id).then(setRedemptions).catch(() => setRedemptions([])).finally(() => setLoadingRedemptions(false));
  };

  const handleDelete = async (c: GiftCampaign) => {
    if (!confirm(`Xóa chương trình "${c.name}"? Không thể hoàn tác.`)) return;
    await api.deleteGiftCampaign(c.id);
    setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
  };

  const startEdit = (c: GiftCampaign) => setEditing({
    id: c.id, name: c.name, branchIds: c.branchIds || [], rewardType: c.rewardType || 'gift',
    giftSize: c.giftSize, giftProtein: c.giftProtein,
    discountPercent: c.discountPercent || 10, discountAmount: c.discountAmount || 10000,
    applyMode: c.applyMode || 'phone', totalLimit: c.totalLimit,
  });

  const toggleBranch = (id: string) => {
    if (!editing) return;
    if (editing.branchIds.includes('ALL')) return; // đang chọn Tất cả → bỏ qua từng cái
    const has = editing.branchIds.includes(id);
    setEditing({ ...editing, branchIds: has ? editing.branchIds.filter((b) => b !== id) : [...editing.branchIds, id] });
  };
  const toggleAll = () => {
    if (!editing) return;
    setEditing({ ...editing, branchIds: editing.branchIds.includes('ALL') ? [] : ['ALL'] });
  };

  const handleSaveEditing = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return alert('Vui lòng nhập tên chương trình.');
    if (editing.branchIds.length === 0) return alert('Vui lòng chọn ít nhất 1 chi nhánh (hoặc Tất cả).');
    if (editing.rewardType === 'percent' && !(editing.discountPercent > 0 && editing.discountPercent <= 100))
      return alert('Nhập % giảm hợp lệ (1–100).');
    if (editing.rewardType === 'amount' && !(editing.discountAmount > 0))
      return alert('Nhập số tiền giảm hợp lệ.');
    if (editing.applyMode === 'phone' && !(editing.totalLimit > 0))
      return alert('Chế độ theo SĐT cần nhập giới hạn số lượt.');

    const payload = {
      name: editing.name,
      branchIds: editing.branchIds,
      rewardType: editing.rewardType,
      giftSize: editing.giftSize,
      giftProtein: editing.giftProtein,
      discountPercent: editing.discountPercent,
      discountAmount: editing.discountAmount,
      applyMode: editing.applyMode,
      totalLimit: editing.applyMode === 'all' ? (editing.totalLimit || 0) : editing.totalLimit,
    };
    setSaving(true);
    try {
      if (editing.id) {
        const updated = await api.updateGiftCampaign(editing.id, payload);
        setCampaigns((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const created = await api.createGiftCampaign(payload);
        setCampaigns((prev) => [created, ...prev]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lưu chương trình thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5 text-pink-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Khuyến Mãi</h2>
            <p className="text-sm text-gray-500">Tặng ly, giảm % hoặc giảm số tiền — cho nhiều chi nhánh, theo SĐT hoặc áp mọi đơn</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Đã lưu</span>}
          <button
            onClick={() => setEditing(emptyCampaign())}
            className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo chương trình
          </button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Chưa có chương trình nào — bấm "Tạo chương trình" để bắt đầu.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {campaigns.map((c) => {
            const remaining = Math.max(0, c.totalLimit - c.redeemedCount);
            const pct = c.totalLimit > 0 ? Math.min(100, (c.redeemedCount / c.totalLimit) * 100) : 0;
            const limited = c.applyMode === 'phone';
            const exhausted = limited && remaining <= 0;
            const RIcon = REWARD_META[c.rewardType]?.icon || Gift;
            return (
              <div key={c.id} className={`border rounded-2xl p-4 ${c.active && !exhausted ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <RIcon className="w-3.5 h-3.5 text-pink-600" /> {rewardText(c)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{branchesText(c)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${limited ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {limited ? 'Theo SĐT' : 'Mọi đơn'}
                    </span>
                    {exhausted && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Hết lượt</span>}
                  </div>
                </div>
                {limited && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Đã dùng: {c.redeemedCount.toLocaleString('vi-VN')}</span>
                      <span>Còn lại: {remaining.toLocaleString('vi-VN')} / {c.totalLimit.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${exhausted ? 'bg-red-400' : 'bg-pink-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => handleViewRedemptions(c)} className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-pink-700">
                    <Users className="w-3.5 h-3.5" /> Đã dùng ({c.redeemedCount.toLocaleString('vi-VN')})
                  </button>
                  <button onClick={() => startEdit(c)} className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-pink-700">
                    <Pencil className="w-3.5 h-3.5" /> Sửa
                  </button>
                  <button onClick={() => handleToggleActive(c)} className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-amber-700">
                    {c.active ? <><EyeOff className="w-3.5 h-3.5" /> Tắt</> : <><Eye className="w-3.5 h-3.5" /> Bật</>}
                  </button>
                  <button onClick={() => handleDelete(c)} className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{editing.id ? 'Sửa chương trình' : 'Tạo chương trình mới'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 font-semibold">Tên chương trình *</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="VD: Khai trương giảm 20% - CN Võ Oanh"
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Kiểu thưởng */}
              <div>
                <label className="text-xs text-gray-500 font-semibold">Kiểu khuyến mãi *</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(Object.keys(REWARD_META) as GiftRewardType[]).map((rt) => {
                    const M = REWARD_META[rt];
                    const on = editing.rewardType === rt;
                    return (
                      <button
                        key={rt}
                        type="button"
                        onClick={() => setEditing({ ...editing, rewardType: rt, applyMode: rt === 'gift' ? 'phone' : editing.applyMode })}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold ${on ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600'}`}
                      >
                        <M.icon className="w-4 h-4" /> {M.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chi nhánh */}
              <div>
                <label className="text-xs text-gray-500 font-semibold">Chi nhánh áp dụng *</label>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={editing.branchIds.includes('ALL')} onChange={toggleAll} />
                  <span className="text-sm font-semibold text-gray-700">Tất cả chi nhánh</span>
                </label>
                {!editing.branchIds.includes('ALL') && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {activeBranches.map((b) => {
                      const on = editing.branchIds.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBranch(b.id)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${on ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-300 text-gray-600'}`}
                        >
                          {b.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Giá trị thưởng theo kiểu */}
              {editing.rewardType === 'gift' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-semibold">Size ly tặng</label>
                    <select value={editing.giftSize} onChange={(e) => setEditing({ ...editing, giftSize: e.target.value })} className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold">Protein</label>
                    <select value={editing.giftProtein} onChange={(e) => setEditing({ ...editing, giftProtein: Number(e.target.value) })} className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {PROTEIN_OPTIONS.map((p) => <option key={p} value={p}>{p}g</option>)}
                    </select>
                  </div>
                </div>
              )}
              {editing.rewardType === 'percent' && (
                <div>
                  <label className="text-xs text-gray-500 font-semibold">% giảm trên tổng đơn *</label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input type="number" min={1} max={100} value={editing.discountPercent} onChange={(e) => setEditing({ ...editing, discountPercent: Number(e.target.value) || 0 })} className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              )}
              {editing.rewardType === 'amount' && (
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Số tiền giảm (VNĐ) *</label>
                  <input type="number" min={1000} step={1000} value={editing.discountAmount} onChange={(e) => setEditing({ ...editing, discountAmount: Number(e.target.value) || 0 })} className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              {/* Chế độ áp dụng (chỉ cho giảm giá; tặng ly luôn theo SĐT) */}
              {editing.rewardType !== 'gift' && (
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Cách áp dụng *</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button type="button" onClick={() => setEditing({ ...editing, applyMode: 'phone' })} className={`py-2 rounded-xl border-2 text-xs font-semibold ${editing.applyMode === 'phone' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-600'}`}>Theo SĐT (giới hạn lượt)</button>
                    <button type="button" onClick={() => setEditing({ ...editing, applyMode: 'all' })} className={`py-2 rounded-xl border-2 text-xs font-semibold ${editing.applyMode === 'all' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>Áp mọi đơn</button>
                  </div>
                </div>
              )}

              {/* Giới hạn số lượt (chế độ theo SĐT) */}
              {editing.applyMode === 'phone' && (
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Giới hạn số lượt *</label>
                  <input type="number" min={1} value={editing.totalLimit} onChange={(e) => setEditing({ ...editing, totalLimit: Number(e.target.value) || 0 })} className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <p className="text-xs text-gray-400 mt-1">Mỗi số điện thoại chỉ dùng 1 lần. Chương trình tự dừng khi đủ số lượt.</p>
                </div>
              )}
              {editing.applyMode === 'all' && (
                <p className="text-xs text-gray-400">Áp cho mọi đơn ở các chi nhánh đã chọn (khi nhân viên bấm áp dụng), không giới hạn theo khách.</p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold">Hủy</button>
              <button
                onClick={handleSaveEditing}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-semibold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu chương trình
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingRedemptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Danh sách đã dùng</h3>
                <p className="text-xs text-gray-500">{viewingRedemptions.name}</p>
              </div>
              <button onClick={() => setViewingRedemptions(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto p-4">
              {loadingRedemptions ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-pink-600" /></div>
              ) : redemptions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Chưa có lượt dùng nào trong chương trình này.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b">
                      <th className="py-2 pr-2">SĐT</th>
                      <th className="py-2 pr-2">Mã</th>
                      <th className="py-2 pr-2">Nội dung</th>
                      <th className="py-2 pr-2">NV</th>
                      <th className="py-2 pr-2">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRedemptions.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-semibold text-gray-800">{r.customerPhone}</td>
                        <td className="py-2 pr-2 font-mono font-bold text-pink-700">{r.code || '-'}</td>
                        <td className="py-2 pr-2 text-gray-600">{r.productName}</td>
                        <td className="py-2 pr-2 text-gray-600">{r.staffName || '-'}</td>
                        <td className="py-2 pr-2 text-gray-400 text-xs">{new Date(r.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Pager {...redemptionPager} onPage={redemptionPager.setPage} unit="lượt" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
