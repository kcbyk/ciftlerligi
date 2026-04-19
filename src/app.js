const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const env = require('./config/env');
const { initializeFirebase } = require('./config/firebase');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { bootstrapData } = require('./services/bootstrapService');
const { initializeTelegramBot } = require('./services/telegramBotService');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { logError } = require('./utils/logger');

const rootDir = process.cwd();
const publicDir = path.resolve(rootDir, 'public');
const viewsDir = path.resolve(rootDir, 'views');
const adminBasePath = `/${env.ADMIN_ROUTE_PATH}`;

let bootPromise = null;

async function ensureBootstrapped({ startTelegramPolling = false } = {}) {
  if (!bootPromise) {
    bootPromise = (async () => {
      initializeFirebase();
      await bootstrapData();

      if (startTelegramPolling) {
        await initializeTelegramBot({ enablePolling: true });
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
  app.use(cookieParser());
  app.use(
    session({
      name: env.SESSION_COOKIE_NAME,
      secret: env.ADMIN_SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'strict',
        secure: env.NODE_ENV === 'production',
        maxAge: 6 * 60 * 60 * 1000,
      },
    })
  );

  app.use(async (_req, _res, next) => {
    try {
      await ensureBootstrapped({ startTelegramPolling });
      next();
    } catch (error) {
      logError('Uygulama bootstrap asamasinda hata', error);
      next(error);
    }
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

  app.get(adminBasePath, (_req, res) => {
    res.sendFile(path.resolve(viewsDir, 'admin-login.html'));
  });

  app.get(`${adminBasePath}/dashboard`, (req, res) => {
    if (!req.session?.isAdmin) {
      return res.redirect(adminBasePath);
    }

    return res.sendFile(path.resolve(viewsDir, 'admin-dashboard.html'));
  });

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
  adminBasePath,
};
