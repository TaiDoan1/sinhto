import { useMemo, useState } from 'react';
import { useCombos, ComboSubscription } from '../../contexts/ComboContext';
import { useInventory } from '../../contexts/InventoryContext';
import { useBranches } from '../../contexts/BranchContext';
import {
  getComboProgress,
  getComboItemForToday,
  getCombosDueToday,
  formatZaloShipMessage,
  getRecipeIngredientsForComboItem,
  wasDeliveredToday,
} from '../../utils/comboUtils';
import {
  Search, Phone, MapPin, Package, Copy, CheckCircle2, Pause, Play,
  Truck, User, Calendar, ChevronRight, MessageCircle, AlertCircle,
} from 'lucide-react';
import { ComboDetailDrawer } from './ComboDetailDrawer';

export type CustomerComboHubVariant = 'pos' | 'admin' | 'cskh';

interface CustomerComboHubProps {
  variant: CustomerComboHubVariant;
  branchId?: string;
  staffId?: string;
  staffName?: string;
  /** Người chốt combo (admin hoặc NV CSKH) */
  claimAs?: { id: string; name: string } | null;
  title?: string;
  className?: string;
  defaultStatusFilter?: 'all' | 'due' | 'pending' | 'active' | 'paused' | 'completed';
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ chốt',
  active: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  paused: 'bg-orange-100 text-orange-800 border-orange-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
};

