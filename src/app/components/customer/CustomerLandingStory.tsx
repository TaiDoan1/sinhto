/**
 * CustomerLandingStory — trang khách hàng dựng lại theo phong cách "kể chuyện cuộn dài"
 * (lấy cảm hứng từ apeel.com): nền kem ấm, chữ serif lớn kiểu editorial, cuộn mượt quán tính
 * (Lenis), tiêu đề hiện lên từng chữ, section ảnh "ghim" phóng to khi cuộn, các khối fade-in.
 *
 * Giữ nguyên hợp đồng props với <CustomerLanding> cũ nên thay thế trực tiếp trong CustomerApp.
 *
 * An toàn trình duyệt cũ / tiết kiệm pin:
 *  - Hiệu ứng cuộn tự viết bằng 1 vòng requestAnimationFrame + getBoundingClientRect
 *    (KHÔNG dùng IntersectionObserver — máy cũ không có), tự tắt khi tab ẩn.
 *  - Lenis nạp động, chỉ bật khi không "giảm chuyển động"; lỗi -> cuộn thường.
 *  - Tôn trọng prefers-reduced-motion: tắt toàn bộ animation, hiện nội dung ngay.
 */
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  createContext,
  Fragment,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Facebook,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  X,
} from 'lucide-react';
import { BRAND } from './landing/brand';
import { IMAGES_ROOT, LANDING_IMAGES, PRODUCT_IMAGES } from '../../config/images';

/* ─────────────────────────────  Bảng màu  ───────────────────────────── */

const C = {
  cream: '#FBF6EC',
  creamDeep: '#F3EADA',
  green: '#0D530E',
  greenSoft: '#0B7A3E',
  brown: '#4B352A',
  orange: '#F97A00',
  ink: '#231A12',
};

/**
 * Ảnh/video nền hero (full-bleed, kiểu apeel.com).
 * Muốn dùng video: đặt file vào `public/images/`, đổi HERO_VIDEO thành đường dẫn (vd '/images/hero.mp4').
 */
const HERO_IMAGE = `${IMAGES_ROOT}/hero-poster.jpg`;
const HERO_VIDEO: string | null = '/videos/hero.mp4';

/* ─────────────────────────────  Nội dung  ───────────────────────────── */

type ComboDuration = 'weekly' | 'monthly' | 'quarterly';
type PlanComboId = 'fat-loss' | 'muscle-build' | 'elite-mass';

const NAV_LINKS = [
  { href: '#cach-lam', label: 'Cách làm' },
  { href: '#nguyen-lieu', label: 'Nguyên liệu' },
  { href: '#combo', label: 'Combo' },
  { href: '#khach', label: 'Khách nói gì' },
  { href: '#si', label: 'Mua sỉ' },
];

const INGREDIENTS = [
  { n: '01', name: 'Trái cây tươi', note: '100% trái cây thật, chọn lọc mỗi ngày — vị ngọt tự nhiên, giàu vitamin & chất xơ.', emoji: '🍓' },
  { n: '02', name: 'Bột ức gà', note: 'Đạm từ ức gà thật, dễ hấp thu, giúp no lâu và phục hồi cơ sau vận động.', emoji: '🍗' },
  { n: '03', name: 'Bột đậu Hà Lan', note: 'Bổ sung đạm thực vật, cân bằng dinh dưỡng trong mỗi ly.', emoji: '🫛' },
  { n: '04', name: 'Sữa tươi', note: 'Tăng độ béo mịn và hương vị, thêm canxi.', emoji: '🥛' },
  { n: '05', name: 'Sữa hạt', note: 'Nguồn béo tự nhiên, cho vị uống mềm, dễ uống hơn.', emoji: '🌰' },
];

const STATS = [
  { value: '20g+', label: 'đạm mỗi ly' },
  { value: '24+', label: 'hương vị' },
  { value: '1.560+', label: 'ly đã giao' },
  { value: '366+', label: 'khách mỗi tháng' },
];

const STEPS = [
  { n: '01', title: 'Chọn vị bạn thích', body: 'Hơn 24 hương vị trong menu — dâu, xoài cam, cacao yến mạch, matcha… Đổi vị mỗi ngày không lo ngán.' },
  { n: '02', title: 'Tụi mình pha tươi mỗi sáng', body: 'Không pha sẵn, không để qua đêm. Trái cây xay ngay trước giờ giao để giữ trọn vị và dinh dưỡng.' },
  { n: '03', title: 'Giao tận cửa trước giờ bạn cần', body: 'Combo tuần / tháng freeship mỗi sáng. Bạn chỉ việc lấy ly ra và uống.' },
];

const TESTIMONIALS = [
  { name: 'Chị Lan', tag: 'Dân văn phòng', text: 'Sáng nào cũng có ly protein giao tận nhà, không còn lo thiếu bữa khi bận họp.' },
  { name: 'Anh Minh', tag: 'Gymer', text: 'Uống được, không tanh như whey. Combo tháng tiết kiệm hơn mua lẻ rõ rệt.' },
  { name: 'Chị Hương', tag: 'Mẹ bỉm', text: '24+ vị nên không bị ngán. Cả nhà ai cũng thích ly xoài cam.' },
];

const FAQS = [
  {
    q: 'FitBlend khác gì whey thông thường?',
    a: 'FitBlend dùng đạm từ bột ức gà thật, kết hợp trái cây tươi — không tanh, không nóng trong như nhiều loại whey. Mỗi ly có 20g+ protein, vị ngon dễ uống mỗi ngày mà không cần pha bột phức tạp.',
  },
  {
    q: 'Giao hàng mỗi ngày như thế nào?',
    a: 'Tụi mình pha tươi mỗi sáng theo combo tuần/tháng bạn đăng ký. Bạn chọn hương vị trước, đội ngũ chuẩn bị và giao tận nơi trước giờ bạn cần.',
  },
  {
    q: 'Combo tháng tiết kiệm bao nhiêu?',
    a: 'Đăng ký Combo Tháng giúp tiết kiệm đáng kể so với mua lẻ từng ly, đồng thời freeship mỗi sáng. Phần lớn khách chọn Combo Tháng để giữ thói quen ăn đủ đạm ổn định.',
  },
  {
    q: 'Ai nên uống protein smoothie?',
    a: 'Phù hợp dân văn phòng thiếu thời gian, người tập gym cần bổ sung đạm, mẹ bỉm muốn bữa ăn nhanh lành mạnh, hoặc bất kỳ ai muốn ăn đủ dinh dưỡng mà không tốn công chuẩn bị.',
  },
];

type PlanCombo = {
  id: PlanComboId;
  name: string;
  subtitle: string;
  specs: string;
  price: string;
  originalPrice: string;
  perCup: string;
  featured?: boolean;
};

