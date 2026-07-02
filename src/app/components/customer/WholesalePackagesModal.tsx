'use client';
import { useState, useEffect } from 'react';
import { X, Sparkles, ShieldCheck, ArrowLeft, ArrowRight, Check, MapPin } from 'lucide-react';
import type { CartItem } from './CustomerCartPanel';
import { PROTEIN_LEVELS_BY_SIZE } from '../../config/menuPricing';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: Omit<CartItem, 'cartItemId'>) => void;
}

const WHOLESALE_PACKAGES = [
  {
    id: 'ws-10',
    name: 'Combo Sỉ 10 Ly',
    cups: 10,
    price: 590000,
    originalPrice: 790000,
    durationMonths: 1,
    desc: 'Phù hợp cho cá nhân uống hàng ngày. Tiết kiệm 25%.',
    badge: 'CÁ NHÂN',
    color: '#10b981',
  },
  {
    id: 'ws-30',
    name: 'Combo Sỉ 30 Ly',
    cups: 30,
    price: 1590000,
    originalPrice: 2370000,
    durationMonths: 2,
    desc: 'Thích hợp cho cặp đôi hoặc tập luyện cường độ cao. Tiết kiệm 33%.',
    badge: 'BEST VALUE',
    color: '#d97706',
    featured: true,
  },
  {
    id: 'ws-50',
    name: 'Combo Sỉ 50 Ly',
    cups: 50,
    price: 2390000,
    originalPrice: 3950000,
    durationMonths: 3,
    desc: 'Lựa chọn tốt nhất cho gia đình hoặc nhóm tập. Tiết kiệm 40%.',
    badge: 'ƯU ĐÃI KHỦNG',
    color: '#6366f1',
  },
];

// Product flavor list (standard list, can load from menuProducts if exists)
const defaultProducts = [
  { id: 'SM-01', name: 'Dâu hạt chia', image: '🍓' },
  { id: 'SM-02', name: 'Dâu chuối', image: '🍌' },
  { id: 'SM-03', name: 'Mãng cầu dâu', image: '🍓' },
  { id: 'SM-04', name: 'Dâu cam', image: '🍊' },
  { id: 'SM-05', name: 'Dâu tằm hạt chia', image: '🫐' },
  { id: 'SM-06', name: 'Phúc bồn tử hạt chia', image: '🫐' },
  { id: 'SM-07', name: 'Chuối hạt chia', image: '🍌' },
  { id: 'SM-08', name: 'Chanh dây chuối', image: '🍋' },
  { id: 'SM-09', name: 'Xoài thơm', image: '🍍' },
  { id: 'SM-10', name: 'Xoài cam', image: '🍊' },
  { id: 'SM-11', name: 'Cacao yến mạch', image: '🍫' },
  { id: 'SM-12', name: 'Cà phê chuối', image: '☕' },
  { id: 'SM-13', name: 'Bơ', image: '🥑' },
  { id: 'SM-14', name: 'Bơ chuối', image: '🥑' },
  { id: 'SM-15', name: 'Matcha', image: '🍵' },
];

const branches = [
  { id: 'CN1', name: 'Chi Nhánh 1 - Quận 1', address: '123 Nguyễn Huệ, Bến Nghé, Quận 1' },
  { id: 'CN2', name: 'Chi Nhánh 2 - Quận 3', address: '456 Lê Văn Sỹ, Phường 14, Quận 3' },
  { id: 'CN3', name: 'Chi Nhánh 3 - Thủ Đức', address: '789 Võ Văn Ngân, Linh Chiểu, Thủ Đức' },
];

