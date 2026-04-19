const path = require('node:path');
const crypto = require('node:crypto');
const env = require('../config/env');
const { getSettings, updateSettings } = require('../services/settingsService');
const {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} = require('../services/questionService');
const {
  listSubmissions,
  getSubmissionById,
} = require('../services/submissionService');
const { logAdminAction, listAdminLogs } = require('../services/adminLogService');
const {
  getTelegramConfig,
  updateTelegramConfig,
} = require('../services/privateConfigService');
const {
  reloadTelegramBot,
  sendTestMessage,
  getTelegramStatus,
} = require('../services/telegramBotService');
const { ensureGenderType, normalizeText } = require('../utils/sanitize');

function safeTimingCompare(a, b) {
  const valueA = Buffer.from(String(a || ''));
  const valueB = Buffer.from(String(b || ''));

  if (valueA.length !== valueB.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueA, valueB);
}

async function adminLogin(req, res) {
  const password = req.body?.password || '';
  const passwordMatches = safeTimingCompare(password, env.ADMIN_PASSWORD);

  if (!passwordMatches) {
    await logAdminAction({
      actionType: 'ADMIN_LOGIN_FAILED',
      actionDetail: 'Hatali sifre denemesi.',
      req,
    });

    return res.status(401).json({
      success: false,
      message: 'Sifre yanlis. Erisim reddedildi.',
    });
  }

  req.session.isAdmin = true;
  req.session.loggedAt = new Date().toISOString();

  await logAdminAction({
    actionType: 'ADMIN_LOGIN_SUCCESS',
    actionDetail: 'Admin panele giris yapti.',
    req,
  });

  return res.json({
    success: true,
    data: {
      loggedAt: req.session.loggedAt,
    },
  });
}

async function adminLogout(req, res) {
  await logAdminAction({
    actionType: 'ADMIN_LOGOUT',
    actionDetail: 'Admin oturumu kapatildi.',
    req,
  });

  req.session.destroy(() => {
    res.clearCookie(env.SESSION_COOKIE_NAME);
    res.json({
      success: true,
      message: 'Cikis yapildi.',
    });
  });
}

async function getAdminSession(req, res) {
  res.json({
    success: true,
    data: {
      isAdmin: true,
      loggedAt: req.session.loggedAt,
      adminRoutePath: env.ADMIN_ROUTE_PATH,
    },
  });
}

async function getDashboard(req, res) {
  const [settings, maleQuestions, femaleQuestions, submissions, logs, telegramConfig] =
    await Promise.all([
      getSettings(),
      listQuestions({
        genderType: 'male',
        includeInactive: true,
        includeUnapproved: true,
      }),
      listQuestions({
        genderType: 'female',
        includeInactive: true,
        includeUnapproved: true,
      }),
      listSubmissions({ limit: 120 }),
      listAdminLogs({ limit: 40 }),
      getTelegramConfig({ includeSecret: false }),
    ]);

  res.json({
    success: true,
    data: {
      settings,
      questions: {
        male: maleQuestions,
        female: femaleQuestions,
      },
      submissions,
      logs,
      telegram: {
        ...telegramConfig,
        status: getTelegramStatus(),
      },
    },
  });
}

async function updateSettingsHandler(req, res) {
  const settings = await updateSettings(req.body || {});

  await logAdminAction({
    actionType: 'SETTINGS_UPDATED',
    actionDetail: 'Genel ayarlar guncellendi.',
    req,
  });

  res.json({
    success: true,
    data: settings,
  });
}

async function listQuestionsByGender(req, res) {
  const genderType = ensureGenderType(req.query.genderType);

  if (!genderType) {
    return res.status(400).json({
      success: false,
      message: 'genderType parametresi male/female olmalidir.',
    });
  }

  const questions = await listQuestions({
    genderType,
    includeInactive: true,
    includeUnapproved: true,
  });

  return res.json({
    success: true,
    data: questions,
  });
}

async function createQuestionHandler(req, res) {
  const question = await createQuestion(req.body || {});

  await logAdminAction({
    actionType: 'QUESTION_CREATED',
    actionDetail: `Yeni soru eklendi: ${question.id}`,
    req,
  });

  res.status(201).json({
    success: true,
    data: question,
  });
}

async function updateQuestionHandler(req, res) {
  const question = await updateQuestion(req.params.questionId, req.body || {});

  await logAdminAction({
    actionType: 'QUESTION_UPDATED',
    actionDetail: `Soru guncellendi: ${question.id}`,
    req,
  });

  res.json({
    success: true,
    data: question,
  });
}

