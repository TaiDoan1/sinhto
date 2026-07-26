import { useEffect, useRef, useState } from 'react';

// Chuyển thể từ file animation gốc (Fitblend Logo Animation) — vị trí/kích thước layer
// theo canvas gốc 1920x1080, giữ nguyên timing/easing để khớp bản thiết kế.
const STAGE_W = 1920;
const STAGE_H = 1080;
const DURATION = 6; // giây — khớp scene "Reveal" gốc (dur: 6)

interface AssetSpec {
  key: string;
  src: string;
  x: number; y: number; w: number; h: number;
  dx: number; dy: number;
  enterStart: number; enterDur: number;
  exitStart: number; exitDur: number;
  idlePhase: number; idleFreq: number; idleAmp: number;
}

const ASSETS: AssetSpec[] = [
  { key: 'palm', src: '/images/splash/logo-palm.png', x: 210, y: 297, w: 214, h: 293,
    dx: -30, dy: -18, enterStart: 0.15, enterDur: 0.70, exitStart: 5.00, exitDur: 0.60,
    idlePhase: 0.0, idleFreq: 0.18, idleAmp: 5 },
  { key: 'dumbbell', src: '/images/splash/logo-dumbbell.png', x: 210, y: 569, w: 214, h: 206,
    dx: -30, dy: 18, enterStart: 0.30, enterDur: 0.70, exitStart: 4.90, exitDur: 0.55,
    idlePhase: 0.6, idleFreq: 0.16, idleAmp: 4 },
  { key: 'wordmark', src: '/images/splash/logo-wordmark.png', x: 358, y: 371, w: 964, h: 363,
    dx: 0, dy: 26, enterStart: 0.45, enterDur: 0.75, exitStart: 4.80, exitDur: 0.55,
    idlePhase: 0.3, idleFreq: 0.14, idleAmp: 3 },
  { key: 'sunbirds', src: '/images/splash/logo-sunbirds.png', x: 1199, y: 297, w: 396, h: 247,
    dx: 30, dy: -18, enterStart: 0.60, enterDur: 0.70, exitStart: 4.70, exitDur: 0.50,
    idlePhase: 1.0, idleFreq: 0.20, idleAmp: 5 },
  { key: 'shaker', src: '/images/splash/logo-shaker.png', x: 1508, y: 454, w: 202, h: 297,
    dx: 30, dy: 18, enterStart: 0.75, enterDur: 0.70, exitStart: 4.60, exitDur: 0.50,
    idlePhase: 1.4, idleFreq: 0.17, idleAmp: 4 },
  { key: 'subtitle', src: '/images/splash/logo-subtitle.png', x: 507, y: 668, w: 1055, h: 115,
    dx: 0, dy: 16, enterStart: 0.95, enterDur: 0.65, exitStart: 4.50, exitDur: 0.50,
    idlePhase: 0.2, idleFreq: 0.15, idleAmp: 2 },
];

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function easeOutCubic(t: number) { const x = t - 1; return x * x * x + 1; }
function easeInCubic(t: number) { return t * t * t; }
function smoothstep(a: number, b: number, x: number) {
  if (a === b) return x < a ? 0 : 1;
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function elementStyle(a: AssetSpec, t: number, floatIdle: boolean) {
  // enter
  let enOpacity: number, enTx: number, enTy: number, enScale: number;
  if (t < a.enterStart) {
    enOpacity = 0; enTx = a.dx; enTy = a.dy; enScale = 0.96;
  } else {
    const p = easeOutCubic(clamp01((t - a.enterStart) / a.enterDur));
    enOpacity = p; enTx = a.dx * (1 - p); enTy = a.dy * (1 - p); enScale = 0.96 + 0.04 * p;
  }
  // exit
  let exOpacity: number, exTy: number, exScale: number;
  if (t < a.exitStart) {
    exOpacity = 1; exTy = 0; exScale = 1;
  } else {
    const p = easeInCubic(clamp01((t - a.exitStart) / a.exitDur));
    exOpacity = 1 - p; exTy = -p * 14; exScale = 1 + 0.03 * p;
  }
  // idle float during hold
  let idleY = 0;
  const holdStart = a.enterStart + a.enterDur;
  if (floatIdle && t >= holdStart && t < a.exitStart) {
    const env = smoothstep(holdStart, holdStart + 0.4, t) * (1 - smoothstep(a.exitStart - 0.4, a.exitStart, t));
    idleY = env * a.idleAmp * Math.sin(2 * Math.PI * a.idleFreq * (t - a.idlePhase));
  }

  const opacity = enOpacity * exOpacity;
  const ty = enTy + exTy + idleY;
  const scale = t < a.exitStart ? enScale : exScale;
  return { opacity, transform: `translate(${enTx}px, ${ty}px) scale(${scale})` };
}

function ShineSweep({ t, box }: { t: number; box: { x: number; y: number; w: number; h: number } }) {
  const start = 2.05, dur = 1.05;
  if (t < start || t > start + dur) return null;
  const p = clamp01((t - start) / dur);
  const travel = box.w + 260;
  const tx = -140 + p * travel;
  const env = Math.sin(Math.PI * p);
  return (
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 130, height: '100%',
        transform: `translateX(${tx}px) skewX(-18deg)`,
        background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${(0.5 * env).toFixed(3)}) 50%, rgba(255,255,255,0) 100%)`,
      }} />
    </div>
  );
}

interface Props {
  onFinish: () => void;
}

/** Màn hình chào FitBlend — logo reveal animation chạy 1 lần khi mở app, bấm vào để bỏ qua. */
export function SplashScreen({ onFinish }: Props) {
  const [t, setT] = useState(0);
  const [fading, setFading] = useState(false);
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    setTimeout(onFinish, 250);
  };

  useEffect(() => {
    const onResize = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const debugT = new URLSearchParams(window.location.search).get('splashDebugT');
    if (debugT !== null) {
      setT(Number(debugT));
      return;
    }
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      setT(elapsed);
      if (elapsed >= DURATION) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onClick={finish}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#ffffff',
        overflow: 'hidden',
        cursor: 'pointer',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.25s ease',
      }}
    >
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%',
          width: STAGE_W, height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        {ASSETS.map((a) => {
          const st = elementStyle(a, t, true);
          return (
            <div
              key={a.key}
              style={{
                position: 'absolute', left: a.x, top: a.y, width: a.w, height: a.h,
                opacity: st.opacity, transform: st.transform, transformOrigin: 'center',
              }}
            >
              <img src={a.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
          );
        })}
        <ShineSweep t={t} box={{ x: ASSETS[2].x, y: ASSETS[2].y, w: ASSETS[2].w, h: ASSETS[2].h * 0.55 }} />
      </div>
    </div>
  );
}
