import { useState, useEffect } from 'react';
import { X, Minus, Plus, Calendar, Check, ArrowLeft, ArrowRight, ShieldCheck, User, Loader2, ShoppingBag } from 'lucide-react';
import { useCombos } from '../../contexts/ComboContext';
import { useLoyalty } from '../../contexts/LoyaltyContext';

interface CustomComboBuilderProps {
  onAddToCart: (combo: any) => void;
  onClose: () => void;
  initialData?: any;
  isPOS?: boolean;
}

const PLAN_DATA = {
  'fat-loss': {
    name: 'Fat Loss Plan',
    specs: '360ml × 40g Protein · 7 ly/tuần',
    icon: '🔥',
    badge: 'STANDARD',
    weekly: { original: 553000, discount: 498000, save: 55000, perCup: 71000 },
    monthly: { original: 2370000, discount: 2015000, save: 355000, perCup: 67000 },
    quarterly: { original: 7150000, discount: 5720000, save: 1430000, perCup: 63000 }
  },
  'muscle-build': {
    name: 'Muscle Build Plan',
    specs: '500ml × 60g Protein · 7 ly/tuần',
    icon: '💪',
    badge: 'PHỔ BIẾN',
    weekly: { original: 805000, discount: 725000, save: 80000, perCup: 103500 },
    monthly: { original: 3450000, discount: 2933000, save: 517000, perCup: 98000 },
    quarterly: { original: 10400000, discount: 8330000, save: 2070000, perCup: 93000 }
  },
  'elite-mass': {
    name: 'Elite Mass Plan',
    specs: '700ml × 90g Protein · 7 ly/tuần',
    icon: '🏆',
    badge: 'FLAGSHIP',
    weekly: { original: 1085000, discount: 977000, save: 108000, perCup: 139500 },
    monthly: { original: 4650000, discount: 3953000, save: 697000, perCup: 132000 },
    quarterly: { original: 14000000, discount: 11230000, save: 2770000, perCup: 125000 }
  }
};

const FLAVORS = [
  { name: 'Matcha', desc: 'Matcha Green Tea', image: '🍵' },
  { name: 'Phúc bồn tử hạt chia', desc: 'Raspberry Chia', image: '🫐' },
  { name: 'Bơ • Bơ chuối', desc: 'Avocado • Banana', image: '🥑' },
  { name: 'Xoài cam • Xoài thơm', desc: 'Mango Orange • Pineapple', image: '🥭' },
  { name: 'Cacao yến mạch', desc: 'Cacao Oat', image: '🍫' },
  { name: 'Cà phê chuối', desc: 'Coffee Banana', image: '☕' },
  { name: 'Chuối hạt chia', desc: 'Banana Chia', image: '🍌' },
  { name: 'Chanh dây chuối', desc: 'Passionfruit Banana', image: '🍋' },
  { name: 'Dâu cam • Dâu chia', desc: 'Strawberry Orange • Chia', image: '🍓' },
  { name: 'Dâu chuối • Dâu tằm', desc: 'Straw Banana • Mulberry', image: '🍓' },
  { name: 'Mãng cầu dâu', desc: 'Soursop Strawberry', image: '🌱' },
  { name: 'Dứa thơm • Xoài thơm', desc: 'Pineapple • Mango Pineapple', image: '🍍' },
];

const SINGLE_TOPPINGS = [
  { name: 'Sữa hạt 100%', price: 15000 },
  { name: 'Sữa A2', price: 20000 },
  { name: 'Bột đậu hà lan', price: 20000 },
  { name: 'Whey Gold Standard', price: 39000 },
  { name: 'Collagen', price: 49000 },
  { name: 'Yến mạch', price: 10000 },
  { name: 'Hạt chia', price: 10000 },
  { name: 'Dừa sấy giòn', price: 10000 },
  { name: 'Cỏ ngọt', price: 10000 },
  { name: 'Mật ong', price: 15000 },
];

