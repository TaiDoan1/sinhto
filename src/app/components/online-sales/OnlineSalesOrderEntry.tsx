import { useState, useEffect, useMemo } from 'react';
import {
  User, Phone, MapPin, ShoppingCart, Package, Plus, Minus, Trash2,
  Loader2, CheckCircle2, CreditCard, Banknote,
} from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { ModifierModal, type CartItem } from '../pos/ModifierModal';
import { CustomComboBuilder } from '../customer/CustomComboBuilder';
import * as api from '../../utils/api';
import type { Employee } from '../../types/employee';

type OrderMode = 'retail' | 'combo';
type PaymentMethod = 'transfer' | 'cash' | 'momo';

interface Product {
  id: string;
  name: string;
  basePrice: number;
  image?: string;
  category?: string;
}

interface Props {
  employee: Employee;
  onComplete?: () => void;
  prefill?: { name?: string; phone?: string; address?: string };
}

export function OnlineSalesOrderEntry({ employee, onComplete, prefill }: Props) {
  const { addOrder } = useOrders();

  const [mode, setMode] = useState<OrderMode>('retail');
  const [customer, setCustomer] = useState({
    name: prefill?.name || '',
    phone: prefill?.phone || '',
    address: prefill?.address || '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [markPaid, setMarkPaid] = useState(true);
  const [claimComboNow, setClaimComboNow] = useState(true);
  const [notes, setNotes] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  const [pendingCombo, setPendingCombo] = useState<{ name: string; price: number; raw: Record<string, unknown> } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    api.fetchProducts()
      .then((data) => setProducts(data))
      .catch(console.error)
      .finally(() => setProductsLoading(false));
  }, []);

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
        name: item.productName || item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        protein: item.protein,
        toppings: item.toppings,
      }));

      const now = new Date();
      await addOrder({
        branchId: employee.branch || 'CN1',
        source: 'online_sales',
        items: orderItems,
        status: markPaid ? 'completed' : 'pending',
        total: cartTotal,
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        deliveryAddress: customer.address.trim(),
        paymentMethod: paymentMethod === 'cash' ? 'cash' : 'transfer',
        paidAt: markPaid ? now : undefined,
        completedAt: markPaid ? now : undefined,
        ...staffPayload(),
      });

      await logActivity('converted', `Nhập đơn lẻ — ${cartTotal.toLocaleString('vi-VN')}đ (${orderItems.length} món)`);
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

      const created = await api.createComboSubscription({
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        deliveryAddress: customer.address.trim(),
        planName: pendingCombo.name,
        comboType: duration === 'weekly' ? 'weekly' : 'monthly',
        comboDuration: duration,
        startDate: startIso,
        nextDelivery: startIso,
        deliveryDays: [1, 2, 3, 4, 5],
        items: raw,
        totalPrice: pendingCombo.price,
        status: 'pending',
        branchId: employee.branch || 'CN1',
        staff: `CSKH - ${employee.fullName}`,
        notes: notes.trim(),
        salesRefCode: employee.username,
      });

      if (claimComboNow && created?.id) {
        await api.claimComboSubscription(created.id, employee.id, employee.fullName);
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
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                placeholder="Địa chỉ giao hàng"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm h-20 resize-none"
              />
            </div>
            <textarea
              placeholder="Ghi chú đơn hàng (tuỳ chọn)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border text-sm h-16 resize-none"
            />
          </div>

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
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="rounded" />
                Khách đã thanh toán (chốt doanh thu ngay)
              </label>
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
                <h3 className="font-bold text-gray-900 mb-3">Chọn sản phẩm</h3>
                {productsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProduct(p)}
                        className="text-left p-3 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                      >
                        <p className="font-semibold text-sm text-gray-900 line-clamp-2">{p.name}</p>
                        <p className="text-indigo-700 font-bold text-sm mt-1">{p.basePrice.toLocaleString('vi-VN')}đ</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
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
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="font-bold text-lg">Tổng: {cartTotal.toLocaleString('vi-VN')}đ</span>
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
              <div className="flex flex-wrap gap-2">
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

      {selectedProduct && (
        <ModifierModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(item) => {
            setCart((prev) => [...prev, item]);
            setSelectedProduct(null);
          }}
        />
      )}

      {showComboBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden h-[90vh] flex flex-col">
            <CustomComboBuilder
              isPOS
              onClose={() => setShowComboBuilder(false)}
              onAddToCart={(combo) => {
                setPendingCombo({
                  name: combo.name || `Combo ${combo.duration || 'tuần'}`,
                  price: combo.finalPrice || combo.totalPrice || 0,
                  raw: combo,
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
