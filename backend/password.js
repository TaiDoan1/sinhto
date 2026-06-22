const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!String(stored).startsWith('scrypt:')) {
    return password === stored;
  }
  const parts = String(stored).split(':');
  if (parts.length !== 3) return false;
  const [, salt, expected] = parts;
  const actual = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
  } catch {
    return false;
  }
}

function isHashed(password) {
  return String(password || '').startsWith('scrypt:');
}

module.exports = { hashPassword, verifyPassword, isHashed };
