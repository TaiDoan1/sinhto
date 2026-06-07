import { useState, useEffect } from 'react';
import { Plus, Minus, Calendar, Package, X, CheckCircle2, ShoppingBag, User, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { getMenuProducts } from '../pos/ProductGrid';
import type { Product } from '../pos/ProductGrid';
import { ModifierModal } from '../pos/ModifierModal';
import { useCombos } from '../../contexts/ComboContext';

export interface ComboItem {
  id: string;
  product: Product;
  quantity: number;
  size: string;
  protein: number;
  toppings: string[];
  price: number;
  assignedDay?: number | 'all';
}

export interface CustomCombo {
  name: string;
  items: ComboItem[];
  comboType: 'weekly' | 'monthly';
  deliveryDays: number[];
  totalPrice: number;
  discount: number;
  finalPrice: number;
  customerName?: string;
  customerPhone?: string;
  id?: string; // Add ID for editing
}

interface CustomComboBuilderProps {
  onAddToCart: (combo: CustomCombo) => void;
  onClose: () => void;
  initialData?: CustomCombo;
  isPOS?: boolean;
}

const weekDayLabels = [
  { id: 0, label: 'CN', fullLabel: 'Chủ Nhật' },
  { id: 1, label: 'T2', fullLabel: 'Thứ 2' },
  { id: 2, label: 'T3', fullLabel: 'Thứ 3' },
  { id: 3, label: 'T4', fullLabel: 'Thứ 4' },
  { id: 4, label: 'T5', fullLabel: 'Thứ 5' },
  { id: 5, label: 'T6', fullLabel: 'Thứ 6' },
  { id: 6, label: 'T7', fullLabel: 'Thứ 7' },
];

const PREDEFINED_COMBOS = [
  {
    id: 'pre-1',
    name: 'Combo Năng Lượng 3 Ngày',
    description: '3 ly Smoothie Protein cao cho các ngày tập nặng. Giảm 5%',
    comboType: 'weekly' as const,
    itemsTemplate: [
      { productId: 'SM-007', quantity: 1, size: '500ml', protein: 40, toppings: ['Hạt Chia'] },
      { productId: 'SM-008', quantity: 1, size: '500ml', protein: 40, toppings: ['Bơ Đậu Phộng'] },
      { productId: 'SM-003', quantity: 1, size: '500ml', protein: 40, toppings: [] },
    ],
    deliveryDays: [1, 3, 5]
  },
  {
    id: 'pre-2',
    name: 'Combo Eat Clean 7 Ngày',
    description: 'Đủ 7 vị Smoothie Detox rau củ quả mọng, eo thon dáng đẹp. Giảm 15%',
    comboType: 'weekly' as const,
    itemsTemplate: [
      { productId: 'SM-001', quantity: 1, size: '350ml', protein: 20, toppings: [] },
      { productId: 'SM-002', quantity: 1, size: '350ml', protein: 20, toppings: [] },
      { productId: 'SM-003', quantity: 2, size: '350ml', protein: 20, toppings: ['Hạt Chia'] },
      { productId: 'SM-004', quantity: 2, size: '350ml', protein: 20, toppings: [] },
      { productId: 'SM-005', quantity: 1, size: '350ml', protein: 20, toppings: [] },
    ],
    deliveryDays: [0, 1, 2, 3, 4, 5, 6]
  }
];

export function CustomComboBuilder({ onAddToCart, onClose, initialData, isPOS }: CustomComboBuilderProps) {
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom'>(initialData ? 'custom' : 'predefined');
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(initialData ? 4 : (isPOS ? 0 : 1));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Customer Info
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone || '');
  const [customerType, setCustomerType] = useState<'new' | 'existing' | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Combo Config
  const [selectedItems, setSelectedItems] = useState<ComboItem[]>(initialData?.items || []);
  const [comboType, setComboType] = useState<'weekly' | 'monthly'>(initialData?.comboType || 'weekly');
  const [deliveryDays, setDeliveryDays] = useState<number[]>(initialData?.deliveryDays || [1, 3, 5]);
  const [selectedCategory, setSelectedCategory] = useState<'smoothies' | 'toppings'>('smoothies');
  const [selectedProductForModifier, setSelectedProductForModifier] = useState<Product | null>(null);
  const [isPhoneChecking, setIsPhoneChecking] = useState(false);
  const [hasCheckedPhone, setHasCheckedPhone] = useState(false);

  const { combos, addNotification } = useCombos();

  useEffect(() => {
    setProducts(getMenuProducts());
    setLoading(false);
  }, []);

  // Auto-lookup for existing customers
  useEffect(() => {
    if (customerType === 'existing' && customerPhone.length >= 10) {
      setIsPhoneChecking(true);
      setHasCheckedPhone(false);
      
      const timer = setTimeout(() => {
        // 1. Check in active combos first (official)
        const existingInCombos = combos.find(c => c.customerPhone === customerPhone);
        if (existingInCombos) {
          setCustomerName(existingInCombos.customerName);
        } else {
          // 2. Check in localStorage
          const savedName = localStorage.getItem(`customer_${customerPhone}`);
          if (savedName) {
            setCustomerName(savedName);
          } else {
            setCustomerName('');
          }
        }
        setIsPhoneChecking(false);
        setHasCheckedPhone(true);
      }, 600); // Artificial delay for UX

      return () => clearTimeout(timer);
    } else {
      setHasCheckedPhone(false);
      setCustomerName('');
    }
  }, [customerPhone, customerType, combos]);

  const handleLookupCustomer = () => {
    if (!customerPhone) return;
    setIsSearching(true);
    setTimeout(() => {
      const savedName = localStorage.getItem(`customer_${customerPhone}`);
      if (savedName) {
        setCustomerName(savedName);
        setStep(1);
      } else {
        alert('Không tìm thấy khách hàng này. Vui lòng đăng ký khách mới!');
        setCustomerType('new');
        setCustomerName(''); // Clear to ensure fresh input
      }
      setIsSearching(false);
    }, 400);
  };

  const handleConfirmNewCustomer = () => {
    if (customerName.trim() && customerPhone.trim()) {
      localStorage.setItem(`customer_${customerPhone.trim()}`, customerName.trim());
      setStep(1);
    } else {
      alert('Vui lòng nhập đầy đủ tên và số điện thoại khách hàng');
    }
  };

  const handleProductClick = (product: Product) => {
    if (product.category === 'smoothies') {
      setSelectedProductForModifier(product);
    } else {
      addCustomizedItem({
        productId: product.id,
        size: '',
        protein: 0,
        toppings: [],
        price: product.basePrice,
        quantity: 1
      }, product);
    }
  };

  const handleModifierAdd = (modifierItem: any) => {
    const product = products.find(p => p.id === modifierItem.productId);
    if (product) addCustomizedItem(modifierItem, product);
    setSelectedProductForModifier(null);
  };

  const addCustomizedItem = (modifierItem: any, product: Product) => {
    const existing = selectedItems.find(item => 
      item.product.id === modifierItem.productId &&
      item.size === modifierItem.size &&
      item.protein === modifierItem.protein &&
      JSON.stringify(item.toppings) === JSON.stringify(modifierItem.toppings)
    );

    if (existing) {
      setSelectedItems(selectedItems.map(item =>
        item.id === existing.id ? { ...item, quantity: item.quantity + modifierItem.quantity } : item
      ));
    } else {
      setSelectedItems([...selectedItems, { 
        id: Date.now().toString() + Math.random(),
        product, 
        quantity: modifierItem.quantity,
        size: modifierItem.size,
        protein: modifierItem.protein,
        toppings: modifierItem.toppings,
        price: modifierItem.price,
        assignedDay: 'all'
      }]);
    }
  };

  const assignDay = (itemId: string, day: number | 'all') => {
    setSelectedItems(selectedItems.map(item => 
      item.id === itemId ? { ...item, assignedDay: day } : item
    ));
  };

  const removeProduct = (itemId: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const toggleDeliveryDay = (day: number) => {
    if (deliveryDays.includes(day)) {
      if (deliveryDays.length > 1) setDeliveryDays(deliveryDays.filter(d => d !== day));
    } else {
      setDeliveryDays([...deliveryDays, day].sort());
    }
  };

  const calculatePricing = () => {
    let subtotal = 0;
    let totalItems = 0;
    selectedItems.forEach(item => {
      const multiplier = (!item.assignedDay || item.assignedDay === 'all') ? (deliveryDays.length > 0 ? deliveryDays.length : 1) : 1;
      const weekMultiplier = comboType === 'monthly' ? 4 : 1;
      const totalQty = item.quantity * multiplier * weekMultiplier;
      subtotal += item.price * totalQty;
      totalItems += totalQty;
    });

    let discount = 0;
    if (comboType === 'weekly') {
      if (subtotal >= 300000) discount = subtotal * 0.10;
      else if (subtotal >= 200000) discount = subtotal * 0.07;
      else if (subtotal >= 150000) discount = subtotal * 0.05;
    } else {
      if (subtotal >= 1000000) discount = subtotal * 0.15;
      else if (subtotal >= 700000) discount = subtotal * 0.12;
      else if (subtotal >= 500000) discount = subtotal * 0.10;
    }

    return { subtotal, discount, finalPrice: subtotal - discount, totalItems };
  };

  const { subtotal, discount, finalPrice, totalItems } = calculatePricing();

  const handleFinalSubmit = () => {
    if (selectedItems.length === 0) return alert('Vui lòng chọn món!');
    if (deliveryDays.length === 0) return alert('Vui lòng chọn ngày giao!');

    const comboData: CustomCombo = {
      id: initialData?.id,
      name: initialData?.name || `Combo Tự Chọn (${comboType === 'weekly' ? 'Tuần' : 'Tháng'})`,
      items: selectedItems,
      comboType,
      deliveryDays,
      totalPrice: subtotal,
      discount,
      finalPrice,
      customerName,
      customerPhone
    };

    if (initialData?.id) {
      if (!isPOS) {
        addNotification({
          comboId: initialData.id,
          customerName: customerName || 'Khách hàng',
          type: 'update',
          message: `Khách hàng vừa cập nhật nội dung Combo ${initialData.id}`
        });
      }
    }

    onAddToCart(comboData);
  };

  const handleAddPredefined = (preDef: any) => {
    const priceTable = JSON.parse(localStorage.getItem('menuPriceTable') || '{}');
    
    const items: ComboItem[] = preDef.itemsTemplate.map((t: any, idx: number) => {
      const product = products.find(p => p.id === t.productId);
      if (!product) return null;
      
      // Tính giá dựa trên bảng giá Admin
      let price = product.basePrice;
      const sizePrices = priceTable[t.size];
      if (sizePrices) {
        price = sizePrices[t.protein] || product.basePrice;
      }
      
      // Thêm giá topping
      price += (t.toppings?.length || 0) * 10000;
      
      return { 
        id: `pre-${idx}-${Date.now()}`, 
        product, 
        quantity: t.quantity, 
        size: t.size, 
        protein: t.protein, 
        toppings: t.toppings || [], 
        price, 
        assignedDay: 'all' 
      };
    }).filter(Boolean);

    setSelectedItems(items as any);
    setDeliveryDays(preDef.deliveryDays);
    setComboType(preDef.comboType);
    setActiveTab('custom');
    setStep(1);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* STEP 0: Customer (POS Only) */}
      {isPOS && step === 0 ? (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-emerald-50/20">
          <button onClick={onClose} className="absolute top-4 right-4 p-4 text-gray-400 hover:text-rose-500 transition-colors"><X className="w-6 h-6" /></button>
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="w-24 h-24 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200 animate-bounce-slow">
              <User className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Xác Nhận Khách Hàng</h2>
              <p className="text-gray-500 mt-2 font-medium">Vui lòng nhập thông tin trước khi bán Combo</p>
            </div>

            {!customerType ? (
              <div className="grid grid-cols-2 gap-6">
                <button onClick={() => setCustomerType('new')} className="aspect-square bg-white border-2 border-emerald-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all hover:border-emerald-500 hover:shadow-xl group active:scale-95">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                    <Plus className="w-8 h-8 text-emerald-600 group-hover:text-white" />
                  </div>
                  <span className="font-black text-gray-800 uppercase tracking-tighter">Khách Mới</span>
                </button>
                <button onClick={() => setCustomerType('existing')} className="aspect-square bg-white border-2 border-emerald-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all hover:border-emerald-500 hover:shadow-xl group active:scale-95">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                    <ShoppingBag className="w-8 h-8 text-emerald-600 group-hover:text-white" />
                  </div>
                  <span className="font-black text-gray-800 uppercase tracking-tighter">Khách Cũ</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-300">
                <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-emerald-50 space-y-6">
                  {customerType === 'new' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest text-left block ml-2">Tên khách hàng</label>
                      <input autoFocus type="text" placeholder="Nguyễn Văn A" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-6 py-5 bg-emerald-50/30 rounded-2xl outline-none border-2 border-transparent focus:bg-white focus:border-emerald-600 font-bold text-xl transition-all" />
                    </div>
                  )}
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest text-left block ml-2">Số điện thoại</label>
                    <div className="relative">
                      <input type="tel" placeholder="0912345678" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-6 py-5 bg-emerald-50/30 rounded-2xl outline-none border-2 border-transparent focus:bg-white focus:border-emerald-600 font-bold text-xl transition-all" />
                      {isPhoneChecking && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-6 h-6 text-emerald-600 animate-spin" /></div>}
                    </div>
                  </div>
                  {customerType === 'existing' && hasCheckedPhone && customerName && (
                    <div className="bg-emerald-500 text-white p-4 rounded-2xl animate-in zoom-in-95 flex items-center justify-between shadow-lg shadow-emerald-200">
                      <div><div className="text-[10px] font-black uppercase opacity-70">Khách hàng tìm thấy</div><div className="font-black text-lg">{customerName}</div></div>
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => { setCustomerType(null); setCustomerName(''); setCustomerPhone(''); }} className="px-8 py-5 bg-white text-gray-400 rounded-2xl font-black border border-gray-100 hover:bg-gray-50">Hủy</button>
                  <button onClick={customerType === 'new' ? handleConfirmNewCustomer : handleLookupCustomer} disabled={isSearching || (customerType === 'new' && (!customerName || !customerPhone)) || (customerType === 'existing' && !customerPhone)} className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center">
                    {isSearching ? 'Đang tìm...' : 'Tiếp Theo →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Header Tabs */}
          <div className="flex border-b shrink-0 sticky top-0 bg-white z-50">
            {!initialData && <button onClick={() => { setActiveTab('predefined'); setStep(1); }} className={`flex-1 py-4 text-xs font-black tracking-widest border-b-4 transition-all ${activeTab === 'predefined' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400'}`}>COMBO CÓ SẴN</button>}
            <button onClick={() => { setActiveTab('custom'); setStep(1); }} className={`flex-1 py-4 text-xs font-black tracking-widest border-b-4 transition-all ${activeTab === 'custom' || initialData ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400'}`}>{initialData ? 'CHỈNH SỬA COMBO' : 'TỰ CHỌN COMBO'}</button>
            <button onClick={onClose} className="p-4 text-gray-400 hover:text-rose-500 transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 overflow-hidden">
            {initialData ? (
              /* QUICK EDIT MODE */
              <div className="h-full flex flex-col md:flex-row overflow-hidden bg-gray-50">
                <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Món trong Combo</h3>
                    <div className="flex gap-2">
                      {['smoothies', 'toppings'].map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat as any)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${selectedCategory === cat ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 border'}`}>{cat}</button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8 overflow-y-auto pr-2">
                    {selectedItems.map(item => (
                      <div key={item.id} className="bg-white rounded-3xl p-4 shadow-sm border border-emerald-50 flex items-center gap-4 group">
                        <div className="text-4xl bg-emerald-50 w-16 h-16 flex items-center justify-center rounded-2xl shrink-0">{item.product.image}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{item.product.name}</h4>
                          <span className="text-[10px] font-bold text-gray-400">{item.size} • {item.protein}g</span>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center bg-gray-100 rounded-lg scale-90 -ml-2">
                              <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg"><Minus className="w-4 h-4" /></button>
                              <span className="w-8 text-center font-bold text-xs">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg"><Plus className="w-4 h-4" /></button>
                            </div>
                            <button onClick={() => removeProduct(item.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-50 rounded-lg"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-emerald-600 text-sm">{item.price.toLocaleString('vi-VN')}đ</div>
                          <select value={item.assignedDay || 'all'} onChange={(e) => assignDay(item.id, e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="text-[10px] font-bold bg-gray-50 border-none rounded-lg mt-1 p-1 outline-none">
                            <option value="all">Tất cả các ngày</option>
                            {deliveryDays.map(d => <option key={d} value={d}>{weekDayLabels.find(w => w.id === d)?.fullLabel}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-6 border-t border-gray-200 shrink-0">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Thêm món nhanh</h4>
                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                      {products.filter(p => p.category === selectedCategory).map(p => (
                        <button key={p.id} onClick={() => handleProductClick(p)} className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-transparent hover:border-emerald-500 transition-all shrink-0 w-24">
                          <div className="text-3xl">{p.image}</div>
                          <span className="text-[10px] font-bold text-gray-700 text-center line-clamp-1">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-80 lg:w-[400px] bg-white p-8 border-l border-gray-100 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                  <div className="space-y-8 flex-1 overflow-y-auto pr-2">
                    <section>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Lịch Giao Hàng</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {weekDayLabels.map(day => (
                          <button key={day.id} onClick={() => toggleDeliveryDay(day.id)} className={`py-3 rounded-xl border-2 text-xs font-black transition-all ${deliveryDays.includes(day.id) ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg' : 'border-gray-50 bg-gray-50 text-gray-400'}`}>{day.label}</button>
                        ))}
                      </div>
                    </section>
                    <section>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Gói Combo</h4>
                      <div className="flex p-1 bg-gray-100 rounded-2xl">
                        {['weekly', 'monthly'].map(type => (
                          <button key={type} onClick={() => setComboType(type as any)} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${comboType === type ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>{type.toUpperCase()}</button>
                        ))}
                      </div>
                    </section>
                    <section className="bg-emerald-50/50 p-6 rounded-3xl space-y-4">
                      <div className="flex justify-between text-xs font-bold text-gray-500"><span>Số lượng:</span><span className="text-gray-900">{totalItems} món</span></div>
                      <div className="flex justify-between text-xs font-bold text-emerald-600"><span>Tiết kiệm:</span><span>-{discount.toLocaleString('vi-VN')}đ</span></div>
                      <div className="pt-4 border-t border-emerald-100 flex justify-between items-end"><span className="font-black text-gray-900">TỔNG CỘNG:</span><span className="text-2xl font-black text-emerald-600">{finalPrice.toLocaleString('vi-VN')}đ</span></div>
                    </section>
                  </div>
                  <div className="pt-8 space-y-3">
                    <button onClick={handleFinalSubmit} className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all">CẬP NHẬT COMBO</button>
                  </div>
                </div>
              </div>
            ) : activeTab === 'predefined' ? (
              /* PREDEFINED COMBOS */
              <div className="h-full overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {PREDEFINED_COMBOS.map(combo => (
                  <div key={combo.id} className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 hover:border-emerald-500 transition-all flex flex-col">
                    <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><ShoppingBag className="w-6 h-6" /></div><h4 className="font-black text-xl text-gray-900">{combo.name}</h4></div>
                    <p className="text-gray-500 text-sm mb-6 flex-1">{combo.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-xs font-bold text-gray-400">📅 {combo.deliveryDays.length} ngày/tuần</div>
                      <button onClick={() => handleAddPredefined(combo)} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black shadow-lg active:scale-95 transition-all">Chọn Combo →</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* WIZARD STEPS FOR NEW COMBO */
              <div className="h-full flex flex-col">
                {step === 1 && (
                  <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-8">
                    <h3 className="text-2xl font-black">Chọn Gói Combo</h3>
                    <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
                      {['weekly', 'monthly'].map(type => (
                        <button key={type} onClick={() => setComboType(type as any)} className={`p-8 rounded-[2.5rem] border-2 transition-all ${comboType === type ? 'border-emerald-600 bg-emerald-50 shadow-xl' : 'border-gray-100 bg-white'}`}>
                          <div className="text-4xl mb-3">{type === 'weekly' ? '📅' : '🗓️'}</div><div className="font-black text-lg uppercase">{type === 'weekly' ? 'Tuần' : 'Tháng'}</div>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setStep(2)} className="w-full max-w-xs bg-gray-900 text-white py-4 rounded-xl font-black">Tiếp Theo →</button>
                  </div>
                )}
                {step === 2 && (
                  <div className="h-full flex flex-col md:flex-row overflow-hidden">
                    <div className="flex-1 p-6 border-r overflow-y-auto">
                       <h3 className="font-black text-lg mb-4">Chọn Món</h3>
                       <div className="grid grid-cols-2 gap-3">
                         {products.filter(p => p.category === 'smoothies').map(p => (
                           <button key={p.id} onClick={() => handleProductClick(p)} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-3 hover:border-emerald-500 transition-all">
                             <div className="text-2xl">{p.image}</div><div className="text-left"><div className="font-bold text-sm">{p.name}</div><div className="text-emerald-600 font-black text-xs">{p.basePrice.toLocaleString('vi-VN')}đ</div></div>
                           </button>
                         ))}
                       </div>
                    </div>
                    <div className="w-80 bg-gray-50 p-6 flex flex-col">
                      <h3 className="font-black text-lg mb-4">Giỏ hàng ({selectedItems.length})</h3>
                      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                        {selectedItems.map(item => (
                          <div key={item.id} className="bg-white p-2 rounded-xl flex justify-between items-center text-xs">
                            <span>{item.product.name}</span>
                            <button onClick={() => removeProduct(item.id)}><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setStep(3)} disabled={selectedItems.length === 0} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black">Tiếp Tục →</button>
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-10">
                    <h3 className="text-2xl font-black">Lịch Nhận Đồ Uống</h3>
                    <div className="grid grid-cols-7 gap-2 w-full max-w-2xl">
                      {weekDayLabels.map(day => (
                        <button key={day.id} onClick={() => toggleDeliveryDay(day.id)} className={`py-6 rounded-2xl border-2 transition-all font-black ${deliveryDays.includes(day.id) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-100'}`}>{day.label}</button>
                      ))}
                    </div>
                    <button onClick={() => setStep(4)} className="w-full max-w-xs bg-emerald-600 text-white py-4 rounded-xl font-black">Xác Nhận →</button>
                  </div>
                )}
                {step === 4 && (
                  <div className="flex-1 p-8 overflow-y-auto text-center space-y-8">
                    <h3 className="text-2xl font-black">Hoàn Tất Combo</h3>
                    <div className="max-w-md mx-auto bg-gray-900 text-white p-8 rounded-[2.5rem] space-y-4 text-left">
                       <div className="flex justify-between"><span>Gói:</span><span>{comboType}</span></div>
                       <div className="flex justify-between"><span>Số món:</span><span>{totalItems}</span></div>
                       <div className="pt-4 border-t border-white/10 flex justify-between text-xl font-black"><span>Tổng tiền:</span><span className="text-emerald-400">{finalPrice.toLocaleString('vi-VN')}đ</span></div>
                    </div>
                    <button onClick={handleFinalSubmit} className="w-full max-w-md bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-xl">ĐẶT COMBO</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {selectedProductForModifier && (
        <ModifierModal
          product={{ id: selectedProductForModifier.id, name: selectedProductForModifier.name, basePrice: selectedProductForModifier.basePrice, image: selectedProductForModifier.image }}
          onClose={() => setSelectedProductForModifier(null)}
          onAddToCart={handleModifierAdd}
        />
      )}
    </div>
  );
}
