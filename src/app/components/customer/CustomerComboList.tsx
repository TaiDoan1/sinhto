import { useState } from 'react';
import { useCombos } from '../../contexts/ComboContext';
import { Package, Calendar, Clock, Edit3, LogIn, Phone, ArrowRight, X, ChevronRight, User } from 'lucide-react';
import { CustomComboBuilder } from './CustomComboBuilder';

export function CustomerComboList() {
  const { combos, updateCombo } = useCombos();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [editingCombo, setEditingCombo] = useState<any>(null);

  const customerCombos = combos.filter(c => c.customerPhone === phoneNumber);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length >= 10) {
      setIsLoggedIn(true);
    }
  };

  const handleUpdateCombo = (updatedData: any) => {
    updateCombo(updatedData.id, updatedData);
    setEditingCombo(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white rounded-[3rem] shadow-2xl border border-emerald-50 text-center space-y-8 animate-in zoom-in-95">
        <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-200">
          <User className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Combo Của Tôi</h2>
          <p className="text-gray-500 mt-2 font-medium">Nhập số điện thoại để xem lịch giao hàng</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest ml-2">Số điện thoại</label>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input 
                autoFocus
                type="tel"
                placeholder="0912345678"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:bg-white focus:border-emerald-600 font-bold text-xl transition-all"
              />
            </div>
          </div>
          <button 
            type="submit"
            disabled={phoneNumber.length < 10}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            Xem Ngay <ArrowRight className="w-6 h-6" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Gói Combo Đã Đăng Ký</h2>
          <p className="text-emerald-600 font-bold flex items-center gap-2 mt-1">
            <Phone className="w-4 h-4" /> {phoneNumber}
          </p>
        </div>
        <button onClick={() => setIsLoggedIn(false)} className="p-3 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-colors">Đăng xuất</button>
      </div>

      <div className="space-y-4 px-4">
        {customerCombos.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="font-bold text-gray-400">Bạn chưa đăng ký combo nào</p>
          </div>
        ) : (
          customerCombos.map(combo => (
            <div key={combo.id} className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-emerald-50 space-y-6 hover:border-emerald-200 transition-all group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                    <Package className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-gray-900">{combo.id}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">
                        {combo.comboType === 'weekly' ? 'Hàng Tuần' : 'Hàng Tháng'}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                        combo.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {combo.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Giá trị gói</div>
                  <div className="text-2xl font-black text-emerald-600">{combo.totalPrice.toLocaleString('vi-VN')}đ</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lịch giao</div>
                    <div className="text-sm font-bold text-gray-700">{combo.deliveryDays.length} ngày/tuần</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Giao tiếp theo</div>
                    <div className="text-sm font-bold text-gray-700">
                      {new Date(combo.nextDelivery).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex gap-3">
                <button 
                  onClick={() => setEditingCombo(combo)}
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-5 h-5" /> Thay Đổi Nội Dung
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL EDIT FOR CUSTOMER */}
      {editingCombo && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-2xl h-[90vh] sm:h-[80vh] rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden flex flex-col animate-in slide-in-from-bottom-20 duration-500">
            <div className="p-6 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-xl">Sửa Gói Combo</h3>
                  <p className="text-xs font-bold text-gray-400">ID: {editingCombo.id}</p>
                </div>
              </div>
              <button onClick={() => setEditingCombo(null)} className="p-4 bg-gray-100 text-gray-400 rounded-2xl hover:bg-gray-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CustomComboBuilder 
                isPOS={false}
                initialData={{
                  id: editingCombo.id,
                  name: editingCombo.name || `Combo ${editingCombo.comboType}`,
                  items: editingCombo.items,
                  comboType: editingCombo.comboType,
                  deliveryDays: editingCombo.deliveryDays,
                  totalPrice: editingCombo.totalPrice,
                  discount: 0,
                  finalPrice: editingCombo.totalPrice,
                  customerName: editingCombo.customerName,
                  customerPhone: editingCombo.customerPhone
                }}
                onClose={() => setEditingCombo(null)}
                onAddToCart={handleUpdateCombo}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
