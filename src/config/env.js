const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function sanitizeRoutePath(routePath) {
  const normalized = (routePath || 'super-admin-paneli-8472').trim();
  return normalized.replace(/^\/+/, '').replace(/\/+$/, '');
}

function readBoolean(value, defaultValue) {
  if (typeof value === 'undefined') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

const isVercelRuntime = process.env.VERCEL === '1';

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  ADMIN_ROUTE_PATH: sanitizeRoutePath(process.env.ADMIN_ROUTE_PATH),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '[ADMIN_SIFRESI]',
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || 'change-me-admin-session-secret',
  PUBLIC_FLOW_JWT_SECRET:
    process.env.PUBLIC_FLOW_JWT_SECRET || 'change-me-public-flow-secret',
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'cift_admin_session',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  TELEGRAM_POLLING_ENABLED: readBoolean(
    process.env.TELEGRAM_POLLING_ENABLED,
    !isVercelRuntime
  ),
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || '*',
};

module.exports = env;
