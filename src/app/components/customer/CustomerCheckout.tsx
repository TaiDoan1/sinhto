import { useState } from 'react';
import { ArrowLeft, MapPin, Banknote, QrCode, ShieldCheck, Ticket, Landmark, CheckCircle2 } from 'lucide-react';
import { useBranches } from '../../contexts/BranchContext';

interface Props {
  total: number;
  onClose: () => void;
  onPlaceOrder: (form: { name: string; phone: string; address: string; paymentMethod: string; branchId?: string; promoCode?: string }) => void;
}

const inputStyle = {
  background: '#f5f5f5',
  border: '1.5px solid rgba(0,0,0,0.06)',
  color: '#0f172a',
  borderRadius: '14px',
};

const inputFocusClass = 'outline-none transition-all w-full px-4 py-3.5 text-sm font-medium';

export function CustomerCheckout({ total, onClose, onPlaceOrder }: Props) {
  const { activeBranches } = useBranches();
  const branches = activeBranches.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
  }));
  const defaultBranchId = branches[0]?.id || 'CN1';
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'cash',
    branchId: defaultBranchId,
    promoCode: '',
  });
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoMsg, setPromoMsg] = useState('');

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleApplyPromo = () => {
    if (!form.promoCode.trim()) return;
    setPromoApplied(true);
    setPromoMsg('Áp dụng mã thành công! Đã ghi nhận mã ưu đãi của bạn.');
  };

  const handleSubmit = () => {
    if (!form.name || !form.phone || !form.address) return alert('Vui lòng nhập đầy đủ thông tin giao hàng!');
    onPlaceOrder(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-lg sm:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden flex flex-col animate-slide-up"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.08)',
          maxHeight: '92vh',
        }}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-4 pb-1 shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(0,0,0,0.1)' }} />
        </div>

        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl transition-all"
            style={{ background: 'rgba(0,0,0,0.05)' }}
          >
            <ArrowLeft className="w-5 h-5 text-zinc-700" />
          </button>
          <div>
            <h2 className="text-[18px] font-black text-zinc-900 leading-tight">Xác nhận đặt hàng</h2>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(0,0,0,0.4)' }}>
              FitBlend Fresh Smoothie Delivery
            </p>
          </div>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6" style={{ scrollbarWidth: 'none' }}>

          {/* Thông tin giao hàng */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,177,79,0.1)' }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: '#00b14f' }} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.5)' }}>
                Thông tin giao hàng
              </span>
            </div>
            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="Họ và tên người nhận"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                className={inputFocusClass}
                style={inputStyle}
              />
              <input
                type="tel"
                placeholder="Số điện thoại liên lạc"
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                className={inputFocusClass}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Địa chỉ giao hàng chi tiết"
                value={form.address}
                onChange={e => update('address', e.target.value)}
                className={inputFocusClass}
                style={inputStyle}
              />
            </div>
          </section>

          {/* Chọn Chi Nhánh */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,177,79,0.1)' }}>
                <Landmark className="w-3.5 h-3.5" style={{ color: '#00b14f' }} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.5)' }}>
                Chi Nhánh pha chế
              </span>
            </div>
            <div className="space-y-2">
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => update('branchId', b.id)}
                  className="w-full flex items-center justify-between p-4 rounded-[14px] text-left transition-all"
                  style={form.branchId === b.id
                    ? { background: 'rgba(0,177,79,0.06)', border: '1.5px solid rgba(0,177,79,0.3)' }
                    : { background: '#f9f9fb', border: '1.5px solid rgba(0,0,0,0.05)' }
                  }
                >
                  <div>
                    <p className="font-black text-[13px]" style={{ color: form.branchId === b.id ? '#00b14f' : 'rgba(0,0,0,0.8)' }}>
                      {b.name}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(0,0,0,0.4)' }}>{b.address}</p>
                  </div>
                  {form.branchId === b.id && (
                    <CheckCircle2 className="w-5 h-5 shrink-0 ml-2" style={{ color: '#00b14f' }} />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Mã giảm giá */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)' }}>
                <Ticket className="w-3.5 h-3.5" style={{ color: '#b45309' }} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.5)' }}>
                Khuyến mãi / Mã giảm giá
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập mã giảm giá..."
                value={form.promoCode}
                onChange={e => update('promoCode', e.target.value.toUpperCase())}
                className={inputFocusClass + ' flex-1'}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="px-5 py-3 rounded-[14px] font-black text-[12px] uppercase tracking-wider transition-all active:scale-95 shrink-0"
                style={{ background: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.7)', border: '1.5px solid rgba(0,0,0,0.1)' }}
              >
                Áp dụng
              </button>
            </div>
            {promoApplied && (
              <p className="text-[12px] font-bold mt-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,177,79,0.06)', color: '#00b14f', border: '1px solid rgba(0,177,79,0.12)' }}>
                ✓ {promoMsg}
              </p>
            )}
          </section>

          {/* Phương thức thanh toán */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,177,79,0.1)' }}>
                <Banknote className="w-3.5 h-3.5" style={{ color: '#00b14f' }} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.5)' }}>
                Phương thức thanh toán
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { id: 'cash',     label: 'Tiền mặt (COD)',          desc: 'Thanh toán khi nhận hàng',       icon: <Banknote className="w-5 h-5" />,  accent: '#00b14f' },
                { id: 'transfer', label: 'Chuyển khoản QR',          desc: 'Quét mã – giao dịch tức thì',   icon: <QrCode className="w-5 h-5" />,   accent: '#2563eb' },
              ].map(pm => (
                <button
                  key={pm.id}
                  onClick={() => update('paymentMethod', pm.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-[16px] transition-all text-left"
                  style={form.paymentMethod === pm.id
                    ? { background: `rgba(${pm.id === 'cash' ? '0,177,79' : '37,99,235'},0.06)`, border: `1.5px solid rgba(${pm.id === 'cash' ? '0,177,79' : '37,99,235'},0.3)` }
                    : { background: '#f9f9fb', border: '1.5px solid rgba(0,0,0,0.05)' }
                  }
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: form.paymentMethod === pm.id ? `rgba(${pm.id === 'cash' ? '0,177,79' : '37,99,235'},0.1)` : 'rgba(0,0,0,0.05)', color: form.paymentMethod === pm.id ? pm.accent : 'rgba(0,0,0,0.4)' }}
                  >
                    {pm.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-[13px]" style={{ color: form.paymentMethod === pm.id ? pm.accent : 'rgba(0,0,0,0.8)' }}>
                      {pm.label}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(0,0,0,0.4)' }}>{pm.desc}</p>
                  </div>
                  {form.paymentMethod === pm.id && (
                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: pm.accent }} />
                  )}
                </button>
              ))}
            </div>
          </section>

        </div>

        {/* Footer CTA */}
        <div className="px-5 py-5 shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: '#f9f9fb' }}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.5)' }}>Tổng số tiền cần trả</p>
              <p className="text-[30px] font-black leading-none" style={{ color: '#00b14f' }}>
                {total.toLocaleString('vi-VN')}đ
              </p>
            </div>
            <span className="text-[11px] font-black px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(0,177,79,0.06)', color: '#00b14f', border: '1px solid rgba(0,177,79,0.15)' }}>
              Freeship trọn đời
            </span>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-4 rounded-[18px] font-black text-[16px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: '#00b14f', color: '#fff', boxShadow: '0 8px 32px rgba(0,177,79,0.25)' }}
          >
            <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />
            XÁC NHẬN ĐẶT ĐƠN HÀNG
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from { transform: translateY(60px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards; }
        input::placeholder { color: rgba(0,0,0,0.35); }
        select option { background: #ffffff; color: #111; }
        ::-webkit-scrollbar { display: none; }
      ` }} />
    </div>
  );
}
