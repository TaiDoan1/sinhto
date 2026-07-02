import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

function findScrollableParent(node: EventTarget | null): HTMLElement | null {
  let el = node instanceof HTMLElement ? node : null;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    const canScrollY =
      /(auto|scroll|overlay)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1;
    if (canScrollY) return el;
    el = el.parentElement;
  }
  return null;
}

/** Mẹo Android Chrome: cuộn 1px để thanh địa chỉ tự ẩn khi cuộn */
function tryHideAndroidChromeBar() {
  if (!isAndroid()) return;
  const run = () => {
    window.scrollTo(0, 1);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  };
  run();
  setTimeout(run, 300);
  setTimeout(run, 1000);
}

async function requestAppFullscreen(): Promise<boolean> {
  const doc = document as Document & {
    webkitFullscreenElement?: Element;
    webkitExitFullscreen?: () => Promise<void>;
  };
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
  };
  const body = document.body as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };

  const targets = [el, body];
  for (const target of targets) {
    try {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
        return true;
      }
      if (target.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
        return true;
      }
      if (target.mozRequestFullScreen) {
        await target.mozRequestFullScreen();
        return true;
      }
    } catch {
      /* thử target tiếp */
    }
  }

  const active = doc.fullscreenElement || doc.webkitFullscreenElement;
  return !!active;
}

const POS_VIEWPORT =
  'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

export function usePosKiosk() {
  const [needsFullscreenTap, setNeedsFullscreenTap] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [fullscreenFailed, setFullscreenFailed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('pos-kiosk');
    document.body.classList.add('pos-kiosk');
    window.scrollTo(0, 0);

    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const prevManifest = manifest?.getAttribute('href') || '';
    manifest?.setAttribute('href', '/manifest-pos.webmanifest');

    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const prevViewport = meta?.getAttribute('content') || '';
    meta?.setAttribute('content', POS_VIEWPORT);

    const standalone = isStandaloneDisplay();
    setIsStandalone(standalone);

    const syncFullscreen = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const active = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(active);
      if (active) {
        setNeedsFullscreenTap(false);
        setFullscreenFailed(false);
        tryHideAndroidChromeBar();
      }
    };

    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);

    if (!standalone) {
      setNeedsFullscreenTap(true);
      tryHideAndroidChromeBar();
    }

    const onResize = () => tryHideAndroidChromeBar();
    const lockWindowScroll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    let touchStartY = 0;
    let activeScrollable: HTMLElement | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY || 0;
      activeScrollable = findScrollableParent(event.target);
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const currentY = event.touches[0]?.clientY || 0;
      const deltaY = currentY - touchStartY;
      const scrollable = activeScrollable || findScrollableParent(event.target);

      if (!scrollable) {
        event.preventDefault();
        return;
      }

      const atTop = scrollable.scrollTop <= 0;
      const atBottom =
        scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;

      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        event.preventDefault();
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('scroll', lockWindowScroll, { passive: true });
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.documentElement.classList.remove('pos-kiosk');
      document.body.classList.remove('pos-kiosk');
      manifest?.setAttribute('href', prevManifest);
      meta?.setAttribute('content', prevViewport);
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('scroll', lockWindowScroll);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    const ok = await requestAppFullscreen();
    tryHideAndroidChromeBar();
    if (ok) {
      setNeedsFullscreenTap(false);
      setIsFullscreen(true);
      setFullscreenFailed(false);
    } else {
      setFullscreenFailed(true);
      setNeedsFullscreenTap(false);
    }
    return ok;
  }, []);

  /** Cần nút toàn màn hình khi chưa PWA và chưa fullscreen */
  const showFullscreenButton = !isStandalone && !isFullscreen;

  return {
    needsFullscreenTap: needsFullscreenTap && !isStandalone && !isFullscreen,
    isFullscreen,
    isStandalone,
    fullscreenFailed,
    showFullscreenButton,
    enterFullscreen,
  };
}

type PosKioskContextValue = ReturnType<typeof usePosKiosk>;

const PosKioskContext = createContext<PosKioskContextValue | null>(null);

export function PosKioskProvider({ children }: { children: ReactNode }) {
  const kiosk = usePosKiosk();
  return createElement(PosKioskContext.Provider, { value: kiosk }, children);
}

export function usePosKioskContext() {
  const ctx = useContext(PosKioskContext);
  if (!ctx) throw new Error('usePosKioskContext must be inside PosKioskProvider');
  return ctx;
}
