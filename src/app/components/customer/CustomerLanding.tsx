import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CupSoda,
  Download,
  Facebook,
  HelpCircle,
  Image as ImageIcon,
  Leaf,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  ShieldCheck,
  Star,
  Truck,
  UserCheck,
  Users,
  UtensilsCrossed,
  Wheat,
  X,
  Zap,
  Dumbbell,
  Ban,
  Droplets,
  FlaskConical,
  Volume2,
  Maximize,
} from 'lucide-react';
import { BRAND } from './landing/brand';
import { LANDING_IMAGES } from '../../config/images';

type ComboDuration = 'weekly' | 'monthly' | 'quarterly';

interface LandingProps {
  onGetStarted: () => void;
  onSelectCombo: (planId: string) => void;
  onSelectDuration?: (duration: ComboDuration) => void;
  onOpenWholesale: () => void;
  onGoToRetail?: () => void;
}

const NAV_LINKS = [
  { href: '#why', label: 'Vì Sao Chọn FitBlend?' },
  { href: '#combos', label: 'Combo sản phẩm' },
  { href: '#feedback', label: 'Feedback Khách Hàng' },
  { href: '#wholesale', label: 'Mua Sỉ' },
];

const HERO_IMAGE_BADGES = [
  { icon: '🍗', text: 'Protein từ bột ức gà' },
  { icon: '✓', text: 'Giao tươi mỗi ngày' },
  { icon: '🍓', text: '24+ hương vị dễ uống' },
];

const HERO_STAT_COLUMNS = [
  {
    icon: Clock,
    value: '10 TIẾNG',
    title: 'Tiết kiệm đến',
    desc: '10 tiếng/tuần chuẩn bị bữa ăn',
  },
  {
    icon: UtensilsCrossed,
    value: '20G+',
    title: 'Protein/ly',
    desc: 'Từ bột ức gà chất lượng cao, giúp no lâu & duy trì cơ bắp',
  },
  {
    icon: CupSoda,
    value: '24+',
    title: 'Hương vị',
    desc: 'Đa dạng – dễ uống không lo nhàm chán',
  },
  {
    icon: Truck,
    value: '1.560+',
    title: 'Ly đã được giao',
    desc: 'Được chuẩn bị tươi mới mỗi ngày',
  },
  {
    icon: Users,
    value: '366+',
    title: 'Khách hàng đồng hành',
    desc: 'Tin tưởng sử dụng mỗi tháng',
  },
];

const HERO_TRUST_STRIP = [
  { icon: ShieldCheck, text: 'Không chất bảo quản' },
  { icon: Leaf, text: 'Không đường tinh luyện' },
  { icon: CheckCircle2, text: 'Nguyên liệu thật 100%' },
  { icon: Zap, text: 'Đáp ứng nhu cầu dinh dưỡng hàng ngày' },
];

const INGREDIENT_CALLOUTS = [
  {
    num: 1,
    side: 'left' as const,
    title: 'TRÁI CÂY TƯƠI',
    desc: '100% trái cây thật, được chọn lọc mỗi ngày – mang lại vị ngon tự nhiên, giàu vitamin & chất xơ.',
    thumb: '🍓',
  },
  {
    num: 2,
    side: 'left' as const,
    title: 'BỘT ỨC GÀ',
    desc: 'Protein từ ức gà thật, dễ hấp thu, hỗ trợ no lâu và phục hồi cơ bắp sau vận động.',
    thumb: '🍗',
  },
  {
    num: 3,
    side: 'left' as const,
    title: 'BỘT ĐẬU HÀ LAN',
    desc: 'Bổ sung thêm protein thực vật, giúp cân bằng dinh dưỡng trong mỗi ly FitBlend.',
    thumb: '🫛',
  },
  {
    num: 4,
    side: 'right' as const,
    title: 'SỮA TƯƠI',
    desc: 'Tăng độ đặc và hương vị, giàu canxi bổ sung.',
    thumb: '🥛',
  },
  {
    num: 5,
    side: 'right' as const,
    title: 'SỮA HẠT',
    desc: 'Nguồn béo tự nhiên, giúp vị uống mềm mại, dễ uống hơn.',
    thumb: '🌰',
  },
];

const INGREDIENT_FEATURE_CARDS = [
  {
    icon: Dumbbell,
    stat: '20G+',
    title: 'PROTEIN / LY',
    desc: 'Protein từ bột ức gà chất lượng cao, giúp no lâu & duy trì cơ bắp',
  },
  {
    icon: CupSoda,
    stat: '100%',
    title: 'TRÁI CÂY THẬT',
    desc: 'Không si-rô, không hương liệu nhân tạo',
  },
  {
    icon: Ban,
    stat: '0%',
    title: 'ĐƯỜNG TINH LUYỆN',
    desc: 'Vị ngọt đến từ trái cây tự nhiên',
  },
  {
    icon: Star,
    stat: '24+',
    title: 'HƯƠNG VỊ',
    desc: 'Đa dạng – dễ uống, không lo nhàm chán',
  },
];

const INGREDIENT_TRUST_STRIP = [
  { icon: Leaf, text: 'Nguyên liệu chất lượng' },
  { icon: Droplets, text: 'Không chất bảo quản' },
  { icon: FlaskConical, text: 'Không hương liệu nhân tạo' },
  { icon: Truck, text: 'Giao tươi mỗi ngày' },
];

type PlanComboId = 'fat-loss' | 'muscle-build' | 'elite-mass';

type PlanComboCard = {
  id: PlanComboId;
  name: string;
  subtitle: string;
  specs: string;
  price: string;
  originalPrice: string;
  save: string;
  perCup: string;
  icon: string;
  badge: string;
  featured?: boolean;
  btnBg: string;
};

