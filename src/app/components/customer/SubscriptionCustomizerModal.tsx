'use client';
import { useState, useEffect } from 'react';
import { X, Minus, Plus, Check, Calendar, ArrowLeft, ArrowRight, ShieldCheck, ShoppingCart, HelpCircle } from 'lucide-react';
import { DEFAULT_COMBO_TOPPINGS, DEFAULT_TOPPING_PRODUCTS } from '../../config/menuToppings';

export interface SubscriptionConfig {
  planId: 'fat-loss' | 'muscle-build' | 'elite-mass';
  duration: 'weekly' | 'monthly' | 'quarterly';
  quantity: number;
  selectedFlavors: string[]; // Length 7, corresponding to Mon-Sun
  selectedCombos: string[]; // list of combo topping IDs
  selectedSingleToppings: string[]; // list of single topping names
  startDate: string; // ISO date string
}

interface Props {
  planId: 'fat-loss' | 'muscle-build' | 'elite-mass';
  onClose: () => void;
  onAddToCart: (cartItem: any) => void;
  initialConfig?: any; // For editing
}

// 15+ Flavors database
const FLAVORS = [
  { name: 'Matcha', desc: 'Matcha Green Tea', image: '🍵', tag: 'Mới' },
  { name: 'Phúc bồn tử hạt chia', desc: 'Raspberry Chia', image: '🫐', tag: 'Phải thử' },
  { name: 'Bơ • Bơ chuối', desc: 'Avocado • Banana', image: '🥑', tag: 'Bán chạy' },
  { name: 'Xoài cam • Xoài thơm', desc: 'Mango Orange • Pineapple', image: '🥭', tag: 'Bán chạy' },
  { name: 'Cacao yến mạch', desc: 'Cacao Oat', image: '🍫' },
  { name: 'Cà phê chuối', desc: 'Coffee Banana', image: '☕' },
  { name: 'Chuối hạt chia', desc: 'Banana Chia', image: '🍌' },
  { name: 'Chanh dây chuối', desc: 'Passionfruit Banana', image: '🍋' },
  { name: 'Dâu cam • Dâu chia', desc: 'Strawberry Orange • Chia', image: '🍓' },
  { name: 'Dâu chuối • Dâu tằm', desc: 'Straw Banana • Mulberry', image: '🍓', tag: 'Mới' },
  { name: 'Mãng cầu dâu', desc: 'Soursop Strawberry', image: '🌱' },
  { name: 'Dứa thơm • Xoài thơm', desc: 'Pineapple • Mango Pineapple', image: '🍍' },
];

const SINGLE_TOPPINGS = DEFAULT_TOPPING_PRODUCTS.map((p) => ({
  name: p.name,
  price: p.basePrice,
  isFree: p.basePrice <= 0,
  image: p.image,
}));

const COMBO_TOPPINGS = DEFAULT_COMBO_TOPPINGS;

const PLAN_DATA = {
  'fat-loss': {
    name: 'Fat Loss Plan',
    subtitle: 'GIẢM MỠ • TONE DÁNG',
    specs: '360ml × 40g Protein · 7 ly/tuần',
    icon: '🔥',
    badge: 'STANDARD',
    colorClass: 'text-orange-500 border-orange-500/20',
    btnClass: 'bg-orange-500 hover:bg-orange-600 text-white',
    accentColor: '#f97316',
    weekly: { original: 553000, discount: 498000, save: 55000, perCup: 71000 },
    monthly: { original: 2370000, discount: 2015000, save: 355000, perCup: 67000 },
    quarterly: { original: 7150000, discount: 5720000, save: 1430000, perCup: 63000 }
  },
  'muscle-build': {
    name: 'Muscle Build Plan',
    subtitle: 'TĂNG CƠ • BEST VALUE',
    specs: '500ml × 60g Protein · 7 ly/tuần',
    icon: '💪',
    badge: 'PHỔ BIẾN',
    colorClass: 'text-emerald-500 border-emerald-500/20',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    accentColor: '#059669',
    weekly: { original: 805000, discount: 725000, save: 80000, perCup: 103500 },
    monthly: { original: 3450000, discount: 2933000, save: 517000, perCup: 98000 },
    quarterly: { original: 10400000, discount: 8330000, save: 2070000, perCup: 93000 }
  },
  'elite-mass': {
    name: 'Elite Mass Plan',
    subtitle: 'TĂNG CÂN • DÂN GYM PRO',
    specs: '700ml × 90g Protein · 7 ly/tuần',
    icon: '🏆',
    badge: 'FLAGSHIP',
    colorClass: 'text-yellow-600 border-yellow-600/20',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    accentColor: '#6366f1',
    weekly: { original: 1085000, discount: 977000, save: 108000, perCup: 139500 },
    monthly: { original: 4650000, discount: 3953000, save: 697000, perCup: 132000 },
    quarterly: { original: 14000000, discount: 11230000, save: 2770000, perCup: 125000 }
  }
};

