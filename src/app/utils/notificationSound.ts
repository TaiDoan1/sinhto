let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

// Mở khóa AudioContext ngay khi người dùng tương tác lần đầu (chính sách autoplay của trình duyệt) —
// nếu tin nhắn đầu tiên đến trước khi CSKH click gì trên trang, tiếng bíp vẫn có thể bị chặn âm thầm.
// Có thêm nút "Bật âm thanh" thủ công (xem unlockAudio) để chắc chắn kích hoạt được.
if (typeof window !== 'undefined') {
  const unlock = () => {
    getAudioContext()?.resume();
  };
  window.addEventListener('click', unlock);
  window.addEventListener('keydown', unlock);
}

export function unlockAudio(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;
  ctx.resume();
  return true;
}

export function isAudioRunning(): boolean {
  return getAudioContext()?.state === 'running';
}

export function playNotificationBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;
  [0, 0.16].forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 0 ? 880 : 1046.5;
    gain.gain.setValueAtTime(0, now + offset);
    gain.gain.linearRampToValueAtTime(0.15, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.2);
  });
}
