'use client';
import { useState, useMemo } from 'react';
import { Package, Users, Calendar, ArrowRight, CheckCircle2, AlertCircle, ShoppingBag, Phone, MapPin, ClipboardList, TrendingUp, X } from 'lucide-react';
import { useCombos } from '../../contexts/ComboContext';

export function ComboDashboard() {
  const { combos, notifications, markNotificationAsRead } = useCombos();
  const [activeTab, setActiveTab] = useState<'overview' | 'production' | 'deliveries' | 'customers'>('overview');

  // 1. Tính toán danh sách sản xuất cho hôm nay - NHÓM THEO KHÁCH HÀNG
  const productionByCustomer = useMemo(() => {
    const today = new Date().getDay();
    return combos
      .filter(c => c.status === 'active' && c.deliveryDays.includes(today))
      .map(combo => ({
        customerName: combo.customerName,
        planName: combo.comboType === 'weekly' ? 'Gói Tuần' : 'Gói Tháng',
        items: combo.items.filter(item => item.assignedDay === 'all' || item.assignedDay === today)
      }))
      .filter(entry => entry.items.length > 0);
  }, [combos]);

  // Danh sách tổng hợp (để pha chế số lượng lớn)
  const aggregatedProduction = useMemo(() => {
    const list: Record<string, number> = {};
    productionByCustomer.forEach(entry => {
      entry.items.forEach(item => {
        const key = `${item.product.name} (${item.size}, ${item.protein}g)`;
        list[key] = (list[key] || 0) + item.quantity;
      });
    });
    return Object.entries(list).sort((a, b) => b[1] - a[1]);
  }, [productionByCustomer]);

  const [selectedProductionEntry, setSelectedProductionEntry] = useState<any>(null);

  // 2. Danh sách giao hàng hôm nay
  const todayDeliveries = useMemo(() => {
    const today = new Date().getDay();
    return combos.filter(c => c.status === 'active' && c.deliveryDays.includes(today));
  }, [combos]);

  // 3. Khách hàng sắp hết hạn (còn dưới 2 buổi giao)
  const expiringSoon = useMemo(() => {
    return combos.filter(c => c.status === 'active').slice(0, 2); 
  }, [combos]);

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-2xl overflow-hidden relative">
      {/* Detail Modal - Optimized for POS */}
      {selectedProductionEntry && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200 border-4 border-emerald-500">
            <div className="p-6">
              {/* Header Sticker Style */}
              <div className="flex justify-between items-start mb-6 border-b-2 border-dashed border-gray-200 pb-4">
                <div>
                  <div className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">ĐƠN LIỆU TRÌNH HÔM NAY</div>
                  <h3 className="text-2xl font-black text-gray-900 leading-tight">{selectedProductionEntry.customerName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-gray-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      {selectedProductionEntry.planName}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedProductionEntry(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-3">
                {selectedProductionEntry.items.map((item: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-4 hover:bg-emerald-50 transition-colors group">
                    {/* Checkbox Icon */}
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white group-hover:border-emerald-500 transition-colors">
                      <div className="w-4 h-4 rounded-full bg-transparent group-hover:bg-emerald-500 transition-colors" />
                    </div>

                    {/* Image */}
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm border border-gray-100">
                      {item.product.image}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-gray-900 truncate">{item.product.name}</h4>
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">x{item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-gray-500 mt-1 uppercase tracking-tighter">
                        <span className="bg-white px-2 py-0.5 rounded border border-gray-200">Size: {item.size}</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-emerald-600">Pro: {item.protein}g</span>
                      </div>
                    </div>

                    {/* Toppings - Compact List */}
                    {item.toppings.length > 0 && (
                      <div className="hidden sm:block flex-1 border-l border-dashed border-gray-300 pl-4">
                        <div className="flex flex-wrap gap-1">
                          {item.toppings.map((t: string, i: number) => (
                            <span key={i} className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[9px] font-black border border-yellow-200 whitespace-nowrap">
                              + {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setSelectedProductionEntry(null)}
                className="w-full mt-6 bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" /> XÁC NHẬN XONG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Tabs */}
      <div className="bg-white px-6 pt-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" /> Quản Lý Combo Chuyên Sâu
          </h2>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'overview', label: 'Tổng Quan', icon: TrendingUp },
              { id: 'production', label: 'Sản Xuất', icon: ClipboardList },
              { id: 'deliveries', label: 'Giao Hàng', icon: MapPin },
              { id: 'customers', label: 'Khách Hàng', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100">
                <div className="text-emerald-600 font-bold text-sm mb-1">Đang hoạt động</div>
                <div className="text-4xl font-black text-gray-900">{combos.filter(c => c.status === 'active').length}</div>
                <div className="text-xs text-gray-400 mt-2">Combo liệu trình</div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100">
                <div className="text-blue-600 font-bold text-sm mb-1">Giao hôm nay</div>
                <div className="text-4xl font-black text-gray-900">{todayDeliveries.length}</div>
                <div className="text-xs text-gray-400 mt-2">Địa chỉ cần đến</div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100">
                <div className="text-orange-600 font-bold text-sm mb-1">Sắp hết hạn</div>
                <div className="text-4xl font-black text-gray-900">{expiringSoon.length}</div>
                <div className="text-xs text-gray-400 mt-2">Cần chăm sóc ngay</div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100">
                <div className="text-purple-600 font-bold text-sm mb-1">Thông báo mới</div>
                <div className="text-4xl font-black text-gray-900">{notifications.filter(n => !n.isRead).length}</div>
                <div className="text-xs text-gray-400 mt-2">Thay đổi từ khách</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Production Quick View */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-600" /> Pha Chế Sáng Nay ({productionByCustomer.length})
                  </h3>
                  <button onClick={() => setActiveTab('production')} className="text-emerald-600 font-bold text-sm hover:underline">Chi tiết</button>
                </div>
                <div className="space-y-3">
                  {productionByCustomer.slice(0, 5).map((entry, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setSelectedProductionEntry(entry)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-emerald-50 rounded-2xl transition-all border border-transparent hover:border-emerald-200 group"
                    >
                      <div className="text-left">
                        <div className="font-black text-gray-900">{entry.customerName}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase">{entry.planName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-emerald-600">{entry.items.length} món</div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-600 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" /> Cập Nhật Từ Khách Hàng
                </h3>
                <div className="space-y-4">
                  {notifications.length === 0 ? (
                    <p className="text-gray-400 text-center py-10">Không có thông báo mới</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-4 rounded-2xl border ${n.isRead ? 'bg-gray-50 border-gray-100' : 'bg-orange-50 border-orange-100'} transition-all`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-black text-gray-900">{n.customerName}</span>
                          <span className="text-[10px] text-gray-400">{new Date(n.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{n.message}</p>
                        {!n.isRead && (
                          <button onClick={() => markNotificationAsRead(n.id)} className="text-xs font-bold text-emerald-600 hover:underline">Đánh dấu đã đọc</button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'production' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Danh Sách Pha Chế Chi Tiết</h3>
                <p className="text-gray-500 font-medium">Nhấn vào từng khách hàng để xem công thức chi tiết</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-emerald-50 px-6 py-3 rounded-xl border border-emerald-100">
                  <div className="text-[10px] font-black text-emerald-600 uppercase">Tổng ly cần làm</div>
                  <div className="text-2xl font-black text-emerald-700">{aggregatedProduction.reduce((s, [, c]) => s + c, 0)} ly</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {productionByCustomer.map((entry, idx) => (
                <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-emerald-500 transition-all group flex flex-col md:flex-row items-center gap-6">
                  {/* Customer Info */}
                  <div className="w-full md:w-64 shrink-0">
                    <h4 className="font-black text-xl text-gray-900 leading-tight">{entry.customerName}</h4>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">{entry.planName}</p>
                  </div>
                  
                  {/* Items List - Horizontal */}
                  <div className="flex-1 flex flex-wrap gap-2 w-full">
                    {entry.items.map((item, i) => (
                      <div key={i} className="bg-white px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-3 shadow-sm">
                        <span className="text-xl">{item.product.image}</span>
                        <div>
                          <div className="text-sm font-black text-gray-800">{item.quantity}x {item.product.name}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">{item.size} • {item.protein}g</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action */}
                  <button 
                    onClick={() => setSelectedProductionEntry(entry)}
                    className="w-full md:w-auto px-6 py-3 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl font-black text-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    XEM CHI TIẾT <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'deliveries' && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
             <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
               <h3 className="text-2xl font-black text-gray-900 mb-6">Lộ Trình Giao Hàng Hôm Nay</h3>
               <div className="space-y-4">
                 {todayDeliveries.map(delivery => (
                   <div key={delivery.id} className="flex flex-col md:flex-row items-center gap-6 p-6 bg-gray-50 rounded-[2rem] border border-gray-100 group hover:border-emerald-500 transition-all">
                     <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm shrink-0">
                       {delivery.items[0]?.product.image || '🥤'}
                     </div>
                     <div className="flex-1 text-center md:text-left">
                       <div className="flex flex-col md:flex-row items-center gap-2 mb-1">
                         <span className="font-black text-xl text-gray-900">{delivery.customerName}</span>
                         <span className="bg-emerald-100 text-emerald-700 px-3 py-0.5 rounded-full text-xs font-bold">{delivery.comboType === 'weekly' ? 'Tuần' : 'Tháng'}</span>
                       </div>
                       <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-500 font-medium">
                         <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {delivery.customerPhone}</span>
                         <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {delivery.customerPhone}</span> {/* Giả lập địa chỉ */}
                       </div>
                     </div>
                     <div className="flex flex-col items-center md:items-end gap-2">
                       <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Sản phẩm:</div>
                       <div className="flex gap-1">
                         {delivery.items.map((item, i) => (
                           <div key={i} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                             {item.quantity}x {item.product.name}
                           </div>
                         ))}
                       </div>
                     </div>
                     <button className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2">
                       Xác Nhận Đã Giao <CheckCircle2 className="w-5 h-5" />
                     </button>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
             <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
               <h3 className="text-2xl font-black text-gray-900 mb-6">Quản Lý Khách Hàng Liệu Trình</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {combos.map(combo => (
                   <div key={combo.id} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                     <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-black text-xl">
                          {combo.customerName.charAt(0)}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          combo.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {combo.status}
                        </div>
                     </div>
                     <div>
                       <div className="font-black text-lg text-gray-900">{combo.customerName}</div>
                       <div className="text-sm text-gray-500 font-medium">{combo.customerPhone}</div>
                     </div>
                     <div className="bg-white p-4 rounded-2xl space-y-2 border border-gray-100">
                       <div className="flex justify-between text-xs">
                         <span className="text-gray-400 font-bold uppercase">Tiến độ:</span>
                         <span className="text-emerald-600 font-black">75%</span>
                       </div>
                       <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                         <div className="bg-emerald-500 h-full w-[75%]" />
                       </div>
                       <div className="text-[10px] text-gray-400 text-center pt-1 font-bold">Còn 2 buổi giao nữa</div>
                     </div>
                     <div className="flex gap-2">
                       <button className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50">Nhắn tin</button>
                       <button className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-100">Mời gia hạn</button>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
