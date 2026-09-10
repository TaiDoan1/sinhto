/**
 * CustomerProducts — trang /products (hoặc ?view=products): catalog đầy đủ sản phẩm + giá,
 * theo phong cách apeel.com/products. Hero → slider hương vị (kéo/bấm) → bảng giá ly lẻ →
 * lưới 24 vị → topping → combo → CTA → footer. Bấm vào sản phẩm → mở app đặt món /dat-mon.
 *
 * Dùng chung hạ tầng hiệu ứng (Styles, Headline, Reveal, Parallax, scroll engine, Lenis) với
 * CustomerLandingStory.
 */
import { useState, useEffect, useRef, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
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
  X,
} from 'lucide-react';
import { BRAND } from './landing/brand';
import { LANDING_IMAGES, PRODUCT_IMAGES } from '../../config/images';
import { DEFAULT_MENU_PRICE_TABLE, PROTEIN_LEVELS_BY_SIZE } from '../../config/menuPricing';
import { DEFAULT_TOPPINGS } from '../../config/menuToppings';
import {
  Styles,
  Headline,
  Reveal,
  Parallax,
  MenuIcon,
  ScrollCtx,
  useScrollEngine,
  prefersReducedMotion,
} from './CustomerLandingStory';

const P = PRODUCT_IMAGES;

const C = {
  cream: '#FBF6EC',
  creamDeep: '#F3EADA',
  green: '#0D530E',
  brown: '#4B352A',
  orange: '#F97A00',
  ink: '#231A12',
  mark: '#F5C842',
};

const HERO_IMAGE = P.combo;
const ORDER_URL = '/dat-mon';

const money = (n: number) => n.toLocaleString('vi-VN') + 'đ';

/** Giá thấp nhất 1 ly (360ml · 20g) để hiển thị "từ …" */
const MIN_CUP_PRICE = Math.min(
  ...Object.values(DEFAULT_MENU_PRICE_TABLE).flatMap((lv) => Object.values(lv)),
);

type Flavor = { name: string; desc: string; img: string; blob: string };

const FLAVORS: Flavor[] = [
  { name: 'Dâu hạt chia', desc: 'Giảm mỡ', img: P.strawberry, blob: '#F3B7C4' },
  { name: 'Dâu chuối', desc: 'Tone dáng', img: P.strawberry, blob: '#F3B7C4' },
  { name: 'Mãng cầu dâu', desc: 'Detox', img: P.strawberry, blob: '#EFC9D4' },
  { name: 'Dâu cam', desc: 'Vitamin C', img: P.mango, blob: '#F6C748' },
  { name: 'Dâu tằm hạt chia', desc: 'Chống oxy hoá', img: P.strawberry, blob: '#C7B4E1' },
  { name: 'Phúc bồn tử hạt chia', desc: 'Năng lượng', img: P.strawberry, blob: '#E7A9C0' },
  { name: 'Chuối hạt chia', desc: 'Tăng cơ', img: P.cacaoOat, blob: '#D8C089' },
  { name: 'Chanh dây chuối', desc: 'Refresh', img: P.mango, blob: '#F7D67A' },
  { name: 'Xoài thơm', desc: 'Tropical', img: P.mango, blob: '#F6C748' },
  { name: 'Xoài cam', desc: 'Vitamin', img: P.mango, blob: '#F6C748' },
  { name: 'Cacao yến mạch', desc: 'Năng lượng bền', img: P.cacaoOat, blob: '#C9A17C' },
  { name: 'Cà phê chuối', desc: 'Pre-workout', img: P.cacaoOat, blob: '#B98E6A' },
  { name: 'Bơ', desc: 'Healthy fat', img: P.hero, blob: '#A7C58E' },
  { name: 'Bơ chuối', desc: 'Siêu béo tốt', img: P.hero, blob: '#B7CE9C' },
  { name: 'Matcha', desc: 'Antioxidant', img: P.hero, blob: '#A7C58E' },
  { name: 'Dâu tằm yến mạch', desc: 'Mới', img: P.strawberry, blob: '#C7B4E1' },
  { name: 'Phúc bồn tử yến mạch', desc: 'Mới', img: P.strawberry, blob: '#E7A9C0' },
  { name: 'Thanh long chuối', desc: 'Mới', img: P.mango, blob: '#EFAFC0' },
  { name: 'Thanh long yến mạch', desc: 'Phải thử', img: P.mango, blob: '#EFAFC0' },
  { name: 'Xoài dâu', desc: 'Mới', img: P.mango, blob: '#F6C748' },
  { name: 'Xoài chuối', desc: 'Mới', img: P.mango, blob: '#F7D67A' },
  { name: 'Cacao chuối', desc: 'Bán chạy', img: P.cacaoOat, blob: '#C9A17C' },
  { name: 'Matcha chuối', desc: 'Mới', img: P.hero, blob: '#A7C58E' },
  { name: 'Matcha yến mạch', desc: 'Mới', img: P.hero, blob: '#B7CE9C' },
];

