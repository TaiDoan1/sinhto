// Xác thực bằng JWT (HS256) tự ký bằng crypto — không cần thêm thư viện ngoài.
// Token cấp khi đăng nhập (employee-login), client gửi lại qua header Authorization: Bearer <token>.
const crypto = require('crypto');

// ĐỔI JWT_SECRET trên production (biến môi trường). Fallback chỉ dùng cho môi trường dev.
const SECRET = process.env.JWT_SECRET || 'fitblend-dev-secret-doi-tren-production';
const DEFAULT_TTL_SECONDS = 60 * 60 * 12; // 12 giờ

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

function fromB64url(str) {
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString();
}

function sign(data) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signToken(payload, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const body = b64urlJson({ ...payload, iat: now, exp: now + ttlSeconds });
  const data = `${header}.${body}`;
  return `${data}.${sign(data)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const expected = sign(data);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  let claims;
  try {
    claims = JSON.parse(fromB64url(body));
  } catch {
    return null;
  }
  if (claims.exp && Math.floor(Date.now() / 1000) > claims.exp) return null;
  return claims;
}

function getTokenFromReq(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (h && h.startsWith('Bearer ')) return h.slice(7).trim();
  // EventSource (SSE) không đặt được header → cho phép truyền token qua query cho các route cần.
  if (req.query && req.query.token) return String(req.query.token);
  return null;
}

function requireAuth(req, res, next) {
  const user = verifyToken(getTokenFromReq(req));
  if (!user) {
    return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
  }
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    if (roles.length && !roles.includes(req.user.position)) {
      return res.status(403).json({ error: 'Không đủ quyền truy cập' });
    }
    next();
  };
}

module.exports = { signToken, verifyToken, getTokenFromReq, requireAuth, requireRole };
