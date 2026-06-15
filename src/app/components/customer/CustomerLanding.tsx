import { useState, useEffect } from 'react';
import { ShoppingCart, ArrowRight, Play, CheckCircle2, Star, Zap, Leaf, ShieldCheck, X, Image as ImageIcon, MessageCircle, Facebook, UserCheck, HelpCircle, ChevronLeft, ChevronRight, Download, Sparkles } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
  onSelectCombo: (planId: string) => void;
  onOpenWholesale: () => void;
  onGoToRetail?: () => void;
}

export function CustomerLanding({ onGetStarted, onSelectCombo, onOpenWholesale, onGoToRetail }: LandingProps) {
  const [scrolled, setScrolled] = useState(false);
  const [showMenuImage, setShowMenuImage] = useState(false);
  const [activeMenuPage, setActiveMenuPage] = useState<1 | 2>(1);
  const [showRegChoice, setShowRegChoice] = useState(false);
  const [showPurchaseTypeChoice, setShowPurchaseTypeChoice] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);



  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [landingDuration, setLandingDuration] = useState<'weekly' | 'monthly' | 'quarterly'>('quarterly');

  const combosData = {
    weekly: [
      {
        id: 'fat-loss',
        name: 'Fat Loss Plan',
        subtitle: 'GIẢM MỠ • TONE DÁNG',
        specs: '360ml × 40g Protein · 7 ly/tuần',
        price: '498k',
        originalPrice: '553k',
        save: '55k',
        perCup: '71k',
        icon: '🔥',
        badge: 'STANDARD',
        featured: false,
        btnText: 'Đặt Gói Tuần',
        btnBg: 'bg-orange-500 text-white hover:bg-orange-600'
      },
      {
        id: 'muscle-build',
        name: 'Muscle Build',
        subtitle: 'TĂNG CƠ • BEST VALUE',
        specs: '500ml × 60g Protein · 7 ly/tuần',
        price: '725k',
        originalPrice: '805k',
        save: '80k',
        perCup: '103.5k',
        icon: '💪',
        badge: 'PHỔ BIẾN',
        featured: true,
        btnText: 'Đặt Gói Tuần',
        btnBg: 'bg-emerald-600 text-white hover:bg-emerald-700'
      },
      {
        id: 'elite-mass',
        name: 'Elite Mass',
        subtitle: 'TĂNG CÂN • DÂN GYM PRO',
        specs: '700ml × 90g Protein · 7 ly/tuần',
        price: '977k',
        originalPrice: '1.085k',
        save: '108k',
        perCup: '139.5k',
        icon: '🏆',
        badge: 'FLAGSHIP',
        featured: false,
        btnText: 'Đặt Gói Tuần',
        btnBg: 'bg-indigo-600 text-white hover:bg-indigo-700'
      }
    ],
    monthly: [
      {
        id: 'fat-loss',
        name: 'Fat Loss Plan',
        subtitle: 'GIẢM MỠ • TONE DÁNG',
        specs: '360ml × 40g Protein · 7 ly/tuần',
        price: '2.015k',
        originalPrice: '2.370k',
        save: '355k',
        perCup: '67k',
        icon: '🔥',
        badge: 'STANDARD',
        featured: false,
        btnText: 'Đặt Gói Tháng',
        btnBg: 'bg-orange-500 text-white hover:bg-orange-600'
      },
      {
        id: 'muscle-build',
        name: 'Muscle Build',
        subtitle: 'TĂNG CƠ • BEST VALUE',
        specs: '500ml × 60g Protein · 7 ly/tuần',
        price: '2.933k',
        originalPrice: '3.450k',
        save: '517k',
        perCup: '98k',
        icon: '💪',
        badge: 'PHỔ BIẾN',
        featured: true,
        btnText: 'Đặt Gói Tháng',
        btnBg: 'bg-emerald-600 text-white hover:bg-emerald-700'
      },
      {
        id: 'elite-mass',
        name: 'Elite Mass',
        subtitle: 'TĂNG CÂN • DÂN GYM PRO',
        specs: '700ml × 90g Protein · 7 ly/tuần',
        price: '3.953k',
        originalPrice: '4.650k',
        save: '697k',
        perCup: '132k',
        icon: '🏆',
        badge: 'FLAGSHIP',
        featured: false,
        btnText: 'Đặt Gói Tháng',
        btnBg: 'bg-indigo-600 text-white hover:bg-indigo-700'
      }
    ],
    quarterly: [
      {
        id: 'fat-loss',
        name: 'Fat Loss Plan',
        subtitle: 'GIẢM MỠ • TONE DÁNG',
        specs: '360ml × 40g Protein · 7 ly/tuần',
        price: '5.720k',
        originalPrice: '7.150k',
        save: '1.430k',
        perCup: '63k',
        icon: '🔥',
        badge: 'STANDARD',
        featured: false,
        btnText: 'Đặt Gói Quý',
        btnBg: 'bg-orange-500 text-white hover:bg-orange-600'
      },
      {
        id: 'muscle-build',
        name: 'Muscle Build',
        subtitle: 'TĂNG CƠ • BEST VALUE',
        specs: '500ml × 60g Protein · 7 ly/tuần',
        price: '8.330k',
        originalPrice: '10.400k',
        save: '2.070k',
        perCup: '93k',
        icon: '💪',
        badge: 'PHỔ BIẾN',
        featured: true,
        btnText: 'Đặt Gói Quý',
        btnBg: 'bg-emerald-600 text-white hover:bg-emerald-700'
      },
      {
        id: 'elite-mass',
        name: 'Elite Mass',
        subtitle: 'TĂNG CÂN • DÂN GYM PRO',
        specs: '700ml × 90g Protein · 7 ly/tuần',
        price: '11.230k',
        originalPrice: '14.000k',
        save: '2.770k',
        perCup: '125k',
        icon: '🏆',
        badge: 'FLAGSHIP',
        featured: false,
        btnText: 'Đặt Gói Quý',
        btnBg: 'bg-indigo-600 text-white hover:bg-indigo-700'
      }
    ]
  };

  const activeCombos = combosData[landingDuration];

  return (
    <div className="min-h-screen bg-[#0a1a0f] text-white font-sans selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-[110] transition-all duration-500 ${scrolled ? 'bg-[#0a1a0f]/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-[#0a1a0f] font-black text-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">F</div>
            <span className="text-xl font-black tracking-tight">FITBLEND</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-white/60">
            <a href="#why" className="hover:text-emerald-400 transition-colors">Tại sao chọn gà?</a>
            <a href="#combos" className="hover:text-emerald-400 transition-colors">Combo tuần</a>
            <button 
              onClick={onOpenWholesale}
              className="hover:text-emerald-400 transition-colors font-bold uppercase tracking-widest text-white/60"
            >
              Mua Sỉ 👑
            </button>
          </div>

          <button 
            onClick={() => setShowPurchaseTypeChoice(true)}
            className="px-6 py-2.5 bg-emerald-500 text-[#0a1a0f] rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
          >
            ĐẶT HÀNG NGAY
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -translate-x-1/2" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="text-center lg:text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-black uppercase tracking-[0.2em] animate-fade-in">
              <Zap className="w-3 h-3" /> Năng lượng sạch mỗi ngày
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter">
              Uống ngon. <br />
              <span className="text-emerald-500 italic font-serif font-light">Sống khỏe.</span>
            </h1>

            <p className="text-lg md:text-xl text-white/50 max-w-xl leading-relaxed">
              Protein Smoothie từ thịt gà thật đầu tiên tại Việt Nam. 
              Không tanh - Không đường - Giao tươi mỗi ngày.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <button 
                onClick={() => setShowPurchaseTypeChoice(true)}
                className="w-full sm:w-auto px-10 py-5 bg-emerald-500 text-[#0a1a0f] rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                ĐẶT HÀNG NGAY <ArrowRight className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setShowMenuImage(true)}
                className="w-full sm:w-auto px-8 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-5 h-5" /> XEM MENU
              </button>

            </div>

            <div className="flex items-center gap-8 pt-8 opacity-50 justify-center lg:justify-start">
              <div className="text-center">
                <div className="text-2xl font-black">15+</div>
                <div className="text-[10px] uppercase tracking-widest font-bold">Vị độc bản</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-black">100%</div>
                <div className="text-[10px] uppercase tracking-widest font-bold">Natural</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-black">0%</div>
                <div className="text-[10px] uppercase tracking-widest font-bold">Đường tinh luyện</div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full group-hover:bg-emerald-500/30 transition-colors" />
            <img 
              src="/images/fitblend_hero_smoothie.png" 
              alt="FitBlend Smoothie" 
              className="relative z-10 w-full max-w-[500px] mx-auto animate-float drop-shadow-[0_0_50px_rgba(16,185,129,0.3)]"
            />

            {/* Floating badges */}
            <div className="absolute top-10 right-0 z-20 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl animate-bounce-slow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-black">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white/60">Protein level</div>
                  <div className="text-lg font-black text-emerald-400">High 60g+</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="why" className="py-32 relative z-10 bg-black/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-sm font-black text-emerald-500 uppercase tracking-[0.4em]">Tại sao lại là thịt gà?</h2>
            <h3 className="text-4xl md:text-6xl font-black">Sự khác biệt từ <span className="text-emerald-500 italic">Dinh dưỡng thật</span></h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Leaf className="w-8 h-8" />, title: '100% Gà Thật', desc: 'Protein từ ức gà tươi, không phải whey bột công nghiệp. Hấp thụ tự nhiên, không gây nóng trong.' },
              { icon: <ShieldCheck className="w-8 h-8" />, title: 'Không Phụ Gia', desc: 'Không đường tinh luyện, không siro, không chất bảo quản. Vị ngọt 100% từ trái cây tươi.' },
              { icon: <Zap className="w-8 h-8" />, title: 'Năng Lượng Bền', desc: 'Chỉ số GI thấp giúp duy trì năng lượng ổn định cả ngày, không gây sụt giảm đường huyết.' }
            ].map((item, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h4 className="text-2xl font-black mb-4">{item.title}</h4>
                <p className="text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Combo Section */}
      <section id="combos" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
            <div className="space-y-4">
              <h2 className="text-sm font-black text-emerald-500 uppercase tracking-[0.4em]">Liệu trình tối ưu</h2>
              <h3 className="text-4xl md:text-7xl font-black">FitBlend <span className="text-emerald-500 italic font-serif font-light">Combo</span></h3>
            </div>
            <div className="flex flex-col items-end gap-4">
              <p className="text-white/40 max-w-sm text-right text-lg leading-relaxed">
                Đăng ký theo tuần để nhận ưu đãi lên đến 20% và miễn phí vận chuyển mỗi sáng.
              </p>
              <button 
                onClick={() => setShowMenuImage(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-sm hover:bg-white/10 transition-all"
              >
                <ImageIcon className="w-4 h-4" /> XEM CHI TIẾT BẢNG GIÁ
              </button>
            </div>
          </div>

          {/* Duration Tab Bar matching Image 1, 2, 3 */}
          <div className="flex justify-center mb-12">
            <div className="flex bg-[#07140b] p-1.5 rounded-[2rem] border border-white/5 shadow-2xl">
              <button
                onClick={() => setLandingDuration('weekly')}
                className={`px-8 py-3.5 rounded-[1.5rem] font-black text-sm uppercase tracking-wider transition-all ${
                  landingDuration === 'weekly' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' : 'text-white/60 hover:text-white'
                }`}
              >
                Tuần -10%
              </button>
              <button
                onClick={() => setLandingDuration('monthly')}
                className={`px-8 py-3.5 rounded-[1.5rem] font-black text-sm uppercase tracking-wider transition-all ${
                  landingDuration === 'monthly' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' : 'text-white/60 hover:text-white'
                }`}
              >
                Tháng -15%
              </button>
              <button
                onClick={() => setLandingDuration('quarterly')}
                className={`px-8 py-3.5 rounded-[1.5rem] font-black text-sm uppercase tracking-wider transition-all ${
                  landingDuration === 'quarterly' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' : 'text-white/60 hover:text-white'
                }`}
              >
                Quý -20%
              </button>
            </div>
          </div>

          {/* Plan cards layout */}
          <div className="grid lg:grid-cols-3 gap-8">
            {activeCombos.map((combo) => (
              <div 
                key={combo.id}
                className={`relative p-8 rounded-[2.5rem] border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between group ${
                  combo.featured 
                    ? 'bg-[#0f2c18] border-emerald-500/30 shadow-[0_20px_50px_rgba(16,185,129,0.1)]' 
                    : 'bg-[#0b1d11] border-white/5 shadow-xl'
                }`}
              >
                {/* Top Badge */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/5 text-white/70 text-[9px] font-black uppercase tracking-widest rounded-lg">
                    {combo.badge}
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-3">
                    <span className="text-3xl bg-white/5 w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5">
                      {combo.icon}
                    </span>
                    <div>
                      <h4 className="text-2xl font-black tracking-tight text-white">{combo.name}</h4>
                      <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                        {combo.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Specs Description */}
                  <p className="text-xs font-bold text-white/50">{combo.specs}</p>

                  <hr className="border-white/5" />

                  {/* Pricing Details */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-emerald-400">{combo.price}</span>
                      <span className="text-base line-through text-white/30 font-bold">{combo.originalPrice}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-white/50 font-bold">
                      <span>= {combo.perCup}/ly • Freeship</span>
                      <span className="bg-red-500/10 text-red-400 border border-red-500/10 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                        Tiết kiệm {combo.save}
                      </span>
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  {/* Bullet points */}
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-xs font-bold text-white/80">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Tự chọn vị 7 ngày uống tùy thích
                    </li>
                    <li className="flex items-center gap-2 text-xs font-bold text-white/80">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Tùy chọn combo hoặc single toppings
                    </li>
                    <li className="flex items-center gap-2 text-xs font-bold text-white/80">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Giao tươi mỗi sáng, đảm bảo dinh dưỡng
                    </li>
                  </ul>
                </div>

                <button 
                  onClick={() => {
                    setActivePlanId(combo.id);
                    setShowRegChoice(true);
                  }}
                  className={`mt-8 w-full py-4.5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${combo.btnBg}`}
                >
                  ĐĂNG KÝ NGAY
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-3xl" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 space-y-12">
          <h2 className="text-5xl md:text-7xl font-black leading-tight">
            Sẵn sàng để <br />
            <span className="text-emerald-500">Bắt đầu?</span>
          </h2>
          <p className="text-xl text-white/50">
            Gia nhập cộng đồng 5000+ người đã thay đổi thói quen dinh dưỡng cùng FitBlend.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button 
              onClick={() => setShowPurchaseTypeChoice(true)}
              className="px-12 py-6 bg-emerald-500 text-[#0a1a0f] rounded-2xl font-black text-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/40"
            >
              ĐẶT HÀNG NGAY
            </button>
          </div>
          <div className="pt-20 flex flex-wrap justify-center gap-12 opacity-30 text-[10px] font-black uppercase tracking-[0.3em]">
            <span>Fresh Delivery</span>
            <span>Natural Protein</span>
            <span>No Sugar Added</span>
            <span>Eco Friendly</span>
          </div>
        </div>
      </section>

      {/* Registration Choice Modal */}
      {showRegChoice && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-[#0a1a0f]/90 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-zoom-in">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
                <HelpCircle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Bắt đầu lộ trình</h3>
                <p className="text-gray-500 font-medium">Bạn muốn tự chọn thực đơn hay cần chuyên gia tư vấn?</p>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    if (activePlanId) onSelectCombo(activePlanId);
                    setShowRegChoice(false);
                  }}
                  className="w-full py-4 bg-emerald-500 text-[#0a1a0f] rounded-2xl font-black text-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-3"
                >
                  <UserCheck className="w-6 h-6" /> TỰ ĐĂNG KÝ (7 NGÀY)
                </button>
                
                <div className="pt-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hoặc nhận tư vấn qua</p>
                  <div className="flex gap-3">
                    <a 
                      href="https://zalo.me/your_number" 
                      target="_blank" 
                      className="flex-1 py-4 bg-[#0068ff] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <MessageCircle className="w-5 h-5" /> ZALO
                    </a>
                    <a 
                      href="https://facebook.com/your_page" 
                      target="_blank" 
                      className="flex-1 py-4 bg-[#1877f2] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <Facebook className="w-5 h-5" /> FACEBOOK
                    </a>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowRegChoice(false)}
                className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Choice between Combo subscription and Retail purchase */}
      {showPurchaseTypeChoice && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-[#0a1a0f]/90 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-zoom-in">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-gray-900">Chọn hình thức mua hàng</h3>
                <p className="text-gray-500 font-medium text-sm">Bạn muốn đăng ký lộ trình dài hạn hay đặt mua lẻ giao ngay?</p>
              </div>

              <div className="grid gap-4">
                {/* Option 1: Combo Plan */}
                <button
                  onClick={() => {
                    setShowPurchaseTypeChoice(false);
                    onGetStarted();
                  }}
                  className="w-full text-left p-6 bg-gradient-to-r from-emerald-50 to-emerald-100/50 hover:from-emerald-100 hover:to-emerald-150/50 border-2 border-emerald-500/25 hover:border-emerald-500 rounded-[22px] transition-all duration-300 group flex items-start gap-4 active:scale-[0.98]"
                >
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                    📦
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 text-lg">Đăng ký Combo dài hạn</h4>
                    <p className="text-gray-500 text-xs mt-1 leading-normal">Đặt theo Tuần/Tháng/Quý. Tiết kiệm tới 20% + Miễn phí vận chuyển mỗi sáng tận nhà.</p>
                  </div>
                </button>

                {/* Option 2: Retail Purchase */}
                <button
                  onClick={() => {
                    setShowPurchaseTypeChoice(false);
                    if (onGoToRetail) {
                      onGoToRetail();
                    } else {
                      onGetStarted();
                    }
                  }}
                  className="w-full text-left p-6 bg-gradient-to-r from-indigo-50 to-indigo-100/50 hover:from-indigo-100 hover:to-indigo-150/50 border-2 border-indigo-500/25 hover:border-indigo-500 rounded-[22px] transition-all duration-300 group flex items-start gap-4 active:scale-[0.98]"
                >
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                    🥤
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 text-lg">Mua lẻ từng ly (Giao ngay)</h4>
                    <p className="text-gray-500 text-xs mt-1 leading-normal">Tùy chọn dung tích ly, lượng Protein & thêm Topping theo sở thích cá nhân tương tự tại quầy POS.</p>
                  </div>
                </button>
              </div>

              <div className="text-center pt-2">
                <button 
                  onClick={() => setShowPurchaseTypeChoice(false)}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Image Modal */}

      {showMenuImage && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-0 bg-black/95 animate-fade-in">
          {/* Close button top right */}
          <button 
            onClick={() => setShowMenuImage(false)}
            className="absolute top-6 right-6 p-4 bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-full transition-all z-[220] hover:scale-110 active:scale-95 hover:bg-white/15"
          >
            <X className="w-8 h-8" />
          </button>
          
          {/* Navigation Controls */}
          <div className="flex flex-col items-center w-full max-w-5xl px-4 relative z-[210]">
            
            {/* Header Tabs */}
            <div className="flex bg-[#07140b] p-1 rounded-full border border-white/10 mb-6 shadow-2xl">
              <button
                onClick={() => setActiveMenuPage(1)}
                className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wider transition-all ${
                  activeMenuPage === 1 ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/60 hover:text-white'
                }`}
              >
                Menu Thức Uống (Trang 1)
              </button>
              <button
                onClick={() => setActiveMenuPage(2)}
                className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wider transition-all ${
                  activeMenuPage === 2 ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/60 hover:text-white'
                }`}
              >
                Bảng Giá Liệu Trình (Trang 2)
              </button>
            </div>

            {/* Main view container */}
            <div className="relative w-full flex items-center justify-center min-h-[50vh]">
              
              {/* Left arrow */}
              <button
                onClick={() => setActiveMenuPage(1)}
                className={`absolute -left-12 top-1/2 -translate-y-1/2 p-4 bg-white/5 backdrop-blur-md hover:bg-white/10 text-white rounded-full transition-all z-[220] hidden md:flex items-center justify-center hover:scale-105 active:scale-95 border border-white/10 ${
                  activeMenuPage === 1 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'opacity-100'
                }`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Image Frame */}
              <div className="w-full flex justify-center items-center overflow-hidden rounded-2xl border border-white/5 bg-[#0b140d]/40 max-h-[70vh]">
                <img 
                  key={activeMenuPage}
                  src={`/images/menu${activeMenuPage}.jpg`} 
                  alt={`FitBlend Menu Trang ${activeMenuPage}`} 
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl animate-zoom-in"
                />
              </div>

              {/* Right arrow */}
              <button
                onClick={() => setActiveMenuPage(2)}
                className={`absolute -right-12 top-1/2 -translate-y-1/2 p-4 bg-white/5 backdrop-blur-md hover:bg-white/10 text-white rounded-full transition-all z-[220] hidden md:flex items-center justify-center hover:scale-105 active:scale-95 border border-white/10 ${
                  activeMenuPage === 2 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'opacity-100'
                }`}
              >
                <ChevronRight className="w-6 h-6" />
              </button>

            </div>

            {/* Footer indicators & tools */}
            <div className="flex flex-col items-center gap-4 mt-6">
              {/* Page Dots */}
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveMenuPage(1)} 
                  className={`w-2.5 h-2.5 rounded-full transition-all ${activeMenuPage === 1 ? 'bg-emerald-500 w-6' : 'bg-white/20 hover:bg-white/40'}`}
                />
                <button 
                  onClick={() => setActiveMenuPage(2)} 
                  className={`w-2.5 h-2.5 rounded-full transition-all ${activeMenuPage === 2 ? 'bg-emerald-500 w-6' : 'bg-white/20 hover:bg-white/40'}`}
                />
              </div>

              {/* Download CTA */}
              <a
                href={`/images/menu${activeMenuPage}.jpg`}
                download={`fitblend-menu-trang-${activeMenuPage}.jpg`}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider rounded-full transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-4 h-4" /> Tải Mặt Này Về Điện Thoại
              </a>
            </div>

          </div>
        </div>
      )}


      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce 4s infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-zoom-in {
          animation: zoom-in 0.3s ease-out forwards;
        }
      `}} />

    </div>
  );
}