const SIZES = Object.keys(DEFAULT_MENU_PRICE_TABLE); // ['360ml','500ml','700ml']

const COMBOS = [
  { name: 'Fat Loss', tag: 'Giảm mỡ · tone dáng', specs: '360ml × 40g đạm · 7 ly/tuần', price: 498000 },
  { name: 'Muscle Build', tag: 'Tăng cơ · best value', specs: '500ml × 60g đạm · 7 ly/tuần', price: 725000, featured: true },
  { name: 'Elite Mass', tag: 'Tăng cân · gym pro', specs: '700ml × 90g đạm · 7 ly/tuần', price: 977000 },
];

/* ─────────────────────────  Slider hương vị (kéo / bấm)  ───────────────────────── */

function FlavorSlider({ onOpen }: { onOpen: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: 0 });

  const onPointerDown = (e: ReactPointerEvent) => {
    const el = ref.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: 0 };
    el.setPointerCapture?.(e.pointerId);
    el.classList.add('is-dragging');
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const el = ref.current;
    if (!el || !drag.current.down) return;
    const dx = e.clientX - drag.current.startX;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const endDrag = (e: ReactPointerEvent) => {
    const el = ref.current;
    drag.current.down = false;
    el?.classList.remove('is-dragging');
    el?.releasePointerCapture?.(e.pointerId);
  };
  const handleClick = () => {
    if (drag.current.moved > 6) return; // đang kéo, không tính là bấm
    onOpen();
  };

  return (
    <section className="pr-flavors-sec" id="huong-vi">
      <div className="fb-wrap">
        <Reveal as="p" className="fb-tag">
          Hương vị
        </Reveal>
        <Headline className="fb-h2" text={'Hơn 24 vị. Kéo để xem, bấm để đặt.'} />
      </div>

      <div
        className="pr-slider"
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {FLAVORS.map((f) => (
          <button type="button" className="pr-flavor" key={f.name} onClick={handleClick}>
            <div className="pr-flavor-media">
              <span className="pr-flavor-blob" style={{ background: f.blob }} />
              <img
                src={f.img}
                alt={f.name}
                draggable={false}
                onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0')}
              />
            </div>
            <h3 className="pr-flavor-name fb-display">
              <span>{f.name}</span>
            </h3>
            <p className="pr-flavor-desc">
              {f.desc} · từ {money(MIN_CUP_PRICE)}
            </p>
          </button>
        ))}
      </div>

      <div className="fb-wrap">
        <button type="button" className="fb-link" onClick={onOpen}>
          Xem tất cả &amp; đặt món <ArrowUpRight size={16} />
        </button>
      </div>
    </section>
  );
}

/* ─────────────────────────────  Trang  ───────────────────────────── */

