import { useState, useEffect, useMemo } from 'react';
import { useCombos, ComboSubscription } from '../../contexts/ComboContext';
import { useInventory } from '../../contexts/InventoryContext';
import {
  getCombosDueToday,
  getComboItemForToday,
  getComboProgress,
  formatZaloShipMessage,
  getRecipeIngredientsForComboItem,
  wasDeliveredToday,
  parseDeliveryLog,
} from '../../utils/comboUtils';
import {
  Truck, Copy, CheckCircle2, Phone, MapPin, Clock, MessageCircle,
  ChevronRight, Package, AlertCircle,
} from 'lucide-react';
import { useBranches } from '../../contexts/BranchContext';

type Tab = 'today' | 'done' | 'all';

export function ComboShipBoard() {
  const { activeBranches } = useBranches();
  const { combos, confirmDelivery, postponeDelivery, isLoading } = useCombos();
  const { deductStockForOrder, checkCartStock, formatShortageMessage, loadForBranch } = useInventory();

  const [branchId, setBranchId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [shipNotes, setShipNotes] = useState<Record<string, string>>({});
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [postponingId, setPostponingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ship_combo_branch');
    if (saved) setBranchId(saved);
  }, []);

  useEffect(() => {
    if (branchId) loadForBranch(branchId);
  }, [branchId, loadForBranch]);

  const activeCombos = useMemo(
    () => combos.filter((c) => c.status === 'active' && (!branchId || c.branchId === branchId)),
    [combos, branchId]
  );

  const dueToday = useMemo(
    () => getCombosDueToday(activeCombos, branchId || undefined) as ComboSubscription[],
    [activeCombos, branchId]
  );

  const doneToday = useMemo(
    () =>
      activeCombos.filter((c) => wasDeliveredToday(c)) as ComboSubscription[],
    [activeCombos]
  );

  const displayed =
    tab === 'today' ? dueToday : tab === 'done' ? doneToday : activeCombos;

  const handleSelectBranch = (id: string) => {
    setBranchId(id);
    localStorage.setItem('ship_combo_branch', id);
  };

  const copyZaloMessage = async (combo: ComboSubscription) => {
    const msg = formatZaloShipMessage(combo, shipNotes[combo.id]);
    await navigator.clipboard.writeText(msg);
    setCopiedId(combo.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeliver = async (combo: ComboSubscription) => {
    if (!branchId) return;
    const todayItem = getComboItemForToday(combo);
    const line = {
      productId: todayItem?.productId,
      productName: todayItem?.productName || combo.planName,
      size: todayItem?.size || '360ml',
      protein: todayItem?.protein ?? 40,
      toppings: todayItem?.toppings || [],
      quantity: 1,
    };

    const check = checkCartStock([line]);
    if (!check.ok) {
      alert(`Không đủ nguyên liệu:\n${formatShortageMessage(check.shortages)}`);
      return;
    }

    setDeliveringId(combo.id);
    try {
      const ok = deductStockForOrder(combo.id, [line], `Ship ${branchId}`);
      if (!ok) {
        alert('Trừ kho thất bại.');
        return;
      }
      await confirmDelivery(combo.id, `Ship ${branchId}`, branchId, shipNotes[combo.id]);
    } finally {
      setDeliveringId(null);
    }
  };

  const handlePostpone = async (combo: ComboSubscription) => {
    setPostponingId(combo.id);
    try {
      await postponeDelivery(combo.id, shipNotes[combo.id]);
    } finally {
      setPostponingId(null);
    }
  };

  if (!branchId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-emerald-700" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Giao Combo</h1>
            <p className="text-gray-500 text-sm mt-1">Thay nhóm Zalo SHIP COMBO — quản lý tập trung</p>
          </div>
          <div className="space-y-3">
            {activeBranches.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelectBranch(b.id)}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all"
              >
                <span className="font-bold text-gray-800">{b.name}</span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const branchName = activeBranches.find((b) => b.id === branchId)?.name || branchId;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-emerald-800 text-white px-4 py-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Giao Combo — {branchName}
            </h1>
            <p className="text-emerald-200 text-xs mt-0.5">
              {dueToday.length} cần giao · {doneToday.length} đã giao hôm nay
            </p>
          </div>
          <button
            onClick={() => { setBranchId(null); localStorage.removeItem('ship_combo_branch'); }}
            className="text-xs bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded-lg"
          >
            Đổi CN
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 text-sm text-blue-900">
          <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Bấm <strong>Copy Zalo</strong> để dán vào nhóm SHIP COMBO. Bấm <strong>Đã giao</strong> để cập nhật tiến độ (6/7 ly) — không cần gõ tay nữa.
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {([
            ['today', `Cần giao (${dueToday.length})`],
            ['done', `Đã giao (${doneToday.length})`],
            ['all', `Tất cả (${activeCombos.length})`],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${
                tab === id
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="text-center py-8 text-gray-400">Đang tải...</div>
        )}

        {!isLoading && displayed.length === 0 && (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="font-bold">Không có combo nào</p>
          </div>
        )}

        {displayed.map((combo) => {
          const todayItem = getComboItemForToday(combo);
          const progress = getComboProgress(combo);
          const isDone = wasDeliveredToday(combo);
          const ingredients = getRecipeIngredientsForComboItem(todayItem);
          const flavor = todayItem?.productName || combo.planName || '—';
          const size = todayItem?.size || '360ml';
          const protein = todayItem?.protein ?? 40;

          return (
            <div
              key={combo.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                isDone ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'
              }`}
            >
              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, (progress.delivered / progress.total) * 100)}%` }}
                />
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900">{combo.customerName}</span>
                      {isDone && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Đã giao
                        </span>
                      )}
                    </div>
                    <a
                      href={`tel:${combo.customerPhone}`}
                      className="text-sm text-emerald-700 font-semibold flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {combo.customerPhone}
                    </a>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-emerald-700">{progress.label}</div>
                    <div className="text-[10px] text-gray-400">tiến độ gói</div>
                  </div>
                </div>

                {/* Drink spec */}
                <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="font-bold text-gray-900 text-sm">
                    1 ly {size} · {protein}g protein
                  </div>
                  <div className="text-emerald-800 font-semibold text-sm mt-0.5">{flavor}</div>
                  {todayItem?.toppings && todayItem.toppings.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      + {todayItem.toppings.join(' · ')}
                    </div>
                  )}
                  {combo.notes && (
                    <div className="text-xs text-amber-700 mt-1">📝 {combo.notes}</div>
                  )}
                </div>

                {combo.deliveryAddress && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{combo.deliveryAddress}</span>
                  </div>
                )}

                {ingredients.length > 0 && !isDone && (
                  <div className="mt-2 text-[11px] text-gray-400">
                    Kho: {ingredients.map((i) => `${i.itemName} ${i.quantity.toFixed(2)}${i.unit}`).join(' · ')}
                  </div>
                )}

                {/* Ship note */}
                {!isDone && tab === 'today' && (
                  <input
                    type="text"
                    placeholder="Ghi chú giao (vd: ít ngọt, mía 50%, giao ngay...)"
                    value={shipNotes[combo.id] || ''}
                    onChange={(e) => setShipNotes((p) => ({ ...p, [combo.id]: e.target.value }))}
                    className="mt-3 w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => copyZaloMessage(combo)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-800 text-sm font-bold hover:bg-blue-100"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedId === combo.id ? 'Đã copy!' : 'Copy Zalo'}
                  </button>
                  {!isDone && tab === 'today' && (
                    <>
                      <button
                        onClick={() => handleDeliver(combo)}
                        disabled={deliveringId === combo.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {deliveringId === combo.id ? '...' : 'Đã giao'}
                      </button>
                      <button
                        onClick={() => handlePostpone(combo)}
                        disabled={postponingId === combo.id}
                        className="px-3 py-2.5 rounded-xl border border-orange-200 text-orange-700 text-xs font-bold disabled:opacity-60"
                        title="Hoãn giao, không trừ ly"
                      >
                        {postponingId === combo.id ? '...' : 'Hoãn'}
                      </button>
                    </>
                  )}
                </div>

                {parseDeliveryLog(combo.deliveryLog).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Lịch sử giao</div>
                    {parseDeliveryLog(combo.deliveryLog).slice(-3).reverse().map((e, i) => (
                      <div key={i} className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(e.date).toLocaleDateString('vi-VN')} — {e.productName}
                        {e.note ? ` (${e.note})` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {dueToday.length > 0 && tab !== 'today' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Còn <strong>{dueToday.length} combo</strong> cần giao hôm nay. Chuyển sang tab &quot;Cần giao&quot;.</span>
          </div>
        )}
      </div>
    </div>
  );
}