const PLAN_COMBOS_DATA: Record<ComboDuration, PlanComboCard[]> = {
    weekly: [
      {
        id: 'fat-loss',
        name: 'Fat Loss Plan',
      subtitle: 'GIẢM MỠ · TONE DÁNG',
        specs: '360ml × 40g Protein · 7 ly/tuần',
        price: '498k',
        originalPrice: '553k',
        save: '55k',
        perCup: '71k',
        icon: '🔥',
        badge: 'STANDARD',
      btnBg: BRAND.orange,
      },
      {
        id: 'muscle-build',
      name: 'Muscle Build Plan',
      subtitle: 'TĂNG CƠ · BEST VALUE',
        specs: '500ml × 60g Protein · 7 ly/tuần',
        price: '725k',
        originalPrice: '805k',
        save: '80k',
        perCup: '103.5k',
        icon: '💪',
        badge: 'PHỔ BIẾN',
        featured: true,
      btnBg: BRAND.green,
      },
      {
        id: 'elite-mass',
      name: 'Elite Mass Plan',
      subtitle: 'TĂNG CÂN · DÂN GYM PRO',
        specs: '700ml × 90g Protein · 7 ly/tuần',
        price: '977k',
        originalPrice: '1.085k',
        save: '108k',
        perCup: '139.5k',
        icon: '🏆',
        badge: 'FLAGSHIP',
      btnBg: '#4f46e5',
    },
    ],
    monthly: [
      {
        id: 'fat-loss',
        name: 'Fat Loss Plan',
      subtitle: 'GIẢM MỠ · TONE DÁNG',
        specs: '360ml × 40g Protein · 7 ly/tuần',
        price: '2.015k',
        originalPrice: '2.370k',
        save: '355k',
        perCup: '67k',
        icon: '🔥',
        badge: 'STANDARD',
      btnBg: BRAND.orange,
      },
      {
        id: 'muscle-build',
      name: 'Muscle Build Plan',
      subtitle: 'TĂNG CƠ · BEST VALUE',
        specs: '500ml × 60g Protein · 7 ly/tuần',
        price: '2.933k',
        originalPrice: '3.450k',
        save: '517k',
        perCup: '98k',
        icon: '💪',
        badge: 'PHỔ BIẾN',
        featured: true,
      btnBg: BRAND.green,
      },
      {
        id: 'elite-mass',
      name: 'Elite Mass Plan',
      subtitle: 'TĂNG CÂN · DÂN GYM PRO',
        specs: '700ml × 90g Protein · 7 ly/tuần',
        price: '3.953k',
        originalPrice: '4.650k',
        save: '697k',
        perCup: '132k',
        icon: '🏆',
        badge: 'FLAGSHIP',
      btnBg: '#4f46e5',
    },
    ],
    quarterly: [
      {
        id: 'fat-loss',
        name: 'Fat Loss Plan',
      subtitle: 'GIẢM MỠ · TONE DÁNG',
        specs: '360ml × 40g Protein · 7 ly/tuần',
        price: '5.720k',
        originalPrice: '7.150k',
        save: '1.430k',
        perCup: '63k',
        icon: '🔥',
        badge: 'STANDARD',
      btnBg: BRAND.orange,
      },
      {
        id: 'muscle-build',
      name: 'Muscle Build Plan',
      subtitle: 'TĂNG CƠ · BEST VALUE',
        specs: '500ml × 60g Protein · 7 ly/tuần',
        price: '8.330k',
        originalPrice: '10.400k',
        save: '2.070k',
        perCup: '93k',
        icon: '💪',
        badge: 'PHỔ BIẾN',
        featured: true,
      btnBg: BRAND.green,
      },
      {
        id: 'elite-mass',
      name: 'Elite Mass Plan',
      subtitle: 'TĂNG CÂN · DÂN GYM PRO',
        specs: '700ml × 90g Protein · 7 ly/tuần',
        price: '11.230k',
        originalPrice: '14.000k',
        save: '2.770k',
        perCup: '125k',
        icon: '🏆',
        badge: 'FLAGSHIP',
      btnBg: '#4f46e5',
    },
  ],
};

const PLAN_DURATION_TABS: { id: ComboDuration; label: string; hint?: string }[] = [
  { id: 'weekly', label: 'Tuần −10%' },
  { id: 'monthly', label: 'Tháng −15%', hint: 'Phổ biến' },
  { id: 'quarterly', label: 'Quý −20% 🔥' },
];

const TESTIMONIALS = [
  {
    name: 'Chị Lan — Dân văn phòng',
    text: 'Sáng nào cũng có ly protein giao tận nhà, không còn lo thiếu bữa khi bận họp.',
    rating: 5,
  },
  {
    name: 'Anh Minh — Gymer',
    text: 'Uống được, không tanh như whey. Combo tháng tiết kiệm hơn mua lẻ rõ rệt.',
    rating: 5,
  },
  {
    name: 'Chị Hương — Mẹ bỉm',
    text: '24+ vị nên không bị ngán. Cả nhà ai cũng thích ly xoài cam.',
    rating: 5,
  },
];

type FaqVideo = {
  id: string;
  title: string;
  duration: string;
  description: string;
  videoUrl?: string;
};

const FAQ_VIDEOS: FaqVideo[] = [
  {
    id: 'faq-whey',
    title: 'FitBlend khác gì whey thông thường?',
    duration: '1:20',
    description:
      'FitBlend dùng protein từ bột ức gà thật, kết hợp trái cây tươi — không tanh, không nóng trong như nhiều loại whey. Mỗi ly cung cấp 20G+ protein, vị ngon dễ uống mỗi ngày mà không cần pha bột phức tạp.',
  },
  {
    id: 'faq-ship',
    title: 'Giao hàng như thế nào mỗi ngày?',
    duration: '0:55',
    description:
      'FitBlend giao tươi mỗi sáng theo combo tuần/tháng bạn đăng ký. Bạn chọn hương vị trước, đội ngũ chuẩn bị và giao tận nơi — tiện lợi cho người bận rộn không có thời gian nấu ăn.',
  },
  {
    id: 'faq-combo',
    title: 'Combo tháng tiết kiệm bao nhiêu?',
    duration: '1:10',
    description:
      'Đăng ký Combo Tháng giúp tiết kiệm chi phí so với mua lẻ từng ly, đồng thời freeship mỗi sáng. 70% khách hàng chọn Combo Tháng để duy trì thói quen ăn đủ protein ổn định.',
  },
  {
    id: 'faq-who',
    title: 'Ai nên uống protein smoothie?',
    duration: '1:35',
    description:
      'Phù hợp dân văn phòng thiếu thời gian, người tập gym cần bổ sung protein, mẹ bỉm muốn bữa ăn nhanh lành mạnh, hoặc bất kỳ ai muốn ăn đủ dinh dưỡng mà không tốn công chuẩn bị.',
  },
];

function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 ${className}`}>
      <div
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-base sm:text-lg text-white shadow-md"
        style={{ background: BRAND.green }}
      >
        F
      </div>
      <span className="text-lg sm:text-xl font-black tracking-tight" style={{ color: BRAND.green }}>
        FitBlend
      </span>
    </div>
  );
}

function IngredientMobileCard({
  thumb,
  title,
}: {
  thumb: string;
  title: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 bg-white/90 border shadow-sm text-center w-[76px] sm:w-[86px] shrink-0"
      style={{ borderColor: `${BRAND.green}18` }}
    >
      <span className="text-lg sm:text-xl leading-none">{thumb}</span>
      <p className="text-[7px] sm:text-[8px] font-black leading-tight" style={{ color: BRAND.greenBright }}>
        {title}
      </p>
    </div>
  );
}

function IngredientMobileConnector({ side }: { side: 'left' | 'right' }) {
  return (
    <span
      className={`block w-5 sm:w-7 shrink-0 border-t-2 border-dashed self-center ${side === 'left' ? 'ml-0.5' : 'mr-0.5'}`}
      style={{ borderColor: `${BRAND.greenBright}55` }}
      aria-hidden
    />
  );
}

function IngredientMobileSlot({
  thumb,
  title,
  side,
  vAlign = 'center',
}: {
  thumb: string;
  title: string;
  side: 'left' | 'right';
  vAlign?: 'start' | 'center' | 'end';
}) {
  const vAlignClass =
    vAlign === 'start' ? 'items-start' : vAlign === 'end' ? 'items-end' : 'items-center';
  const hAlignClass = side === 'left' ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex ${vAlignClass} ${hAlignClass} w-full h-full min-h-0`}>
      {side === 'right' && <IngredientMobileConnector side="right" />}
      <IngredientMobileCard thumb={thumb} title={title} />
      {side === 'left' && <IngredientMobileConnector side="left" />}
    </div>
  );
}

