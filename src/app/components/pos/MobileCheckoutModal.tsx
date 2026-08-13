import { X, Trash2, Printer, QrCode, Wallet, Smartphone, CheckCircle2, ArrowLeft, UserCog, StickyNote } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { usePos } from '../../contexts/PosContext';
import { useCombos } from '../../contexts/ComboContext';
import { useLoyalty } from '../../contexts/LoyaltyContext';
import { useInventory } from '../../contexts/InventoryContext';
import { LoyaltyCustomerSection } from './LoyaltyCustomerSection';
import { PosVoucherRedeem } from './PosVoucherRedeem';
import { PosGiftCampaignBanner } from './PosGiftCampaignBanner';
import { buildComboPayloadFromRaw } from '../../utils/comboUtils';
import { usePaymentQr } from '../../hooks/usePaymentQr';
import { postCustomerDisplayState } from '../../hooks/useCustomerDisplayChannel';
import type { CartItem } from './ModifierModal';
import type { Shift } from '../admin/ShiftSchedule';
import {
  printBothAfterPayment,
  printCupLabels,
  printCustomerReceipt,
  type PosPrintLine,
} from '../../utils/posPrint';

type CheckoutStep = 'cart' | 'loyalty' | 'payment';

interface MobileCheckoutModalProps {
  cart: CartItem[];
  branchId: string;
  currentShifts?: Shift[];
  onClose: () => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onAddItem: (item: CartItem) => void;
  /** Chế độ bán COMBO: đánh dấu đơn là combo + chọn giao/tại quầy. */
  comboMode?: boolean;
}

