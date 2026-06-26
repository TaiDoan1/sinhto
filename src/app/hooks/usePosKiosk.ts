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
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      document.documentElement.classList.remove('pos-kiosk');
      document.body.classList.remove('pos-kiosk');
      manifest?.setAttribute('href', prevManifest);
      meta?.setAttribute('content', prevViewport);
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
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
