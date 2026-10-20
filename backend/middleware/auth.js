const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET is required and must be at least 32 characters. Copy .env.example to .env and set a strong secret.');
const { db } = require('../db');
const { getRole, effectiveRole, hasCap } = require('../lib/roles');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCookie(req,name){ const raw=String(req.headers.cookie||''); const hit=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'=')); return hit?decodeURIComponent(hit.slice(name.length+1)):null; }

// API keys are stored as SHA-256 hashes, never in plain text.
function hashKey(key) { return crypto.createHash('sha256').update(String(key)).digest('hex'); }

function hasEnded(value) {
  if (!value) return false;
  const text = String(value);
  const time = new Date(text.length <= 10 ? text + 'T23:59:59' : text).getTime();
  return !Number.isNaN(time) && time < Date.now();
}

// Paths a suspended student may still reach: sign out, see who they are, and read the suspension notice.
const SUSPENDED_PATHS = ['/api/auth/me', '/api/auth/logout', '/api/role-ops/me', '/api/role-ops/my-status'];

// Decides whether a request is allowed for roles that are limited to looking (read-only,
// write_allow, API-only, suspended) or for an administrator who is "viewing as" someone else.
function blockedByRoleLimits(req, role) {
  const url = String(req.originalUrl || req.url || '').split('?')[0];
  const method = req.method.toUpperCase();
  const safe = SAFE_METHODS.has(method);

  if (req.user.imp && !safe && url !== '/api/role-ops/impersonate/exit' && url !== '/api/auth/logout') {
    return 'You are viewing as another user. This view is read-only.';
  }
  if (role && role.api_only && !url.startsWith('/api/role-ops/machine/')) {
    return 'This account can only use its API key on the machine endpoints.';
  }
  if (role && role.acts_as === 'suspended' && !SUSPENDED_PATHS.includes(url)) {
    return 'Your account is suspended. Please see the suspension notice.';
  }
  if (role && (role.read_only || role.write_allow) && !safe) {
    // Each role desk route checks the role's own power with requireCap, so the desk stays usable.
    if (url.startsWith('/api/role-ops/')) return null;
    if (url === '/api/auth/logout') return null;
    if (role.write_allow && role.write_allow.some((p) => url.startsWith(p))) return null;
    return 'Your role can view this but not change it.';
  }
  return null;
}

function authenticateApiKey(req, res, next, rawKey) {
  const row = db.prepare(`SELECT k.id, k.scopes, k.expires_at, k.revoked_at, u.id user_id, u.name, u.email, u.role, u.active
    FROM machine_api_keys k JOIN users u ON u.id = k.user_id WHERE k.key_hash = ?`).get(hashKey(rawKey));
  if (!row || row.revoked_at || row.active === 0 || row.role !== 'machine_user' || hasEnded(row.expires_at)) {
    return res.status(401).json({ error: 'Invalid, expired or revoked API key.' });
  }
  db.prepare("UPDATE machine_api_keys SET last_used_at = datetime('now') WHERE id = ?").run(row.id);
  const role = getRole('machine_user');
  req.user = {
    id: row.user_id, name: row.name, email: row.email,
    role: effectiveRole('machine_user'), actual_role: 'machine_user',
    api_key: { id: row.id, scopes: String(row.scopes || '').split(',').map((s) => s.trim()).filter(Boolean) },
  };
  const blocked = blockedByRoleLimits(req, role);
  if (blocked) return res.status(403).json({ error: blocked });
  return next();
}

function requireAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return authenticateApiKey(req, res, next, apiKey);

  const header = req.headers.authorization;
  const token = (header && header.startsWith('Bearer ')) ? header.split(' ')[1] : readCookie(req,'matara_session');
  if (!token) return res.status(401).json({ error: 'No active session. Please log in.' });
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  // A deactivated or deleted account is locked out straight away,
  // even if its login token has not expired yet.
  const account = db.prepare('SELECT active, session_version, role, access_expires_at FROM users WHERE id = ?').get(payload.id);
  if (!account || account.active === 0) {
    return res.status(401).json({ error: 'This account is no longer active. Please contact the university office.' });
  }

  // Invalidate legacy parent portal sessions even if their JWT has not expired.
  if (String(account.role || '').toLowerCase() === 'parent') {
    return res.status(403).json({ error: 'Parent portal access is disabled for the university ERP.' });
  }

  if ((payload.sessionVersion || 1) !== (account.session_version || 1)) {
    return res.status(401).json({ error: 'Your session has expired because your account security details changed. Please log in again.' });
  }

  // Temporary roles (invigilators, external examiners) stop working when their access ends.
  if (hasEnded(account.access_expires_at)) {
    return res.status(401).json({ error: 'Your temporary access has ended. Please contact the university office.' });
  }

  // The role in the database is the truth, so a role change takes effect at once.
  // "role" is the older role whose permissions the account inherits (used by existing
  // routes); "actual_role" is the real account type (used by role-specific powers).
  const actual = account.role || payload.role;
  req.user = { ...payload, role: effectiveRole(actual), actual_role: actual };

  const blocked = blockedByRoleLimits(req, getRole(actual));
  if (blocked) return res.status(403).json({ error: blocked });
  next();
}

function requireRole(...roles) {
  const guard = (req, res, next) => {
    const academicAliases = new Set(['lecturer','senior_lecturer','professor','academic_staff']);
    const roleAllowed = req.user && (roles.includes(req.user.role) || (roles.includes('teacher') && academicAliases.has(req.user.role)));
    if (!roleAllowed) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
  return Object.defineProperty(guard, 'name', { value: 'requireRole' });
}

// A power that belongs to one role only (grade lock, holds, gate scans...).
// It checks the real role, so inheriting an older role never grants it.
function requireCap(cap) {
  const guard = (req, res, next) => {
    if (!req.user || !hasCap(req.user.actual_role, cap)) {
      return res.status(403).json({ error: 'Your role does not include this action.' });
    }
    next();
  };
  return Object.defineProperty(guard, 'name', { value: 'requireCap' });
}

module.exports = { requireAuth, requireRole, requireCap, hashKey };
