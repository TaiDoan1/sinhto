import { Wallet, QrCode, Smartphone, Printer, ArrowLeft, Banknote } from 'lucide-react';
import { useState } from 'react';
import type { CartItem } from './StaffModifierModal';
import { useOrders } from '../../contexts/OrderContext';

interface StaffCheckoutProps {
  cart: CartItem[];
  onBack: () => void;
  onComplete: () => void;
}

export function StaffCheckout({ cart, onBack, onComplete }: StaffCheckoutProps) {
  const { addOrder } = useOrders();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'momo' | 'zalopay' | null>(null);
  const [cashGiven, setCashGiven] = useState('');
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + tax;
  const change = cashGiven ? Math.max(0, parseInt(cashGiven) - total) : 0;

  const handleSelectPayment = (method: 'cash' | 'qr' | 'momo' | 'zalopay') => {
    setPaymentMethod(method);
    if (method === 'cash') {
      // Tiền mặt không cần show confirm ngay, đợi nhập số tiền
      return;
    }
    // Các phương thức khác show confirm ngay
    setShowPaymentConfirm(true);
  };

  const handleConfirmPayment = () => {
    if (paymentMethod === 'cash') {
      if (!cashGiven || parseInt(cashGiven) < total) {
        alert('Vui lòng nhập số tiền khách đưa!');
        return;
      }
    }
    handlePrintAndComplete();
  };

  const handlePrintAndComplete = () => {
    const now = new Date();
    const orderNumber = `ORD-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    const printContent = `
FitBlend Smoothie Bar
================================
BILL BẾP - KITCHEN ORDER
================================
Mã ĐH: ${orderNumber}
Thời gian: ${now.toLocaleTimeString('vi-VN')}
NV Order: Nguyễn Văn An
--------------------------------
${cart.map((item, idx) => `
${idx + 1}. ${item.productName}
   Size: ${item.size}
   Protein: ${item.protein}g
   ${item.toppings.length > 0 ? `Topping: ${item.toppings.join(', ')}` : 'Topping: Không'}
   SL: ${item.quantity}
`).join('\n')}
================================
Tổng tiền: ${total.toLocaleString('vi-VN')}đ
${paymentMethod === 'cash' ? `Tiền khách đưa: ${parseInt(cashGiven).toLocaleString('vi-VN')}đ
Tiền thối: ${change.toLocaleString('vi-VN')}đ` : ''}
    `.trim();

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>In Hóa Đơn</title>
            <style>
              body { font-family: monospace; width: 58mm; margin: 0; padding: 10px; }
              pre { white-space: pre-wrap; margin: 0; font-size: 12px; }
            </style>
          </head>
          <body>
            <pre>${printContent}</pre>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }

    // Tạo đơn hàng mới - thanh toán trước, nhận đồ sau
    const orderItems = cart.map(item =>
      `${item.productName} (${item.size}, ${item.protein}g)${item.toppings.length > 0 ? ` + ${item.toppings.join(', ')}` : ''} x${item.quantity}`
    );

    addOrder({
      branchId: 'CN1',
      source: 'mobile',
      items: orderItems,
      status: 'preparing',
      total: total,
      staff: 'Nguyễn Văn An'
    });

    // Tự động hoàn tất thanh toán
    setTimeout(() => {
      onComplete();
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-4 flex items-center gap-3 shadow-lg">
        <button onClick={onBack} className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center active:scale-90 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Thanh Toán</h1>
          <p className="text-sm opacity-90">{cart.length} món</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <h3 className="font-bold mb-3">Chi Tiết Đơn Hàng</h3>
          <div className="space-y-2 mb-3">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <div className="flex-1">
                  <div className="font-semibold">{item.productName}</div>
                  <div className="text-xs text-gray-600">
                    {item.size} • {item.protein}g • x{item.quantity}
                  </div>
                </div>
                <div className="font-bold text-emerald-700">
                  {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tạm tính:</span>
              <span className="font-semibold">{subtotal.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (8%):</span>
              <span className="font-semibold">{tax.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>TỔNG CỘNG:</span>
              <span className="text-red-600">{total.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5 mb-4 border border-gray-100">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-700 rounded"></span>
            Phương Thức Thanh Toán
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSelectPayment('cash')}
              className={`p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                paymentMethod === 'cash'
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <Wallet className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'}`} />
              <div className={`font-semibold text-sm ${paymentMethod === 'cash' ? 'text-green-700' : 'text-gray-600'}`}>Tiền Mặt</div>
            </button>

            <button
              onClick={() => handleSelectPayment('qr')}
              className={`p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                paymentMethod === 'qr'
                  ? 'border-emerald-600 bg-emerald-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <QrCode className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === 'qr' ? 'text-emerald-700' : 'text-gray-400'}`} />
              <div className={`font-semibold text-sm ${paymentMethod === 'qr' ? 'text-emerald-800' : 'text-gray-600'}`}>VietQR</div>
            </button>

            <button
              onClick={() => handleSelectPayment('momo')}
              className={`p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                paymentMethod === 'momo'
                  ? 'border-pink-500 bg-pink-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <Smartphone className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === 'momo' ? 'text-pink-600' : 'text-gray-400'}`} />
              <div className={`font-semibold text-sm ${paymentMethod === 'momo' ? 'text-pink-700' : 'text-gray-600'}`}>MoMo</div>
            </button>

            <button
              onClick={() => handleSelectPayment('zalopay')}
              className={`p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                paymentMethod === 'zalopay'
                  ? 'border-emerald-500 bg-emerald-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <Smartphone className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === 'zalopay' ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div className={`font-semibold text-sm ${paymentMethod === 'zalopay' ? 'text-emerald-700' : 'text-gray-600'}`}>ZaloPay</div>
            </button>
          </div>
        </div>

        {paymentMethod === 'cash' && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <h3 className="font-bold mb-3">Tiền Khách Đưa</h3>
            <div className="relative mb-3">
              <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={cashGiven}
                onChange={(e) => {
                  setCashGiven(e.target.value);
                  if (e.target.value && parseInt(e.target.value) >= total) {
                    setShowPaymentConfirm(true);
                  }
                }}
                placeholder="Nhập số tiền..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-lg font-bold focus:border-green-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[50000, 100000, 200000, 500000].map(amount => (
                <button
                  key={amount}
                  onClick={() => {
                    setCashGiven(amount.toString());
                    if (amount >= total) {
                      setShowPaymentConfirm(true);
                    }
                  }}
                  className="bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold text-sm"
                >
                  {(amount / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
            {cashGiven && parseInt(cashGiven) >= total && (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-700 font-semibold">Tiền Thối:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {change.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!showPaymentConfirm && (
        <div className="p-4 bg-white border-t shadow-lg">
          <div className="text-center text-gray-500 text-sm mb-2">
            {paymentMethod ? 'Vui lòng xác nhận thanh toán' : 'Chọn phương thức thanh toán'}
          </div>
        </div>
      )}

      {showPaymentConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            {paymentMethod === 'qr' && (
              <>
                <h3 className="text-xl font-bold text-center mb-4">Quét Mã QR Để Thanh Toán</h3>
                <div className="bg-gray-100 p-4 rounded-xl mb-4">
                  <div className="aspect-square bg-white flex items-center justify-center">
                    <QrCode className="w-48 h-48 text-gray-400" />
                  </div>
                </div>
                <div className="text-center mb-4">
                  <div className="text-sm text-gray-600">Số tiền</div>
                  <div className="text-3xl font-bold text-emerald-700">
                    {total.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </>
            )}

            {paymentMethod === 'momo' && (
              <>
                <h3 className="text-xl font-bold text-center mb-4 text-pink-600">Thanh Toán MoMo</h3>
                <div className="text-center mb-4">
                  <div className="text-6xl mb-3">📱</div>
                  <div className="text-sm text-gray-600">Số tiền thanh toán</div>
                  <div className="text-3xl font-bold text-pink-600">
                    {total.toLocaleString('vi-VN')}đ
                  </div>
                </div>
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mb-4 text-sm text-gray-700">
                  Khách vui lòng mở MoMo và quét mã để thanh toán
                </div>
              </>
            )}

            {paymentMethod === 'zalopay' && (
              <>
                <h3 className="text-xl font-bold text-center mb-4 text-emerald-700">Thanh Toán ZaloPay</h3>
                <div className="text-center mb-4">
                  <div className="text-6xl mb-3">💳</div>
                  <div className="text-sm text-gray-600">Số tiền thanh toán</div>
                  <div className="text-3xl font-bold text-emerald-700">
                    {total.toLocaleString('vi-VN')}đ
                  </div>
                </div>
                <div className="bg-emerald-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-gray-700">
                  Khách vui lòng mở ZaloPay và quét mã để thanh toán
                </div>
              </>
            )}

            {paymentMethod === 'cash' && (
              <>
                <h3 className="text-xl font-bold text-center mb-4 text-green-600">Thanh Toán Tiền Mặt</h3>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Tổng tiền:</span>
                    <span className="font-bold">{total.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Khách đưa:</span>
                    <span className="font-bold text-green-600">{parseInt(cashGiven).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-2xl border-t pt-3">
                    <span className="text-gray-600">Tiền thối:</span>
                    <span className="font-bold text-green-600">{change.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentConfirm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-bold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmPayment}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Printer className="w-5 h-5" />
                Xác Nhận & In Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
