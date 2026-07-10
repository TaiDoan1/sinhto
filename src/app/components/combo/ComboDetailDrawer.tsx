import { useState, useEffect } from 'react';
import { X, User, MapPin, Calendar, Clock } from 'lucide-react';
import * as api from '../../utils/api';
import { ComboSubscription } from '../../contexts/ComboContext';
import { normalizeComboItems, parseDeliveryLog } from '../../utils/comboUtils';
import type { CustomerComboHubVariant } from './CustomerComboHub';
import { ComboCardDetails } from './ComboCardDetails';

interface DeliveryLogDetail {
  id: string;
  deliveryDate: string;
  deliveryTime: string;
  status: string;
  productName: string;
  branchId: string;
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

interface Props {
  combo: ComboSubscription;
  variant: CustomerComboHubVariant;
  onClose: () => void;
  onSaveEdit?: (address: string, notes: string) => void;
  onChangeBranch?: (branchId: string) => void;
  changingBranch?: boolean;
  branchOptions?: { id: string; name: string }[];
  onClaim?: () => void;
  onActivate?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
  onDeliver?: (note: string) => void;
  onPostpone?: (note: string) => void;
  onReschedule?: (date: string, time: string, note?: string) => void;
  claiming?: boolean;
  delivering?: boolean;
  postponing?: boolean;
  rescheduling?: boolean;
}

export function ComboDetailDrawer({
  combo,
  variant,
  onClose,
  onSaveEdit,
  onChangeBranch,
  changingBranch,
  branchOptions,
  onClaim,
  onActivate,
  onPause,
  onResume,
  onComplete,
  onDeliver,
  onPostpone,
  onReschedule,
  claiming,
  delivering,
  postponing,
  rescheduling,
}: Props) {
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLogDetail[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [editAddress, setEditAddress] = useState(combo.deliveryAddress || '');
  const [editNotes, setEditNotes] = useState(combo.notes || '');
  const [saving, setSaving] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(combo.branchId);

  const items = normalizeComboItems(combo.items);

  useEffect(() => {
    let cancelled = false;
    setLogsLoading(true);
    api
      .fetchDeliveryLogs({ comboOrderId: combo.id })
      .then((rows: any[]) => {
        if (cancelled) return;
        setDeliveryLogs(
          rows.map((r) => ({
            id: r.id,
            deliveryDate: r.deliveryDate,
            deliveryTime: r.deliveryTime || '08:00',
            status: r.status,
            productName: r.productName,
            branchId: r.branchId,
          }))
        );
      })
      .catch(() => setDeliveryLogs([]))
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [combo.id]);

  const handleSave = async () => {
    if (!onSaveEdit) return;
    setSaving(true);
    try {
      await onSaveEdit(editAddress, editNotes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Đóng" />
      <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Chi tiết đơn combo</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <h2 className="text-xl font-black text-gray-900 truncate">{combo.customerName}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[combo.status]}`}>
                {STATUS_LABEL[combo.status]}
              </span>
            </div>
            <a href={`tel:${combo.customerPhone}`} className="text-sm text-emerald-700 font-semibold flex items-center gap-1 mt-1">
              {combo.customerPhone}
            </a>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-1.5 text-gray-700">
              <User className="w-3.5 h-3.5 text-gray-400" /> {combo.customerName} ({combo.customerPhone})
            </div>
            {combo.deliveryAddress && (
              <div className="flex items-start gap-1.5 text-gray-700">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" /> {combo.deliveryAddress}
              </div>
            )}
            <div className="text-gray-700">{combo.planName || 'Combo FitBlend'} · {combo.totalPrice.toLocaleString('vi-VN')}đ</div>
            <div className="text-gray-500 text-xs">
              Chi nhánh: {combo.branchId} · Giao: {combo.deliveryDays.map((d) => (d === 0 ? 'CN' : `T${d + 1}`)).join(', ')}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Lịch giao chi tiết</div>
            {logsLoading ? (
              <p className="text-xs text-gray-400">Đang tải...</p>
            ) : deliveryLogs.length === 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {items.map((item, i) => (
                  <div key={i} className="text-xs bg-gray-50 rounded-lg px-2 py-1.5">
                    <span className="font-semibold text-gray-500">{item.dayLabel}: </span>
                    <span className="text-gray-800">{item.productName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {deliveryLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(log.deliveryDate).toLocaleDateString('vi-VN')}
                      <Clock className="w-3.5 h-3.5 text-gray-400 ml-1" />
                      {log.deliveryTime}
                      <span className="text-gray-500">· {log.productName}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      log.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                      log.status === 'postponed' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {log.status === 'delivered' ? 'Đã giao' : log.status === 'postponed' ? 'Đã hoãn' : 'Chờ giao'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {variant === 'admin' && onChangeBranch && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-gray-400 uppercase">Chi nhánh phụ trách</div>
              <div className="flex gap-2">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {(branchOptions || []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onChangeBranch(selectedBranch)}
                  disabled={changingBranch || selectedBranch === combo.branchId}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold disabled:opacity-40"
                >
                  {changingBranch ? '...' : 'Chuyển chi nhánh'}
                </button>
              </div>
            </div>
          )}

          {(variant === 'admin' || variant === 'cskh') && onSaveEdit && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-400 uppercase">Địa chỉ & ghi chú</div>
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Địa chỉ giao"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Ghi chú (topping, độ ngọt...)"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <button type="button" onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold">
                {saving ? 'Đang lưu...' : 'Lưu địa chỉ & ghi chú'}
              </button>
            </div>
          )}

          {parseDeliveryLog(combo.deliveryLog).length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase mb-1">Lịch sử giao</div>
              {parseDeliveryLog(combo.deliveryLog).slice().reverse().slice(0, 5).map((e, i) => (
                <div key={i} className="text-xs text-gray-500 py-0.5">
                  {new Date(e.date).toLocaleDateString('vi-VN')} — {e.productName}
                  {e.note ? ` (${e.note})` : ''}
                </div>
              ))}
            </div>
          )}

          <ComboCardDetails
            combo={combo}
            variant={variant}
            onClaim={onClaim}
            onActivate={onActivate}
            onPause={onPause}
            onResume={onResume}
            onComplete={onComplete}
            onDeliver={onDeliver}
            onPostpone={onPostpone}
            onReschedule={onReschedule}
            claiming={claiming}
            delivering={delivering}
            postponing={postponing}
            rescheduling={rescheduling}
          />
        </div>
      </div>
    </div>
  );
}