const DAYS_OF_WEEK = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ Nhật'
];

export function SubscriptionCustomizerModal({ planId, onClose, onAddToCart, initialConfig }: Props) {
  const plan = PLAN_DATA[planId];
  
  // Guided steps:
  // Step 0: Chọn ngày start
  // Step 1: Chọn vị 7 ngày
  // Step 2: Chọn Topping (Topping lẻ hoặc Topping combo)
  // Step 3: Xác nhận & Đặt
  const [currentStep, setCurrentStep] = useState<number>(0);

  const [duration, setDuration] = useState<'weekly' | 'monthly' | 'quarterly'>(
    initialConfig?.duration || 'weekly'
  );
  const [quantity, setQuantity] = useState<number>(initialConfig?.quantity || 1);
  const [startDate, setStartDate] = useState<string>(() => {
    if (initialConfig?.startDate) return initialConfig.startDate;
    // Default to tomorrow
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return tom.toISOString().split('T')[0];
  });

  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(
    initialConfig?.selectedFlavors || [
      FLAVORS[0].name, FLAVORS[1].name, FLAVORS[2].name,
      FLAVORS[3].name, FLAVORS[4].name, FLAVORS[5].name,
      FLAVORS[6].name
    ]
  );
  
  // Custom toppings selections
  const [selectedCombos, setSelectedCombos] = useState<string[]>(
    initialConfig?.selectedCombos || []
  );
  const [selectedSingleToppings, setSelectedSingleToppings] = useState<string[]>(
    initialConfig?.selectedSingleToppings || []
  );

  // Active topping tab (combo vs single)
  const [toppingTab, setToppingTab] = useState<'combo' | 'single'>(
    (initialConfig?.selectedCombos?.length || 0) > 0 ? 'combo' : 'single'
  );

  // Day currently being configured for flavor picker popup
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);

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

  // Enforce mutual exclusivity of topping combo and single toppings
  const handleSelectCombo = (id: string) => {
    setSelectedCombos([id]); // single combo selection
    setSelectedSingleToppings([]); // clear single toppings
  };

  const handleToggleSingleTopping = (name: string) => {
    setSelectedCombos([]); // clear combo toppings
    setSelectedSingleToppings(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  // Pricing math
  const planPriceInfo = plan[duration];
  
  // Calculate toppings price (toppings are calculated per week, multiplied by quantity & duration factor)
  const singleToppingsCostPerWeek = selectedSingleToppings.reduce((sum, name) => {
    const topping = SINGLE_TOPPINGS.find(t => t.name === name);
    return sum + (topping ? topping.price * 7 : 0); // 7 cups a week
  }, 0);

  const comboToppingsCostPerWeek = selectedCombos.reduce((sum, id) => {
    const combo = COMBO_TOPPINGS.find(c => c.id === id);
    return sum + (combo ? combo.price * 7 : 0); // 7 cups a week
  }, 0);

  const toppingsCostPerWeek = singleToppingsCostPerWeek + comboToppingsCostPerWeek;

  const durationMultiplier = duration === 'weekly' ? 1 : duration === 'monthly' ? 4.28 : 12.85; // rough weeks per cycle
  const totalToppingsCost = toppingsCostPerWeek * durationMultiplier * quantity;

  // Final values
  const originalPrice = planPriceInfo.original * quantity + totalToppingsCost;
  const finalPrice = planPriceInfo.discount * quantity + totalToppingsCost;
  const savings = planPriceInfo.save * quantity;
  const perCup = planPriceInfo.perCup + (toppingsCostPerWeek / 7);

  const handleAdd = () => {
    const toppingsDisplayList: string[] = [];
    selectedCombos.forEach(cId => {
      const c = COMBO_TOPPINGS.find(x => x.id === cId);
      if (c) toppingsDisplayList.push(`Combo Topping ${c.name}`);
    });
    selectedSingleToppings.forEach(name => {
      toppingsDisplayList.push(name);
    });

    const formattedStartDate = new Date(startDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    const comboData = {
      name: `${plan.name} (${duration === 'weekly' ? 'Tuần' : duration === 'monthly' ? 'Tháng' : 'Quý'} × ${quantity})`,
      image: plan.icon,
      price: finalPrice, // Store in actual VND
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
      toppings: [
        `Ngày bắt đầu: ${formattedStartDate}`,
        ...selectedFlavors.map((f, idx) => `${DAYS_OF_WEEK[idx]}: ${f}`),
        ...toppingsDisplayList
      ],
    };

    onAddToCart(comboData);
    onClose();
  };

  const getDurationLabel = () => {
    if (duration === 'weekly') return 'Số tuần:';
    if (duration === 'monthly') return 'Số tháng:';
    return 'Số quý:';
  };

  const getFormattedStartDate = () => {
    const d = new Date(startDate);
    if (isNaN(d.getTime())) return '';
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${daysOfWeek[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b160e] w-full max-w-4xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[100vh] sm:h-[92vh] max-h-[100vh] sm:max-h-[92vh] overflow-hidden text-white border border-white/5 animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#071009] border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center border border-white/5">{plan.icon}</span>
            <div>
              <h2 className="text-xl font-black text-white leading-tight">{plan.name}</h2>
              <p className="text-xs text-white/50 font-bold uppercase tracking-wider mt-0.5">{plan.specs}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition-all border border-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-6 py-3 bg-[#0d2213]/40 border-b border-white/5 flex items-center justify-between shrink-0 overflow-x-auto gap-4 hide-scrollbar">
          {[
            { label: 'Chọn Ngày Start', num: 0 },
            { label: 'Chọn Vị 7 Ngày', num: 1 },
            { label: 'Chọn Topping', num: 2 },
            { label: 'Xác Nhận & Đặt', num: 3 },
          ].map((st) => (
            <div key={st.num} className="flex items-center gap-2 flex-shrink-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                currentStep === st.num 
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 scale-105' 
                  : currentStep > st.num
                    ? 'bg-emerald-500/30 text-emerald-400'
                    : 'bg-white/5 text-white/40'
              }`}>
                {st.num + 1}
              </span>
              <span className={`text-xs font-bold transition-all ${
                currentStep === st.num ? 'text-emerald-400' : 'text-white/45'
              }`}>
                {st.label}
              </span>
              {st.num < 3 && <div className="w-4 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row min-h-0 bg-[#0d1e11]">
          
          {/* Main Workspace Area (Left) */}
          <div className="flex-1 p-5 md:p-6 md:overflow-y-auto">
            
            {/* STEP 0: CHỌN NGÀY START */}
            {currentStep === 0 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-400" /> Chọn ngày bắt đầu giao hàng:
                  </h3>
                  <p className="text-xs text-white/45 mt-1 font-medium">Bữa sáng bổ dưỡng sẽ được chuẩn bị và giao tươi mỗi sáng</p>
                </div>

                {/* Duration/Quantity choice embedded here for convenience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">Thời hạn gói</label>
                    <div className="grid grid-cols-3 gap-2 bg-[#061108] p-1 rounded-2xl border border-white/5">
                      {(['weekly', 'monthly', 'quarterly'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setDuration(tab)}
                          className={`py-3 rounded-xl text-center transition-all ${
                            duration === tab 
                              ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/10' 
                              : 'text-white/60 hover:text-white hover:bg-white/5 font-bold'
                          }`}
                        >
                          <span className="text-xs block uppercase">
                            {tab === 'weekly' ? 'Tuần' : tab === 'monthly' ? 'Tháng' : 'Quý'}
                          </span>
                          <span className={`text-[10px] block mt-0.5 ${duration === tab ? 'text-white/80' : 'text-emerald-500'}`}>
                            -{tab === 'weekly' ? '10%' : tab === 'monthly' ? '15%' : '20%'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">{getDurationLabel()}</label>
                    <div className="bg-[#061108] p-2.5 rounded-2xl border border-white/5 flex items-center justify-between h-[52px]">
                      <span className="font-bold text-white/70 text-xs ml-2">Số lượng đặt:</span>
                      <div className="flex items-center gap-4 bg-white/5 px-2 py-1 rounded-xl">
                        <button 
                          onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                          className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 text-white transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-extrabold text-white text-base w-5 text-center">{quantity}</span>
                        <button 
                          onClick={() => setQuantity(prev => prev + 1)}
                          className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 text-white transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-white/5" />

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">Chọn nhanh trong 7 ngày tới</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {nextDays.map((day) => {
                      const isSelected = startDate === day.isoString;
                      return (
                        <button
                          key={day.isoString}
                          onClick={() => setStartDate(day.isoString)}
                          className={`p-4 rounded-2xl border-2 text-center transition-all ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/5' 
                              : 'border-white/5 bg-[#071309] hover:bg-[#0d2212]/50'
                          }`}
                        >
                          <span className={`text-[10px] font-black uppercase tracking-widest block ${isSelected ? 'text-emerald-400' : 'text-white/40'}`}>
                            {day.dayName}
                          </span>
                          <span className="font-extrabold text-white text-base block mt-1">
                            {day.dateStr}
                          </span>
                          {isSelected && (
                            <span className="inline-flex mt-2 w-5 h-5 bg-emerald-500 rounded-full items-center justify-center text-black">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">Hoặc chọn ngày cụ thể</label>
                  <div className="relative max-w-sm">
                    <input 
                      type="date" 
                      value={startDate}
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Min tomorrow
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-[#071309] text-white px-5 py-4 rounded-2xl border border-white/10 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-extrabold transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: CHỌN VỊ 7 NGÀY */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-xl font-black text-white">Chọn Vị Cho 7 Ngày Giao:</h3>
                  <p className="text-xs text-white/45 mt-1 font-medium">Bấm vào bất cứ ngày nào để tự do đổi vị thức uống yêu thích</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <button
                      key={day}
                      onClick={() => setActiveDayIndex(idx)}
                      className="flex items-center justify-between p-4 bg-[#071309] hover:bg-[#0d2212]/50 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[18px] bg-white/5 w-10 h-10 rounded-xl flex items-center justify-center border border-white/5">
                          {FLAVORS.find(f => f.name === selectedFlavors[idx])?.image || '🥤'}
                        </span>
                        <div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block leading-none mb-1">{day}</span>
                          <span className="font-extrabold text-white text-[15px]">{selectedFlavors[idx]}</span>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 bg-white/5 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black rounded-xl text-xs font-black border border-white/5 transition-all">
                        Đổi vị
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: CHỌN TOPPING (Lẻ hoặc Combo) */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-xl font-black text-white">Tăng Cường Dinh Dưỡng:</h3>
                  <p className="text-xs text-white/45 mt-1 font-medium">Chọn Topping Combo được chuẩn bị sẵn hoặc tự chọn Topping đơn lẻ</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-[#061108] p-1 rounded-2xl border border-white/5 w-full max-w-md">
                  <button
                    onClick={() => setToppingTab('combo')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      toppingTab === 'combo' ? 'bg-emerald-600 text-white' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Topping Combo (Tiết kiệm)
                  </button>
                  <button
                    onClick={() => setToppingTab('single')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      toppingTab === 'single' ? 'bg-emerald-600 text-white' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Topping Đơn Lẻ
                  </button>
                </div>

                {toppingTab === 'combo' ? (
                  /* Combo Toppings List - Fixed layout to prevent text overlaps and show combo details clearly */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {COMBO_TOPPINGS.map((combo) => {
                      const isSelected = selectedCombos.includes(combo.id);
                      return (
                        <button
                          key={combo.id}
                          onClick={() => handleSelectCombo(combo.id)}
                          className={`p-4 rounded-2xl border-2 text-left flex gap-3.5 transition-all relative items-start ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-500/10' 
                              : 'border-white/5 bg-[#071309] hover:bg-[#0d2212]/50'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-3xl shrink-0 mt-0.5">
                            {combo.image}
                          </div>
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-extrabold text-white text-base leading-tight">{combo.name}</h4>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ml-2 ${
                                isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/10'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                            
                            {/* Clear list description of combo items, no line clamp */}
                            <p className="text-[12px] text-white/50 mt-1.5 font-medium leading-relaxed">
                              Gồm: <span className="text-emerald-400 font-bold">{combo.items}</span>
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <span className="font-black text-emerald-400 text-sm">+{Math.round(combo.price/1000)}k/ly</span>
                              <span className="text-xs line-through text-white/30 font-medium">+{Math.round(combo.originalPrice/1000)}k</span>
                              <span className="bg-red-500/15 border border-red-500/20 text-red-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                Tiết kiệm {combo.save/1000}k
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Single Toppings Grid */
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SINGLE_TOPPINGS.map((topping) => {
                      const isSelected = selectedSingleToppings.includes(topping.name);
                      return (
                        <button
                          key={topping.name}
                          onClick={() => handleToggleSingleTopping(topping.name)}
                          className={`p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-500/10' 
                              : 'border-white/5 bg-[#071309] hover:bg-[#0d2212]/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl shrink-0">{topping.image}</span>
                            <div className="min-w-0">
                              <span className="font-extrabold text-white text-xs block truncate leading-tight">{topping.name}</span>
                              <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                                {topping.isFree ? 'MIỄN PHÍ' : `+${topping.price/1000}k/ly`}
                              </span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/15'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: XÁC NHẬN & ĐẶT */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" /> Xác Nhận Lộ Trình Của Bạn:
                  </h3>
                  <p className="text-xs text-white/45 mt-1 font-medium">Vui lòng kiểm tra lại thông tin trước khi thêm vào giỏ hàng</p>
                </div>

                <div className="bg-[#071309] rounded-3xl p-6 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{plan.icon}</span>
                      <div>
                        <h4 className="font-extrabold text-lg text-white">{plan.name}</h4>
                        <p className="text-xs text-white/45">{duration === 'weekly' ? 'Gói 7 Ngày' : duration === 'monthly' ? 'Gói 30 Ngày' : 'Gói 90 Ngày'} × {quantity} phần</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white/5 border border-white/5 text-emerald-400 rounded-lg text-xs font-black uppercase tracking-wider">{plan.badge}</span>
                  </div>

                  <hr className="border-white/5" />

                  {/* Start Date */}
                  <div className="flex items-start justify-between text-sm">
                    <span className="text-white/45 font-bold">Ngày bắt đầu giao:</span>
                    <span className="text-emerald-400 font-extrabold text-right">{getFormattedStartDate()}</span>
                  </div>

                  <hr className="border-white/5" />

                  {/* Toppings Summary */}
                  <div className="flex items-start justify-between text-sm">
                    <span className="text-white/45 font-bold">Topping đã thêm:</span>
                    <span className="text-white font-extrabold text-right max-w-[70%]">
                      {selectedCombos.length > 0 ? (
                        <span className="text-emerald-400">Combo {COMBO_TOPPINGS.find(c => c.id === selectedCombos[0])?.name}</span>
                      ) : selectedSingleToppings.length > 0 ? (
                        selectedSingleToppings.join(', ')
                      ) : (
                        <span className="text-white/30 font-medium">Không sử dụng topping</span>
                      )}
                    </span>
                  </div>

                  <hr className="border-white/5" />

                  {/* Flavors Menu */}
                  <div className="space-y-2">
                    <span className="text-white/45 font-bold text-sm block">Menu 7 ngày đã chọn:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <div key={day} className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">{day}</span>
                          <span className="text-xs font-extrabold text-white block mt-0.5 truncate">{selectedFlavors[idx]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile-only pricing breakdown (visible on screens smaller than md) */}
                <div className="block md:hidden bg-[#071309] p-5 rounded-3xl border border-white/5 space-y-3">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Chi tiết thanh toán</h4>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-white/45 font-bold">Giá gốc lộ trình:</span>
                    <span className="line-through text-white/30 font-medium">
                      {originalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-white/45 font-bold">Giá ưu đãi:</span>
                    <span className="text-white font-extrabold">
                      {(planPriceInfo.discount * quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  {totalToppingsCost > 0 && (
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-white/45 font-bold">Topping bổ sung:</span>
                      <span className="text-emerald-400 font-extrabold">
                        +{totalToppingsCost.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  )}

                  <hr className="border-white/5" />

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-black text-white">Tổng cộng:</span>
                      <span className="text-2xl font-black text-emerald-400">
                        {finalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="text-[10px] text-white/40 font-bold text-right">
                      = {Math.round(perCup).toLocaleString('vi-VN')}đ/ly · Freeship mỗi sáng
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Sticky Billing Sidebar (Right Side - hidden on mobile, visible on tablet/desktop) */}
          <div className="hidden md:flex md:w-[350px] bg-[#071108] p-6 flex-col justify-between shrink-0 border-l border-white/5">
            
            <div className="space-y-6">
              {/* Pricing Display */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Chi tiết thanh toán</label>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-white/45 font-bold">Giá gốc lộ trình:</span>
                    <span className="line-through text-white/30 font-medium">
                      {originalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-white/45 font-bold">Giá ưu đãi:</span>
                    <span className="text-white font-extrabold">
                      {(planPriceInfo.discount * quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  {totalToppingsCost > 0 && (
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-white/45 font-bold">Topping bổ sung:</span>
                      <span className="text-emerald-400 font-extrabold">
                        +{totalToppingsCost.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  )}

                  <hr className="border-white/5" />

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-black text-white">Tổng cộng:</span>
                      <span className="text-3xl font-black text-emerald-400">
                        {finalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="text-[10px] text-white/40 font-bold text-right">
                      = {Math.round(perCup).toLocaleString('vi-VN')}đ/ly · Freeship mỗi sáng
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-3 py-2 rounded-xl text-[11px] font-black text-center">
                    ✦ Tiết kiệm trọn gói {savings.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>

              {/* Specs Badge */}
              <div className="bg-[#0b2413]/30 border border-emerald-500/15 p-4 rounded-xl flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-extrabold text-white">Dịch vụ giao tươi mỗi sáng</p>
                  <p className="text-white/45 font-medium mt-0.5 leading-relaxed">Smoothie được giao tươi nguyên chất từ 6h - 8h sáng, hoàn toàn freeship.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Unified Responsive Sticky Footer (always visible at bottom of modal) */}
        <div className="px-5 py-4 bg-[#071009] border-t border-white/5 shrink-0 flex flex-row items-center justify-between gap-4">
          {/* Price display and saving tag */}
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[9px] text-white/40 font-black uppercase tracking-wider leading-none mb-1">Tổng cộng</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 leading-none">
                {finalPrice.toLocaleString('vi-VN')}đ
              </p>
            </div>
            {savings > 0 && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                Lưu {Math.round(savings/1000)}k
              </span>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex gap-2 shrink-0">
            {currentStep > 0 ? (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-3.5 py-3.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white font-black rounded-2xl flex items-center justify-center transition-all active:scale-[0.95]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-3.5 py-3.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white/60 font-black rounded-2xl flex items-center justify-center transition-all active:scale-[0.95] text-xs uppercase tracking-wider"
              >
                Hủy
              </button>
            )}

            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-5 sm:px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.95] shadow-lg shadow-emerald-600/10"
              >
                Tiếp Tục <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleAdd}
                className="px-5 sm:px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.95] shadow-xl shadow-emerald-500/25 animate-pulse"
              >
                Đặt Lộ Trình <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 15+ Flavor Selector BottomSheet/Drawer */}
      {activeDayIndex !== null && (
        <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[#0b160e] w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-12 duration-300 border border-white/10">
            
            <div className="px-6 py-4 bg-[#071009] border-b border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-black text-white">
                Chọn vị cho {DAYS_OF_WEEK[activeDayIndex]}
              </h3>
              <button 
                onClick={() => setActiveDayIndex(null)}
                className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:text-white shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0d1e11]">
              {FLAVORS.map((flavor) => (
                <button
                  key={flavor.name}
                  onClick={() => {
                    setSelectedFlavors(prev => {
                      const copy = [...prev];
                      copy[activeDayIndex] = flavor.name;
                      return copy;
                    });
                    setActiveDayIndex(null);
                  }}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-[#0d2212] rounded-2xl border border-white/5 hover:border-emerald-500/30 text-left transition-all group"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl shadow-sm shrink-0 border border-white/5">
                    {flavor.image}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-white text-sm block truncate group-hover:text-emerald-400 transition-colors">
                        {flavor.name}
                      </span>
                      {flavor.tag && (
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md text-white shrink-0 ${
                          flavor.tag === 'Mới' ? 'bg-red-500' :
                          flavor.tag === 'Bán chạy' ? 'bg-amber-500' :
                          'bg-indigo-600'
                        }`}>
                          {flavor.tag}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/45 font-medium block truncate mt-0.5">
                      {flavor.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
