const env = require('../src/config/env');
const { createApp } = require('../src/app');

const app = createApp({
  startTelegramPolling: env.TELEGRAM_POLLING_ENABLED,
});

module.exports = app;
