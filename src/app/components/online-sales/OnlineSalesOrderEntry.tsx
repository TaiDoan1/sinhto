import { useState, useEffect, useMemo } from 'react';
import {
  User, Phone, MapPin, ShoppingCart, Package, Plus, Minus, Trash2,
  Loader2, CheckCircle2, CreditCard, Banknote, X, Store, Clock,
  ClipboardList, Truck, Wallet, Sparkles, PencilLine,
} from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { useCombos } from '../../contexts/ComboContext';
import { type CartItem } from '../pos/ModifierModal';
import { CskhProductPicker } from './CskhProductPicker';
import { CustomComboBuilder } from '../customer/CustomComboBuilder';
import { calculateTotalCups } from '../../utils/comboUtils';
import * as api from '../../utils/api';
import type { Employee } from '../../types/employee';
import { useBranches } from '../../contexts/BranchContext';
import { COMBO_PACKAGE_SETTING_KEY, type ComboPackageTemplate } from '../../types/comboPackage';
import { normalizePhoneVN } from '../../utils/phone';

type OrderMode = 'retail' | 'combo';
type PaymentMethod = 'transfer' | 'cash' | 'momo';
type EntryStep = 1 | 2 | 3 | 4;

const STATUS_LABEL_VI: Record<string, string> = {
  pending: 'Chờ chốt',
  active: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
};

const STEP_ORDER: EntryStep[] = [1, 2, 3, 4];

interface Props {
  employee: Employee;
  onComplete?: () => void;
  /** Chuyển sang tab "Theo dõi đơn" (chờ làm đơn) để kiểm tra đơn vừa tạo. */
  onViewOrders?: () => void;
  prefill?: { name?: string; phone?: string; address?: string };
}

