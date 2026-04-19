const { verifyAdminToken } = require('../utils/adminToken');

const ADMIN_COOKIE_NAME = 'admin_session';

function parseCookies(headerValue = '') {
  return String(headerValue)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [rawKey, ...rawValue] = item.split('=');
      if (!rawKey) {
        return acc;
      }

      const key = rawKey.trim();
      const value = rawValue.join('=').trim();
      acc[key] = decodeURIComponent(value || '');
      return acc;
    }, {});
}

function extractAdminToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookies = parseCookies(req.headers.cookie || '');
  return cookies[ADMIN_COOKIE_NAME] || '';
}

function resolveAdminSession(req) {
  const token = extractAdminToken(req);
  if (!token) {
    return null;
  }

  try {
    const payload = verifyAdminToken(token);
    return {
      token,
      payload,
    };
  } catch (_error) {
    return null;
  }
}

function requireAdminAuth(req, res, next) {
  const session = resolveAdminSession(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Admin oturumu gecersiz veya suresi dolmus.',
    });
  }

  req.adminSession = session.payload;
  req.adminToken = session.token;
  return next();
}

function requireAdminPageAuth({ loginPath = '/' } = {}) {
  return (req, res, next) => {
    const session = resolveAdminSession(req);
    if (!session) {
      return res.redirect(loginPath);
    }

    req.adminSession = session.payload;
    req.adminToken = session.token;
    return next();
  };
}

module.exports = {
  ADMIN_COOKIE_NAME,
  parseCookies,
  extractAdminToken,
  requireAdminAuth,
  requireAdminPageAuth,
};