export function CustomerProducts() {
  const reduced = typeof window !== 'undefined' ? prefersReducedMotion() : false;
  const motionOn = !reduced;
  const subscribe = useScrollEngine(motionOn);

  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const lenisRef = useRef<any>(null);

  useEffect(() => {
    if (!motionOn || typeof window === 'undefined' || !('requestAnimationFrame' in window)) return;
    let lenis: any;
    let raf = 0;
    let cancelled = false;
    import('lenis')
      .then(({ default: Lenis }) => {
        if (cancelled) return;
        lenis = new Lenis({ duration: 1.1, easing: (t: number) => 1 - Math.pow(1 - t, 3), smoothWheel: true, touchMultiplier: 1.6 });
        lenisRef.current = lenis;
        const loop = (time: number) => {
          lenis.raf(time);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      try {
        lenis?.destroy();
      } catch {}
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
    } catch {}
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

  const goLanding = () => {
    window.location.href = '/';
  };
  const goOrder = () => {
    window.location.href = ORDER_URL;
  };

  return (
    <ScrollCtx.Provider value={subscribe}>
      <div className="fb-root" style={{ background: C.cream, color: C.brown }}>
        <Styles />

        {/* NAV */}
        <nav className={`fb-nav ${scrolled ? 'is-scrolled' : ''} ${pastHero ? 'is-past' : ''}`}>
          <div className="fb-nav-inner">
            <button type="button" className="fb-nav-menu" aria-label="Mở menu" onClick={() => setMenuOpen(true)}>
              <MenuIcon />
              <span>Menu</span>
            </button>
            <button type="button" className="fb-logo" onClick={goLanding} aria-label="FitBlend">
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
            <button type="button" className="fb-btn fb-btn-solid fb-nav-combo" onClick={goOrder}>
              Đặt món
            </button>
          </div>
        </nav>

        <button
          type="button"
          className={`fb-menufab ${pastHero ? 'is-show' : ''}`}
          onClick={() => setMenuOpen(true)}
          aria-label="Mở menu"
        >
          Menu <MenuIcon />
        </button>

        {/* HERO */}
        <header className="fb-hero" id="top">
          <Parallax className="fb-hero-bg" speed={0.14}>
            <img src={HERO_IMAGE} alt="" aria-hidden onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0')} />
          </Parallax>
          <div className="fb-hero-scrim" aria-hidden />
          <div className="fb-hero-inner">
            <Headline as="h1" plain className="fb-hero-title" text={'Sản phẩm & bảng giá.'} />
          </div>
          <div className="fb-scrollcue" aria-hidden>
            <ChevronDown size={18} />
          </div>
        </header>

        <div className="fb-after">
          {/* SLIDER HƯƠNG VỊ */}
          <FlavorSlider onOpen={goOrder} />

          {/* BẢNG GIÁ LY LẺ */}
          <section className="fb-section" id="bang-gia">
            <div className="fb-wrap">
              <Reveal as="p" className="fb-tag">
                Bảng giá ly lẻ
              </Reveal>
              <Headline className="fb-h2" text={'Giá theo size & lượng đạm — mọi vị cùng giá.'} />
              <Reveal className="pr-price-table">
                <div className="pr-price-row pr-price-head">
                  <span>Size</span>
                  <span>Đạm</span>
                  <span>Giá / ly</span>
                </div>
                {SIZES.map((size) =>
                  PROTEIN_LEVELS_BY_SIZE[size].map((pr) => (
                    <div className="pr-price-row" key={size + pr}>
                      <span className="pr-price-size fb-display">{size}</span>
                      <span>{pr}g protein</span>
                      <span className="pr-price-val fb-display">
                        {money(DEFAULT_MENU_PRICE_TABLE[size][pr])}
                      </span>
                    </div>
                  )),
                )}
              </Reveal>
              <Reveal className="pr-note">
                Giá đã gồm ly, chưa gồm topping thêm.
              </Reveal>

              {/* COMBO — ngay dưới bảng giá */}
              <div className="pr-combo-block" id="combo">
                <Reveal as="p" className="fb-tag">
                  Combo giao mỗi sáng
                </Reveal>
                <Headline className="fb-h2" text={'Đặt cả tuần, rẻ hơn mua lẻ.'} />
                <div className="pr-combo-grid">
                  {COMBOS.map((c) => (
                    <div className={`pr-combo ${c.featured ? 'is-featured' : ''}`} key={c.name}>
                      {c.featured && <span className="pr-combo-badge">Phổ biến</span>}
                      <h3 className="fb-display">{c.name}</h3>
                      <p className="pr-combo-tag">{c.tag}</p>
                      <p className="pr-combo-specs">{c.specs}</p>
                      <div className="pr-combo-price fb-display">
                        {money(c.price)}
                        <em>/tuần</em>
                      </div>
                      <button type="button" className="fb-btn fb-btn-solid fb-btn-block" onClick={goLanding}>
                        Xem chi tiết
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* LƯỚI 24 VỊ */}
          <section className="fb-section pr-grid-sec" id="thuc-don">
            <div className="fb-wrap">
              <Reveal as="p" className="fb-tag">
                Thực đơn đầy đủ
              </Reveal>
              <Headline className="fb-h2" text={`${FLAVORS.length} vị — bấm để đặt.`} />
              <div className="pr-grid">
                {FLAVORS.map((f) => (
                  <button type="button" className="pr-card" key={f.name} onClick={goOrder}>
                    <div className="pr-card-media" style={{ background: `${f.blob}55` }}>
                      <img
                        src={f.img}
                        alt={f.name}
                        onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0')}
                      />
                    </div>
                    <div className="pr-card-body">
                      <h3 className="fb-display">{f.name}</h3>
                      <p>{f.desc}</p>
                      <span className="pr-card-price">từ {money(MIN_CUP_PRICE)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* TOPPING */}
          <section className="fb-section pr-topping-sec">
            <div className="fb-wrap">
              <Reveal as="p" className="fb-tag fb-tag-light">
                Topping thêm
              </Reveal>
              <Headline className="fb-h2" text={'Thêm gì cũng có.'} />
              <Reveal className="pr-topping-grid">
                {DEFAULT_TOPPINGS.map((t) => (
                  <div className="pr-topping" key={t.name}>
                    <span>{t.name}</span>
                    <b>{t.price === 0 ? 'Miễn phí' : `+${money(t.price)}`}</b>
                  </div>
                ))}
              </Reveal>
            </div>
          </section>

          {/* CTA */}
          <section className="fb-section" id="cta">
            <Reveal className="fb-wrap">
              <div className="pr-cta">
                <Headline className="fb-h2" text={'Chọn vị bạn thích, tụi mình lo phần còn lại.'} />
                <div className="pr-cta-btns">
                  <button type="button" className="fb-btn fb-btn-solid fb-btn-lg" onClick={goOrder}>
                    Đặt món ngay <ArrowRight size={18} />
                  </button>
                  <button type="button" className="fb-btn fb-btn-line fb-btn-lg" onClick={() => setShowMenu(true)}>
                    Xem menu in
                  </button>
                </div>
              </div>
            </Reveal>
          </section>

          {/* FOOTER */}
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
                    <li>
                      <button type="button" onClick={goLanding}>
                        Trang chủ
                      </button>
                    </li>
                    <li>
                      <button type="button" onClick={() => scrollTo('#thuc-don')}>
                        Thực đơn
                      </button>
                    </li>
                    <li>
                      <button type="button" onClick={() => scrollTo('#bang-gia')}>
                        Bảng giá
                      </button>
                    </li>
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
        </div>

        {/* LIÊN HỆ NỔI */}
        <div className="fb-float">
          <a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" style={{ background: '#1877F2' }}>
            <Facebook size={20} />
          </a>
          <a href={BRAND.zalo} target="_blank" rel="noreferrer" aria-label="Zalo" style={{ background: '#0068FF' }}>
            <MessageCircle size={20} />
          </a>
        </div>

        {/* MENU OVERLAY */}
        {menuOpen && (
          <div className="fb-menu-overlay">
            <div className="fb-menu-overlay-top">
              <span className="fb-display">FitBlend</span>
              <button type="button" className="fb-menu-close" aria-label="Đóng" onClick={() => setMenuOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <nav className="fb-menu-overlay-links">
              <button type="button" onClick={goLanding}>
                Trang chủ
              </button>
              <button type="button" onClick={() => scrollTo('#huong-vi')}>
                Hương vị
              </button>
              <button type="button" onClick={() => scrollTo('#bang-gia')}>
                Bảng giá
              </button>
              <button type="button" onClick={() => scrollTo('#combo')}>
                Combo
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); setShowMenu(true); }}>
                Menu in
              </button>
            </nav>
            <div className="fb-menu-overlay-cta">
              <button type="button" className="fb-btn fb-btn-solid fb-btn-lg fb-btn-block" onClick={goOrder}>
                Đặt món ngay
              </button>
              <button type="button" className="fb-btn fb-btn-line fb-btn-lg fb-btn-block" onClick={goLanding}>
                Xem combo
              </button>
            </div>
          </div>
        )}

        {/* MENU IN */}
        {showMenu && (
          <div className="fb-menu-modal" onClick={() => setShowMenu(false)}>
            <button type="button" className="fb-menu-close" aria-label="Đóng" onClick={() => setShowMenu(false)}>
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

        <ProductStyles />
      </div>
    </ScrollCtx.Provider>
  );
}

/* ─────────────────────────────  CSS riêng  ───────────────────────────── */

function ProductStyles() {
  return (
    <style>{`
/* Slider hương vị — kéo / bấm */
.pr-flavors-sec { background: var(--cream); padding: clamp(64px, 10vw, 130px) 0; overflow: hidden; }
.pr-flavors-sec .fb-h2 { margin-bottom: 28px; }
.pr-slider {
  display: flex; gap: clamp(20px, 4vw, 48px);
  padding: 8px max(24px, 6vw) 26px;
  overflow-x: auto; scroll-snap-type: x proximity;
  cursor: grab; -webkit-overflow-scrolling: touch; scrollbar-width: none;
}
.pr-slider::-webkit-scrollbar { display: none; }
.pr-slider.is-dragging { cursor: grabbing; scroll-snap-type: none; }
.pr-slider.is-dragging * { pointer-events: none; }
.pr-flavor {
  flex: 0 0 auto; width: clamp(200px, 26vw, 280px); scroll-snap-align: center;
  background: none; border: 0; padding: 0; cursor: pointer; text-align: center; color: inherit;
}
.pr-flavor-media { position: relative; display: flex; align-items: flex-end; justify-content: center; height: clamp(200px, 26vw, 300px); }
.pr-flavor-blob {
  position: absolute; left: 50%; bottom: 4%; width: 76%; height: 30%;
  transform: translateX(-50%); border-radius: 50%; filter: blur(3px); opacity: .85;
}
.pr-flavor-media img {
  position: relative; z-index: 1; max-height: 100%; width: auto; max-width: 88%;
  object-fit: contain; border-radius: 14px; filter: drop-shadow(0 26px 34px rgba(20,14,8,.2));
  transition: transform .35s ease; user-select: none;
}
.pr-flavor:hover .pr-flavor-media img { transform: translateY(-6px) scale(1.03); }
.pr-flavor-name {
  margin: 16px 0 4px; font-size: clamp(20px, 2.4vw, 30px); line-height: 1.15; font-weight: 600; color: var(--green);
}
.pr-flavor-name span { position: relative; padding: 0 .1em; z-index: 0; }
.pr-flavor:hover .pr-flavor-name span::before {
  content: ""; position: absolute; left: 0; right: 0; bottom: .08em; height: .58em; z-index: -1;
  background: ${C.mark}; border-radius: 3px; transform: rotate(-1.4deg);
}
.pr-flavor-desc { margin: 0; font-size: 12.5px; color: rgba(75,53,42,.7); }
.pr-flavors-sec .fb-link { margin: 10px 0 0 max(24px, 6vw); }

/* Bảng giá */
.pr-price-table { margin-top: 26px; max-width: 560px; border-top: 1px solid rgba(13,83,14,.16); }
.pr-price-row {
  display: grid; grid-template-columns: 1fr 1fr auto; gap: 16px; align-items: center;
  padding: 15px 0; border-bottom: 1px solid rgba(13,83,14,.14); font-size: 14.5px; color: var(--brown);
}
.pr-price-head { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; color: var(--orange); }
.pr-price-size { font-size: 17px; color: var(--green); font-weight: 600; }
.pr-price-val { font-size: 19px; color: var(--green); font-weight: 600; }
.pr-note { margin-top: 18px; font-size: 13px; line-height: 1.6; color: rgba(75,53,42,.72); max-width: 46ch; }

/* Lưới vị */
.pr-grid-sec { background: var(--cream-deep); }
.pr-grid {
  margin-top: 34px; display: grid; gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
}
.pr-card {
  display: flex; flex-direction: column; text-align: left; cursor: pointer;
  background: #fff; border: 1px solid rgba(13,83,14,.12); border-radius: 18px; overflow: hidden;
  padding: 0; color: inherit; transition: transform .18s ease, box-shadow .18s ease;
}
.pr-card:hover { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(13,83,14,.12); }
.pr-card-media { aspect-ratio: 4 / 3; display: flex; align-items: center; justify-content: center; }
.pr-card-media img { width: 78%; height: 78%; object-fit: contain; filter: drop-shadow(0 14px 20px rgba(20,14,8,.18)); }
.pr-card-body { padding: 14px 16px 16px; }
.pr-card-body h3 { margin: 0 0 3px; font-size: 16px; color: var(--green); font-weight: 600; }
.pr-card-body p { margin: 0 0 10px; font-size: 12px; color: rgba(75,53,42,.65); }
.pr-card-price { font-size: 13px; font-weight: 700; color: var(--orange); }

/* Topping */
.pr-topping-sec { background: var(--green); color: var(--cream); }
.pr-topping-sec .fb-h2 { color: #fff; }
.pr-topping-grid {
  margin-top: 28px; display: grid; gap: 2px 28px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
.pr-topping {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
  padding: 12px 0; border-bottom: 1px solid rgba(246,201,154,.24); font-size: 14px;
}
.pr-topping span { color: #fff; }
.pr-topping b { color: #F6C99A; white-space: nowrap; font-weight: 700; }

/* Combo */
.pr-combo-block { margin-top: clamp(48px, 8vw, 96px); padding-top: clamp(40px, 6vw, 64px); border-top: 1px solid rgba(13,83,14,.16); }
.pr-combo-grid { margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.pr-combo {
  position: relative; background: #fff; border: 1px solid rgba(13,83,14,.12); border-radius: 20px;
  padding: 28px 24px; display: flex; flex-direction: column;
}
.pr-combo.is-featured { border-color: var(--green); box-shadow: 0 24px 60px rgba(13,83,14,.14); }
.pr-combo-badge {
  position: absolute; top: -11px; left: 24px; background: var(--orange); color: #fff;
  font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; padding: 5px 12px; border-radius: 999px;
}
.pr-combo h3 { font-size: 24px; color: var(--green); margin: 0 0 4px; font-weight: 600; }
.pr-combo-tag { margin: 0 0 14px; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--orange); }
.pr-combo-specs { margin: 0 0 16px; font-size: 13px; color: var(--brown); line-height: 1.5; }
.pr-combo-price { font-size: 26px; color: var(--green); font-weight: 600; margin: 0 0 18px; }
.pr-combo-price em { font-size: 13px; font-style: normal; color: rgba(75,53,42,.55); font-weight: 400; }
.pr-combo .fb-btn { margin-top: auto; }
@media (max-width: 820px){ .pr-combo-grid { grid-template-columns: 1fr; max-width: 420px; } }

/* CTA */
.pr-cta {
  background: var(--cream-deep); border: 1px solid rgba(13,83,14,.12); border-radius: 32px;
  padding: clamp(36px, 7vw, 80px);
}
.pr-cta .fb-h2 { max-width: 22ch; }
.pr-cta-btns { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 24px; }
`}</style>
  );
}
