import { Trash2, Printer, QrCode, Wallet, Smartphone, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { useCombos } from '../../contexts/ComboContext';
import { useLoyalty } from '../../contexts/LoyaltyContext';
import { LoyaltyCustomerSection } from './LoyaltyCustomerSection';
import { PosVoucherRedeem } from './PosVoucherRedeem';

type CheckoutStep = 'cart' | 'loyalty' | 'payment';

interface CheckoutPanelProps {
  cart: CartItem[];
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
}

export function CheckoutPanel({ cart, onRemoveItem, onClearCart }: CheckoutPanelProps) {
  const { addOrder } = useOrders();
  const { addCombo } = useCombos();
  const {
    addPoints,
    spendPoints,
    calcEarnedPoints,
    calcProgramDiscount,
    activeCustomer,
    redeemPointsAmount,
    selectedRedeemProgramId,
    activeVoucher,
    markVoucherUsed,
    resetLoyalty
  } = useLoyalty();

  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'momo' | 'zalopay' | 'qr' | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const pointsDiscount = calcProgramDiscount(subtotal, selectedRedeemProgramId);
  const total = Math.max(0, subtotal - pointsDiscount);
  const estimatedPointsEarned = calcEarnedPoints(total);

  useEffect(() => {
    if (cart.length === 0) setCheckoutStep('cart');
  }, [cart.length]);

  const stepTitle = checkoutStep === 'cart' ? 'Giỏ Hàng' : checkoutStep === 'loyalty' ? 'Tích Điểm' : 'Thanh Toán';

  const handleSelectPayment = (method: 'cash' | 'momo' | 'zalopay' | 'qr') => {
    setSelectedPayment(method);
    setShowPaymentConfirm(true);
  };

  const completePayment = async () => {
    const orderItems = cart.map(item => ({
      name: item.name || item.productName,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      protein: item.protein,
      toppings: item.toppings,
      isCustomCombo: item.isCustomCombo,
      rawComboData: item.rawComboData
    }));

    addOrder({
      branchId: 'CN1',
      source: 'counter',
      items: orderItems,
      status: 'preparing',
      total: total,
      staff: 'POS - Nhân viên quầy'
    });

    orderItems.forEach(async (item) => {
      if (item.isCustomCombo && item.rawComboData) {
        try {
          await addCombo({
            customerName: item.rawComboData.customerName || activeCustomer?.name || 'Khách tại quầy',
            customerPhone: item.rawComboData.customerPhone || activeCustomer?.phone || '',
            comboType: item.rawComboData.comboType || 'weekly',
            startDate: new Date(),
            nextDelivery: new Date(),
            deliveryDays: item.rawComboData.deliveryDays || [1, 2, 3, 4, 5],
            items: item.rawComboData.items || item.rawComboData,
            totalPrice: item.price,
            status: 'active',
            staff: 'POS - Nhân viên quầy',
            branchId: 'CN1',
            planName: item.name,
          });
        } catch (err) {
          console.error('Failed to create combo:', err);
        }
      }
    });

    if (activeVoucher) {
      try {
        await markVoucherUsed(activeVoucher.code);
      } catch (err) {
        console.error('Lỗi đánh dấu voucher:', err);
      }
    }
    if (activeCustomer) {
      try {
        if (!activeVoucher && redeemPointsAmount > 0) {
          await spendPoints(activeCustomer.id, redeemPointsAmount);
        }
        if (estimatedPointsEarned > 0) {
          await addPoints(activeCustomer.id, total);
        }
      } catch (err) {
        console.error('Lỗi cập nhật điểm loyalty:', err);
      }
    }

    setTimeout(() => handlePrint(), 100);

    onClearCart();
    setShowPaymentConfirm(false);
    setSelectedPayment(null);
    setCheckoutStep('cart');
    resetLoyalty();
  };

  const handlePrint = () => {
    const now = new Date();
    const orderNumber = `ORD-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    const printContent = `
FitBlend Smoothie Bar
================================
BILL BẾP - KITCHEN ORDER
================================
Mã ĐH: ${orderNumber}
Thời gian: ${now.toLocaleTimeString('vi-VN')}
NV Order: POS - Nhân viên quầy
--------------------------------
${cart.map((item, idx) => `
${idx + 1}. ${item.productName}
   Size: ${item.size}
   Protein: ${item.protein}g
   Toppings: ${item.toppings.join(', ') || 'Không'}
   SL: ${item.quantity}
`).join('\n')}
================================
Tổng tiền: ${total.toLocaleString('vi-VN')}đ
${activeCustomer ? `Tích lũy: Khách ${activeCustomer.name} (${activeCustomer.phone})\n+ Thêm: ${estimatedPointsEarned} điểm\n` : ''}
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
  };

  const renderTotals = (showLoyaltyLines: boolean) => (
    <div className="space-y-1 text-xs">
      {showLoyaltyLines && pointsDiscount > 0 && (
        <div className="flex justify-between">
          <span className="text-gray-600">Tạm tính:</span>
          <span className="font-semibold">{subtotal.toLocaleString('vi-VN')}đ</span>
        </div>
      )}
      {showLoyaltyLines && pointsDiscount > 0 && (
        <div className="flex justify-between text-pink-600 font-semibold">
          <span>{activeVoucher ? `Mã ${activeVoucher.code}:` : 'Giảm điểm loyalty:'}</span>
          <span>-{pointsDiscount.toLocaleString('vi-VN')}đ</span>
        </div>
      )}
      {showLoyaltyLines && activeCustomer && estimatedPointsEarned > 0 && (
        <div className="flex justify-between text-emerald-600 text-[10px] font-medium">
          <span>Tích lũy ước tính:</span>
          <span>+{estimatedPointsEarned} điểm</span>
        </div>
      )}
      <div className="flex justify-between text-sm border-t pt-1">
        <span className="font-bold">TỔNG:</span>
        <span className="font-bold text-emerald-700">
          {(showLoyaltyLines ? total : subtotal).toLocaleString('vi-VN')}đ
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md relative">
      <div className="bg-gradient-to-r from-emerald-500 to-pink-500 text-white p-2 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            {checkoutStep !== 'cart' && (
              <button
                onClick={() => setCheckoutStep(checkoutStep === 'payment' ? 'loyalty' : 'cart')}
                className="p-0.5 rounded active:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-bold">{stepTitle}</h2>
          </div>
          {checkoutStep === 'cart' && (
            <button
              onClick={onClearCart}
              className="bg-white bg-opacity-20 active:bg-opacity-30 px-2 py-0.5 rounded text-xs font-semibold transition-colors"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {checkoutStep === 'loyalty' && <LoyaltyCustomerSection orderSubtotal={subtotal} />}

      {checkoutStep !== 'loyalty' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🛒</div>
              <p className="text-sm">Giỏ trống</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="bg-gray-50 rounded p-2 border border-gray-200">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm truncate">{item.productName}</div>
                    {item.isCustomCombo ? (
                      <div className="mt-1.5 space-y-1">
                        {item.toppings.map((t, tIdx) => (
                          <div key={tIdx} className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100 flex items-start gap-1 font-medium leading-tight">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-emerald-600" />
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {item.size} | {item.protein}g
                        </div>
                        {item.toppings.length > 0 && (
                          <div className="text-xs text-emerald-600 font-medium mt-0.5">
                            + {item.toppings.join(', ')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {checkoutStep === 'cart' && (
                    <button
                      onClick={() => onRemoveItem(idx)}
                      className="text-red-500 active:text-red-700 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">SL: {item.quantity}</span>
                  <span className="font-bold text-emerald-700">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {checkoutStep === 'loyalty' && (
        <div className="flex-1 overflow-y-auto p-3">
          {renderTotals(true)}
        </div>
      )}

      <div className="border-t p-2 space-y-2">
        {checkoutStep === 'cart' && (
          <>
            {renderTotals(false)}
            <button
              onClick={() => setCheckoutStep('loyalty')}
              disabled={cart.length === 0}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 active:from-emerald-700 active:to-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-bold transition-colors text-sm shadow-md"
            >
              Hoàn Thành Đơn
            </button>
          </>
        )}

        {checkoutStep === 'loyalty' && (
          <div className="flex gap-2">
            <button
              onClick={() => setCheckoutStep('payment')}
              className="flex-1 bg-gray-100 active:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-xs"
            >
              Không tích điểm
            </button>
            <button
              onClick={() => setCheckoutStep('payment')}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-2.5 rounded-lg font-bold text-xs shadow-md"
            >
              Tiếp Tục Thanh Toán
            </button>
          </div>
        )}

        {checkoutStep === 'payment' && (
          <>
            <div className="px-2 pb-2">
              <PosVoucherRedeem orderSubtotal={subtotal} variant="compact" />
            </div>
            {renderTotals(true)}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleSelectPayment('qr')}
                className="bg-emerald-600 active:bg-emerald-700 text-white py-2 rounded font-semibold flex items-center justify-center gap-1 transition-colors text-xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                QR
              </button>
              <button
                onClick={() => handleSelectPayment('cash')}
                className="bg-green-500 active:bg-green-600 text-white py-2 rounded font-semibold flex items-center justify-center gap-1 transition-colors text-xs"
              >
                <Wallet className="w-3.5 h-3.5" />
                Tiền
              </button>
              <button
                onClick={() => handleSelectPayment('momo')}
                className="bg-pink-500 active:bg-pink-600 text-white py-2 rounded font-semibold flex items-center justify-center gap-1 transition-colors text-xs"
              >
                <Smartphone className="w-3.5 h-3.5" />
                MoMo
              </button>
              <button
                onClick={() => handleSelectPayment('zalopay')}
                className="bg-emerald-700 active:bg-emerald-800 text-white py-2 rounded font-semibold flex items-center justify-center gap-1 transition-colors text-xs"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Zalo
              </button>
            </div>
            <button
              onClick={handlePrint}
              className="w-full bg-gray-700 active:bg-gray-800 text-white py-2 rounded font-semibold flex items-center justify-center gap-1 transition-colors text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              In Bill
            </button>
          </>
        )}
      </div>

      {showPaymentConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            {selectedPayment === 'qr' && (
              <>
                <h3 className="text-xl font-bold text-center mb-4">Quét Mã QR Để Thanh Toán</h3>
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
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

            {selectedPayment === 'cash' && (
              <>
                <h3 className="text-xl font-bold text-center mb-4 text-green-600">Thanh Toán Tiền Mặt</h3>
                <div className="text-center mb-4">
                  <div className="text-6xl mb-3">💵</div>
                  <div className="text-sm text-gray-600">Số tiền cần thanh toán</div>
                  <div className="text-3xl font-bold text-green-600">
                    {total.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </>
            )}

            {selectedPayment === 'momo' && (
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

            {selectedPayment === 'zalopay' && (
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

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentConfirm(false);
                  setSelectedPayment(null);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={completePayment}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Printer className="w-5 h-5" />
                Xác Nhận & In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
