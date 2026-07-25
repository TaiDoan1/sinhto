import { useState, useEffect } from 'react';
import { Gift, Plus, Save, Loader2, CheckCircle, Trash2, Pencil, Eye, EyeOff, X } from 'lucide-react';
import * as api from '../../utils/api';
import type { GiftCampaign } from '../../utils/api';
import { useBranches } from '../../contexts/BranchContext';

const SIZE_OPTIONS = ['250ml', '360ml', '500ml', '700ml'];
const PROTEIN_OPTIONS = [20, 40];

interface EditingCampaign {
  id: string;
  name: string;
  branchId: string;
  giftSize: string;
  giftProtein: number;
  totalLimit: number;
}

function emptyCampaign(defaultBranch: string): EditingCampaign {
  return {
    id: '',
    name: '',
    branchId: defaultBranch,
    giftSize: '360ml',
    giftProtein: 20,
    totalLimit: 1000,
  };
}

/**
 * Chương trình khuyến mãi tặng quà (VD: mua 1 tặng 1 ly 360ml 20g protein, giới hạn 1000 ly,
 * áp dụng 1 chi nhánh) — khác cơ chế đổi điểm ở Tích Điểm KH: không cần khách có điểm/tài
 * khoản, POS tự gợi ý tặng cho MỌI khách khi còn hạn mức, chỉ dừng khi hết số lượng.
 */
export function GiftCampaigns() {
  const { activeBranches, branchLabel } = useBranches();
  const [campaigns, setCampaigns] = useState<GiftCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<EditingCampaign | null>(null);

  const load = () => {
    api.fetchGiftCampaigns().then(setCampaigns).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleActive = async (c: GiftCampaign) => {
    const updated = await api.updateGiftCampaign(c.id, { active: !c.active });
    setCampaigns((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
  };

  const handleDelete = async (c: GiftCampaign) => {
    if (!confirm(`Xóa chương trình "${c.name}"? Không thể hoàn tác.`)) return;
    await api.deleteGiftCampaign(c.id);
    setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
  };

  const handleSaveEditing = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      alert('Vui lòng nhập tên chương trình.');
      return;
    }
    if (!editing.branchId) {
      alert('Vui lòng chọn chi nhánh áp dụng.');
      return;
    }
    if (!editing.totalLimit || editing.totalLimit <= 0) {
      alert('Vui lòng nhập số lượng giới hạn hợp lệ.');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        const updated = await api.updateGiftCampaign(editing.id, {
          name: editing.name,
          branchId: editing.branchId,
          giftSize: editing.giftSize,
          giftProtein: editing.giftProtein,
          totalLimit: editing.totalLimit,
        });
        setCampaigns((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const created = await api.createGiftCampaign({
          name: editing.name,
          branchId: editing.branchId,
          giftSize: editing.giftSize,
          giftProtein: editing.giftProtein,
          totalLimit: editing.totalLimit,
        });
        setCampaigns((prev) => [created, ...prev]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing(null);
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
            <h2 className="text-xl font-bold text-gray-800">Khuyến Mãi Tặng Quà</h2>
            <p className="text-sm text-gray-500">POS tự gợi ý tặng khi khách để lại SĐT — không cần điểm/tài khoản, chỉ giới hạn theo số lượng</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Đã lưu</span>}
          <button
            onClick={() => setEditing(emptyCampaign(activeBranches[0]?.id || ''))}
            className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo chương trình
          </button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Chưa có chương trình khuyến mãi nào — bấm "Tạo chương trình" để bắt đầu.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {campaigns.map((c) => {
            const remaining = Math.max(0, c.totalLimit - c.redeemedCount);
            const pct = c.totalLimit > 0 ? Math.min(100, (c.redeemedCount / c.totalLimit) * 100) : 0;
            const exhausted = remaining <= 0;
            return (
              <div key={c.id} className={`border rounded-2xl p-4 ${c.active && !exhausted ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500">{branchLabel(c.branchId) || c.branchId} · {c.giftSize} · {c.giftProtein}g protein</p>
                  </div>
                  {exhausted && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">Hết hạn mức</span>
                  )}
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Đã tặng: {c.redeemedCount.toLocaleString('vi-VN')}</span>
                    <span>Còn lại: {remaining.toLocaleString('vi-VN')} / {c.totalLimit.toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${exhausted ? 'bg-red-400' : 'bg-pink-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditing({ id: c.id, name: c.name, branchId: c.branchId, giftSize: c.giftSize, giftProtein: c.giftProtein, totalLimit: c.totalLimit })} className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-pink-700">
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
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
                  placeholder="VD: Mua 1 tặng 1 - Khai trương Võ Oanh"
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Chi nhánh áp dụng *</label>
                <select
                  value={editing.branchId}
                  onChange={(e) => setEditing({ ...editing, branchId: e.target.value })}
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {activeBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Size ly tặng</label>
                  <select
                    value={editing.giftSize}
                    onChange={(e) => setEditing({ ...editing, giftSize: e.target.value })}
                    className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Protein</label>
                  <select
                    value={editing.giftProtein}
                    onChange={(e) => setEditing({ ...editing, giftProtein: Number(e.target.value) })}
                    className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {PROTEIN_OPTIONS.map((p) => <option key={p} value={p}>{p}g</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold">Giới hạn số ly *</label>
                  <input
                    type="number"
                    min={1}
                    value={editing.totalLimit}
                    onChange={(e) => setEditing({ ...editing, totalLimit: Number(e.target.value) || 0 })}
                    className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Khách chọn vị bất kỳ trong menu khi nhận quà — chỉ cố định size và mức protein. Chương trình tự tắt khi tặng đủ số lượng giới hạn.
              </p>
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
    </div>
  );
}
