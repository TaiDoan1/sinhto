import { X, Trash2, Printer, QrCode, Wallet, Smartphone, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { useCombos } from '../../contexts/ComboContext';
import { useLoyalty } from '../../contexts/LoyaltyContext';
import { useInventory } from '../../contexts/InventoryContext';
import { LoyaltyCustomerSection } from './LoyaltyCustomerSection';
import { PosVoucherRedeem } from './PosVoucherRedeem';
import { buildComboPayloadFromRaw } from '../../utils/comboUtils';

type CheckoutStep = 'cart' | 'loyalty' | 'payment';

interface MobileCheckoutModalProps {
  cart: CartItem[];
  branchId: string;
  onClose: () => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
}

export function MobileCheckoutModal({ cart, branchId, onClose, onRemoveItem, onClearCart }: MobileCheckoutModalProps) {
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
    resetLoyalty,
  } = useLoyalty();
  const { checkCartStock, formatShortageMessage } = useInventory();

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
    const stockLines = cart.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      name: item.name,
      size: item.size,
      protein: item.protein,
      toppings: item.toppings,
      quantity: item.quantity,
      isCustomCombo: item.isCustomCombo,
    }));
    const stockCheck = checkCartStock(stockLines);
    if (!stockCheck.ok) {
      alert(`Không thể thanh toán:\n${formatShortageMessage(stockCheck.shortages)}`);
      return;
    }

    const orderItems = cart.map(item => ({
      productId: item.productId,
      productName: item.productName,
      name: item.name || item.productName,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      protein: item.protein,
      toppings: item.toppings,
      isCustomCombo: item.isCustomCombo,
      rawComboData: item.rawComboData
    }));

    const ok = addOrder({
      branchId,
      source: 'counter',
      items: orderItems,
      status: 'preparing',
      total: total,
      staff: 'POS - Nhân viên quầy'
    });
    if (!ok) {
      alert('Trừ kho thất bại. Kiểm tra tồn kho hoặc nhập kho trước.');
      return;
    }

    orderItems.forEach(async (item) => {
      if (item.isCustomCombo && item.rawComboData) {
        try {
          const payload = buildComboPayloadFromRaw(item.rawComboData, {
            customerName: item.rawComboData.customerName || activeCustomer?.name || 'Khách tại quầy',
            customerPhone: item.rawComboData.customerPhone || activeCustomer?.phone || '',
            totalPrice: item.price,
            branchId,
            staff: 'POS - Nhân viên quầy',
            status: 'pending',
            planName: item.name,
          });
          await addCombo(payload);
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
    onClose();
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
    <div className="space-y-2 text-sm">
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
        <div className="flex justify-between text-emerald-600 text-xs font-medium">
          <span>Tích lũy ước tính:</span>
          <span>+{estimatedPointsEarned} điểm</span>
        </div>
      )}
      <div className="flex justify-between text-lg border-t pt-2">
        <span className="font-bold">TỔNG CỘNG:</span>
        <span className="font-bold text-emerald-700">
          {(showLoyaltyLines ? total : subtotal).toLocaleString('vi-VN')}đ
        </span>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-emerald-500 to-pink-500 text-white p-4 rounded-t-2xl flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            {checkoutStep !== 'cart' && (
              <button
                onClick={() => setCheckoutStep(checkoutStep === 'payment' ? 'loyalty' : 'cart')}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-bold">{stepTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white bg-opacity-20 active:bg-opacity-30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {checkoutStep === 'loyalty' && <LoyaltyCustomerSection orderSubtotal={subtotal} />}

        {checkoutStep !== 'loyalty' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-6xl mb-3">🛒</div>
                <p>Giỏ hàng trống</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">{item.productName}</div>
                      {item.isCustomCombo ? (
                        <div className="mt-2 space-y-1">
                          {item.toppings.map((t, tIdx) => (
                            <div key={tIdx} className="text-[11px] bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md border border-emerald-100 flex items-start gap-2 font-medium leading-tight">
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
                              <span>{t}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="text-xs text-gray-600 mt-1">
                            Size: <span className="font-semibold">{item.size}</span> |
                            Protein: <span className="font-semibold">{item.protein}g</span>
                          </div>
                          {item.toppings.length > 0 && (
                            <div className="text-xs text-emerald-600 font-bold mt-1 uppercase tracking-wider">
                              + {item.toppings.join(', ')}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {checkoutStep === 'cart' && (
                      <button
                        onClick={() => onRemoveItem(idx)}
                        className="text-red-500 active:text-red-700 ml-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">SL: {item.quantity}</span>
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
          <div className="flex-1 overflow-y-auto px-4 pb-2">
            {renderTotals(true)}
          </div>
        )}

        <div className="border-t p-4 space-y-3 flex-shrink-0 bg-white">
          {checkoutStep === 'cart' && (
            <>
              {renderTotals(false)}
              <button
                onClick={() => setCheckoutStep('loyalty')}
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 active:from-emerald-700 active:to-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold transition-colors text-base shadow-lg"
              >
                Hoàn Thành Đơn
              </button>
              <button
                onClick={onClearCart}
                disabled={cart.length === 0}
                className="w-full bg-gray-500 active:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors text-sm"
              >
                Xóa Tất Cả
              </button>
            </>
          )}

          {checkoutStep === 'loyalty' && (
            <div className="flex gap-2">
              <button
                onClick={() => setCheckoutStep('payment')}
                className="flex-1 bg-gray-100 active:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold text-sm"
              >
                Không tích điểm
              </button>
              <button
                onClick={() => setCheckoutStep('payment')}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-3 rounded-lg font-bold text-sm shadow-lg"
              >
                Tiếp Tục Thanh Toán
              </button>
            </div>
          )}

          {checkoutStep === 'payment' && (
            <>
              <PosVoucherRedeem orderSubtotal={subtotal} variant="compact" />
              {renderTotals(true)}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelectPayment('qr')}
                  className="bg-emerald-600 active:bg-emerald-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <QrCode className="w-5 h-5" />
                  VietQR
                </button>
                <button
                  onClick={() => handleSelectPayment('cash')}
                  className="bg-green-500 active:bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Wallet className="w-5 h-5" />
                  Tiền Mặt
                </button>
                <button
                  onClick={() => handleSelectPayment('momo')}
                  className="bg-pink-500 active:bg-pink-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Smartphone className="w-5 h-5" />
                  MoMo
                </button>
                <button
                  onClick={() => handleSelectPayment('zalopay')}
                  className="bg-emerald-700 active:bg-emerald-800 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Smartphone className="w-5 h-5" />
                  ZaloPay
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showPaymentConfirm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-70 z-[60]" onClick={() => {
            setShowPaymentConfirm(false);
            setSelectedPayment(null);
          }} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[60] bg-white rounded-xl p-6 max-w-md mx-auto">
            {selectedPayment === 'qr' && (
              <>
                <h3 className="text-xl font-bold text-center mb-4">Quét Mã QR Để Thanh Toán</h3>
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <div className="aspect-square bg-white flex items-center justify-center">
                    <QrCode className="w-40 h-40 text-gray-400" />
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
                className="flex-1 bg-gray-200 active:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={completePayment}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Printer className="w-5 h-5" />
                XN & In
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
