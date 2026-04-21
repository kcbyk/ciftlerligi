const express = require('express');
const env = require('../config/env');
const {
  getDatastoreMode,
  resolveLocalDatastorePath,
} = require('../config/firebase');
const { processTelegramWebhookUpdate } = require('../services/telegramBotService');

const router = express.Router();

router.get('/health', (_req, res) => {
  const bootstrapError = _req.app?.locals?.bootstrapError || '';
  res.json({
    success: true,
    service: 'cift-uyum-yarismasi-api',
    environment: env.NODE_ENV,
    siteVariant: env.SITE_VARIANT,
    datastoreMode: getDatastoreMode(),
    localDatastorePath:
      getDatastoreMode() === 'local' ? resolveLocalDatastorePath() : '',
    degraded: Boolean(bootstrapError),
    bootstrapError,
    timestamp: new Date().toISOString(),
  });
});

router.post('/telegram/webhook', async (req, res, next) => {
  try {
    const expectedSecret = String(env.TELEGRAM_WEBHOOK_SECRET || '').trim();
    if (expectedSecret) {
      const receivedSecret = String(
        req.get('x-telegram-bot-api-secret-token') || ''
      ).trim();

      if (receivedSecret !== expectedSecret) {
        return res.status(401).json({
          success: false,
          message: 'Yetkisiz webhook istegi.',
        });
      }
    }

    await processTelegramWebhookUpdate(req.body);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
