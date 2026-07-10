import { useMemo, useState } from 'react';
import * as api from '../../utils/api';
import { useCombos, ComboSubscription } from '../../contexts/ComboContext';
import { useInventory } from '../../contexts/InventoryContext';
import { useBranches } from '../../contexts/BranchContext';
import {
  getComboProgress,
  getComboItemForToday,
  getCombosDueToday,
  wasDeliveredToday,
  getRenewalBadge,
} from '../../utils/comboUtils';
import { Search, Phone, Package, User, ChevronRight, MessageCircle, AlertCircle } from 'lucide-react';
import { ComboDetailDrawer } from './ComboDetailDrawer';
import { ComboCardDetails, type ComboActionProps } from './ComboCardDetails';

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

/**
 * Card đầy đủ (CSKH/Admin) hoặc dòng gọn (POS) — POS chỉ hiện thông tin cốt lõi
 * + 1 nút thao tác nhanh theo ngữ cảnh, bấm vào dòng mở ComboDetailDrawer với
 * toàn bộ chi tiết + thao tác còn lại (dùng chung ComboCardDetails).
 */
function ComboCustomerCard(props: ComboActionProps & { onOpenDetail: () => void }) {
  const { combo, variant, onActivate, onDeliver, onOpenDetail, delivering } = props;
  const progress = getComboProgress(combo);
  const dueToday = !wasDeliveredToday(combo) && combo.status === 'active';
  const renewalBadge = getRenewalBadge(combo);
  const renewalBadgeClass =
    renewalBadge?.tone === 'upgrade' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    renewalBadge?.tone === 'downgrade' ? 'bg-orange-50 text-orange-700 border-orange-200' :
    'bg-sky-50 text-sky-700 border-sky-200';

  if (variant === 'pos') {
    const quickAction = dueToday && onDeliver
      ? { label: delivering ? 'Đang giao...' : 'Giao', onClick: () => onDeliver(''), disabled: !!delivering, className: 'bg-emerald-700 text-white' }
      : combo.status === 'pending' && onActivate
      ? { label: 'Kích hoạt', onClick: onActivate, disabled: false, className: 'bg-emerald-600 text-white' }
      : null;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onOpenDetail}
        onKeyDown={(e) => { if (e.key === 'Enter') onOpenDetail(); }}
        className={`self-start w-full flex items-center gap-2 rounded-xl px-3 py-2.5 border bg-white shadow-sm cursor-pointer transition-all text-left ${
          dueToday ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-gray-200 hover:border-emerald-300'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-gray-900 text-sm truncate">{combo.customerName}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[combo.status]}`}>
              {STATUS_LABEL[combo.status]}
            </span>
            {dueToday && (
              <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shrink-0">Hôm nay</span>
            )}
            {renewalBadge && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${renewalBadgeClass}`}>
                {renewalBadge.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{combo.planName || 'Combo FitBlend'} · {combo.customerPhone}</p>
        </div>
        <div className="text-sm font-black text-emerald-700 shrink-0">{progress.label}</div>
        {quickAction && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); quickAction.onClick(); }}
            disabled={quickAction.disabled}
            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-60 ${quickAction.className}`}
          >
            {quickAction.label}
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </div>
    );
  }

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
              {renewalBadge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${renewalBadgeClass}`}>
                  {renewalBadge.label}
                </span>
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

        <ComboCardDetails {...props} />
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
  const [refundingId, setRefundingId] = useState<string | null>(null);

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

  const handleRefund = async (combo: ComboSubscription, amount: number) => {
    setRefundingId(combo.id);
    try {
      await updateCombo(combo.id, {
        status: 'completed',
        refundAmount: amount,
        refundedAt: new Date().toISOString(),
      });
      const actor = claimAs || (staffId && staffName ? { id: staffId, name: staffName } : null);
      if (actor) {
        await api.createSalesActivity({
          customerPhone: combo.customerPhone,
          careStaffId: actor.id,
          careStaffName: actor.name,
          activityType: 'note',
          content: `Hoàn combo ${combo.planName || ''} — ${amount.toLocaleString('vi-VN')}đ, ngừng combo`,
        }).catch(() => {});
      }
    } finally {
      setRefundingId(null);
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
        <div
          className={`overflow-y-auto flex-1 min-h-0 pb-4 ${
            variant === 'pos' ? 'flex flex-col gap-2' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'
          }`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
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
              onRefund={
                (combo.status === 'active' || combo.status === 'paused') && (variant === 'cskh' || variant === 'admin')
                  ? (amount) => handleRefund(combo, amount)
                  : undefined
              }
              refunding={refundingId === combo.id}
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
            key={detailCombo.id}
            combo={detailCombo}
            variant={variant}
            actor={claimAs || (staffId && staffName ? { id: staffId, name: staffName } : undefined)}
            onClose={() => setDetailComboId(null)}
            onSaveEdit={
              variant !== 'pos'
                ? (address, notes, deliveryDays, shipFee, endDate) => updateCombo(detailCombo.id, { deliveryAddress: address, notes, deliveryDays, shipFee, endDate: endDate || undefined })
                : undefined
            }
            onChangeBranch={
              variant === 'admin'
                ? (branchId) => handleChangeBranch(detailCombo, branchId)
                : undefined
            }
            changingBranch={changingBranchId === detailCombo.id}
            branchOptions={activeBranches.map((b) => ({ id: b.id, name: b.name }))}
            claiming={claimingId === detailCombo.id}
            delivering={deliveringId === detailCombo.id}
            postponing={postponingId === detailCombo.id}
            rescheduling={reschedulingId === detailCombo.id}
            onClaim={detailCombo.status === 'pending' ? () => handleClaim(detailCombo.id) : undefined}
            onActivate={detailCombo.status === 'pending' ? () => updateComboStatus(detailCombo.id, 'active') : undefined}
            onPause={detailCombo.status === 'active' ? () => updateComboStatus(detailCombo.id, 'paused') : undefined}
            onResume={detailCombo.status === 'paused' ? () => updateComboStatus(detailCombo.id, 'active') : undefined}
            onComplete={detailCombo.status !== 'completed' ? () => updateComboStatus(detailCombo.id, 'completed') : undefined}
            onDeliver={
              detailCombo.status === 'active' && dueToday.some((d) => d.id === detailCombo.id)
                ? (note) => handleDeliver(detailCombo, note)
                : undefined
            }
            onPostpone={
              detailCombo.status === 'active' && dueToday.some((d) => d.id === detailCombo.id)
                ? (note) => handlePostpone(detailCombo, note)
                : undefined
            }
            onReschedule={
              detailCombo.status === 'active'
                ? (date, time) => handleReschedule(detailCombo, date, time)
                : undefined
            }
            onRefund={
              (detailCombo.status === 'active' || detailCombo.status === 'paused') && (variant === 'cskh' || variant === 'admin')
                ? (amount) => handleRefund(detailCombo, amount)
                : undefined
            }
            refunding={refundingId === detailCombo.id}
          />
        );
      })()}
    </div>
  );
}
