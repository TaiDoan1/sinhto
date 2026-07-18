import { useEffect, useState } from 'react';
import { Clock, Package, StickyNote } from 'lucide-react';
import { CustomComboBuilder } from '../customer/CustomComboBuilder';
import { useBranchOrders } from '../../hooks/useBranchOrders';
import { VoidOrderModal } from './VoidOrderModal';
import { OrderDetailModal } from './OrderDetailModal';
import { sourceColors, sourceLabels, statusBadgeColors, statusShortLabels, getPrimaryAction } from './orderQueueShared';
import type { Order } from '../../contexts/OrderContext';

export function OrderQueue({ branchId }: { branchId: string }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [voidingOrder, setVoidingOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  const [editingOrderData, setEditingOrderData] = useState<{orderId: string, itemIdx: number} | null>(null);
  const [initialComboData, setInitialComboData] = useState<any>(null);

  const weekDayLabels = [
    { id: 0, label: 'CN' }, { id: 1, label: 'T2' }, { id: 2, label: 'T3' },
    { id: 3, label: 'T4' }, { id: 4, label: 'T5' }, { id: 5, label: 'T6' }, { id: 6, label: 'T7' }
  ];

  const { orders, updateOrderStatus, updateOrder, history } = useBranchOrders(branchId);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedMinutes = (orderTime: Date | string) => {
    const t = orderTime instanceof Date ? orderTime : new Date(orderTime);
    if (Number.isNaN(t.getTime())) return 0;
    return Math.floor((currentTime.getTime() - t.getTime()) / 60000);
  };

  const handleVoidConfirm = () => {
    if (voidingOrder) {
      updateOrderStatus(voidingOrder.id, 'completed');
      if (detailOrder?.id === voidingOrder.id) setDetailOrder(null);
    }
  };

  const openComboEditor = (order: Order, itemIdx: number) => {
    setInitialComboData((order.items[itemIdx] as any)?.rawComboData);
    setEditingOrderData({ orderId: order.id, itemIdx });
    setShowComboBuilder(true);
  };

  // Danh sách hiển thị luôn phản ánh order mới nhất (vd sau khi updateOrderStatus) khi popup chi tiết đang mở
  const detailOrderLive = detailOrder ? orders.find(o => o.id === detailOrder.id) || detailOrder : null;

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {orders.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <Package className="w-20 h-20 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Không có đơn hàng</p>
            <p className="text-sm mt-2">Đơn hàng mới sẽ hiện tại đây</p>
          </div>
        ) : (
          orders.map(order => {
            const elapsed = getElapsedMinutes(order.time);
            const isOverdue = elapsed > 15;
            const primaryAction = getPrimaryAction(order);
            const summary = order.customerName
              || (order.items || []).map(i => typeof i === 'string' ? i : i?.name).filter(Boolean).join(', ');

            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailOrder(order)}
                onKeyDown={(e) => { if (e.key === 'Enter') setDetailOrder(order); }}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 border-2 bg-white shadow-sm cursor-pointer transition-all ${
                  isOverdue ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <div className="text-lg font-black text-emerald-700 shrink-0 w-11 text-center">
                  #{order.orderNumber || 'On'}
                </div>
                <span className={`${sourceColors[order.source] || 'bg-gray-500'} text-white px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0`}>
                  {sourceLabels[order.source] || order.source || 'Khác'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 truncate text-sm">{summary || 'Đơn hàng'}</div>
                </div>
                {order.note && (
                  <span className="shrink-0 p-1 bg-amber-100 text-amber-700 rounded" title={order.note}>
                    <StickyNote className="w-3.5 h-3.5" />
                  </span>
                )}
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeColors[order.status]}`}>
                  {statusShortLabels[order.status]}
                </span>
                <span className={`shrink-0 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                  isOverdue ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Clock className="w-3.5 h-3.5" />{elapsed}p
                </span>
                <span className="shrink-0 text-sm font-bold text-emerald-700 w-20 text-right">
                  {(order.total ?? 0).toLocaleString('vi-VN')}đ
                </span>
                {primaryAction && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, primaryAction.next); }}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-95"
                  >
                    <primaryAction.icon className="w-3.5 h-3.5" />
                    {primaryAction.label}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {detailOrderLive && (
        <OrderDetailModal
          order={detailOrderLive}
          elapsedMinutes={getElapsedMinutes(detailOrderLive.time)}
          onClose={() => setDetailOrder(null)}
          onAdvanceStatus={(next) => updateOrderStatus(detailOrderLive.id, next)}
          onVoid={() => setVoidingOrder(detailOrderLive)}
          onEditComboItem={(itemIdx) => openComboEditor(detailOrderLive, itemIdx)}
        />
      )}

      {voidingOrder && (
        <VoidOrderModal
          order={voidingOrder}
          onClose={() => setVoidingOrder(null)}
          onConfirm={handleVoidConfirm}
        />
      )}
      {/* Combo Editor Modal */}
      {showComboBuilder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden h-[90vh] flex flex-col">
            <CustomComboBuilder
              isPOS={true}
              initialData={initialComboData}
              onClose={() => {
                setShowComboBuilder(false);
                setEditingOrderData(null);
                setInitialComboData(null);
              }}
              onAddToCart={(combo) => {
                if (editingOrderData) {
                  const order = [...orders, ...history].find(o => o.id === editingOrderData.orderId);
                  if (order) {
                    const newItems = [...order.items];
                    newItems[editingOrderData.itemIdx] = {
                      ...newItems[editingOrderData.itemIdx],
                      name: combo.name || `Combo ${combo.comboType === 'weekly' ? 'Tuần' : 'Tháng'}`,
                      price: combo.finalPrice,
                      rawComboData: combo,
                      toppings: combo.items.map((i: any) => {
                        let details = `${i.quantity}x ${i.product.name}`;
                        const dayLabel = (i.assignedDay === 'all' || i.assignedDay === undefined)
                          ? 'Tất cả'
                          : weekDayLabels.find(w => w.id === i.assignedDay)?.label;
                        if (dayLabel) details = `[Giao ${dayLabel}] ` + details;
                        return details;
                      })
                    };
                    const newTotal = newItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
                    updateOrder(order.id, { items: newItems, total: newTotal });
                  }
                }
                setShowComboBuilder(false);
                setEditingOrderData(null);
                setInitialComboData(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
