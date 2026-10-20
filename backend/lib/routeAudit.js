// Walks the Express route tree and reports the guards on every API endpoint.
// Used by test/route-audit.test.js and by `npm run audit:routes`.
function mountPath(layer) {
  if (layer.regexp && layer.regexp.fast_slash) return '';
  const src = layer.regexp ? layer.regexp.source : '';
  const m = src.replace('\\/?(?=\\/|$)', '').replace(/^\^/, '').replace(/\\\//g, '/');
  return m.replace(/\$$/, '');
}

function walk(stack, prefix, inherited, out) {
  let guards = inherited.slice();
  for (const layer of stack) {
    if (layer.route) {
      const handlers = layer.route.stack.map((s) => s.name || 'anonymous');
      const methods = Object.keys(layer.route.methods).map((x) => x.toUpperCase());
      for (const method of methods) {
        out.push({ method, path: prefix + layer.route.path, guards: guards.concat(handlers) });
      }
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      walk(layer.handle.stack, prefix + mountPath(layer), guards, out);
    } else if (layer.name && layer.name !== 'bound dispatch' && layer.name !== '<anonymous>') {
      guards = guards.concat(layer.name);
    } else if (layer.name === '<anonymous>') {
      guards = guards.concat('anonymous');
    }
  }
}

function collectRoutes(app) {
  const out = [];
  walk(app._router.stack, '', [], out);
  return out.filter((r) => r.path.startsWith('/api'));
}

// Endpoints that are intentionally reachable without a session.
const PUBLIC = [
  ['GET', '/api/health'],
  ['POST', '/api/auth/login'],
  ['POST', '/api/auth/2fa/verify-login'], // second step of login, needs the pending-login token
  ['POST', '/api/auth/forgot-password'], // recovery-code reset, rate limited
  ['POST', '/api/v3/payments/mpesa/callback'], // Safaricom callback, shared-secret verified
  ['GET', '/api/v3/verify/:code'], // public QR verification of transcripts and certificates
];

function isAuthed(route) {
  return route.guards.some((g) => /requireAuth|authenticate/i.test(g));
}

module.exports = { collectRoutes, isAuthed, PUBLIC };