function IngredientMobileGrid() {
  const leftItems = INGREDIENT_CALLOUTS.filter((c) => c.side === 'left');
  const rightItems = INGREDIENT_CALLOUTS.filter((c) => c.side === 'right');

  return (
    <div className="lg:hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)] gap-x-0 items-stretch max-w-md sm:max-w-lg mx-auto min-h-[280px] sm:min-h-[320px]">
        {/* Trái — 3 thành phần đều nhau */}
        <div className="grid grid-rows-3 gap-2 sm:gap-2.5 h-full pr-0.5">
          {leftItems.map((item) => (
            <IngredientMobileSlot key={item.num} thumb={item.thumb} title={item.title} side="left" />
          ))}
        </div>

        {/* Ly giữa — to hơn */}
        <div className="relative flex justify-center items-center self-center px-0.5">
          <div
            className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(13,122,62,0.2) 0%, transparent 70%)' }}
          />
          <img
            src={LANDING_IMAGES.heroSmoothie}
            alt="Ly FitBlend Protein Smoothie"
            className="relative z-10 w-[112px] sm:w-[132px] object-contain drop-shadow-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = LANDING_IMAGES.comboBottles;
            }}
          />
        </div>

        {/* Phải — 2 thành phần cân với trái */}
        <div className="grid grid-rows-3 gap-2 sm:gap-2.5 h-full pl-0.5">
          <IngredientMobileSlot thumb={rightItems[0].thumb} title={rightItems[0].title} side="right" vAlign="start" />
          <div aria-hidden className="min-h-0" />
          <IngredientMobileSlot thumb={rightItems[1].thumb} title={rightItems[1].title} side="right" vAlign="end" />
        </div>
      </div>
    </div>
  );
}

