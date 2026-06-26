import { Trash2, Printer, QrCode, Wallet, Smartphone, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { useCombos } from '../../contexts/ComboContext';
import { useLoyalty } from '../../contexts/LoyaltyContext';
import { useInventory } from '../../contexts/InventoryContext';
import { LoyaltyCustomerSection } from './LoyaltyCustomerSection';
import { PosVoucherRedeem } from './PosVoucherRedeem';
import { buildComboPayloadFromRaw } from '../../utils/comboUtils';
import type { CartItem } from './ModifierModal';

type CheckoutStep = 'cart' | 'loyalty' | 'payment';

interface CheckoutPanelProps {
  cart: CartItem[];
  branchId: string;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
}

export function CheckoutPanel({ cart, branchId, onRemoveItem, onClearCart }: CheckoutPanelProps) {
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
      staff: 'POS - Nhân viên quầy',
      customerName: activeCustomer?.name,
      customerPhone: activeCustomer?.phone,
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
    <div className="space-y-1.5">
      {showLoyaltyLines && pointsDiscount > 0 && (
        <div className="flex justify-between text-base">
          <span className="text-gray-600 font-medium">Tạm tính:</span>
          <span className="font-bold">{subtotal.toLocaleString('vi-VN')}đ</span>
        </div>
      )}
      {showLoyaltyLines && pointsDiscount > 0 && (
        <div className="flex justify-between text-base text-pink-600 font-bold">
          <span>{activeVoucher ? `Mã ${activeVoucher.code}:` : 'Giảm điểm:'}</span>
          <span>-{pointsDiscount.toLocaleString('vi-VN')}đ</span>
        </div>
      )}
      {showLoyaltyLines && activeCustomer && estimatedPointsEarned > 0 && (
        <div className="flex justify-between text-emerald-600 text-sm font-semibold">
          <span>Tích lũy ước tính:</span>
          <span>+{estimatedPointsEarned} điểm</span>
        </div>
      )}
      <div className="pos-cart-total-row flex justify-between border-t-2 border-gray-200 pt-2 mt-1">
        <span>TỔNG:</span>
        <span className="pos-cart-total-amount">
          {(showLoyaltyLines ? total : subtotal).toLocaleString('vi-VN')}đ
        </span>
      </div>
    </div>
  );

  return (
    <div className="pos-checkout flex flex-col h-full w-full bg-white rounded-lg shadow-md relative border-2 border-gray-100">
      <div className="pos-checkout-header shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-t-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            {checkoutStep !== 'cart' && (
              <button
                type="button"
                onClick={() => setCheckoutStep(checkoutStep === 'payment' ? 'loyalty' : 'cart')}
                className="p-1 rounded active:bg-white/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="pos-checkout-title">{stepTitle}</h2>
          </div>
          {checkoutStep === 'cart' && (
            <button
              type="button"
              onClick={onClearCart}
              className="bg-white/25 active:bg-white/35 px-3 py-1 rounded-lg text-sm font-bold"
            >
              Xóa hết
            </button>
          )}
        </div>
      </div>

      {checkoutStep === 'loyalty' ? (
        <div className="pos-loyalty-scroll flex-1 min-h-0 overflow-y-auto">
          <LoyaltyCustomerSection orderSubtotal={subtotal} compact />
          <div className="px-3 pb-2">{renderTotals(true)}</div>
        </div>
      ) : (
        <div className="pos-cart-scroll flex-1 overflow-y-auto space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <div className="text-5xl mb-3">🛒</div>
              <p className="text-lg font-semibold">Giỏ trống</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="pos-cart-item bg-gray-50 border border-gray-200">
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="pos-cart-name">{item.productName}</div>
                    {item.isCustomCombo ? (
                      <div className="mt-2 space-y-1">
                        {item.toppings.map((t, tIdx) => (
                          <div
                            key={tIdx}
                            className="pos-cart-topping bg-emerald-50 text-emerald-900 rounded border border-emerald-200 flex items-start gap-1.5 leading-snug"
                          >
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="pos-cart-detail">
                          {item.size} · Protein {item.protein}g
                        </div>
                        {item.toppings.length > 0 && (
                          <div className="pos-cart-detail text-emerald-700 mt-1">
                            + {item.toppings.join(', ')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {checkoutStep === 'cart' && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="text-red-500 active:text-red-700 p-1 shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 pt-1.5 mt-1">
                  <span className="pos-cart-qty text-gray-700">SL: {item.quantity}</span>
                  <span className="pos-cart-price">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="pos-cart-footer shrink-0 border-t-2 border-gray-200 space-y-2 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-10">
        {checkoutStep === 'cart' && (
          <>
            {renderTotals(false)}
            <button
              type="button"
              onClick={() => setCheckoutStep('loyalty')}
              disabled={cart.length === 0}
              className="pos-cart-btn-primary w-full bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl shadow-md"
            >
              Hoàn Thành Đơn
            </button>
          </>
        )}

        {checkoutStep === 'loyalty' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCheckoutStep('payment')}
              className="pos-cart-btn-primary flex-1 bg-gray-100 active:bg-gray-200 text-gray-800 rounded-xl"
            >
              Không tích điểm
            </button>
            <button
              type="button"
              onClick={() => setCheckoutStep('payment')}
              className="pos-cart-btn-primary flex-1 bg-emerald-600 text-white rounded-xl shadow-md"
            >
              Thanh Toán
            </button>
          </div>
        )}

        {checkoutStep === 'payment' && (
          <>
            <div className="px-1 pb-1">
              <PosVoucherRedeem orderSubtotal={subtotal} variant="compact" />
            </div>
            {renderTotals(true)}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPayment('qr')}
                className="pos-cart-btn-pay bg-emerald-600 active:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-5 h-5" />
                QR
              </button>
              <button
                type="button"
                onClick={() => handleSelectPayment('cash')}
                className="pos-cart-btn-pay bg-green-600 active:bg-green-700 text-white rounded-lg flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-5 h-5" />
                Tiền mặt
              </button>
              <button
                type="button"
                onClick={() => handleSelectPayment('momo')}
                className="pos-cart-btn-pay bg-pink-500 active:bg-pink-600 text-white rounded-lg flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-5 h-5" />
                MoMo
              </button>
              <button
                type="button"
                onClick={() => handleSelectPayment('zalopay')}
                className="pos-cart-btn-pay bg-emerald-800 active:bg-emerald-900 text-white rounded-lg flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-5 h-5" />
                ZaloPay
              </button>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="pos-cart-btn-primary w-full bg-gray-700 active:bg-gray-800 text-white rounded-xl flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
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
                  <div className="pos-checkout-pay-emoji text-6xl mb-3">💵</div>
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
