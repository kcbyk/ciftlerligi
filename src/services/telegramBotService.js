const TelegramBot = require('node-telegram-bot-api');
const env = require('../config/env');
const {
  getPairSummaries,
  getSubmissionById,
  getSubmissionsByPairKey,
} = require('./submissionService');
const { getTelegramConfig } = require('./privateConfigService');
const { logInfo, logError, logWarn } = require('../utils/logger');

let botInstance = null;
let activeToken = '';
let pollingMode = false;

async function isAuthorizedChat(chatId) {
  const config = await getTelegramConfig({ includeSecret: true });
  if (!config.chatId) {
    return true;
  }

  return String(config.chatId) === String(chatId);
}

function formatSubmissionForMessage(submission, { compact = false } = {}) {
  const lines = [
    compact ? 'Yeni anket gonderimi alindi.' : 'Yeni basvuru kaydedildi.',
    `Cift: ${submission.pairName}`,
    `1. Kisi: ${submission.personOneName}`,
    `2. Kisi: ${submission.personTwoName}`,
    `Cevaplayan: ${submission.respondentName} (${submission.genderType})`,
    `Kayit ID: ${submission.id}`,
    `Tarih: ${submission.createdAt}`,
    '',
    'Soru - Cevap:',
  ];

  submission.answersJson.forEach((answer, index) => {
    const value = Array.isArray(answer.answer)
      ? answer.answer.join(', ')
      : String(answer.answer ?? '');

    lines.push(`${index + 1}. ${answer.questionText}`);
    lines.push(`   -> ${value}`);
  });

  return lines.join('\n').slice(0, 3900);
}

async function sendMessage(chatId, text, options = {}) {
  if (!botInstance || !chatId) {
    return false;
  }

  await botInstance.sendMessage(chatId, text, {
    disable_web_page_preview: true,
    ...options,
  });

  return true;
}

async function sendPairList(chatId, greetingText = 'Cift listesi:') {
  const pairs = await getPairSummaries();

  if (!pairs.length) {
    await sendMessage(chatId, 'Henuz kayitli bir cift bulunmuyor.');
    return;
  }

  const keyboard = pairs.map((item) => [
    {
      text: `${item.pairName} (${item.respondentCount})`,
      callback_data: `pair:${item.sampleSubmissionId}`,
    },
  ]);

  await sendMessage(chatId, greetingText, {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}

async function handlePairSelection(query, sampleSubmissionId) {
  const chatId = query.message?.chat?.id;
  if (!chatId) {
    return;
  }

  const sampleSubmission = await getSubmissionById(sampleSubmissionId);
  if (!sampleSubmission) {
    await sendMessage(chatId, 'Bu cift kaydi bulunamadi.');
    return;
  }

  const pairSubmissions = await getSubmissionsByPairKey(sampleSubmission.pairNameLower);
  if (!pairSubmissions.length) {
    await sendMessage(chatId, 'Bu cift icin kisi kaydi bulunamadi.');
    return;
  }

  const keyboard = pairSubmissions.map((row) => [
    {
      text: `${row.respondentName} (${row.genderType})`,
      callback_data: `person:${row.id}:${sampleSubmissionId}`,
    },
  ]);

  keyboard.push([{ text: 'Ciftlere Don', callback_data: 'pairs' }]);

  await sendMessage(chatId, `${sampleSubmission.pairName} kisileri:`, {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}

async function handlePersonSelection(query, submissionId, pairSampleId) {
  const chatId = query.message?.chat?.id;
  if (!chatId) {
    return;
  }

  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    await sendMessage(chatId, 'Kisi yaniti bulunamadi.');
    return;
  }

  const text = formatSubmissionForMessage(submission);
  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Cifte Don', callback_data: `pair:${pairSampleId}` }],
        [{ text: 'Ciftler', callback_data: 'pairs' }],
      ],
    },
  });
}

function registerBotHandlers(bot) {
  bot.onText(/\/start|\/couples/i, async (msg) => {
    try {
      const allowed = await isAuthorizedChat(msg.chat.id);
      if (!allowed) {
        await sendMessage(msg.chat.id, 'Bu bota erisiminiz bulunmuyor.');
        return;
      }

      await sendPairList(msg.chat.id, 'Hos geldiniz. Kayitli ciftler:');
    } catch (error) {
      logError('Telegram /start komutu islenemedi', error);
      await sendMessage(msg.chat.id, 'Liste getirilirken hata olustu.');
    }
  });

  bot.on('callback_query', async (query) => {
    const data = query.data || '';

    try {
      const chatId = query.message?.chat?.id;
      const allowed = await isAuthorizedChat(chatId);
      if (!allowed) {
        await sendMessage(chatId, 'Bu bota erisiminiz bulunmuyor.');
        await bot.answerCallbackQuery(query.id);
        return;
      }

      if (data === 'pairs') {
        await sendPairList(chatId, 'Cift listesi:');
      } else if (data.startsWith('pair:')) {
        const [, sampleSubmissionId] = data.split(':');
        await handlePairSelection(query, sampleSubmissionId);
      } else if (data.startsWith('person:')) {
        const [, submissionId, pairSampleId] = data.split(':');
        await handlePersonSelection(query, submissionId, pairSampleId);
      }

      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      logError('Telegram callback query islenemedi', error);
      try {
        await bot.answerCallbackQuery(query.id, {
          text: 'Islem sirasinda hata olustu.',
          show_alert: true,
        });
      } catch (answerError) {
        logError('Telegram callback query response gonderilemedi', answerError);
      }
    }
  });
}

