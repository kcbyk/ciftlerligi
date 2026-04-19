const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const env = require('./config/env');
const { initializeFirebase } = require('./config/firebase');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { requireAdminPageAuth } = require('./middlewares/adminAuth');
const { bootstrapData } = require('./services/bootstrapService');
const {
  initializeTelegramBot,
  configureTelegramWebhook,
} = require('./services/telegramBotService');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { logError } = require('./utils/logger');

const rootDir = process.cwd();
const publicDir = path.resolve(rootDir, 'public');
const viewsDir = path.resolve(rootDir, 'views');

function normalizeAdminRoute(routeValue) {
  const raw = String(routeValue || '').trim();
  const fallback = '/super-admin-paneli-8472';
  if (!raw) {
    return fallback;
  }

  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  const cleaned = withLeadingSlash.replace(/\/+$/, '');
  return cleaned || fallback;
}

let bootPromise = null;

async function ensureBootstrapped({ startTelegramPolling = false } = {}) {
  if (!bootPromise) {
    bootPromise = (async () => {
      initializeFirebase();
      await bootstrapData();

      await initializeTelegramBot({ enablePolling: startTelegramPolling });

      if (!startTelegramPolling) {
        await configureTelegramWebhook();
      }
    })().catch((error) => {
      bootPromise = null;
      throw error;
    });
  }

  return bootPromise;
}

function createApp({ startTelegramPolling = false } = {}) {
  const app = express();
  const adminRoute = normalizeAdminRoute(env.ADMIN_PANEL_ROUTE);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(compression());
  app.use(
    cors({
      origin: env.ALLOWED_ORIGIN === '*' ? true : env.ALLOWED_ORIGIN,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(async (_req, _res, next) => {
    try {
      await ensureBootstrapped({ startTelegramPolling });
    } catch (error) {
      logError('Uygulama bootstrap asamasinda hata', error);
      app.locals.bootstrapError = error.message;
    }

    next();
  });

  app.use(express.static(publicDir, { extensions: ['html'] }));

  app.get('/', (_req, res) => {
    res.sendFile(path.resolve(publicDir, 'index.html'));
  });

  app.get('/form', (_req, res) => {
    res.sendFile(path.resolve(publicDir, 'form.html'));
  });

  app.get('/anket', (_req, res) => {
    res.sendFile(path.resolve(publicDir, 'quiz.html'));
  });

  app.get('/tamamlandi', (_req, res) => {
    res.sendFile(path.resolve(publicDir, 'success.html'));
  });

  app.get(adminRoute, (_req, res) => {
    res.sendFile(path.resolve(viewsDir, 'admin-login.html'));
  });

  app.get(
    `${adminRoute}/dashboard`,
    requireAdminPageAuth({ loginPath: adminRoute }),
    (_req, res) => {
      res.sendFile(path.resolve(viewsDir, 'admin-dashboard.html'));
    }
  );

  app.use('/api/public', publicRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', systemRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
  ensureBootstrapped,
};
