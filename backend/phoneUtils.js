/** Chuẩn hóa SĐT Việt Nam để so khớp (0912…, +84…, 84912…). */
function normalizePhoneVN(raw) {
  if (raw == null) return '';
  let s = String(raw).trim().replace(/\s/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length >= 11) s = '0' + s.slice(2);
  s = s.replace(/\D/g, '');
  if (s.length === 9 && !s.startsWith('0')) s = '0' + s;
  return s;
}

function phonesMatch(a, b) {
  const na = normalizePhoneVN(a);
  const nb = normalizePhoneVN(b);
  return na.length >= 9 && na === nb;
}

module.exports = { normalizePhoneVN, phonesMatch };