const COMBO_TOPPINGS = [
  { id: 'healthy-boost', name: 'Healthy Boost', items: 'Yến mạch + Hạt chia + Cỏ ngọt', price: 25000, originalPrice: 30000, save: 5000 },
  { id: 'protein-plus', name: 'Protein Plus', items: 'Whey Gold + Sữa A2', price: 49000, originalPrice: 59000, save: 10000 },
  { id: 'beauty-blend', name: 'Beauty Blend', items: 'Collagen + Sữa hạt + Mật ong', price: 65000, originalPrice: 79000, save: 14000 },
  { id: 'nutty-crunch', name: 'Nutty Crunch', items: 'Bơ đậu phộng + Dừa sấy + Chà là', price: 29000, originalPrice: 35000, save: 6000 },
];

const DAYS_OF_WEEK = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ Nhật'
];

export function CustomComboBuilder({ onAddToCart, onClose, initialData, isPOS }: CustomComboBuilderProps) {
  // Step 0: Customer Info
  // Step 1: Chọn Gói & Ngày Start
  // Step 2: Chọn Vị 7 Ngày
  // Step 3: Chọn Topping
  // Step 4: Xác Nhận & Đặt
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerType, setCustomerType] = useState<'new' | 'existing' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { combos } = useCombos();
  const { lookupByPhone, registerCustomer, activeCustomer, setActiveCustomer } = useLoyalty();

  // Combo Configurations
  const [planId, setPlanId] = useState<'fat-loss' | 'muscle-build' | 'elite-mass'>('fat-loss');
  const [duration, setDuration] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [quantity, setQuantity] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(() => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return tom.toISOString().split('T')[0];
  });

  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(
    Array(7).fill(FLAVORS[0].name)
  );

  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);
  const [selectedSingleToppings, setSelectedSingleToppings] = useState<string[]>([]);
  const [toppingTab, setToppingTab] = useState<'combo' | 'single'>('single');
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);

  // Load standard products if editing
  useEffect(() => {
    if (initialData?.rawComboData) {
      const d = initialData.rawComboData;
      setPlanId(d.planId || 'fat-loss');
      setDuration(d.duration || 'weekly');
      setQuantity(d.quantity || 1);
      setStartDate(d.startDate || '');
      setSelectedFlavors(d.selectedFlavors || Array(7).fill(FLAVORS[0].name));
      setSelectedCombos(d.selectedCombos || []);
      setSelectedSingleToppings(d.selectedSingleToppings || []);
      setCustomerName(initialData.customerName || '');
      setCustomerPhone(initialData.customerPhone || '');
      setStep(1); // skip customer step if editing
    }
  }, [initialData]);

  // POS: pre-fill from loyalty customer already set at checkout
  useEffect(() => {
    if (isPOS && activeCustomer && !initialData) {
      setCustomerName(activeCustomer.name);
      setCustomerPhone(activeCustomer.phone);
      setStep(1);
    }
  }, [isPOS, activeCustomer, initialData]);

  // Customer Auto Lookup (Existing)
  useEffect(() => {
    if (customerType === 'existing' && customerPhone.length >= 10) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        if (isPOS) {
          const loyaltyCust = await lookupByPhone(customerPhone);
          if (loyaltyCust) {
            setCustomerName(loyaltyCust.name);
            setActiveCustomer(loyaltyCust);
          } else {
            const found = combos.find(c => c.customerPhone === customerPhone);
            if (found) {
              setCustomerName(found.customerName);
            } else {
              setCustomerName('');
            }
          }
        } else {
          const found = combos.find(c => c.customerPhone === customerPhone);
          if (found) {
            setCustomerName(found.customerName);
          } else {
            const saved = localStorage.getItem(`customer_${customerPhone}`);
            if (saved) setCustomerName(saved);
            else setCustomerName('');
          }
        }
        setIsSearching(false);
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [customerPhone, customerType, combos, isPOS, lookupByPhone, setActiveCustomer]);

  const handleLookupCustomer = async () => {
    if (!customerPhone) return;
    setIsSearching(true);
    try {
      if (isPOS) {
        const loyaltyCust = await lookupByPhone(customerPhone.trim());
        if (loyaltyCust) {
          setCustomerName(loyaltyCust.name);
          setActiveCustomer(loyaltyCust);
          setStep(1);
          return;
        }
        const foundInCombo = combos.find(c => c.customerPhone === customerPhone);
        if (foundInCombo) {
          setCustomerName(foundInCombo.customerName);
          setStep(1);
          return;
        }
        alert('Không tìm thấy khách hàng này. Vui lòng đăng ký khách mới!');
        setCustomerType('new');
        setCustomerName('');
      } else {
        const foundInCombo = combos.find(c => c.customerPhone === customerPhone);
        let foundName = foundInCombo ? foundInCombo.customerName : null;
        if (!foundName) {
          foundName = localStorage.getItem(`customer_${customerPhone}`);
        }
        if (foundName) {
          setCustomerName(foundName);
          localStorage.setItem(`customer_${customerPhone}`, foundName);
          setStep(1);
        } else {
          alert('Không tìm thấy khách hàng này. Vui lòng đăng ký khách mới!');
          setCustomerType('new');
          setCustomerName('');
        }
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmNewCustomer = async () => {
    const name = customerName.trim();
    const phone = customerPhone.trim();
    if (!name || !phone) {
      alert('Vui lòng nhập đầy đủ tên và số điện thoại khách hàng');
      return;
    }
    if (isPOS) {
      try {
        const cust = await registerCustomer(name, phone);
        setActiveCustomer(cust);
        setCustomerName(cust.name);
        setCustomerPhone(cust.phone);
        setStep(1);
      } catch {
        alert('Không thể đăng ký khách hàng. Số điện thoại có thể đã tồn tại.');
      }
    } else {
      localStorage.setItem(`customer_${phone}`, name);
      setCustomerName(name);
      setCustomerPhone(phone);
      setStep(1);
    }
  };

  // Pricing math
  const plan = PLAN_DATA[planId];
  const planPriceInfo = plan[duration];

  const singleToppingsCostPerWeek = selectedSingleToppings.reduce((sum, name) => {
    const topping = SINGLE_TOPPINGS.find(t => t.name === name);
    return sum + (topping ? topping.price * 7 : 0);
  }, 0);

  const comboToppingsCostPerWeek = selectedCombos.reduce((sum, id) => {
    const combo = COMBO_TOPPINGS.find(c => c.id === id);
    return sum + (combo ? combo.price * 7 : 0);
  }, 0);

  const toppingsCostPerWeek = singleToppingsCostPerWeek + comboToppingsCostPerWeek;
  const durationMultiplier = duration === 'weekly' ? 1 : duration === 'monthly' ? 4.28 : 12.85;
  const totalToppingsCost = toppingsCostPerWeek * durationMultiplier * quantity;

  const originalPrice = planPriceInfo.original * quantity + totalToppingsCost;
  const finalPrice = planPriceInfo.discount * quantity + totalToppingsCost;
  const savings = planPriceInfo.save * quantity;
  const perCup = planPriceInfo.perCup + (toppingsCostPerWeek / 7);

  const handleSelectComboTopping = (id: string) => {
    setSelectedCombos(prev => prev.includes(id) ? [] : [id]);
    setSelectedSingleToppings([]);
  };

  const handleToggleSingleTopping = (name: string) => {
    setSelectedCombos([]);
    setSelectedSingleToppings(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const handleFinalSubmit = () => {
    const toppingsDisplayList: string[] = [];
    selectedCombos.forEach(cId => {
      const c = COMBO_TOPPINGS.find(x => x.id === cId);
      if (c) toppingsDisplayList.push(`Combo Topping: ${c.name}`);
    });
    selectedSingleToppings.forEach(name => {
      toppingsDisplayList.push(name);
    });

    const formattedStartDate = new Date(startDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    const comboData = {
      name: `${plan.name} (${duration === 'weekly' ? 'Tuần' : duration === 'monthly' ? 'Tháng' : 'Quý'} × ${quantity})`,
      image: plan.icon,
      price: finalPrice,
      quantity: 1,
      isCustomCombo: true,
      rawComboData: {
        planId,
        duration,
        quantity,
        selectedFlavors,
        selectedCombos,
        selectedSingleToppings,
        startDate,
        name: plan.name,
        finalPrice,
      },
      customerName,
      customerPhone,
      toppings: [
        `Khách hàng: ${customerName} (${customerPhone})`,
        `Ngày bắt đầu: ${formattedStartDate}`,
        ...selectedFlavors.map((f, idx) => `${DAYS_OF_WEEK[idx]}: ${f}`),
        ...toppingsDisplayList
      ],
    };

    onAddToCart(comboData);
  };

  const getNext7Days = () => {
    const days = [];
    const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    for (let i = 1; i <= 8; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName = daysOfWeek[d.getDay()];
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
      const isoString = d.toISOString().split('T')[0];
      days.push({ dayName, dateStr, isoString });
    }
    return days;
  };

  const nextDays = getNext7Days();

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 relative select-none">
      {/* Step 0: Customer Registration Screen (Old emerald style, large buttons) */}
      {step === 0 ? (
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center bg-emerald-50/20">
          <button onClick={onClose} className="absolute top-4 right-4 p-4 text-gray-400 hover:text-rose-500 transition-colors"><X className="w-6 h-6" /></button>
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="w-24 h-24 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-250 animate-bounce-slow">
              <User className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Xác Nhận Khách Hàng</h2>
              <p className="text-gray-500 mt-2 font-medium">Vui lòng nhập thông tin trước khi bán Combo</p>
            </div>

            {!customerType ? (
              <div className="grid grid-cols-2 gap-6">
                <button 
                  onClick={() => setCustomerType('new')} 
                  className="aspect-square bg-white border-2 border-emerald-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all hover:border-emerald-500 hover:shadow-xl group active:scale-95 cursor-pointer"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                    <Plus className="w-8 h-8 text-emerald-600 group-hover:text-white" />
                  </div>
                  <span className="font-black text-gray-800 uppercase tracking-tighter text-base">Khách Mới</span>
                </button>
                <button 
                  onClick={() => setCustomerType('existing')} 
                  className="aspect-square bg-white border-2 border-emerald-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all hover:border-emerald-500 hover:shadow-xl group active:scale-95 cursor-pointer"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                    <ShoppingBag className="w-8 h-8 text-emerald-600 group-hover:text-white" />
                  </div>
                  <span className="font-black text-gray-800 uppercase tracking-tighter text-base">Khách Cũ</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-300 text-left">
                <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-emerald-50 space-y-6">
                  {customerType === 'new' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest text-left block ml-2">Tên khách hàng</label>
                      <input 
                        autoFocus 
                        type="text" 
                        placeholder="Nguyễn Văn A" 
                        value={customerName} 
                        onChange={e => setCustomerName(e.target.value)} 
                        className="w-full px-6 py-5 bg-emerald-50/30 rounded-2xl outline-none border-2 border-transparent focus:bg-white focus:border-emerald-600 font-bold text-xl transition-all" 
                      />
                    </div>
                  )}
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest text-left block ml-2">Số điện thoại</label>
                    <div className="relative">
                      <input 
                        type="tel" 
                        placeholder="0912345678" 
                        value={customerPhone} 
                        onChange={e => setCustomerPhone(e.target.value)} 
                        className="w-full px-6 py-5 bg-emerald-50/30 rounded-2xl outline-none border-2 border-transparent focus:bg-white focus:border-emerald-600 font-bold text-xl transition-all" 
                      />
                      {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                  {customerType === 'existing' && customerPhone.length >= 10 && customerName && (
                    <div className="bg-emerald-500 text-white p-4 rounded-2xl animate-in zoom-in-95 flex items-center justify-between shadow-lg shadow-emerald-250">
                      <div>
                        <div className="text-[10px] font-black uppercase opacity-75">Khách hàng tìm thấy:</div>
                        <div className="font-black text-lg">{customerName}</div>
                      </div>
                      <span className="text-white text-sm font-bold">✓ Đã tìm thấy</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setCustomerType(null); setCustomerName(''); setCustomerPhone(''); }} 
                    className="px-8 py-5 bg-white text-gray-400 rounded-2xl font-black border border-gray-100 hover:bg-gray-50 text-base"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={customerType === 'new' ? handleConfirmNewCustomer : handleLookupCustomer} 
                    disabled={isSearching || (customerType === 'new' && (!customerName || !customerPhone)) || (customerType === 'existing' && !customerPhone)} 
                    className="flex-1 bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    Tiếp Theo →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Header Progress Steps (Emerald style, larger) */}
          <div className="px-6 py-5 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between shrink-0 overflow-x-auto gap-4 hide-scrollbar">
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-2xl">{plan.icon}</span>
              <h2 className="text-lg font-black text-gray-900 leading-tight">{plan.name}</h2>
            </div>

            <div className="flex items-center gap-4">
              {[
                { label: 'Chọn Gói', num: 1 },
                { label: 'Chọn Vị 7 Ngày', num: 2 },
                { label: 'Chọn Topping', num: 3 },
                { label: 'Xác Nhận', num: 4 },
              ].map((st) => (
                <div key={st.num} className="flex items-center gap-2 flex-shrink-0">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    step === st.num 
                      ? 'bg-emerald-600 text-white shadow-md scale-110' 
                      : step > st.num
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {st.num}
                  </span>
                  <span className={`text-xs font-black ${
                    step === st.num ? 'text-emerald-900' : 'text-gray-500'
                  }`}>
                    {st.label}
                  </span>
                  {st.num < 4 && <div className="w-5 h-[2px] bg-emerald-100" />}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-xl text-gray-400 hover:text-emerald-700 transition-colors"><X className="w-5 h-5" /></button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
            {/* Left Main View - Larger interactive items */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              {/* STEP 1: CHỌN GÓI & NGÀY START */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Select Plan Type */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-emerald-800 uppercase tracking-widest block ml-1">Chọn Lộ Trình</label>
                    <div className="grid grid-cols-3 gap-4">
                      {(Object.keys(PLAN_DATA) as Array<keyof typeof PLAN_DATA>).map(pId => (
                        <button
                          key={pId}
                          onClick={() => setPlanId(pId)}
                          className={`p-5 rounded-2xl border-2 text-left transition-all ${
                            planId === pId 
                              ? 'border-emerald-600 bg-emerald-50/50 shadow-md scale-[1.01]' 
                              : 'border-gray-250 hover:border-emerald-300 bg-white'
                          }`}
                        >
                          <span className="text-3xl block">{PLAN_DATA[pId].icon}</span>
                          <span className="text-sm font-black block text-gray-950 mt-2 leading-tight">{PLAN_DATA[pId].name}</span>
                          <span className="text-[10px] text-gray-500 block mt-1 font-bold">{PLAN_DATA[pId].specs}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Duration Selection */}
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-emerald-800 uppercase tracking-widest block ml-1">Thời hạn gói</label>
                      <div className="grid grid-cols-3 gap-2 bg-emerald-50/40 p-1.5 rounded-2xl border border-emerald-100">
                        {(['weekly', 'monthly', 'quarterly'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setDuration(tab)}
                            className={`py-3.5 rounded-xl text-center transition-all ${
                              duration === tab 
                                ? 'bg-emerald-600 text-white font-black shadow-md' 
                                : 'text-emerald-850 hover:text-emerald-950 hover:bg-white font-bold text-xs'
                            }`}
                          >
                            <span className="text-xs block uppercase">
                              {tab === 'weekly' ? 'Tuần' : tab === 'monthly' ? 'Tháng' : 'Quý'}
                            </span>
                            <span className={`text-[10px] block font-black mt-0.5 ${duration === tab ? 'text-white/90' : 'text-emerald-700'}`}>
                              -{tab === 'weekly' ? '10%' : tab === 'monthly' ? '15%' : '20%'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-emerald-800 uppercase tracking-widest block ml-1">Số lượng đặt</label>
                      <div className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100 flex items-center justify-between h-[64px]">
                        <span className="font-extrabold text-emerald-900 text-sm ml-2">Số lượng đặt:</span>
                        <div className="flex items-center gap-5 bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                          <button 
                            onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                            className="text-emerald-700 hover:text-emerald-900 p-1"
                          >
                            <Minus className="w-4 h-4 stroke-[3]" />
                          </button>
                          <span className="font-black text-gray-950 text-base w-6 text-center">{quantity}</span>
                          <button 
                            onClick={() => setQuantity(prev => prev + 1)}
                            className="text-emerald-700 hover:text-emerald-900 p-1"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  {/* Start Date Suggestions */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-emerald-800 uppercase tracking-widest block ml-1">Chọn Ngày Bắt Đầu Giao Hàng</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {nextDays.map((day) => {
                        const isSelected = startDate === day.isoString;
                        return (
                          <button
                            key={day.isoString}
                            onClick={() => setStartDate(day.isoString)}
                            className={`p-4 rounded-2xl border-2 text-center transition-all ${
                              isSelected 
                                ? 'border-emerald-600 bg-emerald-50 shadow-md scale-[1.01]' 
                                : 'border-gray-200 bg-white hover:border-emerald-300'
                            }`}
                          >
                            <span className={`text-[10px] font-black uppercase tracking-widest block ${isSelected ? 'text-emerald-800' : 'text-gray-400'}`}>
                              {day.dayName}
                            </span>
                            <span className="font-black text-gray-950 text-base block mt-1">
                              {day.dateStr}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Start Date Picker */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-emerald-800 uppercase tracking-widest block ml-1">Hoặc chọn ngày tùy ý</label>
                    <input 
                      type="date" 
                      value={startDate}
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      onChange={e => setStartDate(e.target.value)}
                      className="max-w-xs w-full bg-white text-gray-800 px-5 py-3.5 rounded-2xl border border-gray-250 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-extrabold text-sm"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: CHỌN VỊ 7 NGÀY */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-base font-black text-gray-950">Chọn vị sinh tố cho các ngày</h3>
                    <p className="text-xs text-gray-500 font-medium">Bấm vào từng ngày bên dưới để chọn vị cụ thể cho khách</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DAYS_OF_WEEK.map((day, idx) => (
                      <button
                        key={day}
                        onClick={() => setActiveDayIndex(idx)}
                        className={`flex items-center justify-between p-4 bg-white hover:bg-emerald-50/10 rounded-2xl border-2 transition-all text-left ${
                          activeDayIndex === idx ? 'border-emerald-600 bg-emerald-50/20' : 'border-gray-200'
                        }`}
                        style={{ minHeight: '68px' }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center border border-emerald-100">
                            {FLAVORS.find(f => f.name === selectedFlavors[idx])?.image || '🥤'}
                          </span>
                          <div>
                            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block mb-0.5">{day}</span>
                            <span className="font-extrabold text-gray-950 text-sm">{selectedFlavors[idx]}</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">Đổi vị</span>
                      </button>
                    ))}
                  </div>

                  {/* Inline Flavor Selection Drawer */}
                  {activeDayIndex !== null && (
                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 space-y-4 animate-in slide-in-from-bottom-5 duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                          Chọn vị cho {DAYS_OF_WEEK[activeDayIndex]}
                        </span>
                        <button onClick={() => setActiveDayIndex(null)} className="text-xs font-black text-gray-500 hover:text-gray-800 bg-white border px-3 py-1 rounded-lg">Đóng</button>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {FLAVORS.map(flavor => (
                          <button
                            key={flavor.name}
                            onClick={() => {
                              setSelectedFlavors(prev => {
                                const next = [...prev];
                                next[activeDayIndex] = flavor.name;
                                return next;
                              });
                              setActiveDayIndex(null);
                            }}
                            className={`p-3 bg-white rounded-xl border-2 text-center transition-all ${
                              selectedFlavors[activeDayIndex] === flavor.name
                                ? 'border-emerald-600 bg-emerald-50/50 shadow-md font-bold scale-[1.01]'
                                : 'border-gray-200 hover:border-emerald-300'
                            }`}
                          >
                            <span className="text-2xl block">{flavor.image}</span>
                            <span className="text-xs font-black block truncate leading-tight mt-1.5">{flavor.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: CHỌN TOPPING */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-base font-black text-gray-950">Bổ sung Toppings</h3>
                    <p className="text-xs text-gray-500 font-medium">Bấm chọn bộ combo ưu đãi hoặc các topping đơn lẻ tùy ý</p>
                  </div>

                  {/* Tabs */}
                  <div className="flex bg-emerald-50/60 p-1.5 rounded-2xl border border-emerald-100 w-full">
                    <button
                      onClick={() => setToppingTab('combo')}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all leading-tight ${
                        toppingTab === 'combo' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-800 hover:text-emerald-950'
                      }`}
                    >
                      Combo Topping
                    </button>
                    <button
                      onClick={() => setToppingTab('single')}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all leading-tight ${
                        toppingTab === 'single' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-800 hover:text-emerald-950'
                      }`}
                    >
                      Topping Đơn Lẻ
                    </button>
                  </div>

                  {toppingTab === 'combo' ? (
                    <div className="grid grid-cols-2 gap-4">
                      {COMBO_TOPPINGS.map(combo => {
                        const isSelected = selectedCombos.includes(combo.id);
                        return (
                          <button
                            key={combo.id}
                            onClick={() => handleSelectComboTopping(combo.id)}
                            className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all relative ${
                              isSelected ? 'border-emerald-600 bg-white shadow-md' : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                            }`}
                            style={{ height: '130px' }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-black text-gray-950 text-sm leading-tight">{combo.name}</span>
                                {isSelected && (
                                  <span className="bg-emerald-600 text-white p-0.5 rounded-full flex-shrink-0">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1 font-medium leading-snug line-clamp-2">{combo.items}</p>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                              <span className="text-sm font-black text-emerald-700">+{Math.round(combo.price/1000)}k/ly</span>
                              <span className="text-xs text-gray-400 line-through">+{Math.round(combo.originalPrice/1000)}k</span>
                              <span className="ml-auto text-[9px] bg-rose-50 text-rose-600 font-black px-1.5 py-0.5 rounded whitespace-nowrap">
                                -{combo.save/1000}k
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {SINGLE_TOPPINGS.map(topping => {
                        const isSelected = selectedSingleToppings.includes(topping.name);
                        return (
                          <button
                            key={topping.name}
                            onClick={() => handleToggleSingleTopping(topping.name)}
                            className={`rounded-xl border-2 text-left flex flex-col justify-between transition-all relative ${
                              isSelected 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md font-bold' 
                                : 'bg-white border-gray-200 text-gray-850 hover:bg-gray-100 hover:border-gray-300'
                            }`}
                            style={{ height: '80px', padding: '10px 12px' }}
                          >
                            <span className={`text-[11px] leading-tight font-extrabold ${ isSelected ? 'text-white/95' : 'text-emerald-700'}`}>
                              +{topping.price.toLocaleString()}đ/ly
                            </span>
                            <span className="text-xs font-black leading-tight">{topping.name}</span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 absolute top-2 right-2 text-white stroke-[3]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: XÁC NHẬN */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" /> Xác nhận thông tin Combo
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">Vui lòng kiểm tra kỹ trước khi thêm vào giỏ hàng POS</p>
                  </div>

                  <div className="bg-emerald-50/20 rounded-2xl p-6 border-2 border-emerald-100 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-bold">Lộ trình:</span>
                      <span className="text-gray-950 font-black text-base">{plan.name} ({duration === 'weekly' ? 'Tuần' : duration === 'monthly' ? 'Tháng' : 'Quý'})</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-bold">Khách hàng:</span>
                      <span className="text-gray-955 font-black text-base">{customerName} ({customerPhone})</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-bold">Ngày bắt đầu:</span>
                      <span className="text-emerald-700 font-black text-base">{new Date(startDate).toLocaleDateString('vi-VN')}</span>
                    </div>

                    <div className="flex items-start justify-between text-sm">
                      <span className="text-gray-500 font-bold">Topping đã chọn:</span>
                      <span className="text-gray-950 font-black text-right max-w-[65%] leading-normal">
                        {selectedCombos.length > 0 ? (
                          <span className="text-emerald-700 font-black">Combo {COMBO_TOPPINGS.find(c => c.id === selectedCombos[0])?.name}</span>
                        ) : selectedSingleToppings.length > 0 ? (
                          selectedSingleToppings.join(', ')
                        ) : (
                          'Không sử dụng topping'
                        )}
                      </span>
                    </div>

                    <hr className="border-emerald-100" />

                    <div className="space-y-2">
                      <span className="text-gray-500 font-bold text-xs block">Menu 7 ngày đã chọn:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <div key={day} className="bg-white p-3 rounded-xl border border-gray-250">
                            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block">{day}</span>
                            <span className="text-xs font-black text-gray-900 block truncate mt-1">{selectedFlavors[idx]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Side Billing Panel - Larger fonts, emerald accents */}
            <div className="w-full lg:w-[350px] bg-gray-50 p-6 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col justify-between">
              <div className="space-y-5">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block">Thông tin thanh toán</label>
                
                <div className="bg-white p-5 rounded-2xl border-2 border-emerald-50 space-y-3.5 shadow-sm">
                  <div className="flex justify-between text-xs font-bold text-gray-500">
                    <span>Giá gốc:</span>
                    <span className="line-through">{originalPrice.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-500">
                    <span>Giá ưu đãi:</span>
                    <span className="text-gray-950 font-extrabold text-sm">{(planPriceInfo.discount * quantity).toLocaleString('vi-VN')}đ</span>
                  </div>
                  {totalToppingsCost > 0 && (
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                      <span>Toppings:</span>
                      <span className="text-emerald-700 font-extrabold">+{totalToppingsCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}

                  <hr className="border-gray-150" />

                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-black text-gray-950">Tổng cộng:</span>
                      <span className="text-2xl font-black text-emerald-700">{finalPrice.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold text-right mt-1">
                      ~ {Math.round(perCup).toLocaleString('vi-VN')}đ/ly · Freeship giao sáng
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons (Larger touch targets) */}
              <div className="flex gap-3 mt-6">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(prev => (prev - 1) as any)}
                    className="px-5 py-4 bg-white border-2 border-gray-250 hover:bg-gray-100 text-gray-800 font-black rounded-xl transition-all active:scale-[0.95] text-sm"
                  >
                    Quay lại
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-5 py-4 bg-white border-2 border-gray-250 hover:bg-gray-100 text-gray-600 font-bold rounded-xl text-sm transition-all active:scale-[0.95]"
                  >
                    HỦY
                  </button>
                )}

                {step < 4 ? (
                  <button
                    onClick={() => setStep(prev => (prev + 1) as any)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.95] text-center"
                  >
                    TIẾP TỤC →
                  </button>
                ) : (
                  <button
                    onClick={handleFinalSubmit}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.95] text-center animate-pulse"
                  >
                    ĐẶT COMBO ({finalPrice.toLocaleString('vi-VN')}đ)
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