export function OnlineSalesOrderEntry({ employee, onComplete, onViewOrders, prefill }: Props) {
  const { addOrder } = useOrders();
  const { activeBranches } = useBranches();
  const { combos } = useCombos();

  const [mode, setMode] = useState<OrderMode>('retail');
  // Luồng nhập đơn theo 4 bước (Khách → Sản phẩm/Combo → Giao nhận → Thanh toán) — CSKH bấm tab
  // để nhảy tự do giữa các bước, không ép tuần tự, chỉ để GOM đúng nhóm field theo việc đang làm
  // thay vì nhồi hết ~15 trường vào 1 thẻ như trước (đây là điểm gây rối chính đã được phản hồi).
  const [activeStep, setActiveStep] = useState<EntryStep>(1);
  const [customer, setCustomer] = useState({
    name: prefill?.name || '',
    phone: prefill?.phone || '',
    address: prefill?.address || '',
  });
  const [deliveryBranch, setDeliveryBranch] = useState(employee.branch || 'CN1');
  // Gộp chung "ngày khách đặt" (nhập đơn cũ/back-date) và "giờ hẹn giao" thành 1 ô duy nhất — CSKH
  // chọn 1 lần: chọn giờ QUÁ KHỨ = nhập lại đơn cũ (ghi nhận đơn vào đúng lúc đó), chọn giờ TƯƠNG
  // LAI = hẹn giao, để trống = đặt & giao ngay bây giờ. Trước đây tách 2 ô riêng (ngày đặt kiểu
  // date, giờ giao kiểu datetime) khiến CSKH phải nhập 2 lần cho cùng 1 mốc thời gian.
  const [orderTime, setOrderTime] = useState(''); // datetime-local — đơn lẻ
  const [comboDeliveryTime, setComboDeliveryTime] = useState('08:00'); // giờ giao/lấy mặc định — combo
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('delivery'); // tại quầy / giao
  const [shipMethod, setShipMethod] = useState<'own' | 'external'>('own'); // shipper mình / bookship ngoài
  const [shipProvider, setShipProvider] = useState(''); // đơn vị ship ngoài
  const [shipTrackingCode, setShipTrackingCode] = useState(''); // mã vận đơn
  const [shipFee, setShipFee] = useState('');
  const [renewFromComboId, setRenewFromComboId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [markPaid, setMarkPaid] = useState(true);
  const [claimComboNow, setClaimComboNow] = useState(true);
  const [notes, setNotes] = useState('');
  const [allergyNote, setAllergyNote] = useState(''); // kỵ vị & dị ứng

  // Popup xác nhận sau khi tạo đơn thành công (thay cho chỉ 1 dòng banner) — kèm nút qua tab
  // "Theo dõi đơn" để kiểm tra đơn đang chờ làm.
  const [completed, setCompleted] = useState<{ mode: OrderMode; customerName: string; total: number; subtitle: string } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  const [pendingCombo, setPendingCombo] = useState<{ name: string; price: number; raw: Record<string, unknown> } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [packageTemplates, setPackageTemplates] = useState<ComboPackageTemplate[]>([]);
  const [showPackagePicker, setShowPackagePicker] = useState(false);
  // Tra khách cũ theo SĐT: gõ đủ số là tự tìm, thấy khách cũ thì hiện thông tin + tự điền tên.
  const [foundCustomer, setFoundCustomer] = useState<{ name?: string; phone?: string; points?: number } | null>(null);
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);

  useEffect(() => {
    const digits = customer.phone.replace(/\D/g, '');
    if (digits.length < 9) { setFoundCustomer(null); return; }
    const normalized = normalizePhoneVN(customer.phone);
    let cancelled = false;
    setLookingUpCustomer(true);
    const t = setTimeout(async () => {
      try {
        const c = await api.fetchCustomerByPhone(normalized);
        if (cancelled) return;
        setFoundCustomer(c || null);
        if (c) {
          // Tự điền tên + địa chỉ khách cũ, nhưng KHÔNG đè nếu CSKH đã gõ sẵn.
          // Địa chỉ ưu tiên: danh bạ khách → nếu trống thì lấy từ combo gần nhất của SĐT này.
          const comboAddr = combos.find((k) => k.customerPhone === normalized || k.customerPhone === customer.phone.trim())?.deliveryAddress || '';
          const bestAddr = (c.address || comboAddr || '').trim();
          setCustomer((prev) => ({
            ...prev,
            name: prev.name.trim() ? prev.name : (c.name || prev.name),
            address: prev.address.trim() ? prev.address : (bestAddr || prev.address),
          }));
        }
      } catch {
        if (!cancelled) setFoundCustomer(null);
      } finally {
        if (!cancelled) setLookingUpCustomer(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [customer.phone]);

  useEffect(() => {
    api
      .fetchSetting(COMBO_PACKAGE_SETTING_KEY)
      .then((v: any) => {
        if (Array.isArray(v)) setPackageTemplates(v.filter((t) => t.active));
      })
      .catch(() => {});
  }, []);

  // Chọn nhanh 1 gói combo mẫu do Admin định nghĩa — dựng "raw" đúng dạng CustomComboBuilder
  // trả về (mảng item theo ngày, gắn thêm thuộc tính duration/deliveryDays/deliveryTime ngay
  // trên mảng) để dùng chung được handleSubmitCombo phía dưới, không cần sửa gì thêm.
  const handlePickPackage = (tpl: ComboPackageTemplate) => {
    const raw: any = tpl.items.map((it) => ({
      assignedDay: it.assignedDay,
      dayLabel: it.dayLabel,
      productName: it.productName,
      size: it.size,
      protein: it.protein,
      toppings: it.toppings,
    }));
    raw.duration = tpl.comboType;
    raw.deliveryDays = tpl.items.map((it) => it.assignedDay);
    raw.startDate = new Date().toISOString();
    raw.deliveryTime = '08:00';
    setPendingCombo({ name: tpl.name, price: tpl.price, raw });
    setShowPackagePicker(false);
  };

  useEffect(() => {
    if (prefill) {
      setCustomer((c) => ({
        name: prefill.name || c.name,
        phone: prefill.phone || c.phone,
        address: prefill.address || c.address,
      }));
    }
  }, [prefill]);

  const cartTotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart]
  );

  const previousCombos = useMemo(() => {
    const phone = customer.phone.trim();
    if (!phone) return [];
    return combos.filter((c) => c.customerPhone === phone);
  }, [combos, customer.phone]);

  const validateCustomer = () => {
    if (!customer.name.trim()) {
      alert('Vui lòng nhập tên khách hàng');
      return false;
    }
    if (!customer.phone.trim()) {
      alert('Vui lòng nhập SĐT khách hàng');
      return false;
    }
    return true;
  };

  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
  };

  const logActivity = async (activityType: string, content: string) => {
    try {
      await api.createSalesActivity({
        customerPhone: customer.phone.trim(),
        careStaffId: employee.id,
        careStaffName: employee.fullName,
        activityType,
        content,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const staffPayload = () => ({
    salesStaffId: employee.id,
    salesStaffName: employee.fullName,
    staff: `CSKH - ${employee.fullName}`,
  });

  const handleSubmitRetail = async () => {
    if (!validateCustomer()) return;
    if (cart.length === 0) {
      alert('Vui lòng thêm sản phẩm vào đơn');
      return;
    }

    setSubmitting(true);
    setSuccessMsg('');
    try {
      const orderItems = cart.map((item) => ({
        productId: item.productId,
        productName: item.productName || item.name,
        name: item.productName || item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        protein: item.protein,
        toppings: item.toppings,
      }));

      const now = new Date();
      // 1 ô giờ dùng chung cho cả 2 việc: chọn giờ QUÁ KHỨ → nhập lại đơn cũ (ghi nhận đơn vào
      // đúng lúc đó); chọn giờ TƯƠNG LAI → chỉ là giờ hẹn giao, đơn vẫn ghi nhận lúc "bây giờ".
      const chosenTime = orderTime ? new Date(orderTime) : null;
      const isBackDate = !!chosenTime && chosenTime.getTime() < now.getTime();
      const orderTimeIso = isBackDate ? chosenTime!.toISOString() : undefined;
      const paidTime = isBackDate ? chosenTime! : now;
      const shipFeeValue = Number(shipFee) || 0;
      const ok = addOrder(
        {
          branchId: deliveryBranch,
          source: 'online_sales',
          items: orderItems,
          // Luôn "pending" để chi nhánh nhận đơn thấy trong Hàng đợi và tự pha chế/giao —
          // dù khách đã thanh toán hay chưa, đơn vẫn cần chi nhánh xử lý xong mới "completed".
          status: 'pending',
          total: cartTotal,
          shipFee: shipFeeValue,
          customerName: customer.name.trim(),
          customerPhone: customer.phone.trim(),
          deliveryAddress: customer.address.trim(),
          paymentMethod: paymentMethod === 'cash' ? 'cash' : 'transfer',
          paidAt: markPaid ? paidTime : undefined,
          deliveryTime: chosenTime ? chosenTime.toISOString() : undefined,
          deliveryType,
          shipMethod: deliveryType === 'delivery' ? shipMethod : '',
          shipProvider: deliveryType === 'delivery' && shipMethod === 'external' ? shipProvider.trim() : '',
          shipTrackingCode: deliveryType === 'delivery' && shipMethod === 'external' ? shipTrackingCode.trim() : '',
          allergyNote: allergyNote.trim(),
          // Trước đây "Ghi chú" ở bước Thanh toán chỉ được lưu vào nhật ký hoạt động nội bộ của
          // CSKH (logActivity bên dưới), KHÔNG bao giờ gắn vào đơn thật — chi nhánh/POS nhận đơn
          // không bao giờ thấy được ghi chú này. Giờ lưu thẳng vào đơn (field `note`, đúng tên cột
          // POS đang đọc — xem OrderQueue.tsx/OrderDetailModal.tsx).
          note: notes.trim(),
          ...staffPayload(),
        },
        { skipStockCheck: true, orderTime: orderTimeIso }
      );
      if (!ok) {
        alert('Tạo đơn thất bại. Vui lòng thử lại.');
        return;
      }

      // Lưu địa chỉ mới nhất vào danh bạ khách (xử lý khách đổi địa chỉ) — lần sau tự điền địa chỉ mới.
      if (customer.address.trim()) {
        api.upsertCustomerAddress(customer.phone.trim(), customer.name.trim(), customer.address.trim());
      }
      await logActivity('converted', `Nhập đơn lẻ — ${cartTotal.toLocaleString('vi-VN')}đ (${orderItems.length} món)${shipFeeValue ? ` + ship ${shipFeeValue.toLocaleString('vi-VN')}đ` : ''}`);
      await api.patchAssignmentProfile(customer.phone.trim(), {
        customerName: customer.name.trim(),
        customerType: 'retail',
        pipelineStage: 'closed_retail',
        careStaffId: employee.id,
        careStaffName: employee.fullName,
        activityType: 'note',
        activityContent: notes || 'NV CSKH nhập đơn bán lẻ',
      }).catch(() => {});

      setCompleted({
        mode: 'retail',
        customerName: customer.name.trim() || 'Khách',
        total: cartTotal + shipFeeValue,
        subtitle: `${orderItems.length} món`,
      });
      setCart([]);
      setShipFee('');
      setOrderTime('');
      setShipProvider('');
      setShipTrackingCode('');
      setAllergyNote('');
      setSuccessMsg('');
      setActiveStep(1);
      onComplete?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể tạo đơn');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCombo = async () => {
    if (!validateCustomer()) return;
    if (!pendingCombo) {
      alert('Vui lòng thiết lập combo trước');
      return;
    }

    setSubmitting(true);
    setSuccessMsg('');
    try {
      const raw = pendingCombo.raw;
      const duration = (raw.duration as string) || 'monthly';
      const startIso = raw.startDate ? new Date(raw.startDate as string).toISOString() : new Date().toISOString();
      const renewFrom = renewFromComboId ? previousCombos.find((c) => c.id === renewFromComboId) : null;

      const created = await api.createComboSubscription({
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        deliveryAddress: deliveryType === 'pickup' ? '' : customer.address.trim(),
        planName: pendingCombo.name,
        comboType: duration === 'weekly' ? 'weekly' : 'monthly',
        comboDuration: duration,
        startDate: startIso,
        nextDelivery: startIso,
        deliveryDays: (raw.deliveryDays as number[]) || [1, 2, 3, 4, 5, 6, 0],
        items: raw,
        totalCups: calculateTotalCups(raw),
        totalPrice: pendingCombo.price,
        shipFee: deliveryType === 'delivery' ? (Number(shipFee) || 0) : 0,
        deliveryType,
        shipMethod: deliveryType === 'delivery' ? shipMethod : '',
        shipProvider: deliveryType === 'delivery' && shipMethod === 'external' ? shipProvider.trim() : '',
        status: 'pending',
        branchId: deliveryBranch,
        deliveryTime: comboDeliveryTime || '08:00',
        staff: `CSKH - ${employee.fullName}`,
        allergyNote: allergyNote.trim(),
        notes: [notes.trim(), (raw.customerNote as string || '').trim()].filter(Boolean).join(' · '),
        salesRefCode: employee.id,
        renewedFromComboId: renewFrom?.id,
        renewedFromDuration: renewFrom?.comboDuration,
        renewedFromPlanName: renewFrom?.planName,
      });

      if (claimComboNow && created?.id) {
        await api.claimComboSubscription(created.id, employee.id, employee.fullName);
      }

      // Lưu địa chỉ mới nhất vào danh bạ khách (trừ khi khách tự lấy tại quầy).
      if (deliveryType !== 'pickup' && customer.address.trim()) {
        api.upsertCustomerAddress(customer.phone.trim(), customer.name.trim(), customer.address.trim());
      }
      await logActivity('claim', `Nhập đơn combo — ${pendingCombo.name} · ${pendingCombo.price.toLocaleString('vi-VN')}đ`);
      await api.patchAssignmentProfile(customer.phone.trim(), {
        customerName: customer.name.trim(),
        customerType: 'combo',
        pipelineStage: claimComboNow ? 'closed_combo' : 'web_sent',
        careStaffId: employee.id,
        careStaffName: employee.fullName,
        activityType: 'note',
        activityContent: notes || 'NV CSKH nhập đơn combo',
      }).catch(() => {});

      setCompleted({
        mode: 'combo',
        customerName: customer.name.trim() || 'Khách',
        total: pendingCombo.price,
        subtitle: pendingCombo.name,
      });
      setPendingCombo(null);
      setShipFee('');
      setRenewFromComboId('');
      setAllergyNote('');
      setSuccessMsg('');
      setActiveStep(1);
      onComplete?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể tạo combo');
    } finally {
      setSubmitting(false);
    }
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => (i === idx ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  // Chấm hoàn tất cho từng tab — chỉ để CSKH liếc biết bước nào đã xong, KHÔNG chặn chuyển bước
  // (CSKH là nhân viên đã quen việc, ép tuần tự chỉ làm chậm khi họ muốn sửa lại bước trước).
  const stepDone: Record<EntryStep, boolean> = {
    1: !!(customer.name.trim() && customer.phone.trim()),
    2: mode === 'retail' ? cart.length > 0 : !!pendingCombo,
    3: deliveryType === 'pickup' || !!customer.address.trim(),
    4: true,
  };
  const stepLabel: Record<EntryStep, string> = {
    1: 'Khách hàng',
    2: mode === 'retail' ? 'Sản phẩm' : 'Combo',
    3: 'Giao nhận',
    4: 'Thanh toán',
  };
  const stepIcon: Record<EntryStep, typeof User> = {
    1: User,
    2: mode === 'retail' ? ShoppingCart : Package,
    3: Truck,
    4: Wallet,
  };

  // Chỉ cho xác nhận khi ĐÃ XONG HẾT các bước (khách + sản phẩm/combo + giao nhận; bước Thanh
  // toán luôn xong). Còn thiếu bước nào thì nút khoá + báo rõ thiếu gì.
  const missingSteps = STEP_ORDER.filter((s) => !stepDone[s]).map((s) => stepLabel[s]);
  const canSubmit = missingSteps.length === 0;
  const handleSubmit = mode === 'retail' ? handleSubmitRetail : handleSubmitCombo;

  // Chú thích cho ô giờ gộp (đặt/giao) — tự đổi theo giờ đang chọn là quá khứ hay tương lai.
  const orderTimeHint = (() => {
    if (!orderTime) return 'Để trống = đặt & giao ngay bây giờ.';
    const t = new Date(orderTime);
    if (Number.isNaN(t.getTime())) return '';
    return t.getTime() < Date.now()
      ? `⏱ Giờ quá khứ → ghi nhận đơn vào đúng lúc ${t.toLocaleString('vi-VN')} (nhập lại đơn cũ).`
      : `📦 Hẹn giao lúc ${t.toLocaleString('vi-VN')}.`;
  })();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-4">
       <div className="max-w-4xl mx-auto w-full space-y-4">
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Loại đơn */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-gray-200 sm:w-fit">
          <button
            type="button"
            onClick={() => setMode('retail')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
              mode === 'retail' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Mua lẻ
          </button>
          <button
            type="button"
            onClick={() => setMode('combo')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
              mode === 'combo' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" /> Đăng ký combo
          </button>
        </div>

        {/* Thanh bước — 4 bước chia đều 1 hàng, bấm để nhảy tự do; nhãn ẩn trên màn siêu hẹp để
            không tràn/cuộn ngang. Chấm xanh = đã có dữ liệu, không ép tuần tự. */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-white rounded-xl border border-gray-200">
          {STEP_ORDER.map((s) => {
            const Icon = stepIcon[s];
            const active = activeStep === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setActiveStep(s)}
                className={`flex items-center justify-center gap-1.5 px-1.5 py-2 rounded-lg text-xs font-bold transition-colors min-w-0 ${
                  active ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate hidden sm:inline">{s}. {stepLabel[s]}</span>
                <span className="sm:hidden font-black">{s}</span>
                {stepDone[s] && !active && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* ─── Bước 1: Khách hàng ─────────────────────────────────────────── */}
        {activeStep === 1 && (
          <div className="bg-white rounded-2xl border border-indigo-100 p-4 sm:p-5 space-y-3 max-w-xl mx-auto w-full">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" /> Thông tin khách
            </h3>
            <input
              placeholder="Tên khách hàng *"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border text-sm"
            />
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                placeholder="Số điện thoại *"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm"
              />
            </div>
            {lookingUpCustomer ? (
              <div className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" /> Đang kiểm tra SĐT...
              </div>
            ) : foundCustomer ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  ✓ Khách cũ: {foundCustomer.name || 'Không tên'}
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  ⭐ {(foundCustomer.points ?? 0).toLocaleString('vi-VN')} điểm
                  {previousCombos.length > 0 && ` · 🎁 ${previousCombos.length} combo đã mua`}
                </div>
              </div>
            ) : customer.phone.replace(/\D/g, '').length >= 9 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-amber-700">
                🆕 Khách mới — chưa có trong hệ thống
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-sm"
            >
              Tiếp: {stepLabel[2]} →
            </button>
          </div>
        )}

        {/* ─── Bước 2: Sản phẩm (mua lẻ) ──────────────────────────────────── */}
        {activeStep === 2 && mode === 'retail' && (
          <div className="grid lg:grid-cols-12 gap-4 w-full">
            {/* Bộ chọn sản phẩm CSKH — 1 màn hình cố định, tự có 2 trạng thái (lưới món → cấu hình
                size/protein/topping), không còn nhét ProductGrid + ModifierModal của POS vào khung
                nhỏ (chật/xấu). Chiều cao cố định theo breakpoint nên trang không "tụt lên xuống". */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-indigo-100 p-2.5 sm:p-3 flex flex-col">
              <h3 className="font-bold text-gray-900 px-1.5 pt-1 pb-2">Chọn sản phẩm</h3>
              <div className="h-[440px] sm:h-[500px] lg:h-[540px] rounded-xl overflow-hidden border border-gray-100">
                <CskhProductPicker onAdd={handleAddToCart} />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-indigo-100 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">Giỏ hàng ({cart.length})</h3>
                </div>
                {cart.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Giỏ hàng trống — thêm sản phẩm bên trái.</p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{item.productName}</p>
                          <p className="text-xs text-gray-500">{item.size} · {item.protein}g</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" onClick={() => updateQty(idx, -1)} className="p-1 rounded-lg bg-gray-100"><Minus className="w-3.5 h-3.5" /></button>
                          <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                          <button type="button" onClick={() => updateQty(idx, 1)} className="p-1 rounded-lg bg-gray-100"><Plus className="w-3.5 h-3.5" /></button>
                          <span className="text-sm font-bold text-indigo-700 w-20 text-right">
                            {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                          </span>
                          <button type="button" onClick={() => setCart((c) => c.filter((_, i) => i !== idx))} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tổng tiền hiện ngay tại khung sản phẩm (không phải kéo xuống thanh đáy) */}
                {cart.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Tạm tính · {cart.reduce((n, it) => n + it.quantity, 0)} ly</span>
                      <span className="font-semibold text-gray-700">{cartTotal.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {Number(shipFee) > 0 && (
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Phí ship</span>
                        <span className="font-semibold text-gray-700">{Number(shipFee).toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm">
                      <span className="text-sm font-black text-white uppercase tracking-wide">Tổng cộng</span>
                      <span className="text-xl font-black text-white">{(cartTotal + (Number(shipFee) || 0)).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-red-600 mb-1 block">⚠️ Kỵ vị & Dị ứng</label>
                <textarea
                  placeholder="VD: dị ứng đậu phộng; không thích vị sầu riêng; không cho topping hạt..."
                  value={allergyNote}
                  onChange={(e) => setAllergyNote(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-red-200 bg-red-50/40 text-sm h-14 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-sm"
              >
                Tiếp: Giao nhận →
              </button>
            </div>
          </div>
        )}

        {/* ─── Bước 2: Combo ──────────────────────────────────────────────── */}
        {activeStep === 2 && mode === 'combo' && (
          <div className="bg-white rounded-2xl border border-indigo-100 p-4 sm:p-5 space-y-4 max-w-xl mx-auto w-full">
            <h3 className="font-bold text-gray-900">Đăng ký combo cho khách</h3>

            {pendingCombo ? (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-indigo-900">{pendingCombo.name}</p>
                  <p className="text-indigo-700 font-semibold mt-1">{pendingCombo.price.toLocaleString('vi-VN')}đ</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button type="button" onClick={() => setShowComboBuilder(true)} className="text-xs text-indigo-700 font-bold hover:text-indigo-900">Sửa</button>
                  <button type="button" onClick={() => setPendingCombo(null)} className="text-xs text-red-600 font-bold">Xóa</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500">Chưa chọn gói combo — chọn 1 trong 2 cách bên dưới.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Ưu tiên "Chọn gói có sẵn" — nhanh 1 chạm, hợp phần lớn ca bán; "Tự thiết lập"
                      chỉ dùng khi khách cần tùy biến riêng nên lùi xuống làm lựa chọn phụ. */}
                  <button
                    type="button"
                    disabled={packageTemplates.length === 0}
                    onClick={() => setShowPackagePicker(true)}
                    className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-left disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center mb-2">
                      <Sparkles className="w-4.5 h-4.5 text-white" />
                    </div>
                    <p className="font-black text-emerald-900">Chọn gói có sẵn</p>
                    <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                      {packageTemplates.length > 0 ? `${packageTemplates.length} gói mẫu — nhanh, 1 chạm` : 'Chưa có gói mẫu nào'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowComboBuilder(true)}
                    className="p-4 rounded-2xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
                      <PencilLine className="w-4.5 h-4.5 text-gray-600" />
                    </div>
                    <p className="font-black text-gray-800">Tự thiết lập combo</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Chọn từng vị theo ngày — khi khách cần tùy biến riêng</p>
                  </button>
                </div>
              </>
            )}

            {previousCombos.length > 0 && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Loại đăng ký</label>
                <select
                  value={renewFromComboId}
                  onChange={(e) => setRenewFromComboId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white"
                >
                  <option value="">Khách mới</option>
                  {previousCombos.map((c) => (
                    <option key={c.id} value={c.id}>
                      Gia hạn từ: {c.planName || 'Combo'} ({STATUS_LABEL_VI[c.status]})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-sm"
            >
              Tiếp: Giao nhận →
            </button>
          </div>
        )}

        {/* ─── Bước 3: Giao nhận ──────────────────────────────────────────── */}
        {activeStep === 3 && (
          <div className="bg-white rounded-2xl border border-indigo-100 p-4 sm:p-5 space-y-3 max-w-xl mx-auto w-full">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" /> Giao nhận
            </h3>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">
                Hình thức nhận{mode === 'combo' ? ' (áp dụng cho các buổi giao)' : ''}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDeliveryType('pickup')} className={`py-2 rounded-xl border-2 text-sm font-semibold ${deliveryType === 'pickup' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>🏪 Khách tự lấy</button>
                <button type="button" onClick={() => setDeliveryType('delivery')} className={`py-2 rounded-xl border-2 text-sm font-semibold ${deliveryType === 'delivery' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>🚚 Giao hàng</button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" /> {deliveryType === 'pickup' ? 'Chi nhánh khách đến lấy' : 'Chi nhánh gần khách nhất (nhận đơn)'}
              </label>
              <select
                value={deliveryBranch}
                onChange={(e) => setDeliveryBranch(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white"
              >
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {deliveryType !== 'pickup' && (
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  placeholder="Địa chỉ giao hàng"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm h-20 resize-none"
                />
              </div>
            )}

            {deliveryType === 'delivery' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 block">Cách giao</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setShipMethod('own')} className={`py-2 rounded-xl border-2 text-sm font-semibold ${shipMethod === 'own' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>Shipper của mình</button>
                  <button type="button" onClick={() => setShipMethod('external')} className={`py-2 rounded-xl border-2 text-sm font-semibold ${shipMethod === 'external' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600'}`}>Bookship ngoài</button>
                </div>
                {shipMethod === 'external' && (
                  mode === 'retail' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input value={shipProvider} onChange={(e) => setShipProvider(e.target.value)} placeholder="Đơn vị ship (Grab/Ahamove...)" className="px-3 py-2 rounded-xl border text-sm" />
                      <input value={shipTrackingCode} onChange={(e) => setShipTrackingCode(e.target.value)} placeholder="Mã vận đơn" className="px-3 py-2 rounded-xl border text-sm" />
                    </div>
                  ) : (
                    <input value={shipProvider} onChange={(e) => setShipProvider(e.target.value)} placeholder="Đơn vị ship (Grab/Ahamove...) — áp dụng hằng ngày" className="w-full px-3 py-2 rounded-xl border text-sm" />
                  )
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">
                    {mode === 'combo' ? 'Phí ship mỗi buổi (nếu có)' : 'Phí ship (nếu có)'}
                  </label>
                  <input value={shipFee} onChange={(e) => setShipFee(e.target.value)} type="number" min={0} placeholder="0" className="w-full px-3 py-2 rounded-xl border text-sm" />
                </div>
              </div>
            )}

            {mode === 'retail' ? (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Giờ khách đặt / giao hàng
                </label>
                <input
                  type="datetime-local"
                  value={orderTime}
                  onChange={(e) => setOrderTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white"
                />
                <p className="text-[11px] text-gray-400 mt-1">{orderTimeHint}</p>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {deliveryType === 'pickup' ? 'Giờ khách lấy mặc định' : 'Giờ giao mặc định'}
                </label>
                <input
                  type="time"
                  value={comboDeliveryTime}
                  onChange={(e) => setComboDeliveryTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white"
                />
                <p className="text-[11px] text-gray-400 mt-1">Áp dụng cho tất cả buổi; có thể sửa riêng từng buổi sau ở chi tiết combo.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveStep(4)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-sm"
            >
              Tiếp: Thanh toán →
            </button>
          </div>
        )}

        {/* ─── Bước 4: Thanh toán & Ghi chú ───────────────────────────────── */}
        {activeStep === 4 && (
          <div className="bg-white rounded-2xl border border-indigo-100 p-4 sm:p-5 space-y-4 max-w-xl mx-auto w-full">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" /> Thanh toán
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'transfer' as const, label: 'Chuyển khoản', icon: CreditCard },
                { id: 'momo' as const, label: 'MoMo', icon: CreditCard },
                { id: 'cash' as const, label: 'Tiền mặt', icon: Banknote },
              ]).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 ${
                    paymentMethod === m.id ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>
            {mode === 'retail' ? (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="rounded" />
                Khách đã thanh toán trước (chi nhánh không cần thu tiền)
              </label>
            ) : (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={claimComboNow} onChange={(e) => setClaimComboNow(e.target.checked)} className="rounded" />
                Chốt combo ngay (gán khách cho tôi)
              </label>
            )}

            {mode === 'combo' && (
              <div>
                <label className="text-xs font-bold text-red-600 mb-1 block">⚠️ Kỵ vị & Dị ứng</label>
                <textarea
                  placeholder="VD: dị ứng đậu phộng; không thích vị sầu riêng; không cho topping hạt..."
                  value={allergyNote}
                  onChange={(e) => setAllergyNote(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-red-200 bg-red-50/40 text-sm h-14 resize-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> Ghi chú
              </label>
              <textarea
                placeholder={
                  mode === 'combo'
                    ? 'Ghi chú vị & giao hàng đặc biệt (trừ vị, giữ lạnh, giờ đặc biệt...)'
                    : 'Ghi chú đơn hàng (tuỳ chọn)'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm h-16 resize-none"
              />
            </div>
          </div>
        )}
       </div>
      </div>

      {/* Thanh tổng tiền + nút Xác nhận — DÁN CỐ ĐỊNH đáy màn hình, luôn thấy dù đang ở bước nào,
          không phải kéo lên tìm nút như trước. Nội dung căn giữa cùng bề ngang với form. */}
      <div className="shrink-0 sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-5 py-3.5 rounded-b-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
       <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          {mode === 'retail' ? (
            cart.length > 0 ? (
              <>
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Tổng thu · {cart.length} món</p>
                <p className="text-lg font-black text-gray-900 truncate">
                  {(cartTotal + (Number(shipFee) || 0)).toLocaleString('vi-VN')}đ
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400 font-semibold">Chưa có sản phẩm trong giỏ</p>
            )
          ) : pendingCombo ? (
            <>
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide truncate">{pendingCombo.name}</p>
              <p className="text-lg font-black text-gray-900">{pendingCombo.price.toLocaleString('vi-VN')}đ</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 font-semibold">Chưa thiết lập combo</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          title={canSubmit ? '' : `Hoàn tất các bước còn thiếu: ${missingSteps.join(', ')}`}
          className="shrink-0 px-5 sm:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm flex items-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span className="truncate">
            {!canSubmit
              ? `Còn thiếu: ${missingSteps.join(', ')}`
              : mode === 'retail' ? 'Xác nhận đơn lẻ' : 'Xác nhận đơn combo'}
          </span>
        </button>
       </div>
      </div>

      {/* Bộ dựng combo — mở FULL MÀN HÌNH (giống quy ước OrderQueue.tsx/ComboManagement.tsx ở POS)
          thay vì nhét trong khung 600px bên trong trang, đỡ cảm giác "app trong app". */}
      {showComboBuilder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden h-[90vh] flex flex-col">
            <CustomComboBuilder
              isPOS
              presetCustomer={{ name: customer.name.trim(), phone: customer.phone.trim() }}
              isCskh
              onClose={() => setShowComboBuilder(false)}
              onAddToCart={(combo) => {
                const raw = combo.rawComboData || combo;
                setPendingCombo({
                  name: combo.name || `Combo ${raw.duration || 'tuần'}`,
                  price: raw.finalPrice || combo.price || combo.totalPrice || 0,
                  raw,
                });
                setShowComboBuilder(false);
              }}
            />
          </div>
        </div>
      )}

      {showPackagePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Chọn gói combo có sẵn</h3>
              <button type="button" onClick={() => setShowPackagePicker(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2">
              {packageTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handlePickPackage(tpl)}
                  className="w-full text-left p-3.5 rounded-xl border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-800">{tpl.name}</p>
                    <p className="font-black text-emerald-700">{tpl.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{tpl.comboType === 'weekly' ? 'Theo tuần' : 'Theo tháng'} · {tpl.items.length} ngày</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popup xác nhận đơn đã tạo — kèm nút qua "Theo dõi đơn" để kiểm tra đơn đang chờ làm */}
      {completed && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>
              <p className="text-white font-black text-lg">Tạo đơn thành công!</p>
              <p className="text-white/90 text-sm mt-0.5">
                {completed.mode === 'retail' ? 'Đơn lẻ' : 'Combo'} cho <b>{completed.customerName}</b>
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-500 truncate">{completed.subtitle}</span>
                <span className="text-xl font-black text-emerald-600 shrink-0">{completed.total.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-semibold flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {completed.mode === 'retail'
                  ? <span>Đơn đang ở <b>“Chờ nhận đơn”</b> — cửa hàng sẽ nhận &amp; làm món. Kiểm tra ở tab Theo dõi đơn.</span>
                  : <span>Combo đã tạo — kiểm tra tiến độ ở tab Theo dõi đơn (mục Combo).</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCompleted(null)}
                  className="py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm"
                >
                  Nhập đơn mới
                </button>
                <button
                  type="button"
                  onClick={() => { setCompleted(null); onViewOrders?.(); }}
                  className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-1"
                >
                  Kiểm tra đơn →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
