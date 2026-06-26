/** Chuẩn hóa SĐT Việt Nam để gửi API / so khớp. */
export function normalizePhoneVN(raw: string): string {
  if (!raw) return '';
  let s = raw.trim().replace(/\s/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length >= 11) s = '0' + s.slice(2);
  s = s.replace(/\D/g, '');
  if (s.length === 9 && !s.startsWith('0')) s = '0' + s;
  return s;
}
