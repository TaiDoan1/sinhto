import { useState } from 'react';
import { X, DollarSign, Lock } from 'lucide-react';
import type { Order } from '../../contexts/OrderContext';
import * as api from '../../utils/api';

interface RefundOrderModalProps {
  order: Order;
  /** Người thực hiện hoàn tiền (tên nhân viên / admin) — ghi vào audit. */
  refundBy: string;
  /** POS = true (bắt nhập PIN quản lý). Admin = false. */
  requirePin?: boolean;
  onClose: () => void;
  /** Gọi sau khi hoàn thành công: nhận kết quả từ server + danh sách món đã hoàn (để ghi tồn kho). */
  onRefunded?: (result: { order: any; refundAmount: number }, refundedItems: any[]) => void;
}

const REFUND_REASONS = [
  'Sản phẩm không đúng',
  'Chất lượng không tốt',
  'Khách không hài lòng',
  'Nhầm món / bấm dư',
  'Lý do khác'
];

const MANAGER_PIN = '1234';

const itemName = (it: any): string =>
  typeof it === 'string' ? it : (it?.name || it?.productName || 'Món');
const itemQty = (it: any): number => (typeof it === 'string' ? 1 : (Number(it?.quantity) || 1));
const itemLineTotal = (it: any): number =>
  typeof it === 'string' ? 0 : (Number(it?.price) || 0) * (Number(it?.quantity) || 1);

export function RefundOrderModal({ order, refundBy, requirePin = false, onClose, onRefunded }: RefundOrderModalProps) {
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectedReason, setSelectedReason] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (idx: number) => {
    setError('');
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(items.map((_, i) => i)));
  const clearAll = () => setSelected(new Set());

  const refundAmount = items.reduce((sum, it, i) => (selected.has(i) ? sum + itemLineTotal(it) : sum), 0);

  const handleRefund = async () => {
    if (selected.size === 0) { setError('Chọn ít nhất 1 món để hoàn'); return; }
    if (!selectedReason) { setError('Vui lòng chọn lý do hoàn tiền'); return; }
    if (requirePin && pin !== MANAGER_PIN) { setError('Mã PIN quản lý không đúng'); return; }

    setSaving(true);
    setError('');
    try {
      const indexes = [...selected];
      const refundedItems = items.filter((_, i) => selected.has(i));
      const result = await api.refundOrderItems(order.id, indexes, selectedReason, refundBy);
      onRefunded?.(result, refundedItems);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hoàn tiền thất bại');
      setSaving(false);
    }
  };

  const allSelected = selected.size === items.length && items.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-600 text-white p-4 rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Hoàn Tiền Theo Món</h2>
              <p className="text-sm opacity-90">#{order.orderNumber ?? order.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-emerald-700 p-1 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content (scroll) */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Chọn món */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Chọn món cần hoàn</label>
              <button
                type="button"
                onClick={allSelected ? clearAll : selectAll}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                {allSelected ? 'Bỏ chọn hết' : 'Chọn cả đơn'}
              </button>
            </div>
            <div className="space-y-1.5">
              {items.map((it, idx) => {
                const checked = selected.has(idx);
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => toggle(idx)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      checked ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300'
                      }`}
                    >
                      {checked && '✓'}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-800 truncate">
                        {itemName(it)} {itemQty(it) > 1 && <span className="text-gray-500">× {itemQty(it)}</span>}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-gray-700 shrink-0">
                      {itemLineTotal(it).toLocaleString('vi-VN')}đ
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tổng hoàn */}
          <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">Số tiền hoàn ({selected.size} món):</span>
            <span className="font-black text-lg text-emerald-700">{refundAmount.toLocaleString('vi-VN')}đ</span>
          </div>

          {/* Lý do */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Lý do hoàn tiền <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => { setSelectedReason(e.target.value); setError(''); }}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-emerald-600 focus:outline-none"
            >
              <option value="">-- Chọn lý do --</option>
              {REFUND_REASONS.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          {/* PIN (chỉ POS) */}
          {requirePin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mã PIN Quản Lý <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setError(''); }}
                  placeholder="Nhập mã PIN"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none"
                  maxLength={4}
                />
              </div>
            </div>
          )}

          <div className="rounded-lg p-3 bg-amber-50 border border-amber-200 text-xs text-gray-600">
            Món được hoàn sẽ bị bỏ khỏi đơn, tổng tiền đơn giảm đúng phần đã hoàn, và <b>doanh thu ca sẽ tự trừ lại</b>. Thao tác có lưu vết để đối soát.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 rounded-b-2xl flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors disabled:opacity-60"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={handleRefund}
            disabled={saving || selected.size === 0}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Đang hoàn...' : `Hoàn ${refundAmount.toLocaleString('vi-VN')}đ`}
          </button>
        </div>
      </div>
    </div>
  );
}