async function deleteQuestionHandler(req, res) {
  const deleted = await deleteQuestion(req.params.questionId);

  await logAdminAction({
    actionType: 'QUESTION_DELETED',
    actionDetail: `Soru silindi: ${deleted.id}`,
    req,
  });

  res.json({
    success: true,
    data: deleted,
  });
}

async function reorderQuestionsHandler(req, res) {
  const genderType = ensureGenderType(req.body?.genderType);
  const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];

  const questions = await reorderQuestions(genderType, orderedIds);

  await logAdminAction({
    actionType: 'QUESTION_REORDERED',
    actionDetail: `Soru sirasi degisti: ${genderType}`,
    req,
  });

  res.json({
    success: true,
    data: questions,
  });
}

async function listSubmissionsHandler(req, res) {
  const submissions = await listSubmissions({ limit: 200 });
  res.json({
    success: true,
    data: submissions,
  });
}

async function getSubmissionDetail(req, res) {
  const submission = await getSubmissionById(req.params.submissionId);
  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Kayit bulunamadi.',
    });
  }

  return res.json({
    success: true,
    data: submission,
  });
}

async function getLogs(req, res) {
  const logs = await listAdminLogs({ limit: 100 });
  res.json({
    success: true,
    data: logs,
  });
}

async function getTelegramSettings(req, res) {
  const telegram = await getTelegramConfig({ includeSecret: false });
  res.json({
    success: true,
    data: {
      ...telegram,
      status: getTelegramStatus(),
    },
  });
}

async function updateTelegramSettingsHandler(req, res) {
  const botToken = normalizeText(req.body?.botToken);
  const chatId = normalizeText(req.body?.chatId);

  const updated = await updateTelegramConfig({
    botToken,
    chatId,
  });

  await reloadTelegramBot({ enablePolling: env.TELEGRAM_POLLING_ENABLED });

  await logAdminAction({
    actionType: 'TELEGRAM_SETTINGS_UPDATED',
    actionDetail: 'Telegram ayarlari panelden guncellendi.',
    req,
  });

  res.json({
    success: true,
    data: {
      botToken: updated.botToken ? `${updated.botToken.slice(0, 4)}********` : '',
      chatId: updated.chatId,
      status: getTelegramStatus(),
      updatedAt: updated.updatedAt,
    },
  });
}

async function sendTelegramTest(req, res) {
  await sendTestMessage();

  await logAdminAction({
    actionType: 'TELEGRAM_TEST_SENT',
    actionDetail: 'Telegram test mesaji gonderildi.',
    req,
  });

  res.json({
    success: true,
    message: 'Test mesaji gonderildi.',
  });
}

function buildPublicAssetPath(file) {
  if (!file?.path) {
    return '';
  }
  return `/uploads/${path.basename(file.path).replace(/\\/g, '/')}`;
}

async function uploadLogo(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Logo dosyasi secilmedi.',
    });
  }

  const logoUrl = buildPublicAssetPath(req.file);
  if (!logoUrl) {
    return res.status(400).json({
      success: false,
      message:
        'Sunucu ortami dosya yazma desteklemiyor. Logo icin dogrudan logoUrl alanini guncelleyin veya storage baglayin.',
    });
  }
  const settings = await updateSettings({ logoUrl });

  await logAdminAction({
    actionType: 'LOGO_UPLOADED',
    actionDetail: `Yeni logo yuklendi: ${req.file.filename}`,
    req,
  });

  return res.json({
    success: true,
    data: settings,
  });
}

async function uploadBackground(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Arka plan dosyasi secilmedi.',
    });
  }

  const backgroundImageUrl = buildPublicAssetPath(req.file);
  if (!backgroundImageUrl) {
    return res.status(400).json({
      success: false,
      message:
        'Sunucu ortami dosya yazma desteklemiyor. Arka plan icin dogrudan backgroundImageUrl alanini guncelleyin veya storage baglayin.',
    });
  }
  const settings = await updateSettings({ backgroundImageUrl });

  await logAdminAction({
    actionType: 'BACKGROUND_UPLOADED',
    actionDetail: `Yeni arka plan yuklendi: ${req.file.filename}`,
    req,
  });

  return res.json({
    success: true,
    data: settings,
  });
}

module.exports = {
  adminLogin,
  adminLogout,
  getAdminSession,
  getDashboard,
  updateSettingsHandler,
  listQuestionsByGender,
  createQuestionHandler,
  updateQuestionHandler,
  deleteQuestionHandler,
  reorderQuestionsHandler,
  listSubmissionsHandler,
  getSubmissionDetail,
  getLogs,
  getTelegramSettings,
  updateTelegramSettingsHandler,
  sendTelegramTest,
  uploadLogo,
  uploadBackground,
};
