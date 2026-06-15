import { ShoppingBag, X, Plus, Minus, ArrowRight, Edit3, Trash2 } from 'lucide-react';

interface CartItem {
  cartItemId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  protein?: number;
  toppings?: string[];
  isCustomCombo?: boolean;
  rawComboData?: any;
}

interface Props {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onEditCombo: (item: CartItem) => void;
}

export function CustomerCartPanel({ cart, isOpen, onClose, onUpdateQty, onRemove, onCheckout, onEditCombo }: Props) {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className={`fixed inset-0 z-40 transition-all duration-300 ${isOpen ? 'visible' : 'invisible pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex flex-col transition-transform duration-300 ease-out rounded-t-[2.5rem] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{
          background: '#ffffff',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          maxHeight: '85vh',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(0,0,0,0.1)' }} />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#00b14f' }}>
              <ShoppingBag className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 className="text-[17px] font-black text-zinc-900 leading-tight">Giỏ hàng của bạn</h2>
              <p className="text-[11px]" style={{ color: 'rgba(0,0,0,0.5)' }}>{itemCount} món · Freeship</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'rgba(0,0,0,0.05)' }}
          >
            <X className="w-5 h-5" style={{ color: 'rgba(0,0,0,0.4)' }} />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
          {cart.length === 0 ? (
            <div className="py-20 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(0,177,79,0.06)' }}>
                <ShoppingBag className="w-10 h-10" style={{ color: 'rgba(0,177,79,0.4)' }} />
              </div>
              <p className="font-black text-[16px]" style={{ color: 'rgba(0,0,0,0.4)' }}>Giỏ hàng trống</p>
              <p className="text-[13px] mt-1" style={{ color: 'rgba(0,0,0,0.3)' }}>Hãy chọn món ngon cho ngày hôm nay!</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.cartItemId}
                className="flex gap-3 rounded-[18px] p-3.5"
                style={{ background: '#f9f9fb', border: '1px solid rgba(0,0,0,0.05)' }}
              >
                {/* Image */}
                <div
                  className="w-[72px] h-[72px] rounded-2xl shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.03)' }}
                >
                  {item.image && (item.image.startsWith('/') || item.image.startsWith('data:')) ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{item.image || '🥤'}</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-zinc-900 text-[14px] leading-snug line-clamp-2 pr-1 flex-1">{item.name}</h4>
                      <button
                        onClick={() => onRemove(item.cartItemId)}
                        className="p-1 rounded-lg ml-1 shrink-0 transition-all"
                        style={{ color: 'rgba(239,68,68,0.7)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {item.isCustomCombo ? (
                      <div className="mt-1.5 space-y-1">
                        {item.toppings?.filter(t => t.startsWith('Ngày bắt đầu:')).map((t, i) => (
                          <span key={`start-${i}`} className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg"
                            style={{ background: 'rgba(251,191,36,0.15)', color: '#b45309' }}>
                            📅 {t.replace('Ngày bắt đầu: ', '')}
                          </span>
                        ))}
                        <div className="space-y-0.5">
                          {item.toppings?.filter(t => !t.startsWith('Ngày bắt đầu:')).slice(0, 2).map((t, i) => (
                            <span key={i} className="block text-[10px] pl-2" style={{ color: '#047857', borderLeft: '2px solid rgba(4,120,87,0.3)' }}>
                              ↳ {t}
                            </span>
                          ))}
                        </div>
                        {(item.toppings?.filter(t => !t.startsWith('Ngày bắt đầu:')).length || 0) > 2 && (
                          <button onClick={() => onEditCombo(item)} className="text-[10px] font-black flex items-center gap-1 mt-1" style={{ color: '#00b14f' }}>
                            <Edit3 className="w-3 h-3" /> Xem chi tiết lộ trình
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] mt-1 font-bold" style={{ color: 'rgba(0,0,0,0.4)' }}>
                        {item.size} · {item.protein}g protein
                        {item.toppings && item.toppings.length > 0 && ` · +${item.toppings.length} topping`}
                      </p>
                    )}
                  </div>

                  {/* Qty + Price */}
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
                      <button
                        onClick={() => onUpdateQty(item.cartItemId, -1)}
                        className="w-8 h-8 flex items-center justify-center transition-all"
                        style={{ color: 'rgba(0,0,0,0.5)' }}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-black text-[14px] text-zinc-900">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQty(item.cartItemId, 1)}
                        className="w-8 h-8 flex items-center justify-center transition-all"
                        style={{ color: '#00b14f' }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-black text-[15px]" style={{ color: '#00b14f' }}>
                      {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="px-5 py-5 shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: '#f9f9fb' }}>
            {/* Summary */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.5)' }}>Tổng thanh toán</p>
                <p className="text-[30px] font-black leading-none" style={{ color: '#00b14f' }}>
                  {total.toLocaleString('vi-VN')}đ
                </p>
              </div>
              <div className="text-right">
                <span
                  className="text-[11px] font-black px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(0,177,79,0.06)', color: '#00b14f', border: '1px solid rgba(0,177,79,0.15)' }}
                >
                  ✦ Freeship
                </span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="w-full py-4 rounded-[18px] font-black text-[16px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: '#00b14f', color: '#fff', boxShadow: '0 8px 32px rgba(0,177,79,0.25)' }}
            >
              TIẾN HÀNH THANH TOÁN
              <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `::-webkit-scrollbar { display: none; }` }} />
    </div>
  );
}

export type { CartItem };
