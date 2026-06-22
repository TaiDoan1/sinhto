/** Chuyen chuoi tieng Viet co dau sang khong dau */
function removeDiacritics(str) {
  if (typeof str !== 'string' || !str) return str;
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** Chuyen de quy object/array/string */
function deepConvert(value) {
  if (typeof value === 'string') return removeDiacritics(value);
  if (Array.isArray(value)) return value.map(deepConvert);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepConvert(v);
    }
    return out;
  }
  return value;
}

/** Parse JSON neu co, convert, tra ve string hoac gia tri goc */
function convertMaybeJson(value) {
  if (value == null || value === '') return value;
  if (typeof value !== 'string') return deepConvert(value);
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(deepConvert(parsed));
  } catch {
    return removeDiacritics(value);
  }
}

module.exports = { removeDiacritics, deepConvert, convertMaybeJson };
