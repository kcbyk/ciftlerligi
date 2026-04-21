const { getFirestore } = require('../config/firebase');
const { PRIVATE_SETTINGS_COLLECTION } = require('../constants/collections');
const env = require('../config/env');
const { normalizeText } = require('../utils/sanitize');

const TELEGRAM_DOC_ID = 'telegram';

function nowIso() {
  return new Date().toISOString();
}

function privateSettingsRef() {
  return getFirestore().collection(PRIVATE_SETTINGS_COLLECTION).doc(TELEGRAM_DOC_ID);
}

async function getTelegramConfig({ includeSecret = true } = {}) {
  const snapshot = await privateSettingsRef().get();
  const row = snapshot.exists ? snapshot.data() : {};

  const botToken = normalizeText(row.botToken || env.TELEGRAM_BOT_TOKEN);
  const chatId = normalizeText(row.chatId || env.TELEGRAM_CHAT_ID);

  return {
    botToken: includeSecret ? botToken : maskToken(botToken),
    chatId,
    updatedAt: row.updatedAt || null,
  };
}

function maskToken(token) {
  if (!token) {
    return '';
  }

  if (token.length <= 8) {
    return `${token.slice(0, 2)}***${token.slice(-2)}`;
  }

  return `${token.slice(0, 4)}********${token.slice(-4)}`;
}

async function updateTelegramConfig({ botToken, chatId }) {
  const patch = {
    updatedAt: nowIso(),
  };

  if (typeof botToken === 'string') {
    patch.botToken = normalizeText(botToken);
  }

  if (typeof chatId === 'string') {
    patch.chatId = normalizeText(chatId);
  }

  await privateSettingsRef().set(patch, { merge: true });

  return getTelegramConfig({ includeSecret: true });
}

module.exports = {
  getTelegramConfig,
  updateTelegramConfig,
};
