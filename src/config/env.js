const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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

function normalizeSiteVariant(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (normalized === 'public') {
    return 'public';
  }

  if (normalized === 'admin') {
    return 'admin';
  }

  return 'full';
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  SITE_VARIANT: normalizeSiteVariant(process.env.SITE_VARIANT),
  SURVEY_JWT_SECRET:
    process.env.SURVEY_JWT_SECRET ||
    process.env.PUBLIC_FLOW_JWT_SECRET ||
    'change-me-survey-flow-secret',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  USE_LOCAL_DATASTORE: readBoolean(process.env.USE_LOCAL_DATASTORE, false),
  LOCAL_DATASTORE_PATH: process.env.LOCAL_DATASTORE_PATH || 'data/local-db.json',
  ADMIN_PANEL_ROUTE: process.env.ADMIN_PANEL_ROUTE || '/super-admin-paneli-8472',
  ADMIN_PANEL_PASSWORD: process.env.ADMIN_PANEL_PASSWORD || 'dogi2345',
  ADMIN_JWT_SECRET:
    process.env.ADMIN_JWT_SECRET ||
    process.env.SURVEY_JWT_SECRET ||
    process.env.PUBLIC_FLOW_JWT_SECRET ||
    'change-me-admin-secret',
  APP_BASE_URL: process.env.APP_BASE_URL || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  TELEGRAM_POLLING_ENABLED: readBoolean(
    process.env.TELEGRAM_POLLING_ENABLED,
    !isVercelRuntime
  ),
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || '*',
};

module.exports = env;
