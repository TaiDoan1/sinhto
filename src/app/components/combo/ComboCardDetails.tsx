import { useState } from 'react';
import { ComboSubscription } from '../../contexts/ComboContext';
import {
  getComboItemForToday,
  formatZaloShipMessage,
  getRecipeIngredientsForComboItem,
  wasDeliveredToday,
} from '../../utils/comboUtils';
import { Copy, Pause, Play, Truck, Calendar, ChevronRight, MapPin } from 'lucide-react';
import type { CustomerComboHubVariant } from './CustomerComboHub';

export interface ComboActionProps {
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
  claiming?: boolean;
  delivering?: boolean;
  postponing?: boolean;
  rescheduling?: boolean;
}

/**
 * Thân chi tiết + toàn bộ thao tác của 1 combo — dùng chung cho card đầy đủ
 * (CSKH/Admin) và bên trong ComboDetailDrawer (POS, mở khi bấm vào dòng gọn).
 * `onOpenDetail` chỉ truyền khi render trực tiếp trên card (để hiện nút "Chi tiết");
 * bỏ trống khi render trong drawer vì đã ở màn chi tiết rồi.
 */
export function ComboCardDetails({
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
}: ComboActionProps & { onOpenDetail?: () => void }) {
  const [shipNote, setShipNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState(combo.deliveryTime || '08:00');

  const todayItem = getComboItemForToday(combo);
  const dueToday = !wasDeliveredToday(combo) && combo.status === 'active';
  const ingredients = getRecipeIngredientsForComboItem(todayItem);

  const copyZalo = async () => {
    await navigator.clipboard.writeText(formatZaloShipMessage(combo, shipNote));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
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
          {onOpenDetail && (
            <button type="button" onClick={onOpenDetail}
              className="ml-auto flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 font-semibold">
              Chi tiết
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
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

    </>
  );
}
