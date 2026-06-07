import { ShoppingBag, X, Plus, Minus, ArrowRight, Edit3 } from 'lucide-react';

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

  return (
    <div className={`fixed inset-0 z-40 transition-all duration-300 ${isOpen ? 'visible' : 'invisible pointer-events-none'}`}>
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />

      {/* Panel */}
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-2xl max-h-[85vh] flex flex-col transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

        {/* Header */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-gray-900">Giỏ hàng</h2>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-lg">{cart.length}</span>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-xl text-gray-400 hover:bg-gray-200"><X className="w-5 h-5" /></button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-gray-300">
              <ShoppingBag className="w-16 h-16 mb-3 opacity-40" />
              <p className="font-bold text-gray-400">Giỏ hàng trống</p>
            </div>
          ) : cart.map(item => (
            <div key={item.cartItemId} className="flex gap-3 bg-gray-50 rounded-2xl p-3">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-3xl shrink-0 shadow-sm">{item.image || '🥤'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</h4>
                  <button onClick={() => onRemove(item.cartItemId)} className="text-gray-300 hover:text-red-500 ml-1"><X className="w-4 h-4" /></button>
                </div>
                {item.isCustomCombo ? (
                  <div className="mt-1 space-y-0.5">
                    {item.toppings?.filter(t => t.startsWith('Ngày bắt đầu:')).map((t, i) => (
                      <span key={`start-${i}`} className="block text-[11px] font-black text-[#d97706] mb-1">
                        📅 {t}
                      </span>
                    ))}
                    {item.toppings?.filter(t => !t.startsWith('Ngày bắt đầu:')).slice(0, 3).map((t, i) => (
                      <span key={i} className="block text-[10px] text-emerald-600 pl-2 border-l-2 border-emerald-200">
                        ↳ {t}
                      </span>
                    ))}
                    {(item.toppings?.filter(t => !t.startsWith('Ngày bắt đầu:')).length || 0) > 3 && (
                      <span className="text-[10px] text-gray-400 block pl-2">
                        +{(item.toppings?.filter(t => !t.startsWith('Ngày bắt đầu:')).length || 0) - 3} chi tiết khác
                      </span>
                    )}
                    <button onClick={() => onEditCombo(item)} className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-1.5">
                      <Edit3 className="w-3 h-3" /> Chi tiết lộ trình
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{item.size} • {item.protein}g protein{item.toppings && item.toppings.length > 0 && ` • +${item.toppings.join(', ')}`}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center bg-white rounded-xl border border-gray-200">
                    <button onClick={() => onUpdateQty(item.cartItemId, -1)} className="w-7 h-7 flex items-center justify-center text-gray-500"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.cartItemId, 1)} className="w-7 h-7 flex items-center justify-center text-gray-500"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                  <span className="font-extrabold text-gray-900 text-sm">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-bold">Tổng cộng</span>
              <span className="text-2xl font-black text-emerald-700">{total.toLocaleString('vi-VN')}đ</span>
            </div>
            <button onClick={onCheckout} className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl">
              Đặt hàng <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export type { CartItem };
