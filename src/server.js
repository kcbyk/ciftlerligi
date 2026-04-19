const env = require('./config/env');
const { createApp, ensureBootstrapped } = require('./app');
const { logInfo, logError } = require('./utils/logger');

const app = createApp({
  startTelegramPolling: env.TELEGRAM_POLLING_ENABLED,
});

async function startServer() {
  try {
    await ensureBootstrapped({
      startTelegramPolling: env.TELEGRAM_POLLING_ENABLED,
    });

    app.listen(env.PORT, () => {
      logInfo('Sunucu baslatildi', {
        port: env.PORT,
      });
    });
  } catch (error) {
    logError('Sunucu baslatilamadi', error);
    process.exit(1);
  }
}

startServer();