export function WholesalePackagesModal({ isOpen, onClose, onAddToCart }: Props) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedPkgId, setSelectedPkgId] = useState(WHOLESALE_PACKAGES[1].id);
  const [selectedProductId, setSelectedProductId] = useState<string>(defaultProducts[12].id); // Default to Avocado 'Bơ'
  const [selectedSize, setSelectedSize] = useState<string>('360ml');
  const [selectedProtein, setSelectedProtein] = useState<number>(40);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0].id);
  const [form, setForm] = useState({ name: '', phone: '' });

  // Read actual products from localStorage if available
  const [products, setProducts] = useState(defaultProducts);

  const proteinLevelsBySize: Record<string, number[]> = PROTEIN_LEVELS_BY_SIZE;

  const handleSizeChange = (newSize: string) => {
    setSelectedSize(newSize);
    const available = proteinLevelsBySize[newSize] || [20, 40];
    if (!available.includes(selectedProtein)) {
      setSelectedProtein(available[0]);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('menuProducts');
      if (saved) {
        const parsed = JSON.parse(saved).filter((p: any) => p.category === 'smoothies');
        if (parsed.length > 0) {
          const mapped = parsed.map((p: any) => ({
            id: p.id,
            name: p.name,
            image: p.name.includes('Matcha') ? '🍵' : 
                   p.name.includes('Bơ') ? '🥑' : 
                   p.name.includes('Xoài') ? '🥭' : 
                   p.name.includes('Dâu') ? '🍓' : 
                   p.name.includes('Chuối') ? '🍌' : 
                   p.name.includes('Cacao') ? '🍫' : 
                   p.name.includes('Cà phê') ? '☕' : '🥤'
          }));
          setProducts(mapped);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  if (!isOpen) return null;

  const selectedPkg = WHOLESALE_PACKAGES.find(p => p.id === selectedPkgId)!;
  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
  const selectedBranch = branches.find(b => b.id === selectedBranchId)!;

  // Let's compute custom package price adjusted by selected ml and protein if necessary.
  // Standard prices:
  // ws-10 (10 ly) -> 250ml: 390k, 360ml: 590k, 500ml: 790k, 700ml: 1190k
  // We can calculate dynamically relative to 360ml base price (360ml base is 590k, 1590k, 2390k)
  // Let's establish size base multiplier or fixed price structure per cup:
  // e.g. 
  // 250ml per cup: ws-10 (39k/cup = 390k), ws-30 (35k/cup = 1050k), ws-50 (32k/cup = 1600k)
  // 360ml per cup: ws-10 (59k/cup = 590k), ws-30 (53k/cup = 1590k), ws-50 (47.8k/cup = 2390k)
  // 500ml per cup: ws-10 (79k/cup = 790k), ws-30 (71k/cup = 2130k), ws-50 (63.8k/cup = 3190k)
  // 700ml per cup: ws-10 (119k/cup = 1190k), ws-30 (107k/cup = 3210k), ws-50 (95.8k/cup = 4790k)
  // Protein supplement add-on (+20k for +20g protein above standard 40g (i.e. 60g) or similar)
  
  const getPackagePrice = () => {
    let pricePerCup = 59;
    if (selectedPkgId === 'ws-10') {
      if (selectedSize === '250ml') pricePerCup = 39;
      else if (selectedSize === '360ml') pricePerCup = 59;
      else if (selectedSize === '500ml') pricePerCup = 79;
      else if (selectedSize === '700ml') pricePerCup = 119;
    } else if (selectedPkgId === 'ws-30') {
      if (selectedSize === '250ml') pricePerCup = 35;
      else if (selectedSize === '360ml') pricePerCup = 53;
      else if (selectedSize === '500ml') pricePerCup = 71;
      else if (selectedSize === '700ml') pricePerCup = 107;
    } else if (selectedPkgId === 'ws-50') {
      if (selectedSize === '250ml') pricePerCup = 32;
      else if (selectedSize === '360ml') pricePerCup = 47.8;
      else if (selectedSize === '500ml') pricePerCup = 63.8;
      else if (selectedSize === '700ml') pricePerCup = 95.8;
    }
    
    // Supplement for protein
    // Default standard is 40g. If 60g -> +20k/cup, if 90g -> +40k/cup, if 20g -> -10k/cup
    let proteinPremium = 0;
    if (selectedProtein === 20) proteinPremium = -10;
    else if (selectedProtein === 60) proteinPremium = 20;
    else if (selectedProtein === 90) proteinPremium = 40;

    const finalPriceCup = Math.max(20, pricePerCup + proteinPremium);
    return Math.round(finalPriceCup * selectedPkg.cups * 1000);
  };

  const currentPrice = getPackagePrice();

  const handleRegister = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      alert('Vui lòng nhập đầy đủ họ tên và số điện thoại đăng ký mua sỉ!');
      return;
    }

    onAddToCart({
      name: `${selectedPkg.name} (${selectedSize} - ${selectedProtein}g Protein)`,
      image: '📦',
      price: currentPrice,
      quantity: 1,
      isCustomCombo: true,
      toppings: [
        `Tên đăng ký sỉ: ${form.name}`,
        `SĐT đăng ký sỉ: ${form.phone}`,
        `Sản phẩm yêu thích: ${selectedProduct.name} (${selectedSize}, ${selectedProtein}g Protein)`,
        `Nơi nhận hàng: ${selectedBranch.name}`,
        `Số lượng: ${selectedPkg.cups} ly`,
        `Thời hạn sử dụng: ${selectedPkg.durationMonths} tháng`,
      ],
      rawComboData: {
        isWholesaleCombo: true,
        packageName: `${selectedPkg.name} (${selectedSize})`,
        totalCups: selectedPkg.cups,
        durationMonths: selectedPkg.durationMonths,
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        preferredProduct: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          image: selectedProduct.image,
        },
        preferredProductSize: selectedSize,
        preferredProductProtein: selectedProtein,
        branchId: selectedBranch.id,
        branchName: selectedBranch.name,
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b160e] w-full max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[100vh] sm:max-h-[92vh] overflow-hidden text-white border border-white/5 animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#071009] border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center border border-white/5">👑</span>
            <div>
              <h2 className="text-xl font-black text-white leading-tight">Mua Sỉ Nước (Prepaid Card)</h2>
              <p className="text-xs text-white/50 font-bold uppercase tracking-wider mt-0.5">Mua số lượng lớn để nhận ưu đãi lên đến 40%</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition-all border border-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-6 py-3 bg-[#0d2213]/40 border-b border-white/5 flex items-center justify-between shrink-0 overflow-x-auto gap-4 hide-scrollbar">
          {[
            { label: 'Chọn Gói Sỉ', num: 0 },
            { label: 'Chọn Vị Yêu Thích', num: 1 },
            { label: 'Chọn Chi Nhánh', num: 2 },
            { label: 'Thông Tin Đăng Ký', num: 3 },
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0d1e11]">
          
          {/* STEP 0: CHỌN GÓI SỈ */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-[#0b2413]/30 border border-emerald-500/15 p-4 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-white/70">
                  <p className="font-extrabold text-white text-sm mb-0.5">Tính Năng Mua Sỉ Khỏe Tiết Kiệm:</p>
                  Mua trước các gói Combo 10 ly, 30 ly hoặc 50 ly. Nhận đồ uống dần từng ngày theo yêu cầu. Số ly sẽ được tự động trừ dần khi rút nước tại quầy POS hoặc qua tổng đài. Tra cứu thời hạn và số dư còn lại cực kỳ đơn giản qua Số điện thoại.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {WHOLESALE_PACKAGES.map((pkg) => {
                  const isSelected = selectedPkgId === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPkgId(pkg.id)}
                      className={`p-5 rounded-[2rem] border-2 text-left flex flex-col justify-between transition-all relative group ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/5' 
                          : 'border-white/5 bg-[#071309] hover:bg-[#0d2212]/50'
                      }`}
                    >
                      <span className="absolute top-4 right-4 bg-white/5 border border-white/5 text-white/60 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                        {pkg.badge}
                      </span>

                      <div>
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl mb-4 border border-white/5">
                          🥤
                        </div>
                        <h3 className="font-extrabold text-lg text-white leading-tight">{pkg.name}</h3>
                        <p className="text-[11px] text-white/45 mt-1 font-medium leading-relaxed min-h-[48px]">{pkg.desc}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/5">
                        <span className="text-[10px] text-white/40 block font-bold">Hạn dùng {pkg.durationMonths} tháng</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-emerald-400">{(pkg.price/1000).toLocaleString('vi-VN')}k</span>
                          <span className="text-xs line-through text-white/30 font-medium">{(pkg.originalPrice/1000).toLocaleString('vi-VN')}k</span>
                        </div>
                        <span className="text-[10px] text-emerald-500 font-bold block mt-1">
                          ~ {Math.round(pkg.price / pkg.cups / 1000)}k / ly
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 1: CHỌN VỊ SẢN PHẨM YÊU THÍCH */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Added size and protein level options - placed FIRST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/5 p-5 rounded-3xl border border-white/5">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">Kích cỡ ly (ml)</label>
                  <div className="grid grid-cols-4 gap-2 bg-[#061108] p-1 rounded-2xl border border-white/5">
                    {Object.keys(proteinLevelsBySize).map(s => (
                      <button 
                        key={s} 
                        type="button"
                        onClick={() => handleSizeChange(s)}
                        className={`py-3 rounded-xl text-center text-xs font-black transition-all uppercase ${
                          selectedSize === s 
                            ? 'bg-emerald-600 text-white shadow-md' 
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">Mức Protein</label>
                  <div className="flex flex-wrap gap-2">
                    {proteinLevelsBySize[selectedSize]?.map(l => (
                      <button 
                        key={l} 
                        type="button"
                        onClick={() => setSelectedProtein(l)}
                        className={`py-2.5 px-5 rounded-xl font-bold text-xs transition-all ${
                          selectedProtein === l 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' 
                            : 'bg-[#071309] text-white/60 hover:text-white border border-white/5'
                        }`}
                      >
                        {l}g Protein
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest block ml-1">Chọn sản phẩm ưa thích làm mặc định (Vị)</h3>
                <p className="text-xs text-white/45 mt-1 font-medium ml-1">Đây là vị smoothie mặc định trong tài khoản của bạn, bạn vẫn có thể đổi vị tự do khi rút ly tại chi nhánh.</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((product) => {
                  const isSelected = selectedProductId === product.id;
                  return (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      className={`p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : 'border-white/5 bg-[#071309] hover:bg-[#0d2212]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">{product.image}</span>
                        <div className="min-w-0">
                          <span className="font-extrabold text-white text-xs block truncate leading-tight">{product.name}</span>
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
            </div>
          )}

          {/* STEP 2: CHỌN CHI NHÁNH */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest block ml-1">Chọn chi nhánh lấy nước chính</h3>
                <p className="text-xs text-white/45 mt-1 font-medium ml-1">Bạn sẽ ưu tiên rút ly tại chi nhánh này, tuy nhiên hệ thống vẫn hỗ trợ rút ly trên toàn hệ thống chi nhánh FitBlend.</p>
              </div>

              <div className="space-y-3">
                {branches.map((branch) => {
                  const isSelected = selectedBranchId === branch.id;
                  return (
                    <button
                      key={branch.id}
                      onClick={() => setSelectedBranchId(branch.id)}
                      className={`w-full p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all relative ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/5' 
                          : 'border-white/5 bg-[#071309] hover:bg-[#0d2212]/50'
                      }`}
                    >
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-emerald-400 border border-white/5 shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-white text-sm leading-tight">{branch.name}</h4>
                        <p className="text-[11px] text-white/45 mt-1 font-medium leading-relaxed">{branch.address}</p>
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
            </div>
          )}

          {/* STEP 3: THÔNG TIN ĐĂNG KÝ */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest block ml-1">Thông tin đăng ký sở hữu gói sỉ</h3>
                <p className="text-xs text-white/45 mt-1 font-medium ml-1">Vui lòng điền đúng Tên và Số điện thoại để nhân viên đối chiếu khi rút ly nước.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/45 uppercase tracking-widest ml-1">Họ và tên khách hàng</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Nguyễn Văn An" 
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#071309] text-white px-5 py-3.5 rounded-2xl border border-white/10 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold transition-all text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/45 uppercase tracking-widest ml-1">Số điện thoại tra cứu</label>
                  <input 
                    type="tel" 
                    placeholder="Ví dụ: 0987654321" 
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-[#071309] text-white px-5 py-3.5 rounded-2xl border border-white/10 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold transition-all text-sm"
                  />
                </div>
              </div>

              <hr className="border-white/5" />

              <div className="bg-[#071309] rounded-3xl p-6 border border-white/5 space-y-3.5">
                <h4 className="text-xs font-black text-white/40 uppercase tracking-widest block">Tóm tắt cấu hình mua sỉ</h4>
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-white/45 font-bold">Gói đăng ký:</span>
                  <span className="text-white font-extrabold">{selectedPkg.name} ({selectedPkg.cups} ly)</span>
                </div>
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-white/45 font-bold">Cấu hình ly mặc định:</span>
                  <span className="text-white font-extrabold">{selectedSize} · {selectedProtein}g Protein</span>
                </div>
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-white/45 font-bold">Sản phẩm yêu thích:</span>
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                    <span>{selectedProduct.image}</span> {selectedProduct.name}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-white/45 font-bold">Chi nhánh lấy nước:</span>
                  <span className="text-white font-extrabold">{selectedBranch.name}</span>
                </div>
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-white/45 font-bold">Thời hạn sử dụng:</span>
                  <span className="text-white font-extrabold">{selectedPkg.durationMonths} tháng từ lúc kích hoạt</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#071009] border-t border-white/5 shrink-0 flex flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[9px] text-white/40 font-black uppercase tracking-wider leading-none mb-1">Thanh toán gói sỉ</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 leading-none">
              {currentPrice.toLocaleString('vi-VN')}đ
            </p>
          </div>

          <div className="flex gap-2">
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
                onClick={() => {
                  if (currentStep === 1 && !selectedProductId) {
                    alert('Vui lòng chọn sản phẩm yêu thích!');
                    return;
                  }
                  if (currentStep === 2 && !selectedBranchId) {
                    alert('Vui lòng chọn chi nhánh!');
                    return;
                  }
                  setCurrentStep(prev => prev + 1);
                }}
                className="px-5 sm:px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.95] shadow-lg shadow-emerald-600/10"
              >
                Tiếp Tục <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleRegister}
                className="px-6 sm:px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.95] shadow-xl shadow-emerald-500/20"
              >
                <ShieldCheck className="w-4 h-4 stroke-[3]" /> MUA GÓI SỈ & THÊM GIỎ HÀNG
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
