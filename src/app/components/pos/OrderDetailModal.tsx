import { X, User, MapPin, Phone, XCircle, Edit, CheckCircle2, Clock } from 'lucide-react';
import type { Order } from '../../contexts/OrderContext';
import { sourceColors, sourceLabels, statusBadgeColors, statusLabels, getPrimaryAction } from './orderQueueShared';

interface Props {
  order: Order;
  elapsedMinutes: number;
  onClose: () => void;
  onAdvanceStatus: (nextStatus: Order['status']) => void;
  onVoid: () => void;
  onEditComboItem: (itemIdx: number) => void;
}

export function OrderDetailModal({ order, elapsedMinutes, onClose, onAdvanceStatus, onVoid, onEditComboItem }: Props) {
  const isOverdue = elapsedMinutes > 15;
  const primaryAction = getPrimaryAction(order);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Đóng" />
      <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Chi tiết đơn hàng</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <h2 className="text-xl font-black text-gray-900">#{order.orderNumber || 'Online'}</h2>
              <span className={`${sourceColors[order.source] || 'bg-gray-500'} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                {sourceLabels[order.source] || order.source || 'Khác'}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isOverdue ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Clock className="w-3 h-3 inline mr-1" />{elapsedMinutes}p
              </span>
            </div>
            <span className={`inline-block mt-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${statusBadgeColors[order.status]}`}>
              {statusLabels[order.status]}
            </span>
            <p className="text-xs text-gray-500 mt-1">{order.id} · NV: {order.staff}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {(order.source === 'mobile' || order.source === 'online_sales') && (
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-sm space-y-1.5">
              <div className="flex justify-between font-bold text-emerald-900">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{order.customerName}</span>
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{order.customerPhone}</span>
              </div>
              {order.deliveryAddress && (
                <div className="flex items-start gap-1.5 text-emerald-800">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{order.deliveryAddress}</span>
                </div>
              )}
              {order.paymentMethod && (
                <div className="pt-1.5 border-t border-emerald-200 text-emerald-800 font-semibold flex items-center justify-between">
                  <span>Thanh toán:</span>
                  <span className="bg-white px-2 py-0.5 rounded text-xs border border-emerald-200">
                    {order.paymentMethod === 'cash' ? '💵 Tiền mặt (COD)' : '📱 Chuyển khoản QR'}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Món đã đặt</div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="text-sm text-gray-700">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-gray-900">
                      • {typeof item === 'string' ? item : `${item?.quantity ?? 1}x ${item?.name ?? 'Món'}`}
                    </span>
                    {typeof item === 'object' && item?.isCustomCombo && (order.status === 'pending' || order.status === 'preparing') && (
                      <button
                        type="button"
                        onClick={() => onEditComboItem(idx)}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {typeof item === 'object' && (item.size || item.protein || (item.toppings && item.toppings.length > 0)) && (
                    <div className="text-xs text-gray-600 ml-3 mt-0.5 font-medium bg-white p-1.5 rounded border border-gray-100 shadow-sm">
                      {item.isCustomCombo ? (
                        <div className="space-y-1">
                          {item.toppings?.map((t: string, tIdx: number) => (
                            <div key={tIdx} className="flex items-start gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-100 text-[10px] font-bold leading-tight">
                              <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-600 shrink-0" />
                              <span>{t}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          {item.size && <span>Size: {item.size} | </span>}
                          {item.protein && <span>Protein: {item.protein}g</span>}
                          {item.toppings && item.toppings.length > 0 && (
                            <span className="block mt-1 text-emerald-600">↳ + {item.toppings.join(', ')}</span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200 text-right">
                <span className="text-lg font-bold text-emerald-700">{(order.total ?? 0).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </div>

          {order.shipperName && (
            <div className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-2 rounded-lg inline-block">
              🏍️ Shipper: {order.shipperName}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-2">
          {primaryAction && (
            <button
              type="button"
              onClick={() => onAdvanceStatus(primaryAction.next)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <primaryAction.icon className="w-5 h-5" />
              {primaryAction.label}
            </button>
          )}
          {(order.status === 'pending' || order.status === 'preparing' || order.status === 'ready') && (
            <button
              type="button"
              onClick={onVoid}
              className="bg-rose-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95"
              title="Hủy đơn"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