export function MobileCheckoutModal({ cart, branchId, currentShifts = [], onClose, onRemoveItem, onClearCart, onAddItem, comboMode = false }: MobileCheckoutModalProps) {
  const { addOrder } = useOrders();
  const { session } = usePos();
  const staffName = session?.employeeName || 'POS - Nhân viên quầy';
  const { addCombo } = useCombos();
  const { qrImageUrl } = usePaymentQr();
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
  const [comboDeliveryType, setComboDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [comboAddress, setComboAddress] = useState('');

  // Khi chi nhánh có từ 2 ca đang làm trở lên, cho thu ngân chọn đúng người bán đơn này
  // — mặc định là người đang đăng nhập, nhưng có thể đổi (VD: đổi ca giữa buổi).
  const staffOptions = (() => {
    const map = new Map<string, string>();
    if (session?.employeeId) map.set(session.employeeId, session.employeeName);
    for (const s of currentShifts) {
      if (s.employeeId) map.set(s.employeeId, s.employeeName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  })();
  const [selectedStaffId, setSelectedStaffId] = useState(session?.employeeId || '');
  useEffect(() => {
    if (session?.employeeId) setSelectedStaffId(session.employeeId);
  }, [session?.employeeId]);
  const effectiveStaffName = staffOptions.find((s) => s.id === selectedStaffId)?.name || staffName;
  const effectiveStaffId = selectedStaffId || session?.employeeId || '';

  // Ghi chú ý khách (VD: ít đá, không đường, giao gấp...) — nhân viên ghi lại lúc thanh toán.
  const [orderNote, setOrderNote] = useState('');
  const [appliedCampaign, setAppliedCampaign] = useState<{
    campaignId: string; label: string; rewardType: 'percent' | 'amount'; discountPercent: number; discountAmount: number;
  } | null>(null);
  useEffect(() => {
    if (cart.length === 0) { setOrderNote(''); setAppliedCampaign(null); }
  }, [cart.length]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const pointsDiscount = calcProgramDiscount(subtotal, selectedRedeemProgramId);
  const campaignDiscount = !appliedCampaign
    ? 0
    : appliedCampaign.rewardType === 'percent'
      ? Math.round(subtotal * (appliedCampaign.discountPercent || 0) / 100)
      : Math.min(appliedCampaign.discountAmount || 0, subtotal);
  const totalDiscount = pointsDiscount + campaignDiscount;
  const total = Math.max(0, subtotal - totalDiscount);
  const estimatedPointsEarned = calcEarnedPoints(total);

  // Đồng bộ màn hình khách (monitor thứ 2) — bị tạm ngưng vài giây sau khi thanh toán xong
  // để màn hình "Cảm ơn quý khách" không bị đè ngay bởi trạng thái giỏ hàng rỗng kế tiếp.
  const suppressDisplaySyncUntilRef = useRef(0);
  useEffect(() => {
    if (Date.now() < suppressDisplaySyncUntilRef.current) return;
    const stage = showPaymentConfirm && selectedPayment ? 'payment' : cart.length > 0 ? 'cart' : 'idle';
    postCustomerDisplayState({
      stage,
      branchId,
      items: cart.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        toppings: item.toppings,
      })),
      subtotal,
      discount: totalDiscount,
      total,
      paymentMethod: selectedPayment,
      qrImageUrl,
      customerName: activeCustomer?.name,
      updatedAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, subtotal, total, pointsDiscount, selectedPayment, showPaymentConfirm, qrImageUrl, branchId, activeCustomer]);

  const makeOrderNumber = () =>
    `ORD-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

  const cartToPrintLines = (): PosPrintLine[] =>
    cart.map((item) => ({
      productName: item.productName,
      size: item.size,
      bagSize: item.bagSize,
      protein: item.protein,
      toppings: item.toppings,
      quantity: item.quantity,
      price: item.price,
      isCustomCombo: item.isCustomCombo,
    }));

  const buildReceipt = (orderNumber: string, now: Date, paymentMethod?: string | null) => ({
    orderNumber,
    time: now,
    staff: effectiveStaffName,
    paymentMethod: paymentMethod || undefined,
    lines: cartToPrintLines(),
    subtotal,
    discount: totalDiscount,
    total,
    customerName: activeCustomer?.name,
    customerPhone: activeCustomer?.phone,
    pointsEarned: estimatedPointsEarned,
    note: orderNote.trim() || undefined,
  });

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
      productCategory: item.productCategory,
      name: item.name,
      size: item.size,
      bagSize: item.bagSize,
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
      productCategory: item.productCategory,
      name: item.name || item.productName,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      bagSize: item.bagSize,
      protein: item.protein,
      toppings: item.toppings,
      isCustomCombo: item.isCustomCombo,
      isCombo: comboMode || undefined,
      rawComboData: item.rawComboData
    }));

    const ok = addOrder({
      branchId,
      source: 'counter',
      items: orderItems,
      status: 'preparing',
      total: total,
      staff: effectiveStaffName,
      staffId: effectiveStaffId,
      // Người đăng nhập máy POS (mở ca) — dùng để gán đúng ca/kết ca, khác staffId (người được
      // chọn gắn tên cho đơn này, có thể chưa tự check-in nếu làm chung ca với người đăng nhập).
      sessionStaffId: session?.employeeId,
      paymentMethod: selectedPayment || undefined,
      note: orderNote.trim() || undefined,
      ...(comboMode ? {
        deliveryType: comboDeliveryType,
        deliveryAddress: comboDeliveryType === 'delivery' ? comboAddress.trim() : '',
      } : {}),
    } as any);
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
            staff: effectiveStaffName,
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

    const orderNumber = makeOrderNumber();
    const now = new Date();
    setTimeout(
      () => printBothAfterPayment(buildReceipt(orderNumber, now, selectedPayment), cartToPrintLines()),
      100
    );

    suppressDisplaySyncUntilRef.current = Date.now() + 5000;
    postCustomerDisplayState({
      stage: 'success',
      branchId,
      items: [],
      subtotal,
      discount: totalDiscount,
      total,
      paymentMethod: selectedPayment,
      qrImageUrl,
      customerName: activeCustomer?.name,
      pointsEarned: estimatedPointsEarned,
      updatedAt: Date.now(),
    });
    setTimeout(() => {
      suppressDisplaySyncUntilRef.current = 0;
      postCustomerDisplayState({ stage: 'idle', branchId, items: [], subtotal: 0, discount: 0, total: 0, updatedAt: Date.now() });
    }, 5000);

    onClearCart();
    setShowPaymentConfirm(false);
    setSelectedPayment(null);
    setCheckoutStep('cart');
    resetLoyalty();
    onClose();
  };

  const handlePrintCupLabels = () => {
    const now = new Date();
    printCupLabels(cartToPrintLines(), { orderNumber: makeOrderNumber(), time: now, note: orderNote.trim() || undefined });
  };

  const handlePrintCustomerReceipt = () => {
    const now = new Date();
    printCustomerReceipt(buildReceipt(makeOrderNumber(), now, selectedPayment));
  };

  const renderTotals = (showLoyaltyLines: boolean) => (
    <div className="space-y-2 text-sm">
      {totalDiscount > 0 && (
        <div className="flex justify-between">
          <span className="text-gray-600">Tạm tính:</span>
          <span className="font-semibold">{subtotal.toLocaleString('vi-VN')}đ</span>
        </div>
      )}
      {pointsDiscount > 0 && (
        <div className="flex justify-between text-pink-600 font-semibold">
          <span>{activeVoucher ? `Mã ${activeVoucher.code}:` : 'Giảm điểm loyalty:'}</span>
          <span>-{pointsDiscount.toLocaleString('vi-VN')}đ</span>
        </div>
      )}
      {campaignDiscount > 0 && appliedCampaign && (
        <div className="flex justify-between items-center text-emerald-600 font-semibold gap-2">
          <span className="min-w-0 truncate">🎁 {appliedCampaign.label}:</span>
          <span className="flex items-center gap-2 shrink-0">
            -{campaignDiscount.toLocaleString('vi-VN')}đ
            <button type="button" onClick={() => setAppliedCampaign(null)} className="text-xs text-gray-400 underline font-normal">bỏ</button>
          </span>
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
          {total.toLocaleString('vi-VN')}đ
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

        {staffOptions.length > 1 && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
            <UserCog className="w-4 h-4 text-amber-700 shrink-0" />
            <label className="text-xs font-bold text-amber-800 shrink-0">Nhân viên bán:</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="flex-1 min-w-0 border border-amber-300 rounded-lg px-2 py-1.5 text-sm font-bold text-gray-800 bg-white"
            >
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {comboMode && checkoutStep === 'cart' && (
          <div className="shrink-0 px-4 py-2 bg-indigo-50 border-b border-indigo-200 space-y-2">
            <div className="text-xs font-black text-indigo-700">🎁 ĐƠN COMBO</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setComboDeliveryType('pickup')} className={`py-2 rounded-lg text-sm font-bold border ${comboDeliveryType === 'pickup' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>🏬 Tại quầy</button>
              <button type="button" onClick={() => setComboDeliveryType('delivery')} className={`py-2 rounded-lg text-sm font-bold border ${comboDeliveryType === 'delivery' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>🛵 Giao hàng</button>
            </div>
            {comboDeliveryType === 'delivery' && (
              <input value={comboAddress} onChange={(e) => setComboAddress(e.target.value)} placeholder="Địa chỉ giao hàng" className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm" />
            )}
          </div>
        )}

        {checkoutStep === 'loyalty' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <LoyaltyCustomerSection
              orderSubtotal={subtotal}
              giftCampaign={{
                branchId,
                staffId: effectiveStaffId,
                staffName: effectiveStaffName,
                alreadyGifted: cart.some((i) => i.isGift),
                onGiftAdded: onAddItem,
                discountApplied: !!appliedCampaign,
                onDiscountApplied: (d) => setAppliedCampaign(d),
              }}
            />
          </div>
        )}

        {checkoutStep !== 'loyalty' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {checkoutStep === 'cart' && (
              <PosGiftCampaignBanner
                branchId={branchId}
                initialPhone={activeCustomer?.phone}
                staffId={effectiveStaffId}
                staffName={effectiveStaffName}
                alreadyGifted={cart.some((i) => i.isGift)}
                onGiftAdded={onAddItem}
                discountApplied={!!appliedCampaign}
                onDiscountApplied={(d) => setAppliedCampaign(d)}
              />
            )}
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
              {cart.length > 0 && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-1">
                    <StickyNote className="w-3.5 h-3.5" />
                    Ghi chú ý khách (tùy chọn)
                  </label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="VD: ít đá, không đường, khách chờ lấy ngay..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:border-emerald-500 outline-none"
                  />
                </div>
              )}
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
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={handlePrintCupLabels}
                  className="bg-amber-600 active:bg-amber-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
                >
                  <Printer className="w-5 h-5" />
                  Tem ly
                </button>
                <button
                  type="button"
                  onClick={handlePrintCustomerReceipt}
                  className="bg-gray-700 active:bg-gray-800 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
                >
                  <Printer className="w-5 h-5" />
                  Bill khách
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
                    {qrImageUrl ? (
                      <img
                        src={qrImageUrl}
                        alt="QR thanh toán"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <QrCode className="w-40 h-40 text-gray-400" />
                    )}
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
