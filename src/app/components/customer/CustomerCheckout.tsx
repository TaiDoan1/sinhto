import { useState } from 'react';
import { ArrowLeft, MapPin, Banknote, QrCode, ShieldCheck } from 'lucide-react';

interface Props {
  total: number;
  onClose: () => void;
  onPlaceOrder: (form: { name: string; phone: string; address: string; paymentMethod: string }) => void;
}

export function CustomerCheckout({ total, onClose, onPlaceOrder }: Props) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', paymentMethod: 'cash' });
  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    if (!form.name || !form.phone || !form.address) return alert('Vui lòng nhập đầy đủ thông tin!');
    onPlaceOrder(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center gap-3 shrink-0">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-black text-gray-900">Xác nhận đơn hàng</h2>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="space-y-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Thông tin giao hàng
            </h3>
            <input type="text" placeholder="Họ và tên" value={form.name} onChange={e => update('name', e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium" />
            <input type="tel" placeholder="Số điện thoại" value={form.phone} onChange={e => update('phone', e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium" />
            <input type="text" placeholder="Địa chỉ giao hàng" value={form.address} onChange={e => update('address', e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium" />
          </section>

          <section className="space-y-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Thanh toán
            </h3>
            {[
              { id: 'cash', label: 'Tiền mặt (COD)', desc: 'Thanh toán khi nhận hàng', icon: <Banknote className="w-6 h-6" />, color: 'bg-green-100 text-green-600' },
              { id: 'transfer', label: 'Chuyển khoản QR', desc: 'Quét mã QR', icon: <QrCode className="w-6 h-6" />, color: 'bg-emerald-100 text-emerald-700' },
            ].map(pm => (
              <label key={pm.id} onClick={() => update('paymentMethod', pm.id)}
                className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${form.paymentMethod === pm.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pm.color}`}>{pm.icon}</div>
                <div>
                  <div className="font-bold text-gray-900">{pm.label}</div>
                  <div className="text-xs text-gray-500">{pm.desc}</div>
                </div>
              </label>
            ))}
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-500">Tổng thanh toán</span>
            <span className="text-2xl font-black text-emerald-700">{total.toLocaleString('vi-VN')}đ</span>
          </div>
          <button onClick={handleSubmit}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Xác nhận đặt hàng
          </button>
        </div>
      </div>
    </div>
  );
}