function IngredientCallout({
  num,
  title,
  desc,
  thumb,
  align,
}: {
  num: number;
  title: string;
  desc: string;
  thumb: string;
  align: 'left' | 'right';
}) {
  const isLeft = align === 'left';

  const numberBadge = (
    <span
      className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 shadow-sm"
      style={{ background: BRAND.greenBright }}
    >
      {num}
    </span>
  );

  const thumbBox = (
    <span className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-xl flex items-center justify-center text-4xl shrink-0 bg-white shadow-md border border-black/5">
      {thumb}
    </span>
  );

  const textBlock = (
    <div className="flex-1 min-w-0 py-1">
      <h3
        className="font-black text-[13px] md:text-sm mb-1.5 leading-snug tracking-wide"
        style={{ color: BRAND.greenBright }}
      >
        {num}. {title}
      </h3>
      <p className="text-[11px] md:text-xs leading-relaxed" style={{ color: BRAND.ink, opacity: 0.72 }}>
        {desc}
      </p>
    </div>
  );

  const cardBody = (
    <div
      className="relative flex-1 flex items-center gap-3 md:gap-4 rounded-2xl px-3 py-3 md:px-4 md:py-3.5 min-h-[96px]"
      style={{ background: 'rgba(13, 122, 62, 0.07)' }}
    >
      <span
        className={`hidden lg:block absolute top-1/2 -translate-y-1/2 border-t-2 border-dashed w-8 md:w-12 ${
          isLeft ? '-right-8 md:-right-12' : '-left-8 md:-left-12'
        }`}
        style={{ borderColor: `${BRAND.greenBright}45` }}
      />
      {isLeft ? (
        <>
          {textBlock}
          {thumbBox}
        </>
      ) : (
        <>
          {thumbBox}
          {textBlock}
        </>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-2 md:gap-2.5 w-full">
      {isLeft && numberBadge}
      {cardBody}
      {!isLeft && numberBadge}
    </div>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-black uppercase tracking-[0.25em] mb-3"
      style={{ color: BRAND.orange }}
    >
      {children}
    </p>
  );
}

function VideoWatchModal({
  video,
  onClose,
  onExplore,
}: {
  video: FaqVideo;
  onClose: () => void;
  onExplore: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const startPlay = () => {
    if (video.videoUrl) {
      setPlaying(true);
      requestAnimationFrame(() => videoRef.current?.play());
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-3 md:p-6 bg-black/55 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-[#EFEFEF] rounded-xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" style={{ color: BRAND.ink }} />
        </button>

        {/* Video — trái */}
        <div className="md:w-[58%] bg-black relative flex flex-col shrink-0">
          <div className="relative aspect-video md:aspect-auto md:flex-1 md:min-h-[320px] lg:min-h-[360px]">
            {playing && video.videoUrl ? (
              <video
                ref={videoRef}
                src={video.videoUrl}
                className="absolute inset-0 w-full h-full object-contain bg-black"
                controls
                playsInline
                onEnded={() => setPlaying(false)}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={startPlay}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 group cursor-pointer"
                  aria-label="Phát video"
                >
                  <div className="flex items-center gap-3 opacity-90">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-lg"
                      style={{ background: BRAND.greenBright }}
                    >
                      F
                    </div>
                    <span className="text-white text-2xl md:text-3xl font-black tracking-tight lowercase">
                      fitblend
                    </span>
                  </div>
                  <div
                    className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-full bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"
                  >
                    <Play className="w-8 h-8 ml-1" style={{ color: BRAND.ink }} fill="currentColor" />
                  </div>
                  {!video.videoUrl && (
                    <p className="text-white/60 text-xs mt-1 px-6 text-center">
                      Video sẽ sớm được cập nhật — bạn có thể đọc giải đáp bên cạnh
                    </p>
                  )}
                </button>
              </>
            )}
          </div>
          
          {/* Thanh điều khiển (preview) */}
          {!playing && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#2a2a2a] text-white text-xs">
              <Play className="w-4 h-4 shrink-0 opacity-80" />
              <span className="tabular-nums opacity-70">00:00</span>
              <div className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full w-0 bg-white/80 rounded-full" />
              </div>
              <span className="tabular-nums opacity-70">{video.duration}</span>
              <Volume2 className="w-4 h-4 shrink-0 opacity-70" />
              <Maximize className="w-4 h-4 shrink-0 opacity-70" />
            </div>
          )}
        </div>

        {/* Nội dung — phải */}
        <div className="md:w-[42%] flex flex-col justify-center px-6 py-8 md:px-8 md:py-10 lg:px-10">
          <h2 className="text-xl md:text-2xl lg:text-[1.65rem] font-black uppercase leading-tight mb-5 tracking-tight">
            <span style={{ color: BRAND.ink }}>Tại sao chọn </span>
            <span style={{ color: BRAND.orange }}>FitBlend?</span>
          </h2>
          <p
            className="text-sm font-bold mb-3 leading-snug"
            style={{ color: BRAND.greenBright }}
          >
            {video.title}
          </p>
          <p
            className="text-sm md:text-[15px] leading-relaxed mb-8"
            style={{ color: BRAND.ink, opacity: 0.72 }}
          >
            {video.description}
          </p>
            <button 
            type="button"
            onClick={() => {
              onClose();
              onExplore();
            }}
            className="self-start px-8 py-3 rounded-md border-2 font-black text-sm uppercase tracking-wide transition-colors hover:bg-orange-50"
            style={{ borderColor: BRAND.orange, color: BRAND.orange, background: 'white' }}
          >
            Xem thêm
            </button>
          </div>
      </div>
    </div>
  );
}

function FloatingContact() {
  return (
    <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-4 z-[120] flex flex-col gap-2.5 pb-[env(safe-area-inset-bottom)]">
      <a
        href={BRAND.zalo}
        target="_blank"
        rel="noreferrer"
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
        style={{ background: '#0068FF' }}
        aria-label="Zalo"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </a>
      <a
        href={BRAND.facebook}
        target="_blank"
        rel="noreferrer"
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
        style={{ background: '#1877F2' }}
        aria-label="Facebook"
      >
        <Facebook className="w-5 h-5 sm:w-6 sm:h-6" />
      </a>
    </div>
  );
}

export function CustomerLanding({
  onGetStarted,
  onSelectCombo,
  onSelectDuration,
  onOpenWholesale,
  onGoToRetail,
}: LandingProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMenuImage, setShowMenuImage] = useState(false);
  const [activeMenuPage, setActiveMenuPage] = useState<1 | 2>(1);
  const [showRegChoice, setShowRegChoice] = useState(false);
  const [showPurchaseTypeChoice, setShowPurchaseTypeChoice] = useState(false);
  const [activeFaqVideo, setActiveFaqVideo] = useState<FaqVideo | null>(null);
  const [landingPlanDuration, setLandingPlanDuration] = useState<ComboDuration>('monthly');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goComboDuration = (duration: ComboDuration) => {
    if (onSelectDuration) {
      onSelectDuration(duration);
      return;
    }
    onGetStarted();
  };

  const goSelectPlan = (planId: PlanComboId) => {
    onSelectDuration?.(landingPlanDuration);
    onSelectCombo(planId);
  };

  const activePlanCombos = PLAN_COMBOS_DATA[landingPlanDuration];

  const scrollTo = (href: string) => {
    setMobileMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-dvh font-sans selection:bg-orange-100 pb-20 sm:pb-0" style={{ background: BRAND.beige, color: BRAND.brown }}>
      <FloatingContact />

      {/* ── 1. Navigation ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[110] transition-all duration-300 pt-[env(safe-area-inset-top)] ${
          scrolled ? 'py-2.5 sm:py-3 shadow-md backdrop-blur-md' : 'py-3.5 sm:py-5'
        }`}
        style={{ background: scrolled ? 'rgba(255,253,246,0.95)' : BRAND.beige }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between gap-3">
          <button type="button" onClick={() => scrollTo('#why')}>
            <Logo />
          </button>

          <div className="hidden lg:flex items-center gap-6 text-sm font-bold" style={{ color: BRAND.green }}>
            {NAV_LINKS.map((link) => (
          <button 
                key={link.href}
                type="button"
                onClick={() => scrollTo(link.href)}
                className="hover:opacity-70 transition-opacity"
              >
                {link.label}
          </button>
            ))}
        </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRegChoice(true)}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-full text-sm font-black text-white shadow-md hover:scale-[1.02] transition-transform"
              style={{ background: BRAND.orange }}
            >
              Nhận Tư Vấn Combo
            </button>
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl"
              style={{ color: BRAND.green }}
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t px-4 py-4 space-y-3" style={{ borderColor: `${BRAND.green}20`, background: BRAND.beige }}>
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => scrollTo(link.href)}
                className="block w-full text-left font-bold py-2"
                style={{ color: BRAND.green }}
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowRegChoice(true);
              }}
              className="w-full py-3 rounded-xl font-black text-white"
              style={{ background: BRAND.orange }}
            >
              Nhận Tư Vấn Combo
            </button>
            </div>
        )}
      </nav>

      {/* ── 2. Hero — Vì sao chọn FitBlend ── */}
      <section id="why" className="pt-20 sm:pt-28 pb-8 md:pt-32 md:pb-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-10 lg:gap-14 items-center mb-5 sm:mb-8 md:mb-14">
            <div className="space-y-3 sm:space-y-5 md:space-y-6 order-2 lg:order-1 text-center lg:text-left">
              <div
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white"
                style={{ background: BRAND.green }}
              >
                <Zap className="w-3.5 h-3.5" style={{ color: BRAND.orange }} />
                Bữa ăn protein trong 1 phút
              </div>

              <h1 className="text-[1.6rem] sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black leading-[1.1] tracking-tight">
                <span style={{ color: BRAND.green }}>Đủ Protein.</span>
                <br />
                <span style={{ color: BRAND.orange }}>Không Tốn Thời Gian.</span>
            </h1>

              <p className="text-[13px] sm:text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 opacity-80 line-clamp-3 sm:line-clamp-none" style={{ color: BRAND.brown }}>
                Protein Smoothie từ bột ức gà — dinh dưỡng nhanh, ngon, tiện cho người bận rộn.
              </p>

              <div className="hidden sm:flex flex-wrap justify-center lg:justify-start gap-2 pt-1">
                {HERO_IMAGE_BADGES.map((usp) => (
                  <span
                    key={usp.text}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs md:text-sm font-bold border-2 bg-white/60"
                    style={{ borderColor: BRAND.orange, color: BRAND.orange }}
                  >
                    {usp.text}
                  </span>
                ))}
              </div>

              <div className="hidden sm:flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2 max-w-sm mx-auto lg:mx-0 lg:max-w-none">
              <button 
                  type="button"
                  onClick={() => scrollTo('#combos')}
                  className="w-full sm:w-auto px-6 sm:px-7 py-3.5 rounded-full font-black text-white flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform text-sm md:text-base"
                  style={{ background: BRAND.orange }}
                >
                  Khám Phá Combo FitBlend <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                  type="button"
                onClick={() => setShowMenuImage(true)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full font-bold border-2 flex items-center justify-center gap-2 bg-white active:scale-[0.98] transition-transform text-sm"
                  style={{ borderColor: `${BRAND.green}30`, color: BRAND.green }}
              >
                  <ImageIcon className="w-4 h-4" /> Xem Menu
              </button>
              </div>
            </div>

            <div className="order-1 lg:order-2 flex items-center justify-center lg:justify-end gap-3 md:gap-5">
              <div className="relative flex-1 max-w-[200px] sm:max-w-md lg:max-w-none mx-auto">
                <div
                  className="absolute -inset-3 sm:-inset-4 rounded-[2rem] opacity-20 blur-2xl"
                  style={{ background: BRAND.orange }}
                />
                <img
                  src={LANDING_IMAGES.comboBottles}
                  alt="FitBlend Protein Smoothie"
                  className="relative z-10 w-full max-h-[180px] sm:max-h-[340px] md:max-h-[420px] object-contain drop-shadow-2xl mx-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = LANDING_IMAGES.heroSmoothie;
                  }}
                />
            </div>

              <div className="hidden md:flex flex-col gap-3 shrink-0">
                {HERO_IMAGE_BADGES.map((badge) => (
                  <div
                    key={badge.text}
                    className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 border bg-white shadow-md min-w-[168px]"
                    style={{ borderColor: `${BRAND.green}18` }}
                  >
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0"
                      style={{ background: `${BRAND.green}12` }}
                    >
                      {badge.icon}
                    </span>
                    <span className="text-[11px] font-bold leading-snug" style={{ color: BRAND.green }}>
                      {badge.text}
                    </span>
              </div>
                ))}
              </div>
              </div>
            </div>

          {/* Thanh số liệu */}
          <div
            className="rounded-2xl sm:rounded-[1.75rem] md:rounded-[2rem] border overflow-hidden shadow-xl"
            style={{ background: BRAND.green, borderColor: 'rgba(255,255,255,0.12)' }}
          >
            {/* Mobile: lưới 2 cột */}
            <div className="md:hidden grid grid-cols-2 gap-2 p-3">
              {HERO_STAT_COLUMNS.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.title}
                    className={`rounded-lg p-2.5 text-left ${idx === HERO_STAT_COLUMNS.length - 1 ? 'col-span-2' : ''}`}
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className="w-3.5 h-3.5 text-white shrink-0" />
                      <span className="text-base sm:text-lg font-black" style={{ color: BRAND.orange }}>{stat.value}</span>
                    </div>
                    <p className="text-[11px] font-black text-white">{stat.title}</p>
                    <p className="text-[10px] text-white/70 mt-0.5 leading-snug line-clamp-2">{stat.desc}</p>
                  </div>
                );
              })}
          </div>

            {/* Desktop: grid 5 cột */}
            <div className="hidden md:grid md:grid-cols-5 gap-4 p-6 md:p-8">
              {HERO_STAT_COLUMNS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.title} className="text-left md:px-2">
                    <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-3">
                        <span
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(255,255,255,0.1)' }}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </span>
                        <span
                          className="text-2xl md:text-3xl font-black leading-none"
                          style={{ color: BRAND.orange }}
                        >
                          {stat.value}
                        </span>
                </div>
                <div>
                        <p className="text-sm font-black text-white">{stat.title}</p>
                        <p className="text-[11px] md:text-xs text-white/75 mt-1 leading-relaxed">{stat.desc}</p>
                </div>
              </div>
            </div>
                );
              })}
            </div>

            <div
              className="hidden sm:grid sm:grid-cols-2 md:flex md:flex-wrap items-center justify-center gap-x-3 gap-y-2 md:gap-x-4 px-3 sm:px-4 py-2.5 md:py-5 border-t text-[10px] sm:text-xs font-semibold text-white/85"
              style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.12)' }}
            >
              {HERO_TRUST_STRIP.map((item, i) => {
                const Icon = item.icon;
                return (
                  <span key={item.text} className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                    {i > 0 && <span className="hidden sm:inline text-white/30">|</span>}
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND.orange }} />
                      <span className="leading-tight">{item.text}</span>
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Thành phần — theo mockup ── */}
      <section id="ingredients" className="py-8 sm:py-14 md:py-20" style={{ background: BRAND.cream }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-5 sm:mb-10 md:mb-12">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-white mb-3 sm:mb-6 shadow-sm"
              style={{ background: BRAND.greenBright }}
            >
              <Leaf className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Nguyên liệu thật
            </div>
            <h2 className="text-lg sm:text-2xl md:text-[2.35rem] font-black leading-tight mb-2 sm:mb-4 uppercase tracking-tight">
              <span style={{ color: BRAND.ink }}>5 Thành Phần </span>
              <span style={{ color: BRAND.greenBright }}>FitBlend</span>
            </h2>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed hidden sm:block" style={{ color: BRAND.ink, opacity: 0.78 }}>
              Không đường tinh luyện · Không hương liệu nhân tạo · Nguyên liệu thật 100%
            </p>
          </div>

          {/* Mobile: ly giữa + 5 thành phần (icon + tiêu đề) */}
          <div className="lg:hidden mb-4">
            <IngredientMobileGrid />
                </div>

          {/* Desktop: ly giữa + 5 thành phần */}
          <div className="relative max-w-5xl mx-auto mb-10 md:mb-14 hidden lg:block">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_240px_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] gap-3 lg:gap-5 items-stretch">
              {/* Trái — 3 hàng đều */}
              <div className="grid grid-rows-3 gap-3 lg:gap-4 lg:min-h-[500px] order-2 lg:order-1">
                {INGREDIENT_CALLOUTS.filter((c) => c.side === 'left').map((item) => (
                  <div key={item.num} className="flex items-center">
                    <IngredientCallout {...item} align="left" />
              </div>
            ))}
          </div>

              {/* Ly trung tâm */}
              <div className="relative flex justify-center items-center order-1 lg:order-2 py-8 lg:py-0 lg:min-h-[500px]">
                <div
                  className="absolute w-48 h-48 md:w-56 md:h-56 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(13,122,62,0.18) 0%, transparent 70%)' }}
                />
                <div className="relative z-10 flex flex-col items-center">
                  <img
                    src={LANDING_IMAGES.heroSmoothie}
                    alt="Ly FitBlend Protein Smoothie"
                    className="w-36 sm:w-44 md:w-52 object-contain drop-shadow-2xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = LANDING_IMAGES.comboBottles;
                    }}
                  />
                  <span className="absolute -top-2 right-2 text-xl opacity-60 pointer-events-none">🍃</span>
                  <span className="absolute top-12 -left-4 text-lg opacity-40 pointer-events-none">🍃</span>
        </div>
              </div>

              {/* Phải — card 4 trên, card 5 giữa (khớp mockup) */}
              <div className="grid grid-rows-3 gap-3 lg:gap-4 lg:min-h-[500px] order-3">
                <div className="flex items-start pt-0">
                  <IngredientCallout {...INGREDIENT_CALLOUTS[3]} align="right" />
            </div>
                <div className="flex items-center">
                  <IngredientCallout {...INGREDIENT_CALLOUTS[4]} align="right" />
                </div>
                <div aria-hidden />
              </div>
            </div>
          </div>

          {/* 4 thẻ highlight — icon tròn xanh đặc, số đen */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-4 md:mb-8">
            {INGREDIENT_FEATURE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl p-5 md:p-6 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] flex gap-4 items-start"
                >
                  <span
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: BRAND.greenBright }}
                  >
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-xl md:text-2xl font-black leading-none mb-1" style={{ color: BRAND.ink }}>
                      {card.stat}
                    </p>
                    <p
                      className="text-[10px] md:text-[11px] font-black mb-2 tracking-wide uppercase"
                      style={{ color: BRAND.greenBright }}
                    >
                      {card.title}
                    </p>
                    <p className="text-[11px] md:text-xs leading-relaxed" style={{ color: BRAND.ink, opacity: 0.65 }}>
                      {card.desc}
                    </p>
            </div>
                </div>
              );
            })}
          </div>

          {/* Footer strip — nền xanh nhạt full width trong container */}
          <div
            className="hidden md:flex flex-wrap items-center justify-center gap-x-4 md:gap-x-8 gap-y-2 rounded-xl px-4 py-4 md:py-5 text-[11px] md:text-xs font-semibold"
            style={{ background: 'rgba(13, 122, 62, 0.08)', color: BRAND.greenBright }}
          >
            {INGREDIENT_TRUST_STRIP.map((item, i) => {
              const Icon = item.icon;
              return (
                <span key={item.text} className="inline-flex items-center gap-3">
                  {i > 0 && <span className="hidden md:inline w-px h-3.5 bg-current opacity-25" />}
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                    {item.text}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. Combo sản phẩm — Gói theo mục tiêu ── */}
      <section id="combos" className="py-10 sm:py-16 md:py-28">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-4 sm:mb-6">
            <SectionTag>Combo sản phẩm</SectionTag>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black mb-2 sm:mb-3" style={{ color: BRAND.green }}>
              Gói Theo Mục Tiêu
            </h2>
            <p className="opacity-75 text-sm hidden sm:block">
              Fat Loss · Muscle Build · Elite Mass — chọn gói phù hợp thể trạng, đăng ký tuần/tháng/quý để tiết kiệm đến 20% và freeship mỗi sáng.
            </p>
          </div>

          <p
            className="text-center text-xs sm:text-sm font-bold mb-6 sm:mb-8 px-3 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl max-w-2xl mx-auto"
            style={{ background: `${BRAND.orange}12`, color: BRAND.brown }}
          >
            70% khách chọn gói Tháng
          </p>

          <div className="flex justify-center mb-6 sm:mb-10 px-1">
            <div
              className="inline-flex p-1 rounded-2xl sm:rounded-[2rem] border shadow-sm w-full max-w-md sm:max-w-none sm:w-auto"
              style={{ background: 'white', borderColor: `${BRAND.green}15` }}
            >
              {PLAN_DURATION_TABS.map((tab) => (
              <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLandingPlanDuration(tab.id)}
                  className={`relative flex-1 sm:flex-none px-3 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-sm uppercase tracking-wide transition-all ${
                    landingPlanDuration === tab.id ? 'text-white shadow-md' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    background: landingPlanDuration === tab.id ? BRAND.green : 'transparent',
                    color: landingPlanDuration === tab.id ? 'white' : BRAND.brown,
                  }}
                >
                  {tab.label}
                  {tab.hint && landingPlanDuration !== tab.id && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-black uppercase whitespace-nowrap hidden sm:block" style={{ background: BRAND.orange, color: 'white' }}>
                      {tab.hint}
                    </span>
                  )}
              </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 items-stretch">
            {activePlanCombos.map((combo) => (
              <div 
                key={combo.id}
                className={`relative rounded-2xl sm:rounded-[2rem] border bg-white p-4 sm:p-6 md:p-8 flex flex-col h-full w-full ${
                  combo.featured ? 'md:scale-[1.05] shadow-2xl z-10' : 'shadow-lg'
                }`}
                style={{
                  borderColor: combo.featured ? BRAND.green : `${BRAND.green}15`,
                  boxShadow: combo.featured ? `0 20px 50px ${BRAND.green}20` : undefined,
                }}
              >
                <span
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider"
                  style={{ background: `${BRAND.green}10`, color: BRAND.green }}
                >
                    {combo.badge}
                  </span>

                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pr-16 sm:pr-20">
                  <span
                    className="text-xl sm:text-2xl w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `${BRAND.green}08` }}
                  >
                      {combo.icon}
                    </span>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-black leading-tight" style={{ color: BRAND.green }}>
                      {combo.name}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider opacity-70">
                        {combo.subtitle}
                      </p>
                    </div>
                  </div>

                <p className="text-[11px] sm:text-xs font-bold opacity-60 mb-3 sm:mb-4">{combo.specs}</p>

                <div className="mb-3 sm:mb-5">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black" style={{ color: BRAND.green }}>
                      {combo.price}
                    </span>
                    <span className="text-sm line-through opacity-40 font-bold">{combo.originalPrice}</span>
                    </div>
                  <div className="flex items-center justify-between gap-2 mt-1 text-[10px] sm:text-xs font-bold opacity-70">
                    <span>= {combo.perCup}/ly · Freeship</span>
                    <span
                      className="px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase shrink-0"
                      style={{ background: `${BRAND.orange}15`, color: BRAND.orange }}
                    >
                      −{combo.save}
                      </span>
                    </div>
                  </div>

                <ul className="space-y-2 mb-4 sm:mb-6 flex-1">
                  {[
                    'Tự chọn vị 7 ngày uống tùy thích',
                    'Tùy chọn combo hoặc single toppings',
                    'Giao tươi mỗi sáng, đảm bảo dinh dưỡng',
                  ].map((perk, idx) => (
                    <li
                      key={perk}
                      className={`flex items-start gap-2 text-xs sm:text-sm font-medium ${idx >= 2 ? 'hidden sm:flex' : ''}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5" style={{ color: BRAND.green }} />
                      {perk}
                    </li>
                  ))}
                  </ul>

                <button
                  type="button"
                  onClick={() => goSelectPlan(combo.id)}
                  className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-white text-sm transition-transform active:scale-[0.98] mt-auto"
                  style={{ background: combo.btnBg }}
                >
                  Đăng Ký Ngay
                </button>
              </div>
            ))}
                </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-6 sm:mt-10">
                <button 
              type="button"
              onClick={() => setShowPurchaseTypeChoice(true)}
              className="text-sm font-bold underline opacity-70 hover:opacity-100"
              style={{ color: BRAND.green }}
            >
              Hoặc mua lẻ từng ly giao ngay →
            </button>
            <button
              type="button"
              onClick={() => setShowMenuImage(true)}
              className="inline-flex items-center gap-2 text-sm font-bold opacity-70 hover:opacity-100"
              style={{ color: BRAND.green }}
            >
              <ImageIcon className="w-4 h-4" /> Xem chi tiết bảng giá
                </button>
          </div>
        </div>
      </section>

      {/* ── 5. Feedback ── */}
      <section id="feedback" className="py-10 sm:py-16 md:py-28 text-white" style={{ background: BRAND.brown }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
            <SectionTag>
              <span style={{ color: BRAND.orange }}>Feedback khách hàng</span>
            </SectionTag>
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black mb-2 sm:mb-4">
              Khách Hàng Tin Dùng FitBlend
            </h2>
            <p className="opacity-80 text-sm hidden sm:block">
              Không chỉ ngon miệng, FitBlend còn giúp việc ăn đủ protein mỗi ngày trở nên đơn giản hơn.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-6 sm:mb-12">
            {[
              { value: '366+', label: 'khách/tháng' },
              { value: '1.560+', label: 'ly giao/tháng' },
              { value: '4.9/5', label: 'đánh giá' },
            ].map((item, idx) => (
              <div
                key={item.label}
                className={`text-center rounded-xl sm:rounded-2xl p-3 sm:p-6 bg-white/5 border border-white/10 ${idx === 2 ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                <div className="text-2xl sm:text-3xl font-black" style={{ color: BRAND.orange }}>
                  {item.value}
                </div>
                <div className="text-[11px] sm:text-sm opacity-75 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-10">
            {TESTIMONIALS.map((t, idx) => (
              <div
                key={t.name}
                className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-white/5 border border-white/10 ${idx === TESTIMONIALS.length - 1 && TESTIMONIALS.length % 2 !== 0 ? 'col-span-2 md:col-span-1 max-w-md md:max-w-none mx-auto w-full' : ''}`}
              >
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" style={{ color: BRAND.orange }} />
                  ))}
                </div>
                <p className="text-xs sm:text-sm leading-relaxed opacity-90 mb-2 sm:mb-4 line-clamp-4 sm:line-clamp-none">&ldquo;{t.text}&rdquo;</p>
                <p className="text-[10px] sm:text-xs font-bold opacity-60">{t.name}</p>
              </div>
            ))}
          </div>

          <div className="text-center hidden sm:block">
            <button
              type="button"
              onClick={() => scrollTo('#combos')}
              className="px-8 py-4 rounded-2xl font-black text-white"
              style={{ background: BRAND.orange }}
            >
              Xem Combo Phù Hợp
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. FAQ Video ── */}
      <section id="faq" className="py-10 sm:py-16 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
            <SectionTag>Câu hỏi thường gặp</SectionTag>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black mb-2 sm:mb-4" style={{ color: BRAND.green }}>
              Giải Đáp Nhanh
          </h2>
            <p className="opacity-75 text-sm hidden sm:block">
              Video ngắn từ đội ngũ FitBlend.
            </p>
            <p className="text-xs opacity-60 mt-1 lg:hidden">← Vuốt ngang để xem thêm video</p>
          </div>

          {/* Mobile/tablet: cuộn ngang — chỉ phần video */}
          <div className="lg:hidden -mx-3 px-3 overflow-x-auto snap-x snap-mandatory flex gap-3 pb-2 scrollbar-hide">
            {FAQ_VIDEOS.map((video) => (
            <button 
                key={video.id}
                type="button"
                onClick={() => setActiveFaqVideo(video)}
                className="group flex flex-col shrink-0 snap-center w-[72vw] max-w-[280px] text-left rounded-2xl overflow-hidden border bg-[#FFFDF6] hover:shadow-lg transition-shadow"
                style={{ borderColor: `${BRAND.green}12` }}
              >
                <div
                  className="aspect-video w-full flex items-center justify-center relative"
                  style={{ background: `${BRAND.brown}18` }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform"
                    style={{ background: BRAND.orange }}
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </div>
                  <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-1 rounded bg-black/50 text-white tabular-nums">
                    {video.duration}
                  </span>
                </div>
                <div className="flex flex-col flex-1 p-3 min-h-[5rem]">
                  <p className="font-bold text-xs leading-snug line-clamp-3 flex-1" style={{ color: BRAND.brown }}>
                    {video.title}
                  </p>
                  <p className="text-[10px] mt-auto pt-2 font-semibold shrink-0" style={{ color: BRAND.orange }}>
                    Nhấn để xem →
                  </p>
                </div>
            </button>
            ))}
          </div>

          {/* Desktop: lưới 4 cột */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-5 items-stretch">
            {FAQ_VIDEOS.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => setActiveFaqVideo(video)}
                className="group flex flex-col h-full w-full text-left rounded-2xl overflow-hidden border bg-[#FFFDF6] hover:shadow-lg transition-shadow"
                style={{ borderColor: `${BRAND.green}12` }}
              >
                <div
                  className="aspect-video w-full shrink-0 flex items-center justify-center relative"
                  style={{ background: `${BRAND.brown}18` }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform"
                    style={{ background: BRAND.orange }}
                  >
                    <Play className="w-6 h-6 ml-1" />
                  </div>
                  <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-1 rounded bg-black/50 text-white tabular-nums">
                    {video.duration}
                  </span>
                </div>
                <div className="flex flex-col flex-1 p-4 min-h-[7.5rem]">
                  <p className="font-bold text-sm leading-snug line-clamp-3 flex-1" style={{ color: BRAND.brown }}>
                    {video.title}
                  </p>
                  <p className="text-[11px] mt-auto pt-3 font-semibold shrink-0" style={{ color: BRAND.orange }}>
                    Nhấn để xem video →
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeFaqVideo && (
        <VideoWatchModal
          video={activeFaqVideo}
          onClose={() => setActiveFaqVideo(null)}
          onExplore={() => scrollTo('#combos')}
        />
      )}

      {/* ── 7. Mua sỉ ── */}
      <section id="wholesale" className="py-8 sm:py-16 md:py-28">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="rounded-2xl sm:rounded-[2.5rem] overflow-hidden grid lg:grid-cols-2 gap-0 border shadow-xl bg-white" style={{ borderColor: `${BRAND.green}12` }}>
            <div className="p-5 sm:p-8 md:p-12 flex flex-col justify-center">
              <SectionTag>Mua sỉ</SectionTag>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black mb-2 sm:mb-4" style={{ color: BRAND.green }}>
                Đối Tác FitBlend
              </h2>
              <p className="opacity-75 leading-relaxed mb-4 sm:mb-8 text-sm sm:text-base line-clamp-3 sm:line-clamp-none">
                Dành cho gym, đại lý, văn phòng muốn bổ sung dinh dưỡng tiện lợi.
              </p>
              <button
                type="button"
                onClick={onOpenWholesale}
                className="self-start px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-white text-sm shadow-lg active:scale-[0.98] transition-transform"
                style={{ background: BRAND.green }}
              >
                Nhận Báo Giá Sỉ
              </button>
              </div>
            <div
              className="hidden sm:flex min-h-[200px] lg:min-h-0 items-center justify-center p-8"
              style={{ background: `linear-gradient(135deg, ${BRAND.green}12, ${BRAND.orange}15)` }}
            >
              <img
                src={LANDING_IMAGES.comboBottles}
                alt="FitBlend đối tác"
                className="max-h-48 sm:max-h-64 w-auto object-contain drop-shadow-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Footer ── */}
      <footer className="py-8 sm:py-16 border-t" style={{ borderColor: `${BRAND.green}12`, background: 'white' }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-10 mb-6 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <Logo className="mb-3 sm:mb-4" />
              <p className="font-black text-sm sm:text-lg mb-1 sm:mb-2" style={{ color: BRAND.green }}>
                Ăn Đủ Protein. Không Tốn Thời Gian.
              </p>
              <p className="text-xs sm:text-sm opacity-70 leading-relaxed hidden sm:block">
                Protein Smoothie từ bột ức gà đầu tiên tại Việt Nam.
              </p>
            </div>

              <div>
              <h4 className="font-black mb-4 text-sm uppercase tracking-wider" style={{ color: BRAND.green }}>
                Liên hệ
              </h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0" style={{ color: BRAND.orange }} />
                  <a href={`tel:${BRAND.phone}`}>{BRAND.phoneDisplay}</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" style={{ color: BRAND.orange }} />
                  <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: BRAND.orange }} />
                  TP. Hồ Chí Minh
                </li>
              </ul>
              </div>
              
            <div className="hidden sm:block">
              <h4 className="font-black mb-4 text-sm uppercase tracking-wider" style={{ color: BRAND.green }}>
                Liên kết nhanh
              </h4>
              <ul className="space-y-2 text-sm">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <button type="button" onClick={() => scrollTo(link.href)} className="hover:opacity-70">
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden sm:block">
              <h4 className="font-black mb-4 text-sm uppercase tracking-wider" style={{ color: BRAND.green }}>
                Theo dõi FitBlend
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href={BRAND.facebook} target="_blank" rel="noreferrer" className="hover:opacity-70">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href={BRAND.tiktok} target="_blank" rel="noreferrer" className="hover:opacity-70">
                    TikTok
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center pt-6 sm:pt-8 border-t" style={{ borderColor: `${BRAND.green}10` }}>
            <button
              type="button"
              onClick={() => setShowRegChoice(true)}
              className="hidden sm:inline-flex px-10 py-4 rounded-2xl font-black text-white shadow-lg hover:scale-[1.02] transition-transform"
              style={{ background: BRAND.orange }}
            >
              Nhận Tư Vấn Combo
            </button>
            <p className="text-[10px] sm:text-xs opacity-50 mt-4 sm:mt-8">© {new Date().getFullYear()} FitBlend. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Sticky CTA — mobile */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-[100] px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t backdrop-blur-md"
        style={{ background: 'rgba(255,253,246,0.95)', borderColor: `${BRAND.green}15` }}
      >
        <button
          type="button"
          onClick={() => scrollTo('#combos')}
          className="w-full py-3.5 rounded-2xl font-black text-white text-sm shadow-lg active:scale-[0.98] transition-transform"
          style={{ background: BRAND.orange }}
        >
          Đặt Combo FitBlend Ngay
        </button>
      </div>

      {/* ── Modals (giữ logic cũ) ── */}
      {showRegChoice && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
            <div className="text-center space-y-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: `${BRAND.orange}15`, color: BRAND.orange }}
              >
                <HelpCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black" style={{ color: BRAND.green }}>
                  Bắt đầu lộ trình
                </h3>
                <p className="text-sm opacity-70 mt-1">Bạn muốn tự đăng ký hay cần tư vấn?</p>
              </div>
              <div className="space-y-3">
                <button 
                  type="button"
                  onClick={() => {
                    goComboDuration('monthly');
                    setShowRegChoice(false);
                  }}
                  className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2"
                  style={{ background: BRAND.orange }}
                >
                  <UserCheck className="w-5 h-5" /> Tự đăng ký Combo Tháng
                </button>
                  <div className="flex gap-3">
                    <a 
                    href={BRAND.zalo}
                      target="_blank" 
                    rel="noreferrer"
                    className="flex-1 py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: '#0068FF' }}
                    >
                    <MessageCircle className="w-4 h-4" /> Zalo
                    </a>
                    <a 
                    href={BRAND.facebook}
                      target="_blank" 
                    rel="noreferrer"
                    className="flex-1 py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: '#1877F2' }}
                    >
                    <Facebook className="w-4 h-4" /> Facebook
                    </a>
                  </div>
                </div>
              <button type="button" onClick={() => setShowRegChoice(false)} className="text-sm opacity-50 hover:opacity-80">
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}

      {showPurchaseTypeChoice && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-center mb-2" style={{ color: BRAND.green }}>
              Chọn hình thức mua hàng
            </h3>
            <p className="text-center text-sm opacity-70 mb-6">Đăng ký combo dài hạn hay mua lẻ giao ngay?</p>
              <div className="grid gap-4">
                <button
                type="button"
                  onClick={() => {
                    setShowPurchaseTypeChoice(false);
                    onGetStarted();
                  }}
                className="text-left p-5 rounded-2xl border-2 hover:shadow-md transition-shadow"
                style={{ borderColor: `${BRAND.orange}40`, background: `${BRAND.orange}08` }}
                >
                <div className="font-black text-lg" style={{ color: BRAND.green }}>
                  📦 Đăng ký Combo dài hạn
                  </div>
                <p className="text-xs opacity-70 mt-1">Tuần / Tháng / Quý — tiết kiệm & freeship mỗi sáng</p>
                </button>
                <button
                type="button"
                  onClick={() => {
                    setShowPurchaseTypeChoice(false);
                  onGoToRetail ? onGoToRetail() : onGetStarted();
                }}
                className="text-left p-5 rounded-2xl border-2 hover:shadow-md transition-shadow"
                style={{ borderColor: `${BRAND.green}25`, background: `${BRAND.green}06` }}
              >
                <div className="font-black text-lg" style={{ color: BRAND.green }}>
                  🥤 Mua lẻ từng ly
                  </div>
                <p className="text-xs opacity-70 mt-1">Chọn size, protein & topping như tại quầy</p>
                </button>
              </div>
            <button type="button" onClick={() => setShowPurchaseTypeChoice(false)} className="w-full mt-4 text-sm opacity-50">
                  Đóng
                </button>
          </div>
        </div>
      )}

      {showMenuImage && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 p-4">
          <button 
            type="button"
            onClick={() => setShowMenuImage(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex gap-2 mb-4">
            {([1, 2] as const).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setActiveMenuPage(page)}
                className="px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  background: activeMenuPage === page ? BRAND.orange : 'rgba(255,255,255,0.1)',
                  color: 'white',
                }}
              >
                Trang {page}
              </button>
            ))}
            </div>
          <div className="relative flex items-center max-w-4xl w-full">
              <button
              type="button"
              disabled={activeMenuPage === 1}
                onClick={() => setActiveMenuPage(1)}
              className="hidden md:flex absolute -left-12 p-3 rounded-full bg-white/10 text-white disabled:opacity-30"
              >
              <ChevronLeft className="w-5 h-5" />
              </button>
                <img 
                  src={LANDING_IMAGES.menuPage(activeMenuPage)} 
              alt={`Menu trang ${activeMenuPage}`}
              className="max-h-[70vh] w-full object-contain rounded-xl"
                />
              <button
              type="button"
              disabled={activeMenuPage === 2}
                onClick={() => setActiveMenuPage(2)}
              className="hidden md:flex absolute -right-12 p-3 rounded-full bg-white/10 text-white disabled:opacity-30"
              >
              <ChevronRight className="w-5 h-5" />
              </button>
            </div>
              <a
                href={LANDING_IMAGES.menuPage(activeMenuPage)}
            download
            className="mt-4 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-white"
            style={{ background: BRAND.orange }}
              >
            <Download className="w-4 h-4" /> Tải menu
              </a>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
