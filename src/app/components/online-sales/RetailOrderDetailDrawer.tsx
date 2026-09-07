import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import type { Order } from '../../contexts/OrderContext';
import * as api from '../../utils/api';
import { lookupMacroFull } from '../../utils/macroData';

function isoToLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Chi tiết + sửa 1 đơn lẻ (mua lẻ) — dùng chung cho mọi nơi cần mở đơn ra xem/chỉnh: Quản lý
 * khách (admin/CSKH), và (khi được nối) danh sách đơn ở Cổng CSKH. Sửa được giờ hẹn giao, địa
 * chỉ, ghi chú/vị, kỵ vị & dị ứng, shipper/đơn vị ship, phí ship. */
export function RetailOrderDetailDrawer({ order, onClose, onSaved }: { order: Order; onClose: () => void; onSaved?: () => void }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const orderMacro = items.reduce((acc: any, it: any) => {
    const m = lookupMacroFull(it.productName || it.name, it.size, Array.isArray(it.toppings) ? it.toppings : []);
    const q = it.quantity || 1;
    if (m) { acc.cal += m.cal * q; acc.protein += m.protein * q; acc.carb += m.carb * q; acc.fat += m.fat * q; acc.matched += q; }
    else acc.unknown += q;
    return acc;
  }, { cal: 0, protein: 0, carb: 0, fat: 0, matched: 0, unknown: 0 });
  const { updateOrder } = useOrders();
  const [deliveryTime, setDeliveryTime] = useState(isoToLocalInput(order.deliveryTime));
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress || '');
  const [note, setNote] = useState(order.note || '');
  const [allergyNote, setAllergyNote] = useState(order.allergyNote || '');
  const [shipProvider, setShipProvider] = useState(order.shipProvider || '');
  const [shipTrackingCode, setShipTrackingCode] = useState(order.shipTrackingCode || '');
  const [shipFee, setShipFee] = useState(String(order.shipFee || ''));
  const [shipperId, setShipperId] = useState(order.shipperId || '');
  const [shippers, setShippers] = useState<{ id: string; fullName: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const isDelivery = (order.deliveryType || 'delivery') === 'delivery';
  const isOwnShip = (order.shipMethod || 'own') !== 'external';

  useEffect(() => {
    if (!isDelivery || !isOwnShip) return;
    api.fetchEmployees()
      .then((list: any[]) => setShippers((list || []).filter((e) => e.position === 'shipper' && (!order.branchId || e.branch === order.branchId)).map((e) => ({ id: e.id, fullName: e.fullName }))))
      .catch(() => {});
  }, [isDelivery, isOwnShip, order.branchId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrder(order.id, {
        // Luôn giữ nguyên trạng thái GỐC của đơn (order.status) — TUYỆT ĐỐI không để updateOrder tự
        // suy ra/mặc định trạng thái khác. Đơn ở đây có thể đến từ nguồn KHÔNG nằm trong bộ nhớ đơn
        // hàng của POS (vd CSKH tải riêng theo SĐT khách), nên không dựa vào suy đoán ở nơi khác —
        // nếu không, sửa 1 đơn ĐÃ HOÀN THÀNH có thể vô tình bị đẩy về 'pending', sai lịch sử/doanh thu.
        status: order.status,
        deliveryTime: deliveryTime ? new Date(deliveryTime).toISOString() : '',
        deliveryAddress: deliveryAddress.trim(),
        note: note.trim(),
        allergyNote: allergyNote.trim(),
        shipProvider: shipProvider.trim(),
        shipTrackingCode: shipTrackingCode.trim(),
        shipFee: Number(shipFee) || 0,
        shipperId,
        shipperName: shippers.find((s) => s.id === shipperId)?.fullName || (shipperId ? order.shipperName : ''),
      });
      onSaved?.();
      onClose();
    } catch {
      alert('Lưu thay đổi thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-lg text-gray-900">Chi tiết đơn lẻ</h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Ngày</p>
              <p className="font-semibold text-gray-900">{new Date(order.time).toLocaleDateString('vi-VN')}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Khách hàng</p>
              <p className="font-semibold text-gray-900">{order.customerName || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Số điện thoại</p>
              <p className="font-semibold text-gray-900">{order.customerPhone || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Chi nhánh nhận đơn</p>
              <p className="font-semibold text-gray-900">{order.branchId || '—'}</p>
            </div>
          </div>

          {/* Sửa được: giờ giao (khách đổi giờ), địa chỉ, ghi chú/vị */}
          <div className="space-y-3 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
            <p className="text-xs font-bold text-indigo-700 uppercase">Sửa đơn (khách đổi giờ / vị / ghi chú)</p>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Giờ hẹn giao</label>
              <input type="datetime-local" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Địa chỉ giao</label>
              <input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Địa chỉ giao hàng" className="w-full px-3 py-2 rounded-lg border text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Ghi chú / đổi vị theo yêu cầu khách</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: đổi vị dâu → xoài, ít đá..." className="w-full px-3 py-2 rounded-lg border text-sm h-16 resize-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-red-600 mb-1 block">⚠️ Kỵ vị & Dị ứng</label>
              <textarea value={allergyNote} onChange={(e) => setAllergyNote(e.target.value)} placeholder="VD: dị ứng đậu phộng; không topping hạt..." className="w-full px-3 py-2 rounded-lg border border-red-200 bg-red-50/40 text-sm h-14 resize-none" />
            </div>
            {isDelivery && isOwnShip && (
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Gán shipper của mình (để trống → shipper chi nhánh tự nhận)</label>
                <select value={shipperId} onChange={(e) => setShipperId(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm bg-white">
                  <option value="">— Chưa gán (shipper tự nhận) —</option>
                  {shippers.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
            )}
            {isDelivery && (
              <div className="grid grid-cols-2 gap-2">
                <input value={shipProvider} onChange={(e) => setShipProvider(e.target.value)} placeholder="Đơn vị ship (bookship)" className="px-3 py-2 rounded-lg border text-sm" />
                <input value={shipTrackingCode} onChange={(e) => setShipTrackingCode(e.target.value)} placeholder="Mã vận đơn" className="px-3 py-2 rounded-lg border text-sm" />
                <input value={shipFee} onChange={(e) => setShipFee(e.target.value)} type="number" min={0} placeholder="Phí ship (VNĐ)" className="col-span-2 px-3 py-2 rounded-lg border text-sm" />
              </div>
            )}
            <button type="button" onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Lưu thay đổi
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Ly lẻ</p>
            <div className="space-y-2">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">
                      {item.quantity && item.quantity > 1 ? `${item.quantity} × ` : ''}{item.productName || item.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[item.size, item.protein ? `${item.protein}g protein` : null, Array.isArray(item.toppings) && item.toppings.length ? item.toppings.join(', ') : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <p className="font-bold text-indigo-700 text-sm shrink-0">
                    {((item.price || 0) * (item.quantity || 1)).toLocaleString('vi-VN')}đ
                  </p>
                </div>
              ))}
            </div>
          </div>

          {orderMacro.matched > 0 && (
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-sm">
              <div className="text-xs font-bold text-sky-800 uppercase mb-1">📊 Dinh dưỡng (Macro)</div>
              <div className="font-bold text-sky-900">{orderMacro.cal} kcal · {orderMacro.protein}g đạm · {orderMacro.carb}g carb · {orderMacro.fat}g béo</div>
              {orderMacro.unknown > 0 && <div className="text-[11px] text-amber-600 mt-0.5">{orderMacro.unknown} món chưa có số liệu macro.</div>}
            </div>
          )}

          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <span>Tiền hàng</span>
              <span>{order.total.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <span>Phí ship</span>
              <span>{(order.shipFee || 0).toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-lg text-gray-900">
                Tổng thu: {(order.total + (order.shipFee || 0)).toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
