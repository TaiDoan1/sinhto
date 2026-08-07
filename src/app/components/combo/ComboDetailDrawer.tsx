import { useState, useEffect } from 'react';
import { X, User, MapPin, Calendar, Clock, Loader2 } from 'lucide-react';
import * as api from '../../utils/api';
import { ComboSubscription } from '../../contexts/ComboContext';
import type { SalesActivity } from '../../types/onlineSales';
import { normalizeComboItems, parseDeliveryLog, getRenewalBadge } from '../../utils/comboUtils';
import type { CustomerComboHubVariant } from './CustomerComboHub';
import { ComboCardDetails } from './ComboCardDetails';
import { DeliveryDayToggle } from './DeliveryDayToggle';
import { ACTIVITY_LABEL } from '../online-sales/constants';

interface DeliveryLogDetail {
  id: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress: string;
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
  actor?: { id: string; name: string };
  onClose: () => void;
  onSaveEdit?: (address: string, notes: string, deliveryDays: number[], shipFee: number, endDate: string) => void;
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
  onRefund?: (amount: number) => void;
  claiming?: boolean;
  delivering?: boolean;
  postponing?: boolean;
  rescheduling?: boolean;
  refunding?: boolean;
}

export function ComboDetailDrawer({
  combo,
  variant,
  actor,
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
  onRefund,
  claiming,
  delivering,
  postponing,
  rescheduling,
  refunding,
}: Props) {
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLogDetail[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [editAddress, setEditAddress] = useState(combo.deliveryAddress || '');
  const [editNotes, setEditNotes] = useState(combo.notes || '');
  const [editDeliveryDays, setEditDeliveryDays] = useState<number[]>(combo.deliveryDays || [1, 2, 3, 4, 5, 6, 0]);
  const [editShipFee, setEditShipFee] = useState(String(combo.shipFee || ''));
  const [editEndDate, setEditEndDate] = useState(combo.endDate ? combo.endDate.split('T')[0] : '');
  const [saving, setSaving] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(combo.branchId);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [noteInput, setNoteInput] = useState('');
  const [loggingNote, setLoggingNote] = useState(false);
  // Sửa lịch giao từng buổi (CSKH/Admin): đổi ngày/giờ/địa chỉ, huỷ buổi, thêm buổi mới
  const [editingSlotId, setEditingSlotId] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [slotAddr, setSlotAddr] = useState('');
  const [slotBranch, setSlotBranch] = useState('');
  const [slotBusy, setSlotBusy] = useState(false);

  const items = normalizeComboItems(combo.items);
  const renewalBadge = getRenewalBadge(combo);
  const canEditSchedule = (variant === 'cskh' || variant === 'admin') && combo.status !== 'completed';
  const branchName = (id?: string) => (branchOptions || []).find((b) => b.id === id)?.name || id || '';

  const loadLogs = () => {
    setLogsLoading(true);
    return api
      .fetchDeliveryLogs({ comboOrderId: combo.id })
      .then((rows: any[]) => {
        setDeliveryLogs(
          rows
            .filter((r) => r.status !== 'cancelled')
            .map((r) => ({
              id: r.id,
              deliveryDate: r.deliveryDate,
              deliveryTime: r.deliveryTime || '08:00',
              deliveryAddress: r.deliveryAddress || '',
              status: r.status,
              productName: r.productName,
              branchId: r.branchId,
            }))
        );
      })
      .catch(() => setDeliveryLogs([]))
      .finally(() => setLogsLoading(false));
  };

  const startEditSlot = (log: DeliveryLogDetail) => {
    setEditingSlotId(log.id);
    setSlotDate((log.deliveryDate || '').split('T')[0]);
    setSlotTime(log.deliveryTime || '08:00');
    setSlotAddr(log.deliveryAddress || combo.deliveryAddress || '');
    setSlotBranch(log.branchId || combo.branchId || '');
  };

  const saveSlot = async (log: DeliveryLogDetail) => {
    setSlotBusy(true);
    try {
      await api.rescheduleDeliveryLog(log.id, { deliveryDate: slotDate, deliveryTime: slotTime, deliveryAddress: slotAddr, branchId: slotBranch });
      setEditingSlotId('');
      await loadLogs();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không đổi được lịch buổi này');
    } finally {
      setSlotBusy(false);
    }
  };

  const cancelSlot = async (log: DeliveryLogDetail) => {
    if (!confirm(`Huỷ buổi giao ngày ${new Date(log.deliveryDate).toLocaleDateString('vi-VN')}?`)) return;
    setSlotBusy(true);
    try {
      await api.cancelDeliveryLog(log.id);
      await loadLogs();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không huỷ được buổi này');
    } finally {
      setSlotBusy(false);
    }
  };

  const addSlot = async () => {
    const lastDate = deliveryLogs.length ? deliveryLogs[deliveryLogs.length - 1].deliveryDate : new Date().toISOString();
    const next = new Date(lastDate);
    next.setDate(next.getDate() + 1);
    const defDate = next.toISOString().split('T')[0];
    setSlotBusy(true);
    try {
      await api.addDeliveryLog({
        comboOrderId: combo.id,
        deliveryDate: defDate,
        deliveryTime: combo.deliveryTime || '08:00',
        deliveryAddress: combo.deliveryAddress || '',
        branchId: combo.branchId,
      });
      await loadLogs();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không thêm được buổi giao');
    } finally {
      setSlotBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setActivitiesLoading(true);
    api
      .fetchSalesActivities({ customerPhone: combo.customerPhone })
      .then((rows) => { if (!cancelled) setActivities(rows); })
      .catch(() => { if (!cancelled) setActivities([]); })
      .finally(() => { if (!cancelled) setActivitiesLoading(false); });
    return () => { cancelled = true; };
  }, [combo.customerPhone]);

  const logActivity = async (activityType: string, content: string) => {
    if (!actor) return;
    await api.createSalesActivity({
      customerPhone: combo.customerPhone,
      careStaffId: actor.id,
      careStaffName: actor.name,
      activityType,
      content,
    });
    const rows = await api.fetchSalesActivities({ customerPhone: combo.customerPhone });
    setActivities(rows);
  };

  const addNote = async () => {
    if (!noteInput.trim()) return;
    setLoggingNote(true);
    try {
      await logActivity('note', noteInput.trim());
      setNoteInput('');
    } finally {
      setLoggingNote(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo.id]);

  const handleSave = async () => {
    if (!onSaveEdit) return;
    setSaving(true);
    try {
      await onSaveEdit(editAddress, editNotes, editDeliveryDays, Number(editShipFee) || 0, editEndDate);
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
              {renewalBadge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  renewalBadge.tone === 'upgrade' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  renewalBadge.tone === 'downgrade' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-sky-50 text-sky-700 border-sky-200'
                }`}>
                  {renewalBadge.label}
                </span>
              )}
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
            <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
              {combo.deliveryType === 'pickup' ? (
                <span className="text-indigo-700">🏪 Khách tự lấy tại quầy</span>
              ) : (
                <span className="text-emerald-700">
                  🚚 Giao tận nơi — {combo.shipMethod === 'external' ? `Bookship${combo.shipProvider ? ` (${combo.shipProvider})` : ''}` : 'Shipper của mình'}
                </span>
              )}
            </div>
            {combo.deliveryType !== 'pickup' && combo.deliveryAddress && (
              <div className="flex items-start gap-1.5 text-gray-700">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" /> {combo.deliveryAddress}
              </div>
            )}
            <div className="text-gray-700">
              {combo.planName || 'Combo FitBlend'} · {combo.totalPrice.toLocaleString('vi-VN')}đ
              {(combo.shipFee || 0) > 0 && (
                <span className="text-gray-500"> + {combo.shipFee!.toLocaleString('vi-VN')}đ ship</span>
              )}
            </div>
            <div className="text-gray-500 text-xs">
              Chi nhánh: {combo.branchId} · Giao: {combo.deliveryDays.map((d) => (d === 0 ? 'CN' : `T${d + 1}`)).join(', ')}
            </div>
            {combo.endDate && (
              <div className="text-gray-500 text-xs">
                Kết thúc: {new Date(combo.endDate).toLocaleDateString('vi-VN')}
              </div>
            )}
            {combo.renewedFromPlanName && (
              <div className="text-gray-500 text-xs">
                Combo trước: {combo.renewedFromPlanName}
              </div>
            )}
          </div>

          {combo.notes && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-semibold">
              ⚠️ {combo.notes}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase">Lịch giao chi tiết</div>
              {canEditSchedule && deliveryLogs.length > 0 && (
                <button type="button" onClick={addSlot} disabled={slotBusy}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-50">
                  + Thêm buổi
                </button>
              )}
            </div>
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
              <div className="space-y-1.5">
                {deliveryLogs.map((log) => {
                  const editable = canEditSchedule && log.status === 'pending';
                  if (editingSlotId === log.id) {
                    return (
                      <div key={log.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày giao</label>
                            <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)}
                              className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Giờ giao</label>
                            <input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)}
                              className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            {combo.deliveryType === 'pickup' ? 'Chi nhánh khách lấy buổi này' : 'Chi nhánh làm/giao buổi này'}
                          </label>
                          <select value={slotBranch} onChange={(e) => setSlotBranch(e.target.value)}
                            className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white">
                            {(branchOptions || []).map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        {combo.deliveryType !== 'pickup' && (
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Địa chỉ giao buổi này</label>
                            <input value={slotAddr} onChange={(e) => setSlotAddr(e.target.value)}
                              placeholder="Để trống = dùng địa chỉ chung của combo"
                              className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white" />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => saveSlot(log)} disabled={slotBusy}
                            className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-60">
                            {slotBusy ? 'Đang lưu...' : 'Lưu buổi'}
                          </button>
                          <button type="button" onClick={() => setEditingSlotId('')} disabled={slotBusy}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">Huỷ sửa</button>
                          <button type="button" onClick={() => cancelSlot(log)} disabled={slotBusy}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold">Xoá buổi</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={log.id} className="text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-gray-700 flex-wrap">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(log.deliveryDate).toLocaleDateString('vi-VN')}
                          <Clock className="w-3.5 h-3.5 text-gray-400 ml-1" />
                          {log.deliveryTime}
                          <span className="text-gray-500">· {log.productName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            log.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                            log.status === 'postponed' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {log.status === 'delivered' ? 'Đã giao' : log.status === 'postponed' ? 'Đã hoãn' : 'Chờ giao'}
                          </span>
                          {editable && (
                            <button type="button" onClick={() => startEditSlot(log)}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800">Sửa</button>
                          )}
                        </div>
                      </div>
                      {combo.deliveryType !== 'pickup' && (log.deliveryAddress && log.deliveryAddress !== combo.deliveryAddress) && (
                        <div className="flex items-start gap-1 text-[11px] text-emerald-700 mt-0.5">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {log.deliveryAddress}
                        </div>
                      )}
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {combo.deliveryType === 'pickup' ? '🏪 Lấy tại: ' : '🏭 Làm/giao tại: '}
                        <span className="font-semibold text-gray-700">{branchName(log.branchId)}</span>
                        {log.branchId && combo.branchId && log.branchId !== combo.branchId && (
                          <span className="ml-1 text-amber-700 font-bold">(khác mặc định)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(variant === 'admin' || variant === 'cskh') && onChangeBranch && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-gray-400 uppercase">
                {combo.deliveryType === 'pickup' ? 'Chi nhánh khách lấy (mặc định)' : 'Chi nhánh phụ trách (mặc định)'}
              </div>
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
                placeholder="Ghi chú vị & giao hàng đặc biệt (trừ vị, giữ lạnh, giờ đặc biệt...)"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-gray-400 uppercase">Giao vào các ngày</div>
                <DeliveryDayToggle value={editDeliveryDays} onChange={setEditDeliveryDays} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">Phí ship (nếu có)</div>
                  <input
                    type="number"
                    min="0"
                    value={editShipFee}
                    onChange={(e) => setEditShipFee(e.target.value)}
                    placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">Ngày kết thúc</div>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <button type="button" onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold">
                {saving ? 'Đang lưu...' : 'Lưu địa chỉ & ghi chú'}
              </button>
            </div>
          )}

          {actor && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Nhật ký hoạt động
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="VD: Gia hạn từ combo trước, đã thu 795k tiền mặt..."
                  className="flex-1 px-3 py-2 rounded-xl border text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                />
                <button
                  type="button"
                  onClick={addNote}
                  disabled={loggingNote}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-60"
                >
                  {loggingNote ? '...' : 'Lưu'}
                </button>
              </div>
              {activitiesLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Chưa có hoạt động</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div key={a.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800">{ACTIVITY_LABEL[a.activityType] || a.activityType}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{a.content}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            onRefund={onRefund}
            claiming={claiming}
            delivering={delivering}
            postponing={postponing}
            rescheduling={rescheduling}
            refunding={refunding}
          />
        </div>
      </div>
    </div>
  );
}