function createTelegramClient(token, { enablePolling }) {
  return new TelegramBot(token, {
    polling: enablePolling,
  });
}

function normalizeBaseUrl(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return '';
  }

  const withProtocol =
    rawValue.startsWith('http://') || rawValue.startsWith('https://')
      ? rawValue
      : `https://${rawValue}`;

  return withProtocol.replace(/\/+$/, '');
}

function resolvePublicBaseUrl() {
  if (env.APP_BASE_URL) {
    return normalizeBaseUrl(env.APP_BASE_URL);
  }

  if (process.env.VERCEL_URL) {
    return normalizeBaseUrl(process.env.VERCEL_URL);
  }

  return '';
}

async function initializeTelegramBot({ enablePolling = true } = {}) {
  const config = await getTelegramConfig({ includeSecret: true });
  const botToken = config.botToken;

  if (!botToken) {
    logWarn('Telegram token bulunamadi, bot baslatilmadi.');
    return null;
  }

  if (botInstance && activeToken === botToken && pollingMode === enablePolling) {
    return botInstance;
  }

  if (botInstance && pollingMode) {
    try {
      await botInstance.stopPolling();
    } catch (error) {
      logWarn('Eski Telegram polling durdurulamadi.', { message: error.message });
    }
  }

  const nextBot = createTelegramClient(botToken, { enablePolling });
  registerBotHandlers(nextBot);

  if (enablePolling) {
    try {
      await nextBot.deleteWebHook();
    } catch (error) {
      logWarn('Telegram webhook temizlenemedi.', { message: error.message });
    }
  }

  botInstance = nextBot;
  activeToken = botToken;
  pollingMode = enablePolling;

  if (enablePolling) {
    logInfo('Telegram bot polling baslatildi.');
  } else {
    logInfo('Telegram bot polling kapali modda baslatildi.');
  }

  return botInstance;
}

async function configureTelegramWebhook() {
  const config = await getTelegramConfig({ includeSecret: true });
  if (!config.botToken) {
    logWarn('Telegram token bulunamadi, webhook ayarlanamadi.');
    return false;
  }

  if (!botInstance || pollingMode || activeToken !== config.botToken) {
    await initializeTelegramBot({ enablePolling: false });
  }

  if (!botInstance) {
    return false;
  }

  const baseUrl = resolvePublicBaseUrl();
  if (!baseUrl) {
    logWarn('APP_BASE_URL tanimli degil, Telegram webhook ayarlanamadi.');
    return false;
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  const secretToken = String(env.TELEGRAM_WEBHOOK_SECRET || '').trim();

  const webhookOptions = {
    drop_pending_updates: false,
  };

  if (secretToken) {
    webhookOptions.secret_token = secretToken;
  }

  await botInstance.setWebHook(webhookUrl, webhookOptions);
  logInfo('Telegram webhook ayarlandi.', { webhookUrl });
  return true;
}

async function reloadTelegramBot({ enablePolling = true } = {}) {
  if (botInstance && pollingMode) {
    try {
      await botInstance.stopPolling();
    } catch (error) {
      logWarn('Telegram polling kapatilirken hata olustu.', { message: error.message });
    }
  }

  botInstance = null;
  activeToken = '';
  pollingMode = false;

  return initializeTelegramBot({ enablePolling });
}

async function processTelegramWebhookUpdate(update) {
  if (!update || typeof update !== 'object') {
    return false;
  }

  if (!botInstance) {
    await initializeTelegramBot({ enablePolling: false });
  }

  if (!botInstance) {
    return false;
  }

  botInstance.processUpdate(update);
  return true;
}

async function sendSubmissionNotification(submission) {
  const config = await getTelegramConfig({ includeSecret: true });
  if (!config.chatId) {
    logWarn('Telegram chat id eksik, bildirim gonderilemedi.');
    return false;
  }

  if (!botInstance) {
    await initializeTelegramBot({ enablePolling: false });
  }

  if (!botInstance) {
    return false;
  }

  const message = formatSubmissionForMessage(submission, { compact: true });
  await sendMessage(config.chatId, message);
  return true;
}

async function sendTestMessage() {
  const config = await getTelegramConfig({ includeSecret: true });
  if (!config.chatId) {
    const error = new Error('Telegram chat id tanimlanmamis.');
    error.statusCode = 400;
    throw error;
  }

  if (!botInstance) {
    await initializeTelegramBot({ enablePolling: false });
  }

  if (!botInstance) {
    const error = new Error('Telegram bot baslatilamadi. Token bilgisini kontrol edin.');
    error.statusCode = 400;
    throw error;
  }

  await sendMessage(
    config.chatId,
    'Test mesaji: Telegram entegrasyonu basariyla calisiyor. <3'
  );

  return true;
}

function getTelegramStatus() {
  return {
    isActive: Boolean(botInstance),
    tokenLoaded: Boolean(activeToken),
    pollingMode,
  };
}

module.exports = {
  initializeTelegramBot,
  configureTelegramWebhook,
  reloadTelegramBot,
  processTelegramWebhookUpdate,
  sendSubmissionNotification,
  sendTestMessage,
  getTelegramStatus,
};
