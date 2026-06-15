import { useEffect, useState } from 'react';
import { Clock, Package, User, CheckCircle, XCircle, MapPin, Phone, Play, Edit, CheckCircle2 } from 'lucide-react';
import { CustomComboBuilder } from '../customer/CustomComboBuilder';
import { useOrders } from '../../contexts/OrderContext';
import { VoidOrderModal } from './VoidOrderModal';
import type { Order } from '../../contexts/OrderContext';

const sourceColors = {
  counter: 'bg-green-500',
  mobile: 'bg-emerald-600',
  web: 'bg-emerald-500'
};

const sourceLabels = {
  counter: 'Tại Quầy',
  mobile: 'Đặt Online',
  web: 'Web'
};

export function OrderQueue() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [voidingOrder, setVoidingOrder] = useState<Order | null>(null);
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  const [editingOrderData, setEditingOrderData] = useState<{orderId: string, itemIdx: number} | null>(null);
  const [initialComboData, setInitialComboData] = useState<any>(null);

  const weekDayLabels = [
    { id: 0, label: 'CN' }, { id: 1, label: 'T2' }, { id: 2, label: 'T3' },
    { id: 3, label: 'T4' }, { id: 4, label: 'T5' }, { id: 5, label: 'T6' }, { id: 6, label: 'T7' }
  ];

  const { orders, updateOrderStatus, updateOrder, history } = useOrders();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedMinutes = (orderTime: Date) => {
    return Math.floor((currentTime.getTime() - orderTime.getTime()) / 60000);
  };

  const handleVoidConfirm = () => {
    if (voidingOrder) {
      updateOrderStatus(voidingOrder.id, 'completed');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

            return (
              <div key={order.id} className={`rounded-xl p-4 border-2 bg-white shadow-md hover:shadow-lg transition-all ${
                isOverdue ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}>
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-emerald-700">#{order.orderNumber || 'Online'}</div>
                      <div className="text-xs text-gray-500">{order.id}</div>
                    </div>
                    <div>
                      <div className={`${sourceColors[order.source]} text-white px-2 py-1 rounded text-xs font-bold mb-1 inline-block`}>
                        {sourceLabels[order.source]}
                      </div>
                      <div className="text-xs text-gray-600">
                        <User className="w-3 h-3 inline mr-1" />
                        {order.staff}
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg font-bold ${
                    isOverdue ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Clock className="w-4 h-4 inline mr-1" />
                    <span>{elapsed}p</span>
                  </div>
                </div>

                {/* Customer Info for Online Orders */}
                {order.source === 'mobile' && (
                  <div className="mb-3 bg-emerald-50 rounded-lg p-3 border border-emerald-100 text-sm">
                    <div className="flex justify-between font-bold text-blue-800 mb-1">
                      <span>{order.customerName}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {order.customerPhone}</span>
                    </div>
                    <div className="flex items-start gap-1 text-emerald-800 mt-1">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{order.deliveryAddress}</span>
                    </div>
                    {order.paymentMethod && (
                      <div className="mt-2 pt-2 border-t border-blue-200 text-blue-800 font-semibold flex items-center justify-between">
                        <span>Thanh toán:</span>
                        <span className="bg-white px-2 py-0.5 rounded text-xs border border-blue-200">
                          {order.paymentMethod === 'cash' ? '💵 Tiền mặt (COD)' : '📱 Chuyển khoản QR'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Items */}
                <div className="mb-3 bg-gray-50 rounded-lg p-3">
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-700">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-gray-900">• {typeof item === 'string' ? item : `${item.quantity}x ${item.name}`}</span>
                          {item.isCustomCombo && (order.status === 'pending' || order.status === 'preparing') && (
                            <button 
                              onClick={() => {
                                setInitialComboData(item.rawComboData);
                                setEditingOrderData({ orderId: order.id, itemIdx: idx });
                                setShowComboBuilder(true);
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {typeof item === 'object' && (item.size || item.protein || (item.toppings && item.toppings.length > 0)) && (
                          <div className="text-xs text-gray-600 ml-3 mt-0.5 font-medium bg-white p-1.5 rounded border border-gray-100 shadow-sm inline-block w-full">
                            {item.isCustomCombo ? (
                              <div className="mt-1 space-y-1">
                                {item.toppings?.map((t: string, tIdx: number) => (
                                  <div key={tIdx} className="flex items-start gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-100 text-[10px] font-bold leading-tight">
                                    <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-600 flex-shrink-0" />
                                    <span>{t}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <>
                                {item.size && <span>Size: {item.size} | </span>}
                                {item.protein && <span>Protein: {item.protein}g</span>}
                                {item.toppings && item.toppings.length > 0 && <span className="block mt-1 text-emerald-600">↳ + {item.toppings.join(', ')}</span>}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200 text-right">
                    <span className="text-lg font-bold text-emerald-700">
                      {order.total.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-3 flex justify-between items-center">
                  <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    order.status === 'preparing' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'delivering' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {order.status === 'pending' ? '🔔 CHỜ XÁC NHẬN' :
                     order.status === 'preparing' ? '🔥 ĐANG LÀM MÓN' :
                     order.status === 'ready' ? '📦 CHỜ SHIPPER LẤY' :
                     order.status === 'delivering' ? '🏍️ ĐANG GIAO HÀNG' :
                     'HOÀN THÀNH'}
                  </span>
                  
                  {order.shipperName && (
                    <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      🏍️ {order.shipperName}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Nhận Đơn & Làm Món
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Xong - {order.source === 'mobile' ? 'Chờ Shipper' : 'Giao Khách'}
                    </button>
                  )}

                  {order.status === 'ready' && order.source !== 'mobile' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Hoàn Tất Giao Nhận
                    </button>
                  )}

                  {(order.status === 'pending' || order.status === 'preparing' || order.status === 'ready') && (
                    <button
                      onClick={() => setVoidingOrder(order)}
                      className="bg-rose-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95"
                      title="Hủy đơn"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

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