const PLAN_COMBOS: Record<ComboDuration, PlanCombo[]> = {
  weekly: [
    { id: 'fat-loss', name: 'Fat Loss', subtitle: 'Giảm mỡ · tone dáng', specs: '360ml × 40g đạm · 7 ly/tuần', price: '498k', originalPrice: '553k', perCup: '71k' },
    { id: 'muscle-build', name: 'Muscle Build', subtitle: 'Tăng cơ · best value', specs: '500ml × 60g đạm · 7 ly/tuần', price: '725k', originalPrice: '805k', perCup: '103,5k', featured: true },
    { id: 'elite-mass', name: 'Elite Mass', subtitle: 'Tăng cân · gym pro', specs: '700ml × 90g đạm · 7 ly/tuần', price: '977k', originalPrice: '1.085k', perCup: '139,5k' },
  ],
  monthly: [
    { id: 'fat-loss', name: 'Fat Loss', subtitle: 'Giảm mỡ · tone dáng', specs: '360ml × 40g đạm · 7 ly/tuần', price: '2.015k', originalPrice: '2.370k', perCup: '67k' },
    { id: 'muscle-build', name: 'Muscle Build', subtitle: 'Tăng cơ · best value', specs: '500ml × 60g đạm · 7 ly/tuần', price: '2.933k', originalPrice: '3.450k', perCup: '98k', featured: true },
    { id: 'elite-mass', name: 'Elite Mass', subtitle: 'Tăng cân · gym pro', specs: '700ml × 90g đạm · 7 ly/tuần', price: '3.953k', originalPrice: '4.650k', perCup: '132k' },
  ],
  quarterly: [
    { id: 'fat-loss', name: 'Fat Loss', subtitle: 'Giảm mỡ · tone dáng', specs: '360ml × 40g đạm · 7 ly/tuần', price: '5.720k', originalPrice: '7.150k', perCup: '63k' },
    { id: 'muscle-build', name: 'Muscle Build', subtitle: 'Tăng cơ · best value', specs: '500ml × 60g đạm · 7 ly/tuần', price: '8.330k', originalPrice: '10.400k', perCup: '93k', featured: true },
    { id: 'elite-mass', name: 'Elite Mass', subtitle: 'Tăng cân · gym pro', specs: '700ml × 90g đạm · 7 ly/tuần', price: '11.230k', originalPrice: '14.000k', perCup: '125k' },
  ],
};

const DURATION_TABS: { id: ComboDuration; label: string; save: string }[] = [
  { id: 'weekly', label: 'Tuần', save: '−10%' },
  { id: 'monthly', label: 'Tháng', save: '−15%' },
  { id: 'quarterly', label: 'Quý', save: '−20%' },
];

/* ─────────────────────────  Hạ tầng hiệu ứng cuộn  ───────────────────── */

type ScrollFn = (y: number, vh: number) => void;
type Subscribe = (fn: ScrollFn) => () => void;

export const ScrollCtx = createContext<Subscribe | null>(null);
export const useScrollSub = () => useContext(ScrollCtx);

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Một vòng rAF duy nhất cho cả trang: mỗi frame gọi lần lượt các callback đã đăng ký với
 * (scrollY, viewportH). Tự dừng khi tab ẩn. Không dùng IntersectionObserver.
 */
export function useScrollEngine(enabled: boolean): Subscribe {
  const subs = useRef<Set<ScrollFn>>(new Set());
  const raf = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const runOnce = useCallback((fn: ScrollFn) => {
    try {
      fn(window.scrollY || 0, window.innerHeight || 0);
    } catch {
      /* noop */
    }
  }, []);

  const subscribe = useCallback<Subscribe>(
    (fn) => {
      subs.current.add(fn);
      runOnce(fn); // trạng thái ban đầu đúng ngay cả khi vòng rAF chưa chạy
      return () => {
        subs.current.delete(fn);
      };
    },
    [runOnce],
  );

  useEffect(() => {
    if (!enabled) {
      // reduced-motion: kích hoạt hết reveal 1 lần
      subs.current.forEach(runOnce);
      return;
    }
    let running = true;
    const tick = () => {
      if (!running) return;
      const y = window.scrollY || 0;
      const vh = window.innerHeight || 0;
      subs.current.forEach((fn) => {
        try {
          fn(y, vh);
        } catch {
          /* noop */
        }
      });
      raf.current = requestAnimationFrame(tick);
    };
    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf.current);
      } else if (!running) {
        running = true;
        raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, runOnce]);

  return subscribe;
}

