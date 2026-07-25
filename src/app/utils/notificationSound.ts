let audioEl: HTMLAudioElement | null = null;
let unlocked = false;

function getAudioEl(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audioEl) {
    audioEl = new Audio('/sounds/notify.wav');
    audioEl.preload = 'auto';
  }
  return audioEl;
}

// Dùng thẻ <audio> chuẩn thay vì Web Audio API — Safari (đặc biệt trên iOS/Mac) chặn Web Audio
// tự phát nghiêm ngặt hơn nhiều so với play() của <audio>. Mở khóa ngay khi người dùng tương tác
// lần đầu; vẫn có nút "Bật âm thanh" thủ công (xem unlockAudio) để chắc chắn kích hoạt được.
if (typeof window !== 'undefined') {
  const unlock = () => {
    const el = getAudioEl();
    if (!el) return;
    el.muted = true;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
        unlocked = true;
      })
      .catch(() => {});
  };
  window.addEventListener('click', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
}

export function unlockAudio(): boolean {
  const el = getAudioEl();
  if (!el) return false;
  el.muted = false;
  el.currentTime = 0;
  el.play()
    .then(() => {
      unlocked = true;
    })
    .catch(() => {});
  return true;
}

export function isAudioRunning(): boolean {
  return unlocked;
}

export function playNotificationBeep() {
  const el = getAudioEl();
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}
