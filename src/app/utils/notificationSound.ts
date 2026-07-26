interface SoundHandle {
  el: HTMLAudioElement | null;
  unlocked: boolean;
}

const handles = new Map<string, SoundHandle>();

function getHandle(src: string): SoundHandle {
  let h = handles.get(src);
  if (!h) {
    h = { el: null, unlocked: false };
    handles.set(src, h);
  }
  return h;
}

function getAudioEl(src: string): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  const h = getHandle(src);
  if (!h.el) {
    h.el = new Audio(src);
    h.el.preload = 'auto';
  }
  return h.el;
}

// Dùng thẻ <audio> chuẩn thay vì Web Audio API — Safari (đặc biệt trên iOS/Mac) chặn Web Audio
// tự phát nghiêm ngặt hơn nhiều so với play() của <audio>. Mở khóa ngay khi người dùng tương tác
// lần đầu; vẫn có nút "Bật âm thanh" thủ công (xem unlockAudio) để chắc chắn kích hoạt được.
function unlockOne(src: string) {
  const h = getHandle(src);
  const el = getAudioEl(src);
  if (!el) return;
  el.muted = true;
  el.play()
    .then(() => {
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      h.unlocked = true;
    })
    .catch(() => {});
}

const NOTIFY_SRC = '/sounds/notify.wav';
const ORDER_SRC = '/sounds/order-notify.wav';

if (typeof window !== 'undefined') {
  const unlockAll = () => {
    unlockOne(NOTIFY_SRC);
    unlockOne(ORDER_SRC);
  };
  window.addEventListener('click', unlockAll);
  window.addEventListener('keydown', unlockAll);
  window.addEventListener('touchstart', unlockAll);
}

export function unlockAudio(): boolean {
  const el = getAudioEl(NOTIFY_SRC);
  if (!el) return false;
  const h = getHandle(NOTIFY_SRC);
  el.muted = false;
  el.currentTime = 0;
  el.play()
    .then(() => {
      h.unlocked = true;
    })
    .catch(() => {});
  return true;
}

export function isAudioRunning(): boolean {
  return getHandle(NOTIFY_SRC).unlocked;
}

export function playNotificationBeep() {
  const el = getAudioEl(NOTIFY_SRC);
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}

// Thông báo giọng nói "Có đơn hàng online mới" (file ghi sẵn, mặc định) — dùng khi CSKH đưa
// đơn xuống POS chi nhánh, hoặc làm phương án dự phòng khi trình duyệt không hỗ trợ đọc chữ.
export function playOrderNotification() {
  const el = getAudioEl(ORDER_SRC);
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}

// Đọc bằng giọng đọc trình duyệt (Web Speech API) — cho phép Admin đổi nội dung câu thông báo
// mà không cần tạo lại file âm thanh. Rơi về file ghi sẵn nếu trình duyệt không hỗ trợ đọc.
export function speakOrderNotification(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    playOrderNotification();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'vi-VN';
    utter.rate = 1;
    utter.onerror = () => playOrderNotification();
    window.speechSynthesis.speak(utter);
  } catch {
    playOrderNotification();
  }
}