/** Hiện dần khi cuộn tới (~88% khung nhìn). */
export function Reveal({
  children,
  className = '',
  as: Tag = 'div',
  stagger = false,
  resetKey,
}: {
  children: ReactNode;
  className?: string;
  as?: any;
  stagger?: boolean;
  resetKey?: unknown;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const sub = useScrollSub();
  useEffect(() => {
    const el = ref.current;
    if (!el || !sub) return;
    el.classList.remove('is-in');
    let done = false;
    return sub((_, vh) => {
      if (done) return;
      if (el.getBoundingClientRect().top < vh * 0.97) {
        el.classList.add('is-in');
        done = true;
      }
    });
  }, [sub, resetKey]);
  return (
    <Tag ref={ref as any} className={`fb-reveal ${stagger ? 'fb-stagger' : ''} ${className}`}>
      {children}
    </Tag>
  );
}

/** Tiêu đề serif hiện lên từng chữ (mask + trượt lên). */
export function Headline({
  text,
  className = '',
  as: Tag = 'h2',
  plain = false,
}: {
  text: string;
  className?: string;
  as?: any;
  plain?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const sub = useScrollSub();
  useEffect(() => {
    const el = ref.current;
    if (!el || !sub) return;
    let done = false;
    return sub((_, vh) => {
      if (done) return;
      if (el.getBoundingClientRect().top < vh * 0.95) {
        el.classList.add('is-in');
        done = true;
      }
    });
  }, [sub]);
  const words = text.split(' ');
  return (
    <Tag ref={ref as any} className={`${plain ? '' : 'fb-display'} fb-headline ${className}`}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="fb-word">
            <span className="fb-word-in" style={{ transitionDelay: `${Math.min(i * 40, 600)}ms` }}>
              {w}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </Tag>
  );
}

/** Lớp dịch chuyển chậm hơn cuộn (parallax). */
export function Parallax({
  children,
  className = '',
  speed = 0.15,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const sub = useScrollSub();
  useEffect(() => {
    const el = ref.current;
    if (!el || !sub) return;
    return sub((_, vh) => {
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${(-mid * speed).toFixed(1)}px, 0)`;
    });
  }, [sub, speed]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * Khối "nở ra khi cuộn" (giống apeel.com): lúc trồi lên là thẻ bo góc có lề 2 bên,
 * cuộn tiếp thì lề co về 0 và góc bo phẳng dần → tràn viền.
 * Đặt CSS var `--expand` (0→1) lên phần tử; CSS nội suy margin + border-radius.
 */
export function ScrollExpand({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const sub = useScrollSub();
  useEffect(() => {
    const el = ref.current;
    if (!el || !sub) return;
    return sub((_, vh) => {
      const top = el.getBoundingClientRect().top;
      const start = vh; // vừa ló lên đáy màn hình
      const end = vh * 0.06; // gần chạm mép trên → nở hết
      let p = (start - top) / (start - end);
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      el.style.setProperty('--expand', p.toFixed(3));
    });
  }, [sub]);
  return (
    <div ref={ref} className={`fb-expand ${className}`}>
      {children}
    </div>
  );
}

/** Section "ghim": ảnh nguyên liệu phóng to dần, các callout hiện lần lượt theo tiến độ cuộn. */
function PinnedIngredients({ id }: { id?: string }) {
  const outer = useRef<HTMLDivElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const sub = useScrollSub();

  useEffect(() => {
    const o = outer.current;
    const s = stage.current;
    const list = listRef.current;
    if (!o || !s || !sub) return;
    const img = s.querySelector<HTMLElement>('.fb-pin-img');
    return sub((y, vh) => {
      const top = o.offsetTop;
      const span = o.offsetHeight - vh;
      const p = span > 0 ? Math.min(1, Math.max(0, (y - top) / span)) : 0;
      if (img) img.style.transform = `scale(${(0.62 + p * 0.5).toFixed(3)})`;
      if (list) {
        const items = list.children;
        for (let i = 0; i < items.length; i++) {
          const threshold = 0.1 + (i / items.length) * 0.72;
          (items[i] as HTMLElement).classList.toggle('is-in', p >= threshold);
        }
      }
    });
  }, [sub]);

  return (
    <section className="fb-pin-outer" id={id} ref={outer}>
      <div className="fb-pin-stage" ref={stage}>
        <div className="fb-pin-visual" aria-hidden>
          <img
            className="fb-pin-img"
            src={PRODUCT_IMAGES.strawberry}
            alt=""
            onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0')}
          />
        </div>

        <div className="fb-wrap fb-pin-inner">
          <div className="fb-pin-head">
            <p className="fb-tag">Nguyên liệu</p>
            <Headline className="fb-pin-h" text={'Nguyên liệu bạn đọc được tên.'} />
          </div>

          <ul className="fb-pin-list" ref={listRef}>
            {INGREDIENTS.map((ing) => (
              <li key={ing.n}>
                <span className="fb-pin-n fb-display">{ing.n}</span>
                <span className="fb-pin-emoji">{ing.emoji}</span>
                <span className="fb-pin-name fb-display">{ing.name}</span>
                <span className="fb-pin-note">{ing.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────  Trang chính  ───────────────────────────── */

interface LandingProps {
  onGetStarted: () => void;
  onSelectCombo: (planId: string) => void;
  onSelectDuration?: (duration: ComboDuration) => void;
  onOpenWholesale: () => void;
  onGoToRetail?: () => void;
}

export function CustomerLanding({
  onGetStarted,
  onSelectCombo,
  onSelectDuration,
  onOpenWholesale,
  onGoToRetail,
}: LandingProps) {
  const reduced = typeof window !== 'undefined' ? prefersReducedMotion() : false;
  const motionOn = !reduced;
  const subscribe = useScrollEngine(motionOn);

  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [duration, setDuration] = useState<ComboDuration>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const lenisRef = useRef<any>(null);

  /* Lenis smooth-scroll — nạp động, chỉ khi không giảm chuyển động */
  useEffect(() => {
    if (!motionOn || typeof window === 'undefined' || !('requestAnimationFrame' in window)) return;
    let lenis: any;
    let raf = 0;
    let cancelled = false;
    import('lenis')
      .then(({ default: Lenis }) => {
        if (cancelled) return;
        lenis = new Lenis({
          duration: 1.1,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          smoothWheel: true,
          touchMultiplier: 1.6,
        });
        lenisRef.current = lenis;
        const loop = (time: number) => {
          lenis.raf(time);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        /* trình duyệt cũ: bỏ qua, dùng cuộn thường */
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      try {
        lenis?.destroy();
      } catch {
        /* noop */
      }
      lenisRef.current = null;
    };
  }, [motionOn]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 32);
      setPastHero(y > (window.innerHeight || 800) * 0.62);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    const lock = showMenu || menuOpen;
    document.body.style.overflow = lock ? 'hidden' : '';
    try {
      if (lock) lenisRef.current?.stop();
      else lenisRef.current?.start();
    } catch {
      /* noop */
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMenu, menuOpen]);

  const scrollTo = useCallback(
    (href: string) => {
      setMenuOpen(false);
      const el = document.querySelector(href);
      if (!el) return;
      if (lenisRef.current) lenisRef.current.scrollTo(el as HTMLElement, { offset: -72 });
      else (el as HTMLElement).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    },
    [reduced],
  );

  const goCombos = () => {
    onSelectDuration?.(duration);
    onGetStarted();
  };
  const goPlan = (id: PlanComboId) => {
    onSelectDuration?.(duration);
    onSelectCombo(id);
  };
  const goRetail = () => (onGoToRetail ? onGoToRetail() : onGetStarted());

  const combos = PLAN_COMBOS[duration];

  return (
    <ScrollCtx.Provider value={subscribe}>
      <div className="fb-root" style={{ background: C.cream, color: C.brown }}>
        <Styles />

        {/* ───────────────  NAV  ─────────────── */}
        <nav className={`fb-nav ${scrolled ? 'is-scrolled' : ''} ${pastHero ? 'is-past' : ''}`}>
          <div className="fb-nav-inner">
            <button
              type="button"
              className="fb-nav-menu"
              aria-label="Mở menu"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
              <span>Menu</span>
            </button>

            <button type="button" className="fb-logo" onClick={() => scrollTo('#top')} aria-label="FitBlend">
              <img
                src={LANDING_IMAGES.logo}
                alt="FitBlend"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                }}
              />
              <span className="fb-display" style={{ display: 'none' }}>FitBlend</span>
            </button>

            <button type="button" className="fb-btn fb-btn-solid fb-nav-combo" onClick={goCombos}>
              Combo
            </button>
          </div>

        </nav>

        {/* Nút menu nổi — hiện sau khi cuộn qua hero (giống apeel.com) */}
        <button
          type="button"
          className={`fb-menufab ${pastHero ? 'is-show' : ''}`}
          onClick={() => setMenuOpen(true)}
          aria-label="Mở menu"
        >
          Menu <MenuIcon />
        </button>

        {/* ───────────────  HERO (ghim)  ─────────────── */}
        <header className="fb-hero" id="top">
          <Parallax className="fb-hero-bg" speed={0.14}>
            {HERO_VIDEO ? (
              <video
                src={HERO_VIDEO}
                poster={HERO_IMAGE}
                autoPlay
                muted
                loop
                playsInline
                aria-hidden
              />
            ) : (
              <img
                src={HERO_IMAGE}
                alt=""
                aria-hidden
                onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0')}
              />
            )}
          </Parallax>
          <div className="fb-hero-scrim" aria-hidden />

          <div className="fb-hero-inner">
            <Headline
              as="h1"
              plain
              className="fb-hero-title"
              text={'Bữa sáng đủ đạm, giao tận cửa nhà bạn.'}
            />
          </div>

          <div className="fb-scrollcue" aria-hidden>
            <ChevronDown size={18} />
          </div>
        </header>

        {/* Mọi nội dung sau hero cuộn ĐÈ LÊN hero đang ghim */}
        <div className="fb-after">

        {/* ───────────────  MANIFESTO (nở ra khi cuộn)  ─────────────── */}
        <ScrollExpand>
          <section className="fb-manifesto">
            <div className="fb-wrap">
              <Headline
                className="fb-manifesto-text"
                text={
                  'Cơ thể cần đạm mỗi ngày. Nhưng nấu thì mất thời gian, còn whey thì tanh và khó uống. Nên tụi mình làm một ly sinh tố ngon tới mức bạn quên mất là mình đang ăn healthy.'
                }
              />
            </div>
          </section>
        </ScrollExpand>

        {/* ───────────────  CÁCH LÀM  ─────────────── */}
        <section className="fb-section" id="cach-lam">
          <div className="fb-wrap">
            <Reveal as="p" className="fb-tag">
              Cách hoạt động
            </Reveal>
            <Headline className="fb-h2" text={'Ba bước, không phải nghĩ.'} />
            <Reveal className="fb-steps" stagger>
              {STEPS.map((s) => (
                <div className="fb-step" key={s.n}>
                  <span className="fb-step-n fb-display">{s.n}</span>
                  <h3 className="fb-display">{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ───────────────  NGUYÊN LIỆU — section ghim  ─────────────── */}
        <PinnedIngredients id="nguyen-lieu" />

        {/* ───────────────  SỐ LIỆU  ─────────────── */}
        <section className="fb-stats">
          <Reveal className="fb-wrap fb-stats-grid" stagger>
            {STATS.map((s) => (
              <div className="fb-stat" key={s.label}>
                <div className="fb-stat-v fb-display">{s.value}</div>
                <div className="fb-stat-l">{s.label}</div>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ───────────────  COMBO  ─────────────── */}
        <section className="fb-section fb-combos" id="combo">
          <div className="fb-wrap">
            <Reveal as="p" className="fb-tag">
              Combo giao mỗi sáng
            </Reveal>
            <Headline className="fb-h2" text={'Chọn lộ trình, tụi mình lo phần còn lại.'} />

            <Reveal className="fb-dur">
              {DURATION_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={duration === t.id ? 'is-active' : ''}
                  onClick={() => {
                    setDuration(t.id);
                    onSelectDuration?.(t.id);
                  }}
                >
                  {t.label} <em>{t.save}</em>
                </button>
              ))}
            </Reveal>

            <Reveal className="fb-combo-grid" stagger resetKey={duration}>
              {combos.map((c) => (
                <div className={`fb-combo ${c.featured ? 'is-featured' : ''}`} key={c.id}>
                  {c.featured && <span className="fb-combo-badge">Phổ biến</span>}
                  <h3 className="fb-display">{c.name}</h3>
                  <p className="fb-combo-sub">{c.subtitle}</p>
                  <p className="fb-combo-specs">{c.specs}</p>
                  <div className="fb-combo-price">
                    <span className="fb-display">{c.price}</span>
                    <s>{c.originalPrice}</s>
                  </div>
                  <p className="fb-combo-per">≈ {c.perCup}/ly</p>
                  <button
                    type="button"
                    className="fb-btn fb-btn-solid fb-btn-block"
                    onClick={() => goPlan(c.id)}
                  >
                    Chọn {c.name}
                  </button>
                </div>
              ))}
            </Reveal>

            <Reveal className="fb-combo-foot">
              <button type="button" className="fb-link" onClick={goRetail}>
                Chưa chắc? Mua lẻ vài ly uống thử trước <ArrowUpRight size={16} />
              </button>
            </Reveal>
          </div>
        </section>

        {/* ───────────────  KHÁCH NÓI GÌ  ─────────────── */}
        <section className="fb-section fb-quotes" id="khach">
          <div className="fb-wrap">
            <Reveal as="p" className="fb-tag fb-tag-light">
              Khách nói gì
            </Reveal>
            <Reveal className="fb-quote-grid" stagger>
              {TESTIMONIALS.map((t) => (
                <figure className="fb-quote" key={t.name}>
                  <blockquote className="fb-display">“{t.text}”</blockquote>
                  <figcaption>
                    <strong>{t.name}</strong> · {t.tag}
                  </figcaption>
                </figure>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ───────────────  FAQ  ─────────────── */}
        <section className="fb-section" id="faq">
          <div className="fb-wrap fb-faq-wrap">
            <div>
              <Reveal as="p" className="fb-tag">
                Câu hỏi thường gặp
              </Reveal>
              <Headline className="fb-h2" text={'Vài điều khách hay hỏi.'} />
            </div>
            <Reveal className="fb-faq">
              {FAQS.map((f, i) => (
                <div className={`fb-faq-item ${openFaq === i ? 'is-open' : ''}`} key={i}>
                  <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span className="fb-display">{f.q}</span>
                    <Plus size={18} />
                  </button>
                  <div className="fb-faq-a">
                    <p>{f.a}</p>
                  </div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ───────────────  MUA SỈ  ─────────────── */}
        <section className="fb-section" id="si">
          <Reveal className="fb-wrap">
            <div className="fb-wholesale">
              <div>
                <p className="fb-tag">Dành cho đối tác</p>
                <h2 className="fb-display fb-h2">Phòng gym, văn phòng, đại lý.</h2>
                <p className="fb-wholesale-body">
                  Đặt số lượng lớn, giá sỉ, giao định kỳ. Bổ sung dinh dưỡng tiện lợi cho cả tập
                  thể mà không cần bận tâm khâu chuẩn bị.
                </p>
                <button
                  type="button"
                  className="fb-btn fb-btn-solid fb-btn-lg"
                  onClick={onOpenWholesale}
                >
                  Nhận báo giá sỉ <ArrowRight size={18} />
                </button>
              </div>
              <img
                src={PRODUCT_IMAGES.combo}
                alt="Combo FitBlend"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            </div>
          </Reveal>
        </section>

        {/* ───────────────  FOOTER  ─────────────── */}
        <footer className="fb-footer">
          <div className="fb-wrap">
            <div className="fb-footer-top">
              <div className="fb-footer-brand">
                <span className="fb-display">FitBlend</span>
                <p>Ăn đủ protein. Không tốn thời gian.</p>
                <p className="fb-muted">Protein Smoothie từ bột ức gà đầu tiên tại Việt Nam.</p>
              </div>

              <div>
                <h4>Liên hệ</h4>
                <ul>
                  <li>
                    <Phone size={15} /> <a href={`tel:${BRAND.phone}`}>{BRAND.phoneDisplay}</a>
                  </li>
                  <li>
                    <Mail size={15} /> <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
                  </li>
                  <li>
                    <MapPin size={15} /> TP. Hồ Chí Minh
                  </li>
                </ul>
              </div>

              <div>
                <h4>Khám phá</h4>
                <ul>
                  {NAV_LINKS.map((l) => (
                    <li key={l.href}>
                      <button type="button" onClick={() => scrollTo(l.href)}>
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4>Theo dõi</h4>
                <ul>
                  <li>
                    <a href={BRAND.facebook} target="_blank" rel="noreferrer">
                      Facebook
                    </a>
                  </li>
                  <li>
                    <a href={BRAND.tiktok} target="_blank" rel="noreferrer">
                      TikTok
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="fb-footer-bot">
              <span>© {new Date().getFullYear()} FitBlend. All rights reserved.</span>
              <Leaf size={14} />
            </div>
          </div>
        </footer>
        </div>{/* /fb-after */}

        {/* ───────────────  LIÊN HỆ NỔI  ─────────────── */}
        <div className="fb-float">
          <a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" style={{ background: '#1877F2' }}>
            <Facebook size={20} />
          </a>
          <a href={BRAND.zalo} target="_blank" rel="noreferrer" aria-label="Zalo" style={{ background: '#0068FF' }}>
            <MessageCircle size={20} />
          </a>
        </div>

        {/* ───────────────  MENU TOÀN MÀN HÌNH  ─────────────── */}
        {menuOpen && (
          <div className="fb-menu-overlay">
            <div className="fb-menu-overlay-top">
              <span className="fb-display">FitBlend</span>
              <button
                type="button"
                className="fb-menu-close"
                aria-label="Đóng"
                onClick={() => setMenuOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            <nav className="fb-menu-overlay-links">
              {NAV_LINKS.map((l, i) => (
                <button
                  key={l.href}
                  type="button"
                  style={{ animationDelay: `${60 + i * 45}ms` }}
                  onClick={() => scrollTo(l.href)}
                >
                  {l.label}
                </button>
              ))}
              <button
                type="button"
                style={{ animationDelay: `${60 + NAV_LINKS.length * 45}ms` }}
                onClick={() => {
                  setMenuOpen(false);
                  setShowMenu(true);
                }}
              >
                Thực đơn
              </button>
            </nav>
            <div className="fb-menu-overlay-cta">
              <a className="fb-btn fb-btn-solid fb-btn-lg fb-btn-block" href="/dat-mon">
                Đặt món ngay
              </a>
              <button
                type="button"
                className="fb-btn fb-btn-line fb-btn-lg fb-btn-block"
                onClick={() => {
                  setMenuOpen(false);
                  goCombos();
                }}
              >
                Xem combo
              </button>
            </div>
          </div>
        )}

        {/* ───────────────  MODAL THỰC ĐƠN  ─────────────── */}
        {showMenu && (
          <div className="fb-menu-modal" onClick={() => setShowMenu(false)}>
            <button
              type="button"
              className="fb-menu-close"
              aria-label="Đóng"
              onClick={() => setShowMenu(false)}
            >
              <X size={24} />
            </button>
            <div className="fb-menu-scroll" onClick={(e) => e.stopPropagation()}>
              {[1, 2].map((p) => (
                <img
                  key={p}
                  src={LANDING_IMAGES.menuPage(p)}
                  alt={`Thực đơn trang ${p}`}
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollCtx.Provider>
  );
}

/* ─────────────────────────  Thành phần phụ  ───────────────────────── */

export function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

/* ─────────────────────────────  CSS  ───────────────────────────── */

export function Styles() {
  return (
    <style>{`
.fb-root {
  --cream:${C.cream}; --cream-deep:${C.creamDeep}; --green:${C.green};
  --green-soft:${C.greenSoft}; --brown:${C.brown}; --orange:${C.orange}; --ink:${C.ink};
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: clip;
}
.fb-root *, .fb-root *::before, .fb-root *::after { box-sizing: border-box; }
.fb-display {
  font-family: "Fraunces", "Playfair Display", Georgia, "Times New Roman", serif;
  font-optical-sizing: auto;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.fb-wrap { width: 100%; max-width: 1120px; margin: 0 auto; padding: 0 24px; }
@media (max-width: 640px){ .fb-wrap { padding: 0 18px; } }

.fb-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-weight: 700; font-size: 14px; line-height: 1; cursor: pointer;
  border-radius: 999px; padding: 12px 20px; border: 1.5px solid transparent;
  transition: transform .18s ease, background .18s ease, color .18s ease, border-color .18s ease;
  white-space: nowrap; text-decoration: none;
}
.fb-btn:active { transform: scale(.97); }
.fb-btn-lg { padding: 15px 26px; font-size: 15px; }
.fb-btn-block { width: 100%; }
.fb-btn-solid { background: var(--green); color: #fff; }
.fb-btn-solid:hover { background: #0a3f0b; }
.fb-btn-line { border-color: var(--green); color: var(--green); background: transparent; }
.fb-btn-line:hover { background: var(--green); color: #fff; }
.fb-btn-ghost { background: transparent; color: var(--green); padding: 10px 14px; }
.fb-btn-ghost:hover { background: rgba(13,83,14,.08); }
.fb-btn-cream { border-color: rgba(251,246,236,.55); color: var(--cream); background: rgba(251,246,236,.06); }
.fb-btn-cream:hover { background: var(--cream); color: var(--green); border-color: var(--cream); }
.fb-link {
  display: inline-flex; align-items: center; gap: 6px; background: none; border: 0;
  color: var(--green); font-weight: 700; font-size: 14px; cursor: pointer; padding: 6px 0;
  border-bottom: 1.5px solid currentColor;
}

.fb-nav {
  position: fixed; inset: 0 0 auto 0; z-index: 120;
  padding: calc(env(safe-area-inset-top) + 12px) clamp(12px, 3vw, 40px) 0;
  background: transparent;
  transition: transform .4s cubic-bezier(.4,0,.2,1);
}
/* Sau khi cuộn qua hero: ẩn thanh nav, hiện nút "Menu" nổi (giống apeel.com) */
.fb-nav.is-past { transform: translateY(calc(-100% - 24px)); }
.fb-menufab {
  position: fixed; top: calc(env(safe-area-inset-top) + 14px); right: 16px; z-index: 125;
  display: inline-flex; align-items: center; gap: 9px;
  padding: 11px 18px; border: 0; border-radius: 999px; cursor: pointer;
  background: var(--green); color: var(--cream);
  font-size: 14px; font-weight: 700; letter-spacing: .01em;
  box-shadow: 0 10px 30px rgba(13,83,14,.28);
  opacity: 0; transform: translateY(-8px) scale(.96); pointer-events: none;
  transition: opacity .3s ease, transform .3s ease;
}
.fb-menufab.is-show { opacity: 1; transform: none; pointer-events: auto; }
.fb-menufab:hover { background: #0a3f0b; }
/* Thanh nav = 1 "khay" nền kem bo tròn 2 góc dưới, nổi trên hero (giống apeel.com) */
.fb-nav-inner {
  max-width: 1180px; margin: 0 auto; padding: 11px 16px 11px 12px;
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 14px;
  background: var(--cream);
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(20,14,8,.10);
  transition: box-shadow .3s ease, padding .3s ease;
}
.fb-nav.is-scrolled .fb-nav-inner {
  padding-top: 9px; padding-bottom: 9px;
  box-shadow: 0 12px 36px rgba(20,14,8,.16);
}
.fb-nav-menu {
  justify-self: start; display: inline-flex; align-items: center; gap: 8px;
  background: none; border: 0; cursor: pointer; color: var(--green);
  font-size: 14px; font-weight: 700; padding: 8px 10px; border-radius: 999px;
}
.fb-nav-menu:hover { background: rgba(13,83,14,.08); }
.fb-logo { display: flex; align-items: center; gap: 9px; background: none; border: 0; cursor: pointer; color: var(--green); padding: 0; justify-self: center; }
.fb-logo img { height: 38px; width: auto; display: block; }
.fb-logo span { font-size: 20px; font-weight: 600; }
.fb-nav-combo { justify-self: end; }
@media (max-width: 420px){
  .fb-nav-menu span { display: none; }
  .fb-nav-inner { padding-left: 12px; }
}

.fb-hero {
  position: sticky; top: 0; z-index: 0;
  height: 100vh; height: 100svh;
  display: flex; align-items: center;
  padding: 110px 0 84px; overflow: hidden;
  background: var(--ink);
}
/* Nội dung sau hero: cuộn đè lên hero đang ghim; kéo lên 1 chút để lộ mép section (giống apeel) */
.fb-after { position: relative; z-index: 1; margin-top: calc(-1 * clamp(52px, 9vh, 96px)); }
@media (prefers-reduced-motion: reduce){ .fb-after { margin-top: 0; } }
.fb-hero-bg { position: absolute; inset: -12% 0; z-index: 0; will-change: transform; }
.fb-hero-bg img, .fb-hero-bg video {
  width: 100%; height: 100%; object-fit: cover; display: block;
  animation: fb-hero-zoom 18s ease-out both;
}
@keyframes fb-hero-zoom { from { transform: scale(1.14); } to { transform: scale(1); } }
.fb-hero-scrim {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(15,10,6,.74) 0%, rgba(15,10,6,.46) 40%, rgba(15,10,6,.16) 74%, rgba(15,10,6,.04) 100%),
    linear-gradient(180deg, rgba(15,10,6,.34) 0%, rgba(15,10,6,.12) 24%, rgba(15,10,6,.38) 68%, rgba(15,10,6,.72) 100%),
    rgba(15,10,6,.20);
}
.fb-hero-inner { position: relative; z-index: 2; max-width: 1120px; margin: 0 auto; padding: 0 24px; width: 100%; }
.fb-hero-title {
  font-family: "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(40px, 8.6vw, 116px); line-height: .95; letter-spacing: -.022em;
  color: var(--cream); margin: 0; max-width: 15ch; font-weight: 800; text-wrap: balance;
  text-shadow: 0 2px 40px rgba(0,0,0,.25);
}
.fb-scrollcue {
  position: absolute; left: 50%; bottom: calc(clamp(52px, 9vh, 96px) + 12px); margin-left: -14px; z-index: 2;
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  color: rgba(251,246,236,.7); animation: fb-bob 1.8s ease-in-out infinite;
}
@keyframes fb-bob { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(7px);} }
@media (prefers-reduced-motion: reduce){ .fb-hero-bg img, .fb-hero-bg video { animation: none; } }
@media (max-width: 780px){
  .fb-hero { padding: 92px 0 40px; }
  .fb-hero-title { max-width: none; }
  .fb-scrollcue { display: none; }
}

.fb-headline .fb-word { display: inline-block; overflow: hidden; vertical-align: top; padding: .2em .04em .16em; margin: -.2em -.04em -.16em; }
.fb-headline .fb-word-in { display: inline-block; }
@media (prefers-reduced-motion: no-preference) {
  .fb-headline .fb-word-in { transform: translateY(130%); transition: transform .8s cubic-bezier(.19,1,.22,1); }
  .fb-headline.is-in .fb-word-in { transform: translateY(0); }
}

@media (prefers-reduced-motion: no-preference) {
  .fb-reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
  .fb-reveal.is-in { opacity: 1; transform: none; }
  .fb-stagger > * { opacity: 0; transform: translateY(28px); transition: opacity .6s cubic-bezier(.2,.7,.2,1), transform .6s cubic-bezier(.2,.7,.2,1); }
  .fb-stagger.is-in > * { opacity: 1; transform: none; }
  .fb-stagger.is-in > *:nth-child(2){ transition-delay: .08s; }
  .fb-stagger.is-in > *:nth-child(3){ transition-delay: .16s; }
  .fb-stagger.is-in > *:nth-child(4){ transition-delay: .24s; }
  .fb-stagger.is-in > *:nth-child(5){ transition-delay: .32s; }
}

.fb-section { padding: clamp(72px, 12vw, 160px) 0; background: var(--cream); }
.fb-tag { text-transform: uppercase; letter-spacing: .2em; font-size: 12px; font-weight: 700; color: var(--orange); margin: 0 0 18px; }
.fb-tag-light { color: #F6C99A; }
.fb-h2 { font-size: clamp(30px, 5vw, 60px); line-height: 1.06; color: var(--green); margin: 0 0 12px; max-width: 20ch; font-weight: 500; }

/* Khối nở ra khi cuộn */
.fb-expand { --expand: 0; position: relative; z-index: 1; }
.fb-expand > * {
  margin-left: calc((1 - var(--expand)) * clamp(18px, 5.5vw, 64px));
  margin-right: calc((1 - var(--expand)) * clamp(18px, 5.5vw, 64px));
  border-top-left-radius: calc((1 - var(--expand)) * 44px);
  border-top-right-radius: calc((1 - var(--expand)) * 44px);
}
@media (prefers-reduced-motion: reduce){
  .fb-expand > * { margin-left: 0; margin-right: 0; border-radius: 0; }
}

.fb-manifesto {
  background: var(--cream); color: var(--green);
  padding: clamp(90px, 16vw, 200px) 0;
  box-shadow: 0 -24px 70px rgba(20,14,8,.22);
}
.fb-manifesto-text { font-size: clamp(24px, 4.2vw, 50px); line-height: 1.28; color: var(--green); margin: 0; max-width: 24ch; font-weight: 400; }
.fb-manifesto .fb-headline .fb-word-in { color: var(--green); }

.fb-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 48px; }
.fb-step { border-top: 2px solid rgba(13,83,14,.2); padding-top: 22px; }
.fb-step-n { display: block; font-size: 15px; color: var(--orange); font-weight: 600; margin-bottom: 14px; }
.fb-step h3 { font-size: 22px; color: var(--green); margin: 0 0 10px; font-weight: 600; }
.fb-step p { margin: 0; font-size: 15px; line-height: 1.6; color: var(--brown); }
@media (max-width: 780px){ .fb-steps { grid-template-columns: 1fr; gap: 8px; } }

.fb-pin-outer { position: relative; height: 220vh; background: var(--cream-deep); }
.fb-pin-stage { position: sticky; top: 0; height: 100vh; height: 100svh; display: flex; align-items: center; overflow: hidden; }
.fb-pin-visual {
  position: absolute; inset: 0; z-index: 1; display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.fb-pin-img {
  width: min(42vmin, 380px); height: min(42vmin, 380px); object-fit: contain;
  transform: scale(.62); will-change: transform; filter: drop-shadow(0 40px 90px rgba(13,83,14,.24));
}
.fb-pin-inner {
  position: relative; z-index: 3; width: 100%;
  display: grid; grid-template-columns: minmax(0,1fr) minmax(0, 400px);
  gap: clamp(28px, 7vw, 96px); align-items: center;
}
.fb-pin-head { min-width: 0; }
.fb-pin-h { font-size: clamp(28px, 3.6vw, 46px); line-height: 1.08; color: var(--green); margin: 0; max-width: 12ch; font-weight: 500; }
.fb-pin-list { list-style: none; margin: 0; padding: 0; }
.fb-pin-list li {
  display: grid; grid-template-columns: auto auto 1fr; gap: 2px 12px; align-items: baseline;
  padding: 13px 0; border-top: 1px solid rgba(13,83,14,.16);
  opacity: 0; transform: translateY(14px); transition: opacity .5s ease, transform .5s ease;
}
.fb-pin-list li:last-child { border-bottom: 1px solid rgba(13,83,14,.16); }
.fb-pin-list li.is-in { opacity: 1; transform: none; }
.fb-pin-n { font-size: 12px; color: var(--orange); font-weight: 600; }
.fb-pin-emoji { font-size: 15px; }
.fb-pin-name { grid-column: 2 / 4; font-size: 18px; color: var(--green); font-weight: 600; }
.fb-pin-note { grid-column: 2 / 4; font-size: 13px; line-height: 1.5; color: var(--brown); }
@media (prefers-reduced-motion: reduce){
  .fb-pin-outer { height: auto; }
  .fb-pin-stage { position: relative; height: auto; padding: 72px 0; }
  .fb-pin-visual { position: relative; margin: 0 0 24px; }
  .fb-pin-img { transform: none !important; }
  .fb-pin-list li { opacity: 1; transform: none; }
}
@media (max-width: 900px){
  .fb-pin-inner { grid-template-columns: 1fr; gap: 22px; }
  .fb-pin-h { max-width: none; }
  .fb-pin-img { width: 66vw; height: 66vw; opacity: .12; }
}

.fb-stats { background: var(--green); color: var(--cream); padding: clamp(56px, 9vw, 110px) 0; }
.fb-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.fb-stat { text-align: center; }
.fb-stat-v { font-size: clamp(34px, 6vw, 68px); line-height: 1; color: #fff; font-weight: 500; }
.fb-stat-l { margin-top: 10px; font-size: 13px; letter-spacing: .04em; opacity: .8; }
@media (max-width: 640px){ .fb-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 30px 16px; } }

.fb-combos { background: var(--cream); }
.fb-dur { display: inline-flex; gap: 4px; margin: 30px 0 40px; padding: 5px; background: var(--cream-deep); border-radius: 999px; border: 1px solid rgba(13,83,14,.12); }
.fb-dur button {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px;
  border: 0; background: none; cursor: pointer; border-radius: 999px;
  font-weight: 700; font-size: 14px; color: var(--green); opacity: .7; transition: all .2s ease;
}
.fb-dur button em { font-style: normal; font-size: 12px; opacity: .7; }
.fb-dur button.is-active { background: var(--green); color: #fff; opacity: 1; }
.fb-dur button.is-active em { opacity: .85; }
.fb-combo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.fb-combo { position: relative; background: #fff; border: 1px solid rgba(13,83,14,.12); border-radius: 22px; padding: 30px 26px; display: flex; flex-direction: column; }
.fb-combo.is-featured { border-color: var(--green); box-shadow: 0 24px 60px rgba(13,83,14,.14); }
.fb-combo-badge {
  position: absolute; top: -11px; left: 26px; background: var(--orange); color: #fff;
  font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase;
  padding: 5px 12px; border-radius: 999px;
}
.fb-combo h3 { font-size: 26px; color: var(--green); margin: 0 0 4px; font-weight: 600; }
.fb-combo-sub { margin: 0 0 16px; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--orange); }
.fb-combo-specs { margin: 0 0 18px; font-size: 13.5px; color: var(--brown); line-height: 1.5; }
.fb-combo-price { display: flex; align-items: baseline; gap: 10px; }
.fb-combo-price span { font-size: 34px; color: var(--green); font-weight: 600; }
.fb-combo-price s { font-size: 15px; color: rgba(75,53,42,.5); }
.fb-combo-per { margin: 4px 0 22px; font-size: 12.5px; color: rgba(75,53,42,.7); }
.fb-combo .fb-btn { margin-top: auto; }
.fb-combo-foot { margin-top: 34px; }
@media (max-width: 880px){
  .fb-combo-grid { grid-template-columns: 1fr; max-width: 420px; }
  .fb-dur { display: flex; width: 100%; max-width: 420px; }
  .fb-dur button { flex: 1; justify-content: center; padding: 11px 8px; }
}

.fb-quotes { background: var(--green); color: var(--cream); }
.fb-quote-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 30px; }
.fb-quote { margin: 0; border-top: 2px solid rgba(246,201,154,.4); padding-top: 22px; }
.fb-quote blockquote { margin: 0 0 16px; font-size: 20px; line-height: 1.4; color: #fff; font-weight: 400; }
.fb-quote figcaption { font-size: 13px; opacity: .82; }
.fb-quote figcaption strong { font-weight: 700; }
@media (max-width: 780px){ .fb-quote-grid { grid-template-columns: 1fr; gap: 6px; } }

.fb-faq-wrap { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 48px; align-items: start; }
.fb-faq-item { border-top: 1px solid rgba(13,83,14,.16); }
.fb-faq-item:last-child { border-bottom: 1px solid rgba(13,83,14,.16); }
.fb-faq-item > button {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: none; border: 0; cursor: pointer; text-align: left;
  padding: 22px 0; color: var(--green); font-size: 18px; font-weight: 600;
}
.fb-faq-item > button svg { flex-shrink: 0; transition: transform .3s ease; }
.fb-faq-item.is-open > button svg { transform: rotate(45deg); }
.fb-faq-a { overflow: hidden; max-height: 0; transition: max-height .35s ease; }
.fb-faq-item.is-open .fb-faq-a { max-height: 320px; }
.fb-faq-a p { margin: 0 0 22px; font-size: 14.5px; line-height: 1.65; color: var(--brown); max-width: 52ch; }
@media (max-width: 880px){ .fb-faq-wrap { grid-template-columns: 1fr; gap: 20px; } }

.fb-wholesale {
  display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center;
  background: var(--cream-deep); border: 1px solid rgba(13,83,14,.12);
  border-radius: 32px; padding: clamp(32px, 6vw, 72px);
}
.fb-wholesale h2 { margin: 8px 0 16px; }
.fb-wholesale-body { margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: var(--brown); max-width: 42ch; }
.fb-wholesale img { width: 100%; max-width: 340px; justify-self: center; border-radius: 24px; filter: drop-shadow(0 30px 60px rgba(13,83,14,.2)); }
@media (max-width: 780px){ .fb-wholesale { grid-template-columns: 1fr; } .fb-wholesale img { display: none; } }

.fb-footer { background: var(--ink); color: rgba(251,246,236,.72); padding: 72px 0 40px; }
.fb-footer-top { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 32px; padding-bottom: 40px; border-bottom: 1px solid rgba(251,246,236,.14); }
.fb-footer-brand span { font-size: 24px; color: #fff; font-weight: 600; }
.fb-footer-brand p { margin: 12px 0 0; font-size: 14px; color: #fff; font-weight: 600; }
.fb-footer-brand p.fb-muted { color: rgba(251,246,236,.55); font-weight: 400; max-width: 34ch; }
.fb-footer h4 { margin: 0 0 16px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: rgba(251,246,236,.5); }
.fb-footer ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.fb-footer li { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.fb-footer a, .fb-footer button { color: rgba(251,246,236,.72); background: none; border: 0; padding: 0; cursor: pointer; font-size: 14px; text-decoration: none; text-align: left; }
.fb-footer a:hover, .fb-footer button:hover { color: #fff; }
.fb-footer-bot { display: flex; align-items: center; justify-content: space-between; padding-top: 26px; font-size: 12px; color: rgba(251,246,236,.45); }
@media (max-width: 780px){ .fb-footer-top { grid-template-columns: 1fr 1fr; } .fb-footer-brand { grid-column: 1 / -1; } }

.fb-float { position: fixed; right: 16px; bottom: 20px; z-index: 114; display: flex; flex-direction: column; gap: 10px; }
@media (max-width: 780px){ .fb-float { bottom: calc(16px + env(safe-area-inset-bottom)); } }
.fb-float a { width: 44px; height: 44px; border-radius: 999px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.22); transition: transform .18s ease; }
.fb-float a:hover { transform: scale(1.08); }

.fb-menu-overlay {
  position: fixed; inset: 0; z-index: 200; background: var(--cream);
  display: flex; flex-direction: column; padding: 20px 24px calc(24px + env(safe-area-inset-bottom));
  animation: fb-menu-in .3s ease both;
}
@keyframes fb-menu-in { from { opacity: 0; } to { opacity: 1; } }
.fb-menu-overlay-top { display: flex; align-items: center; justify-content: space-between; padding: 4px 0 12px; }
.fb-menu-overlay-top span { font-size: 22px; font-weight: 600; color: var(--green); }
.fb-menu-overlay-top .fb-menu-close {
  position: static; width: 44px; height: 44px; border-radius: 999px; border: 0; cursor: pointer;
  background: rgba(13,83,14,.10); color: var(--green); display: flex; align-items: center; justify-content: center;
}
.fb-menu-overlay-links { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.fb-menu-overlay-links button {
  text-align: left; background: none; border: 0; cursor: pointer; color: var(--green);
  font-family: "Fraunces", Georgia, serif; font-weight: 500; letter-spacing: -.01em;
  font-size: clamp(30px, 8vw, 52px); line-height: 1.18; padding: 6px 0;
  animation: fb-link-in .5s cubic-bezier(.2,.7,.2,1) both;
}
@keyframes fb-link-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.fb-menu-overlay-cta { display: flex; flex-direction: column; gap: 10px; max-width: 420px; width: 100%; }
@media (min-width: 720px){
  .fb-menu-overlay-cta { flex-direction: row; }
}

.fb-menu-modal {
  position: fixed; inset: 0; z-index: 300; background: rgba(20,14,8,.92);
  display: flex; flex-direction: column; align-items: center; padding: 20px; overscroll-behavior: contain;
}
.fb-menu-close {
  position: absolute; top: 14px; right: 14px; z-index: 2;
  width: 44px; height: 44px; border-radius: 999px; border: 0; cursor: pointer;
  background: rgba(255,255,255,.14); color: #fff; display: flex; align-items: center; justify-content: center;
}
.fb-menu-scroll { width: 100%; max-width: 520px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding: 56px 0 20px; }
.fb-menu-scroll img { width: 100%; border-radius: 12px; display: block; box-shadow: 0 20px 50px rgba(0,0,0,.4); }
`}</style>
  );
}