function ComboCustomerCard({
  combo,
  variant,
  onClaim,
  onActivate,
  onPause,
  onResume,
  onComplete,
  onDeliver,
  onPostpone,
  onReschedule,
  onOpenDetail,
  claiming,
  delivering,
  postponing,
  rescheduling,
}: {
  combo: ComboSubscription;
  variant: CustomerComboHubVariant;
  onClaim?: () => void;
  onActivate?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
  onDeliver?: (note: string) => void;
  onPostpone?: (note: string) => void;
  onReschedule?: (date: string, time: string, note?: string) => void;
  onOpenDetail: () => void;
  claiming?: boolean;
  delivering?: boolean;
  postponing?: boolean;
  rescheduling?: boolean;
}) {
  const [shipNote, setShipNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState(combo.deliveryTime || '08:00');

  const progress = getComboProgress(combo);
  const todayItem = getComboItemForToday(combo);
  const dueToday = !wasDeliveredToday(combo) && combo.status === 'active';
  const ingredients = getRecipeIngredientsForComboItem(todayItem);

  const copyZalo = async () => {
    await navigator.clipboard.writeText(formatZaloShipMessage(combo, shipNote));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${dueToday ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-gray-200'}`}>
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${Math.min(100, (progress.delivered / progress.total) * 100)}%` }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-gray-900">{combo.customerName}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[combo.status]}`}>
                {STATUS_LABEL[combo.status]}
              </span>
              {dueToday && (
                <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">Giao hôm nay</span>
              )}
            </div>
            <a href={`tel:${combo.customerPhone}`} className="text-sm text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
              <Phone className="w-3.5 h-3.5" />{combo.customerPhone}
            </a>
            <p className="text-xs text-gray-500 mt-0.5">{combo.planName || 'Combo FitBlend'} · {combo.id}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-black text-emerald-700">{progress.label}</div>
            <div className="text-[10px] text-gray-400">tiến độ</div>
          </div>
        </div>

        {/* Hôm nay */}
        {combo.status === 'active' && todayItem && (
          <div className="mt-3 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-bold text-emerald-700 uppercase">Hôm nay</div>
              {combo.deliveryTime && (
                <div className="text-[10px] font-bold text-emerald-700">Giờ giao: {combo.deliveryTime}</div>
              )}
            </div>
            <div className="font-bold text-sm text-gray-900">
              {todayItem.productName} · {todayItem.size} · {todayItem.protein}g protein
            </div>
            {todayItem.toppings && todayItem.toppings.length > 0 && (
              <div className="text-xs text-gray-600 mt-1">+ {todayItem.toppings.join(' · ')}</div>
            )}
          </div>
        )}

        {combo.deliveryAddress && (
          <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{combo.deliveryAddress}</span>
          </div>
        )}

        {combo.careStaffName && (
          <p className="text-xs text-gray-400 mt-1">CS: {combo.careStaffName}</p>
        )}
        {variant === 'admin' && combo.commissionAmount != null && combo.commissionAmount > 0 && (
          <p className="text-xs text-amber-700 mt-1">
            HH: {combo.commissionAmount.toLocaleString('vi-VN')}đ · {combo.commissionStatus || 'pending'}
          </p>
        )}

        {/* Actions row */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyZalo}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Đã copy!' : 'Copy Zalo'}
          </button>

          {combo.status === 'pending' && variant === 'cskh' && onClaim && (
            <button type="button" onClick={onClaim} disabled={claiming}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold disabled:opacity-60">
              {claiming ? '...' : 'Chốt combo'}
            </button>
          )}
          {combo.status === 'pending' && variant === 'admin' && onClaim && (
            <button type="button" onClick={onClaim} disabled={claiming}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold disabled:opacity-60">
              {claiming ? '...' : 'Chốt combo'}
            </button>
          )}
          {combo.status === 'pending' && variant === 'pos' && onActivate && (
            <button type="button" onClick={onActivate}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">
              Kích hoạt tại quầy
            </button>
          )}
          {combo.status === 'active' && onPause && (
            <button type="button" onClick={onPause}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold">
              <Pause className="w-3.5 h-3.5" /> Tạm dừng
            </button>
          )}
          {combo.status === 'paused' && onResume && (
            <button type="button" onClick={onResume}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <Play className="w-3.5 h-3.5" /> Kích hoạt lại
            </button>
          )}
          {combo.status !== 'completed' && onComplete && (
            <button type="button" onClick={onComplete}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">
              Hoàn thành
            </button>
          )}
          <button type="button" onClick={onOpenDetail}
            className="ml-auto flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 font-semibold">
            Chi tiết
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Deliver section */}
        {combo.status === 'active' && dueToday && onDeliver && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <input
              type="text"
              placeholder="Ghi chú giao (ít ngọt, giao ngay...)"
              value={shipNote}
              onChange={(e) => setShipNote(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2"
            />
            {ingredients.length > 0 && (
              <p className="text-[11px] text-gray-400">
                Kho: {ingredients.map((i) => `${i.itemName} ${i.quantity.toFixed(2)}${i.unit}`).join(' · ')}
              </p>
            )}
            <button
              type="button"
              onClick={() => onDeliver(shipNote)}
              disabled={delivering}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold disabled:opacity-60"
            >
              <Truck className="w-4 h-4" />
              {delivering ? 'Đang xử lý...' : 'Xác nhận giao & Trừ kho'}
            </button>
            {onPostpone && (
              <button
                type="button"
                onClick={() => onPostpone(shipNote)}
                disabled={postponing}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-orange-200 text-orange-700 text-sm font-bold disabled:opacity-60"
              >
                <Calendar className="w-4 h-4" />
                {postponing ? 'Đang hoãn...' : 'Hoãn giao (không trừ ly)'}
              </button>
            )}
          </div>
        )}

        {/* Đổi ngày/giờ giao theo yêu cầu khách — CSKH và chi nhánh (POS) đều đổi được */}
        {combo.status === 'active' && onReschedule && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {!showReschedule ? (
              <button
                type="button"
                onClick={() => setShowReschedule(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold"
              >
                <Calendar className="w-4 h-4" />
                Đổi ngày/giờ giao gần nhất
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full text-sm border rounded-lg px-3 py-2"
                  />
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full text-sm border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReschedule(false)}
                    className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onReschedule(rescheduleDate, rescheduleTime);
                      setShowReschedule(false);
                    }}
                    disabled={rescheduling}
                    className="flex-1 py-2 rounded-xl bg-gray-800 text-white text-sm font-bold disabled:opacity-60"
                  >
                    {rescheduling ? 'Đang lưu...' : 'Xác nhận đổi lịch'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export function CustomerComboHub({
  variant,
  branchId,
  staffId,
  staffName,
  claimAs,
  title,
  className = '',
  defaultStatusFilter,
}: CustomerComboHubProps) {
  const { combos, claimCombo, updateCombo, updateComboStatus, confirmDelivery, postponeDelivery, rescheduleDelivery, changeComboBranch, isLoading } = useCombos();
  const { deductStockForOrder, checkCartStock, formatShortageMessage } = useInventory();
  const { activeBranches } = useBranches();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'pending' | 'active' | 'paused' | 'completed'>(
    defaultStatusFilter || (variant === 'cskh' ? 'active' : 'due')
  );
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [postponingId, setPostponingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [changingBranchId, setChangingBranchId] = useState<string | null>(null);
  const [detailComboId, setDetailComboId] = useState<string | null>(null);

  const baseCombos = useMemo(() => {
    let list = [...combos];
    if (branchId) list = list.filter((c) => c.branchId === branchId);
    if (variant === 'cskh' && staffId) {
      list = list.filter(
        (c) => c.careStaffId === staffId || c.status === 'pending'
      );
    }
    return list;
  }, [combos, branchId, variant, staffId]);

  const dueToday = useMemo(
    () => getCombosDueToday(baseCombos.filter((c) => c.status === 'active'), branchId) as ComboSubscription[],
    [baseCombos, branchId]
  );

  const filtered = useMemo(() => {
    let list = baseCombos;
    if (statusFilter === 'due') list = dueToday;
    else if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.customerPhone.includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.planName || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const aDue = dueToday.some((d) => d.id === a.id) ? 0 : 1;
      const bDue = dueToday.some((d) => d.id === b.id) ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return 0;
    });
  }, [baseCombos, statusFilter, search, dueToday]);

  const pendingCount = baseCombos.filter((c) => c.status === 'pending').length;
  const activeCount = baseCombos.filter((c) => c.status === 'active').length;

  const handleClaim = async (comboId: string) => {
    const actor = claimAs || (staffId && staffName ? { id: staffId, name: staffName } : null);
    if (!actor) {
      alert('Cần đăng nhập để chốt combo.');
      return;
    }
    setClaimingId(comboId);
    try {
      await claimCombo(comboId, actor.id, actor.name);
    } finally {
      setClaimingId(null);
    }
  };

  const handleDeliver = async (combo: ComboSubscription, note: string) => {
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
      const ok = deductStockForOrder(combo.id, [line], variant === 'pos' ? 'POS' : variant === 'cskh' ? 'CSKH' : 'Admin');
      if (!ok) {
        alert('Trừ kho thất bại.');
        return;
      }
      await confirmDelivery(
        combo.id,
        staffName || claimAs?.name || (variant === 'pos' ? 'POS' : variant === 'cskh' ? 'CSKH' : 'Admin'),
        branchId || combo.branchId,
        note
      );
    } finally {
      setDeliveringId(null);
    }
  };

  const handlePostpone = async (combo: ComboSubscription, note: string) => {
    setPostponingId(combo.id);
    try {
      await postponeDelivery(combo.id, note);
    } finally {
      setPostponingId(null);
    }
  };

  const handleReschedule = async (combo: ComboSubscription, date: string, time: string) => {
    setReschedulingId(combo.id);
    try {
      await rescheduleDelivery(combo.id, date, time);
    } finally {
      setReschedulingId(null);
    }
  };

  const handleChangeBranch = async (combo: ComboSubscription, branchId: string) => {
    setChangingBranchId(combo.id);
    try {
      await changeComboBranch(combo.id, branchId);
    } finally {
      setChangingBranchId(null);
    }
  };

  const hubTitle = title || (
    variant === 'pos' ? 'Combo Khách Hàng' :
    variant === 'cskh' ? 'Khách Combo Của Tôi' :
    'Quản Lý Combo Khách Hàng'
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="mb-4">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" />
          {hubTitle}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {activeCount} đang chạy · {dueToday.length} giao hôm nay
          {pendingCount > 0 && ` · ${pendingCount} chờ chốt`}
        </p>
      </div>

      {pendingCount > 0 && (variant === 'admin' || variant === 'cskh') && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-sm text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>{pendingCount} combo chờ chốt</strong> — khách đặt từ web/POS, cần kích hoạt trước khi giao.</span>
        </div>
      )}

      {variant !== 'cskh' && (
        <div className="mb-3 bg-blue-50 border border-blue-100 rounded-xl p-2.5 flex gap-2 text-xs text-blue-900">
          <MessageCircle className="w-4 h-4 shrink-0" />
          Copy Zalo → dán nhóm SHIP COMBO. Đã giao → tự cập nhật tiến độ (6/7 ly).
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Tìm tên, SĐT, mã gói..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {([
            ['due', `Giao hôm nay (${dueToday.length})`],
            ['pending', 'Chờ chốt'],
            ['active', 'Đang chạy'],
            ['paused', 'Tạm dừng'],
            ['completed', 'Xong'],
            ['all', 'Tất cả'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap ${
                statusFilter === id
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Đang tải combo...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border">
          <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-semibold">Không có combo phù hợp</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto flex-1 min-h-0 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {filtered.map((combo) => (
            <ComboCustomerCard
              key={combo.id}
              combo={combo}
              variant={variant}
              claiming={claimingId === combo.id}
              delivering={deliveringId === combo.id}
              postponing={postponingId === combo.id}
              onClaim={combo.status === 'pending' ? () => handleClaim(combo.id) : undefined}
              onActivate={combo.status === 'pending' ? () => updateComboStatus(combo.id, 'active') : undefined}
              onPause={combo.status === 'active' ? () => updateComboStatus(combo.id, 'paused') : undefined}
              onResume={combo.status === 'paused' ? () => updateComboStatus(combo.id, 'active') : undefined}
              onComplete={combo.status !== 'completed' ? () => updateComboStatus(combo.id, 'completed') : undefined}
              onDeliver={
                combo.status === 'active' && dueToday.some((d) => d.id === combo.id)
                  ? (note) => handleDeliver(combo, note)
                  : undefined
              }
              onPostpone={
                combo.status === 'active' && dueToday.some((d) => d.id === combo.id)
                  ? (note) => handlePostpone(combo, note)
                  : undefined
              }
              onReschedule={
                combo.status === 'active'
                  ? (date, time) => handleReschedule(combo, date, time)
                  : undefined
              }
              rescheduling={reschedulingId === combo.id}
              onOpenDetail={() => setDetailComboId(combo.id)}
            />
          ))}
        </div>
      )}

      {detailComboId && (() => {
        const detailCombo = combos.find((c) => c.id === detailComboId);
        if (!detailCombo) return null;
        return (
          <ComboDetailDrawer
            combo={detailCombo}
            variant={variant}
            onClose={() => setDetailComboId(null)}
            onSaveEdit={
              variant !== 'pos'
                ? (address, notes) => updateCombo(detailCombo.id, { deliveryAddress: address, notes })
                : undefined
            }
            onChangeBranch={
              variant === 'admin'
                ? (branchId) => handleChangeBranch(detailCombo, branchId)
                : undefined
            }
            changingBranch={changingBranchId === detailCombo.id}
            branchOptions={activeBranches.map((b) => ({ id: b.id, name: b.name }))}
          />
        );
      })()}
    </div>
  );
}
