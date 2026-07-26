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
let speechUnlocked = false;

if (typeof window !== 'undefined') {
  const unlockAll = () => {
    unlockOne(NOTIFY_SRC);
    // Nhiều trình duyệt/WebView (đặc biệt Android) chỉ cho phép speechSynthesis phát tiếng
    // sau khi có 1 lần gọi speak() gắn với thao tác thật của người dùng — làm "ấm" ngay từ
    // lần chạm/click đầu tiên để lần đọc thông báo sau đó (do sự kiện server đẩy tới) không
    // bị chặn âm thầm.
    if (!speechUnlocked && 'speechSynthesis' in window) {
      try {
        const warmup = new SpeechSynthesisUtterance(' ');
        warmup.volume = 0;
        window.speechSynthesis.speak(warmup);
        speechUnlocked = true;
      } catch {
        /* ignore */
      }
    }
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

// Đọc bằng giọng đọc trình duyệt (Web Speech API) — cho phép Admin đổi nội dung câu thông báo
// mà không cần tạo lại file âm thanh. LUÔN phát kèm tiếng "ting" thật (không chỉ khi lỗi) —
// speechSynthesis có thể bị chặn ÂM THẦM (không bắn onerror) trên một số trình duyệt/WebView
// thiếu giọng đọc tiếng Việt, khiến nhân viên tưởng không có thông báo gì cả nếu chỉ dựa vào
// giọng đọc. Tiếng "ting" qua thẻ <audio> đáng tin cậy hơn nhiều nên luôn đảm bảo nghe được.
export function speakOrderNotification(text: string) {
  playNotificationBeep();
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'vi-VN';
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  } catch {
    /* tiếng "ting" đã phát ở trên, không cần fallback thêm */
  }
}
