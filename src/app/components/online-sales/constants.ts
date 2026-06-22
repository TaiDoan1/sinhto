import type { PipelineStage } from '../../types/onlineSales';

export const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: 'fb_new', label: 'Mới inbox FB', color: 'bg-slate-100 text-slate-700' },
  { id: 'fb_replied', label: 'Đã rep FB', color: 'bg-blue-100 text-blue-800' },
  { id: 'zalo_sent', label: 'Đã nhắn Zalo', color: 'bg-sky-100 text-sky-800' },
  { id: 'web_sent', label: 'Đã gửi web', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'closed_retail', label: 'Đã mua lẻ', color: 'bg-amber-100 text-amber-800' },
  { id: 'closed_combo', label: 'Đã mua combo', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'nurturing', label: 'Đang chăm sóc', color: 'bg-violet-100 text-violet-800' },
  { id: 'upsell_pending', label: 'Chờ upsale', color: 'bg-orange-100 text-orange-800' },
];

export const ZALO_TEMPLATES = {
  th1_intro: {
    label: 'TH1 — Chào + gửi web (khách lẻ)',
    text: `Chào {name}! FitBlend cảm ơn bạn đã quan tâm 🥤
Mình gửi bạn link tham khảo menu & combo protein smoothie giao tươi mỗi sáng:
{webLink}

Bạn muốn thử ly lẻ hay đăng ký combo tháng tiết kiệm hơn ạ? Mình tư vấn miễn phí nhé!`,
  },
  th1_upsell: {
    label: 'TH1 — Upsale combo',
    text: `{name} ơi, combo tháng FitBlend giúp tiết kiệm ~15% so với mua lẻ + freeship mỗi sáng 🎁
Bạn xem gói phù hợp tại: {webLink}
Mình hỗ trợ chọn vị 7 ngày/tuần cho bạn nhé!`,
  },
  th2_welcome: {
    label: 'TH2 — Chào khách combo mới',
    text: `Chào {name}! Cảm ơn bạn đã đăng ký combo FitBlend 💪
Mình là {staffName}, sẽ đồng hành chăm sóc lộ trình dinh dưỡng cho bạn.
Bạn thích vị nào tuần này? Có câu hỏi gì cứ nhắn mình nhé!`,
  },
  th2_renewal: {
    label: 'TH2 — Combo sắp hết / gia hạn',
    text: `{name} ơi, combo của bạn sắp hết rồi ạ ⏰
Gia hạn thêm để duy trì thói quen ăn đủ protein — combo tháng vẫn đang giảm 15%:
{webLink}
Mình giữ vị yêu thích tuần trước cho bạn luôn nhé!`,
  },
  followup: {
    label: 'Follow-up chung',
    text: `Chào {name}! Mình là {staffName} từ FitBlend.
Bạn còn quan tâm protein smoothie giao sáng không ạ? Mình sẵn sàng tư vấn thêm 😊`,
  },
};

export function buildWebLink(refCode?: string) {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://fitblend.vn';
  const params = new URLSearchParams();
  if (refCode) params.set('cs', refCode);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function fillTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
    template
  );
}

export function comboDaysRemaining(startDate: Date | string, duration?: string): number {
  const start = new Date(startDate);
  const days = duration === 'monthly' ? 30 : duration === 'quarterly' ? 90 : 7;
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}
