import { useState, useEffect, useMemo } from 'react';
import {
  User, Phone, MapPin, ShoppingCart, Package, Plus, Minus, Trash2,
  Loader2, CheckCircle2, CreditCard, Banknote, X, Store, Clock, CalendarDays,
} from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { useCombos } from '../../contexts/ComboContext';
import { ProductGrid, type Product } from '../pos/ProductGrid';
import { ModifierModal, type CartItem } from '../pos/ModifierModal';
import { CustomComboBuilder } from '../customer/CustomComboBuilder';
import { calculateTotalCups } from '../../utils/comboUtils';
import * as api from '../../utils/api';
import type { Employee } from '../../types/employee';
import { useBranches } from '../../contexts/BranchContext';
import { COMBO_PACKAGE_SETTING_KEY, type ComboPackageTemplate } from '../../types/comboPackage';
import { normalizePhoneVN } from '../../utils/phone';

type OrderMode = 'retail' | 'combo';
type PaymentMethod = 'transfer' | 'cash' | 'momo';

const STATUS_LABEL_VI: Record<string, string> = {
  pending: 'Chờ chốt',
  active: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
};

interface Props {
  employee: Employee;
  onComplete?: () => void;
  prefill?: { name?: string; phone?: string; address?: string };
}

export function OnlineSalesOrderEntry({ employee, onComplete, prefill }: Props) {
  const { addOrder } = useOrders();
  const { activeBranches } = useBranches();
  const { combos } = useCombos();

  const [mode, setMode] = useState<OrderMode>('retail');
  const [customer, setCustomer] = useState({
    name: prefill?.name || '',
    phone: prefill?.phone || '',
    address: prefill?.address || '',
  });
  const [deliveryBranch, setDeliveryBranch] = useState(employee.branch || 'CN1');
  const [deliveryTime, setDeliveryTime] = useState(''); // giờ hẹn giao (datetime-local) — đơn lẻ
  const [orderDate, setOrderDate] = useState(''); // ngày khách đặt (nhập đơn cũ / back-date) — trống = hôm nay
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

  const [showProductGrid, setShowProductGrid] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
    setSelectedProduct(null);
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
      // Nhập đơn cũ: nếu chọn ngày đặt trong quá khứ, ghi nhận đơn vào đúng ngày đó
      // (đặt 12:00 trưa để tránh lệch ngày do múi giờ). Trống = hôm nay.
      const backDate = orderDate ? new Date(`${orderDate}T12:00:00`) : null;
      const orderTimeIso = backDate ? backDate.toISOString() : undefined;
      const paidTime = backDate || now;
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
          deliveryTime: deliveryTime ? new Date(deliveryTime).toISOString() : undefined,
          deliveryType,
          shipMethod: deliveryType === 'delivery' ? shipMethod : '',
          shipProvider: deliveryType === 'delivery' && shipMethod === 'external' ? shipProvider.trim() : '',
          shipTrackingCode: deliveryType === 'delivery' && shipMethod === 'external' ? shipTrackingCode.trim() : '',
          allergyNote: allergyNote.trim(),
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

      setCart([]);
      setShipFee('');
      setDeliveryTime('');
      setOrderDate('');
      setShipProvider('');
      setShipTrackingCode('');
      setAllergyNote('');
      setSuccessMsg(`Đã tạo đơn lẻ ${cartTotal.toLocaleString('vi-VN')}đ cho ${customer.name}`);
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

      setPendingCombo(null);
      setShipFee('');
      setRenewFromComboId('');
      setAllergyNote('');
      setSuccessMsg(`Đã tạo combo ${pendingCombo.name} cho ${customer.name}`);
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

  return (
    <div className="space-y-5">
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Loại đơn */}
      <div className="flex gap-2 p-1 bg-white rounded-xl border border-gray-200 w-fit">
        <button
          type="button"
          onClick={() => setMode('retail')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
            mode === 'retail' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Mua lẻ
        </button>
        <button
          type="button"
          onClick={() => setMode('combo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
            mode === 'combo' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Package className="w-4 h-4" /> Đăng ký combo
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        {/* Khách hàng */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-indigo-100 p-5 space-y-3">
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
            {mode === 'retail' && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Ngày khách đặt (nhập đơn cũ)
                </label>
                <input
                  type="date"
                  value={orderDate}
                  max={new Date().toLocaleDateString('sv-SE')}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {orderDate
                    ? `⏱ Đơn sẽ ghi nhận vào ngày ${new Date(`${orderDate}T12:00:00`).toLocaleDateString('vi-VN')} (không phải hôm nay).`
                    : 'Để trống = hôm nay. Chọn ngày cũ khi nhập lại đơn khách đã đặt trước đó.'}
                </p>
              </div>
            )}

            {mode === 'retail' && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Giờ hẹn giao (khách online)
                </label>
                <input
                  type="datetime-local"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white"
                />
              </div>
            )}

            {/* Hình thức nhận — dùng cho cả đơn lẻ & combo */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">
                Hình thức nhận{mode === 'combo' ? ' (áp dụng cho các buổi giao)' : ''}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDeliveryType('pickup')} className={`py-2 rounded-xl border-2 text-sm font-semibold ${deliveryType === 'pickup' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>🏪 Khách tự lấy</button>
                <button type="button" onClick={() => setDeliveryType('delivery')} className={`py-2 rounded-xl border-2 text-sm font-semibold ${deliveryType === 'delivery' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>🚚 Giao hàng</button>
              </div>
            </div>

            {/* Cách giao (chỉ khi giao hàng) */}
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
                {mode === 'retail' && (
                  <input value={shipFee} onChange={(e) => setShipFee(e.target.value)} type="number" min={0} placeholder="Phí ship (VNĐ)" className="w-full px-3 py-2 rounded-xl border text-sm" />
                )}
              </div>
            )}
            {mode === 'combo' && (
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
            <div>
              <label className="text-xs font-bold text-red-600 mb-1 block">⚠️ Kỵ vị & Dị ứng</label>
              <textarea
                placeholder="VD: dị ứng đậu phộng; không thích vị sầu riêng; không cho topping hạt..."
                value={allergyNote}
                onChange={(e) => setAllergyNote(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-red-200 bg-red-50/40 text-sm h-14 resize-none"
              />
            </div>
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

          {mode === 'retail' && cart.length > 0 && (
            <div className="bg-white rounded-2xl border border-indigo-100 p-5">
              <h3 className="font-bold text-gray-900 mb-3">Giỏ hàng ({cart.length})</h3>
              <div className="space-y-2 mb-4">
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
              <div className="border-t pt-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Tiền hàng</span>
                  <span>{cartTotal.toLocaleString('vi-VN')}đ</span>
                </div>
                {Number(shipFee) > 0 && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Phí ship</span>
                    <span>{Number(shipFee).toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-lg">Tổng thu: {(cartTotal + (Number(shipFee) || 0)).toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
              <div className="flex items-center justify-end pt-3">
                <button
                  type="button"
                  onClick={handleSubmitRetail}
                  disabled={submitting}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Xác nhận đơn lẻ
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-indigo-100 p-5 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Thanh toán</h3>
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
            {mode === 'retail' && (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Phí ship (nếu có)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={shipFee}
                    onChange={(e) => setShipFee(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="rounded" />
                  Khách đã thanh toán trước (chi nhánh không cần thu tiền)
                </label>
              </>
            )}
            {mode === 'combo' && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={claimComboNow} onChange={(e) => setClaimComboNow(e.target.checked)} className="rounded" />
                Chốt combo ngay (gán khách cho tôi)
              </label>
            )}
          </div>
        </div>

        {/* Sản phẩm / Combo */}
        <div className="lg:col-span-8 space-y-4">
          {mode === 'retail' ? (
            <>
              <div className="bg-white rounded-2xl border border-indigo-100 p-5">
                {showProductGrid || selectedProduct ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">Chọn sản phẩm</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProductGrid(false);
                          setSelectedProduct(null);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="h-[560px] rounded-xl overflow-hidden border border-gray-100">
                      {selectedProduct ? (
                        <ModifierModal
                          product={selectedProduct}
                          onClose={() => setSelectedProduct(null)}
                          onAddToCart={handleAddToCart}
                          theme="purple"
                          skipStockCheck
                        />
                      ) : (
                        <ProductGrid onProductClick={setSelectedProduct} theme="purple" hideCategories={['combo']} />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Chọn sản phẩm</h3>
                    <button
                      type="button"
                      onClick={() => setShowProductGrid(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm sản phẩm
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-indigo-100 p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Đăng ký combo cho khách</h3>
              {pendingCombo ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-indigo-900">{pendingCombo.name}</p>
                    <p className="text-indigo-700 font-semibold mt-1">{pendingCombo.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <button type="button" onClick={() => setPendingCombo(null)} className="text-xs text-red-600 font-bold">Xóa</button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Chưa chọn gói combo — bấm nút bên dưới để thiết lập.</p>
              )}
              {deliveryType === 'delivery' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Phí ship mỗi buổi (nếu có)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={shipFee}
                    onChange={(e) => setShipFee(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm"
                  />
                </div>
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
              <div className="flex flex-wrap gap-2">
                {packageTemplates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPackagePicker(true)}
                    className="px-5 py-3 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-sm hover:bg-emerald-200"
                  >
                    Chọn gói có sẵn
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowComboBuilder(true)}
                  className="px-5 py-3 bg-indigo-100 text-indigo-800 rounded-xl font-bold text-sm hover:bg-indigo-200"
                >
                  + Thiết lập combo
                </button>
                {pendingCombo && (
                  <button
                    type="button"
                    onClick={handleSubmitCombo}
                    disabled={submitting}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm disabled:opacity-60 flex items-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Xác nhận đơn combo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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

      {showComboBuilder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-black/60">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden h-[95dvh] flex flex-col">
            <CustomComboBuilder
              isPOS
              presetCustomer={{ name: customer.name.trim(), phone: customer.phone.trim() }}
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
    </div>
  );
}
