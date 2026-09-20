// Real server-side authentication for the POS API.
//
// Before this file existed, every "protected" route trusted an `x-user-role`
// header that the BROWSER set itself, so anyone could send
// `x-user-role: admin` and be an admin. Now:
//   1. /api/auth/login and /api/auth/google-login return a signed token.
//   2. Every other /api/* request must carry it as `Authorization: Bearer <token>`.
//   3. The user's id/role/name come from inside the verified token — never
//      from a request header.
//
// Uses only Node's built-in crypto (HS256 JWT format), so there is nothing
// new to `npm install` on Render.

const crypto = require('crypto');

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // one long shift; re-login after that

let SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  // Never fall back to a hardcoded/guessable secret. A random per-process one
  // is safe, but every restart (Render free tier restarts after idling) logs
  // everyone out — so set JWT_SECRET in the Render environment.
  SECRET = crypto.randomBytes(48).toString('hex');
  console.warn(
    '[auth] JWT_SECRET is missing or shorter than 32 characters. Using a random ' +
    'secret for this process only — all staff will be logged out on every restart. ' +
    'Set JWT_SECRET in the Render environment variables.'
  );
}

const b64url = (input) => Buffer.from(input).toString('base64url');

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    sub: user.id,
    role: user.role,
    name: user.name,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  }));
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const expected = Buffer.from(sign(`${header}.${payload}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

  try {
    const h = JSON.parse(Buffer.from(header, 'base64url').toString());
    if (h.alg !== 'HS256') return null;
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!p.exp || p.exp < Math.floor(Date.now() / 1000)) return null;
    if (!p.sub || !p.role) return null;
    return p;
  } catch (e) {
    return null;
  }
}

// Only these can be called without a token. (Mounted on /api, so req.path
// is relative to that.)
const PUBLIC_POST_PATHS = new Set([
  '/auth/login',
  '/auth/google-login',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

// Mounted with app.use('/api', authenticate): default-deny for every API route.
function authenticate(req, res, next) {
  if (req.method === 'OPTIONS') return next(); // CORS preflight
  const cleanPath = req.path.replace(/\/+$/, '') || '/';
  if (req.method === 'POST' && PUBLIC_POST_PATHS.has(cleanPath)) return next();

  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  const payload = match && verifyToken(match[1]);
  if (!payload) return res.status(401).json({ error: 'Authentication required' });

  req.user = { id: payload.sub, role: payload.role, name: payload.name };
  next();
}

const verifyRole = (roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Permission denied for this task' });
  }
  next();
};

// Small in-memory limiter (fine for a single Render instance). Used to slow
// down password guessing and reset-email spam.
function makeLimiter(max, windowMs) {
  const hits = new Map(); // key -> { count, resetAt }
  const prune = () => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  };
  return {
    isBlocked(key) {
      const e = hits.get(key);
      return !!e && e.resetAt > Date.now() && e.count >= max;
    },
    hit(key) {
      prune();
      const e = hits.get(key);
      if (e && e.resetAt > Date.now()) e.count += 1;
      else hits.set(key, { count: 1, resetAt: Date.now() + windowMs });
    },
    clear(key) { hits.delete(key); },
  };
}

module.exports = { signToken, verifyToken, authenticate, verifyRole, makeLimiter, TOKEN_TTL_SECONDS };
