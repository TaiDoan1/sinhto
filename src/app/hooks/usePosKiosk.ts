import { useCallback, useEffect, useState } from 'react';

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
  // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function requestAppFullscreen(): Promise<boolean> {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
  } catch {
    /* user gesture or policy blocked */
  }
  return false;
}

const POS_VIEWPORT =
  'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

/** Ẩn thanh URL trình duyệt + phóng to UI trên máy POS Android (iPOS, v.v.) */
export function usePosKiosk() {
  const [needsFullscreenTap, setNeedsFullscreenTap] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (active) setNeedsFullscreenTap(false);
    };

    document.addEventListener('fullscreenchange', syncFullscreen);

    if (!standalone && !document.fullscreenElement) {
      setNeedsFullscreenTap(true);
    }

    return () => {
      document.documentElement.classList.remove('pos-kiosk');
      document.body.classList.remove('pos-kiosk');
      manifest?.setAttribute('href', prevManifest);
      meta?.setAttribute('content', prevViewport);
      document.removeEventListener('fullscreenchange', syncFullscreen);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    const ok = await requestAppFullscreen();
    if (ok) {
      setNeedsFullscreenTap(false);
      setIsFullscreen(true);
    }
    return ok;
  }, []);

  return {
    needsFullscreenTap: needsFullscreenTap && !isStandalone && !isFullscreen,
    isFullscreen,
    isStandalone,
    enterFullscreen,
  };
}
