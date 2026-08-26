import { useState, useEffect } from 'react';
import { X, User, MapPin, Calendar, Clock, Loader2 } from 'lucide-react';
import * as api from '../../utils/api';
import { ComboSubscription } from '../../contexts/ComboContext';
import type { SalesActivity } from '../../types/onlineSales';
import { normalizeComboItems, parseDeliveryLog, getRenewalBadge } from '../../utils/comboUtils';
import { lookupMacroFull } from '../../utils/macroData';
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
  productId: string;
  size: string;
  protein: number;
  branchId: string;
  deliveryType?: 'pickup' | 'delivery';
  shipMethod?: 'own' | 'external';
  shipProvider?: string;
}

const SIZE_OPTIONS = ['250ml', '360ml', '500ml', '700ml'];
const PROTEIN_OPTIONS = [20, 40];

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
  onSaveEdit?: (address: string, notes: string, deliveryDays: number[], shipFee: number, endDate: string, allergyNote: string) => void;
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
  const [editAllergy, setEditAllergy] = useState(combo.allergyNote || '');
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
  const [slotFlavor, setSlotFlavor] = useState('');
  const [slotSize, setSlotSize] = useState('360ml');
  const [slotProtein, setSlotProtein] = useState(40);
  const [slotBusy, setSlotBusy] = useState(false);
  // Hình thức nhận/giao riêng cho buổi: 'pickup' (lấy tại quầy) | 'own' (NV FIT giao) | 'external' (bookship ngoài)
  const [slotFulfill, setSlotFulfill] = useState<'pickup' | 'own' | 'external'>('own');
  const [slotShipProvider, setSlotShipProvider] = useState('');
  const [smoothies, setSmoothies] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.fetchProducts()
      .then((rows: any[]) => setSmoothies((rows || []).filter((p) => p.category === 'smoothies').map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, []);

  const items = normalizeComboItems(combo.items);
  const renewalBadge = getRenewalBadge(combo);
  const canEditSchedule = (variant === 'cskh' || variant === 'admin') && combo.status !== 'completed';
  const branchName = (id?: string) => (branchOptions || []).find((b) => b.id === id)?.name || id || '';

  // Macro (cal/đạm/carb/fat) theo từng buổi + tổng combo
  const macroPerDay = deliveryLogs.map((l) => ({ date: l.deliveryDate, flavor: l.productName, size: l.size, macro: lookupMacroFull(l.productName, l.size) }));
  const macroMatched = macroPerDay.filter((x) => x.macro);
  const macroTotal = macroMatched.reduce(
    (a, x) => ({ cal: a.cal + x.macro!.cal, protein: a.protein + x.macro!.protein, carb: a.carb + x.macro!.carb, fat: a.fat + x.macro!.fat }),
    { cal: 0, protein: 0, carb: 0, fat: 0 }
  );
  const macroUnknown = macroPerDay.length - macroMatched.length;
  const copyMacro = async () => {
    const lines = macroPerDay.map((x) => x.macro
      ? `${new Date(x.date).toLocaleDateString('vi-VN')} · ${x.flavor} (${x.size}): ${x.macro.cal} kcal · ${x.macro.protein}g đạm · ${x.macro.carb}g carb · ${x.macro.fat}g béo`
      : `${new Date(x.date).toLocaleDateString('vi-VN')} · ${x.flavor}: (chưa có số liệu macro)`);
    const text = `📊 Macro combo — ${combo.customerName}\n${lines.join('\n')}\n\nTổng ${macroMatched.length} ly: ${macroTotal.cal} kcal · ${macroTotal.protein}g đạm · ${macroTotal.carb}g carb · ${macroTotal.fat}g béo`;
    try { await navigator.clipboard.writeText(text); alert('Đã copy macro để gửi khách'); } catch { alert(text); }
  };

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
              productId: r.productId || '',
              size: r.size || '360ml',
              protein: r.protein ?? 40,
              branchId: r.branchId,
              deliveryType: r.deliveryType,
              shipMethod: r.shipMethod,
              shipProvider: r.shipProvider,
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
    setSlotFlavor(log.productName || '');
    setSlotSize(log.size || '360ml');
    setSlotProtein(log.protein ?? 40);
    // Hình thức nhận/giao của buổi (ưu tiên buổi, fallback combo).
    const dType = log.deliveryType || combo.deliveryType;
    const sMethod = log.shipMethod || combo.shipMethod;
    setSlotFulfill(dType === 'pickup' ? 'pickup' : sMethod === 'external' ? 'external' : 'own');
    setSlotShipProvider(log.shipProvider || combo.shipProvider || '');
  };

  const saveSlot = async (log: DeliveryLogDetail) => {
    setSlotBusy(true);
    try {
      const picked = smoothies.find((s) => s.name === slotFlavor);
      const deliveryType = slotFulfill === 'pickup' ? 'pickup' : 'delivery';
      const shipMethod = slotFulfill === 'external' ? 'external' : 'own';
      const shipProvider = slotFulfill === 'external' ? slotShipProvider.trim() : '';
      await api.rescheduleDeliveryLog(log.id, {
        deliveryDate: slotDate, deliveryTime: slotTime, deliveryAddress: slotFulfill === 'pickup' ? '' : slotAddr, branchId: slotBranch,
        productName: slotFlavor, productId: picked?.id || '', size: slotSize, protein: slotProtein,
        deliveryType, shipMethod, shipProvider,
      });
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

  // Tạm hoãn 1 buổi: đánh dấu buổi này "Đã hoãn" (không trừ ly) + tự tạo buổi mới vào ngày hôm sau
  const postponeSlot = async (log: DeliveryLogDetail) => {
    if (!confirm(`Tạm hoãn buổi giao ngày ${new Date(log.deliveryDate).toLocaleDateString('vi-VN')}?\nBuổi này sẽ KHÔNG bị trừ ly và tự dời sang ngày hôm sau.`)) return;
    const note = prompt('Lý do hoãn (không bắt buộc):', '') || '';
    setSlotBusy(true);
    try {
      await api.postponeDeliveryLog(log.id, { note });
      await loadLogs();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không hoãn được buổi này');
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
      await onSaveEdit(editAddress, editNotes, editDeliveryDays, Number(editShipFee) || 0, editEndDate, editAllergy);
    } finally {
      setSaving(false);
    }
  };

  const editingLog = deliveryLogs.find((l) => l.id === editingSlotId) || null;

  // Buổi hôm nay / ngày mai để tô đậm nổi bật trên lịch giao.
  const dayTagOf = (dateStr: string): 'today' | 'tomorrow' | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    return diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="relative w-full bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3 z-10 w-full max-w-5xl mx-auto">
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

        <div className="p-5 space-y-5 flex-1 w-full max-w-5xl mx-auto">
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

          {combo.allergyNote && (
            <div className="text-sm text-red-800 bg-red-50 border border-red-300 rounded-xl px-3 py-2 font-bold">
              🚫 Kỵ vị & Dị ứng: {combo.allergyNote}
            </div>
          )}
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
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {deliveryLogs.map((log) => {
                  const editable = canEditSchedule && log.status === 'pending';
                  const dayTag = dayTagOf(log.deliveryDate);
                  const highlight = log.status === 'pending' ? dayTag : null; // đã giao rồi thì không cần tô
                  return (
                    <div key={log.id} className={`rounded-xl p-3 flex flex-col gap-1.5 border ${
                      highlight === 'today' ? 'border-emerald-400 border-2 bg-emerald-50 ring-2 ring-emerald-200 shadow-md' :
                      highlight === 'tomorrow' ? 'border-amber-300 border-2 bg-amber-50' :
                      log.status === 'delivered' ? 'border-emerald-200 bg-white' :
                      log.status === 'postponed' ? 'border-orange-200 bg-white' : 'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className={`flex items-center gap-1.5 font-bold text-sm ${highlight === 'today' ? 'text-emerald-800' : 'text-gray-800'}`}>
                          <Calendar className={`w-4 h-4 ${highlight === 'today' ? 'text-emerald-700' : 'text-emerald-600'}`} />
                          {new Date(log.deliveryDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                          log.status === 'postponed' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {log.status === 'delivered' ? 'Đã giao' : log.status === 'postponed' ? 'Đã hoãn' : 'Chờ giao'}
                        </span>
                      </div>
                      {highlight && (
                        <span className={`self-start text-[10px] font-black px-2 py-0.5 rounded-full ${
                          highlight === 'today' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {highlight === 'today' ? '🔥 HÔM NAY' : '⏭️ NGÀY MAI'}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" /> {log.deliveryTime}
                      </div>
                      <div className="text-sm text-gray-800 font-semibold">
                        {log.productName}{log.size ? ` (${log.size}${log.protein ? `·${log.protein}g` : ''})` : ''}
                      </div>
                      {combo.deliveryType !== 'pickup' && (log.deliveryAddress && log.deliveryAddress !== combo.deliveryAddress) && (
                        <div className="flex items-start gap-1 text-[11px] text-emerald-700">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {log.deliveryAddress}
                        </div>
                      )}
                      {(() => {
                        const dType = log.deliveryType || combo.deliveryType;
                        const sMethod = log.shipMethod || combo.shipMethod;
                        const label = dType === 'pickup' ? '🏪 Lấy tại quầy'
                          : sMethod === 'external' ? `📦 Bookship${(log.shipProvider || combo.shipProvider) ? ` (${log.shipProvider || combo.shipProvider})` : ''}`
                          : '🛵 NV FIT giao';
                        return <div className="text-[11px] font-bold text-indigo-700">{label}</div>;
                      })()}
                      <div className="text-[11px] text-gray-500">
                        {(log.deliveryType || combo.deliveryType) === 'pickup' ? '🏪 Lấy tại: ' : '🏭 Làm/giao tại: '}
                        <span className="font-semibold text-gray-700">{branchName(log.branchId)}</span>
                        {log.branchId && combo.branchId && log.branchId !== combo.branchId && (
                          <span className="ml-1 text-amber-700 font-bold">(khác mặc định)</span>
                        )}
                      </div>
                      {editable && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <button type="button" onClick={() => startEditSlot(log)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg px-2.5 py-1">
                            ✏️ Đổi ngày/giờ giao
                          </button>
                          <button type="button" disabled={slotBusy} onClick={() => postponeSlot(log)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-300 hover:bg-orange-100 rounded-lg px-2.5 py-1 disabled:opacity-40">
                            ⏸ Tạm hoãn
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {macroPerDay.length > 0 && (
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-bold text-sky-800 uppercase">📊 Dinh dưỡng (Macro)</div>
                <button type="button" onClick={copyMacro} className="text-[11px] font-bold text-sky-700 hover:text-sky-900">Copy gửi khách</button>
              </div>
              {macroMatched.length > 0 ? (
                <div className="text-sm text-gray-700">
                  <div className="font-bold text-sky-900">Tổng {macroMatched.length} ly: {macroTotal.cal} kcal · {macroTotal.protein}g đạm · {macroTotal.carb}g carb · {macroTotal.fat}g béo</div>
                  <div className="text-xs text-gray-500 mt-0.5">TB/ly: {Math.round(macroTotal.cal / macroMatched.length)} kcal · {Math.round(macroTotal.protein / macroMatched.length)}g đạm</div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">Chưa có số liệu macro cho các vị/size này.</div>
              )}
              {macroUnknown > 0 && macroMatched.length > 0 && (
                <div className="text-[11px] text-amber-600 mt-1">{macroUnknown} ly chưa có số liệu macro (vị/size chưa khai báo trong bảng Macro).</div>
              )}
            </div>
          )}

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
              <label className="text-xs font-bold text-red-600 block">⚠️ Kỵ vị & Dị ứng</label>
              <textarea
                value={editAllergy}
                onChange={(e) => setEditAllergy(e.target.value)}
                placeholder="VD: dị ứng đậu phộng; không thích sầu riêng; không topping hạt..."
                rows={2}
                className="w-full border border-red-200 bg-red-50/40 rounded-lg px-3 py-2 text-sm"
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

      {editingLog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => !slotBusy && setEditingSlotId('')} aria-label="Đóng" />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-50 uppercase tracking-wider">Đổi buổi giao</p>
                <h3 className="text-lg font-black text-white">
                  {new Date(editingLog.deliveryDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                </h3>
              </div>
              <button type="button" onClick={() => !slotBusy && setEditingSlotId('')} className="p-1.5 rounded-lg hover:bg-white/20 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">📅 Ngày giao</label>
                  <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">⏰ Giờ giao</label>
                  <input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-emerald-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">🚚 Hình thức nhận buổi này</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setSlotFulfill('pickup')}
                    className={`py-2 rounded-xl text-xs font-bold border ${slotFulfill === 'pickup' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300'}`}>🏪 Lấy tại quầy</button>
                  <button type="button" onClick={() => setSlotFulfill('own')}
                    className={`py-2 rounded-xl text-xs font-bold border ${slotFulfill === 'own' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300'}`}>🛵 NV FIT giao</button>
                  <button type="button" onClick={() => setSlotFulfill('external')}
                    className={`py-2 rounded-xl text-xs font-bold border ${slotFulfill === 'external' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300'}`}>📦 Bookship ngoài</button>
                </div>
              </div>

              {slotFulfill === 'external' && (
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Đơn vị bookship</label>
                  <input value={slotShipProvider} onChange={(e) => setSlotShipProvider(e.target.value)}
                    placeholder="VD: Grab, Ahamove, Shopee Food..."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-emerald-500 focus:outline-none" />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">
                  {slotFulfill === 'pickup' ? '🏪 Chi nhánh khách lấy' : '🏭 Chi nhánh làm/giao'}
                </label>
                <select value={slotBranch} onChange={(e) => setSlotBranch(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-emerald-500 focus:outline-none">
                  {(branchOptions || []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {slotFulfill !== 'pickup' && (
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">📍 Địa chỉ giao buổi này</label>
                  <input value={slotAddr} onChange={(e) => setSlotAddr(e.target.value)}
                    placeholder="Để trống = dùng địa chỉ chung của combo"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-emerald-500 focus:outline-none" />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">🥤 Vị buổi này</label>
                <div className="grid grid-cols-12 gap-2">
                  <select value={slotFlavor} onChange={(e) => setSlotFlavor(e.target.value)}
                    className="col-span-6 border border-gray-300 rounded-xl px-2 py-2.5 text-sm bg-white focus:border-emerald-500 focus:outline-none">
                    <option value="">-- Chọn vị --</option>
                    {smoothies.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <select value={slotSize} onChange={(e) => setSlotSize(e.target.value)}
                    className="col-span-3 border border-gray-300 rounded-xl px-1 py-2.5 text-sm bg-white focus:border-emerald-500 focus:outline-none">
                    {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={slotProtein} onChange={(e) => setSlotProtein(Number(e.target.value))}
                    className="col-span-3 border border-gray-300 rounded-xl px-1 py-2.5 text-sm bg-white focus:border-emerald-500 focus:outline-none">
                    {PROTEIN_OPTIONS.map((p) => <option key={p} value={p}>{p}g</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 flex gap-2">
              <button type="button" onClick={() => cancelSlot(editingLog)} disabled={slotBusy}
                className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 disabled:opacity-60">Xoá buổi</button>
              <button type="button" onClick={() => setEditingSlotId('')} disabled={slotBusy}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 disabled:opacity-60">Huỷ</button>
              <button type="button" onClick={() => saveSlot(editingLog)} disabled={slotBusy}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 disabled:opacity-60">
                {slotBusy ? 'Đang lưu...' : '✓ Lưu buổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
