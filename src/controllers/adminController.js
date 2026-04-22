const env = require('../config/env');
const { getSettings, updateSettings } = require('../services/settingsService');
const {
  listQuestions,
  createQuestion,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  isQuestionUsable,
} = require('../services/questionService');
const {
  getPairSummaries,
  getSubmissionsByPairKey,
  getSubmissionById,
  deleteSubmission,
} = require('../services/submissionService');
const { createAdminLog } = require('../services/adminLogService');
const {
  ensureGenderType,
  normalizeLookupKey,
  normalizeText,
} = require('../utils/sanitize');
const { signAdminToken } = require('../utils/adminToken');
const { ADMIN_COOKIE_NAME } = require('../middlewares/adminAuth');

const ADMIN_TOKEN_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function getQuestionTextKey(question = {}) {
  return normalizeText(question.questionText).toLocaleLowerCase('tr-TR');
}

function getRepresentativeQuestions(questionList = []) {
  const grouped = new Map();

  questionList.forEach((question) => {
    const key = getQuestionTextKey(question);
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, question);
      return;
    }

    const currentOrder = Number(current.orderIndex || Number.MAX_SAFE_INTEGER);
    const nextOrder = Number(question.orderIndex || Number.MAX_SAFE_INTEGER);

    if (nextOrder < currentOrder) {
      grouped.set(key, question);
    }
  });

  return Array.from(grouped.values()).sort((left, right) => {
    const leftOrder = Number(left.orderIndex || Number.MAX_SAFE_INTEGER);
    const rightOrder = Number(right.orderIndex || Number.MAX_SAFE_INTEGER);

    if (leftOrder === rightOrder) {
      return String(left.questionText || '').localeCompare(String(right.questionText || ''), 'tr-TR');
    }

    return leftOrder - rightOrder;
  });
}

function resolveIpAddress(req) {
  return req.headers['x-forwarded-for'] || req.ip || '';
}

function setAdminCookie(res, token) {
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_TOKEN_MAX_AGE_MS,
    path: '/',
  });
}

function clearAdminCookie(res) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

async function adminLogin(req, res) {
  const password = normalizeText(req.body?.password);
  const ipAddress = resolveIpAddress(req);

  if (!password || password !== env.ADMIN_PANEL_PASSWORD) {
    await createAdminLog({
      actionType: 'ADMIN_LOGIN_FAILED',
      actionDetail: 'Hatali sifre girisi',
      ipAddress,
    }).catch(() => {});

    return res.status(401).json({
      success: false,
      message: 'Sifre hatali.',
    });
  }

  const adminToken = signAdminToken({
    role: 'admin',
    loggedInAt: Date.now(),
  });

  setAdminCookie(res, adminToken);

  await createAdminLog({
    actionType: 'ADMIN_LOGIN_SUCCESS',
    actionDetail: 'Admin panele giris yapti',
    ipAddress,
  }).catch(() => {});

  return res.json({
    success: true,
    message: 'Admin oturumu acildi.',
    data: {
      route: env.ADMIN_PANEL_ROUTE,
      expiresInSeconds: Math.floor(ADMIN_TOKEN_MAX_AGE_MS / 1000),
    },
  });
}

async function adminLogout(req, res) {
  clearAdminCookie(res);

  await createAdminLog({
    actionType: 'ADMIN_LOGOUT',
    actionDetail: 'Admin cikis yapti',
    ipAddress: resolveIpAddress(req),
  }).catch(() => {});

  return res.json({
    success: true,
    message: 'Admin oturumu kapatildi.',
  });
}

async function getAdminSessionInfo(_req, res) {
  return res.json({
    success: true,
    data: {
      role: 'admin',
      route: env.ADMIN_PANEL_ROUTE,
    },
  });
}

async function getAdminSettings(_req, res) {
  const settings = await getSettings();
  return res.json({
    success: true,
    data: settings,
  });
}

async function patchAdminSettings(req, res) {
  const settings = await updateSettings(req.body || {});

  await createAdminLog({
    actionType: 'ADMIN_SETTINGS_UPDATED',
    actionDetail: 'Kurallar veya genel metinler guncellendi',
    ipAddress: resolveIpAddress(req),
  }).catch(() => {});

  return res.json({
    success: true,
    message: 'Ayarlar guncellendi.',
    data: settings,
  });
}

async function getAdminQuestions(req, res) {
  const genderType = ensureGenderType(req.query?.genderType);

  const questions = getRepresentativeQuestions((await listQuestions({
    genderType: genderType || undefined,
    includeInactive: true,
    includeUnapproved: true,
  }))
    .filter(isQuestionUsable)
    .map((question) => ({
      ...question,
      questionType: 'open_text',
      options: [],
    })));

  return res.json({
    success: true,
    data: questions,
  });
}

async function createAdminQuestion(req, res) {
  const existingQuestions = await listQuestions({
    includeInactive: true,
    includeUnapproved: true,
  });
  const normalizedQuestionText = getQuestionTextKey({
    questionText: req.body?.questionText,
  });

  if (normalizedQuestionText) {
    const duplicateQuestion = existingQuestions.find(
      (question) => getQuestionTextKey(question) === normalizedQuestionText
    );

    if (duplicateQuestion) {
      return res.status(409).json({
        success: false,
        message: 'Bu soru zaten listede var.',
      });
    }
  }

  const maxOrderIndex = existingQuestions.reduce(
    (maxValue, question) => Math.max(maxValue, Number(question.orderIndex || 0)),
    0
  );

  const created = await createQuestion({
    questionText: req.body?.questionText,
    orderIndex: Number(req.body?.orderIndex || 0) || maxOrderIndex + 1,
    questionType: 'open_text',
    options: [],
    genderType: 'male',
    isActive: true,
    approved: true,
  });

  await createAdminLog({
    actionType: 'ADMIN_QUESTION_CREATED',
    actionDetail: `Yeni soru eklendi: ${created.id}`,
    ipAddress: resolveIpAddress(req),
  }).catch(() => {});

  return res.status(201).json({
    success: true,
    message: 'Soru eklendi.',
    data: created,
  });
}

async function patchAdminQuestion(req, res) {
  const questionId = normalizeText(req.params?.questionId);
  if (!questionId) {
    return res.status(400).json({
      success: false,
      message: 'Soru kimligi eksik.',
    });
  }

  const targetQuestion = await getQuestionById(questionId);
  if (!targetQuestion) {
    return res.status(404).json({
      success: false,
      message: 'Soru bulunamadi.',
    });
  }

  const existingQuestions = await listQuestions({
    includeInactive: true,
    includeUnapproved: true,
  });
  const targetKey = getQuestionTextKey(targetQuestion);
  const relatedQuestions = existingQuestions.filter(
    (question) => getQuestionTextKey(question) === targetKey
  );

  const payload = {
    questionText: req.body?.questionText,
    orderIndex: req.body?.orderIndex,
    questionType: 'open_text',
    options: [],
    isActive: true,
    approved: true,
  };

  const updatedQuestions = await Promise.all(
    relatedQuestions.map((question) => updateQuestion(question.id, payload))
  );
  const updated = getRepresentativeQuestions(updatedQuestions)[0];

  await createAdminLog({
    actionType: 'ADMIN_QUESTION_UPDATED',
    actionDetail: `Soru guncellendi: ${questionId}`,
    ipAddress: resolveIpAddress(req),
  }).catch(() => {});

  return res.json({
    success: true,
    message: 'Soru guncellendi.',
    data: updated,
  });
}

async function removeAdminQuestion(req, res) {
  const questionId = normalizeText(req.params?.questionId);
  if (!questionId) {
    return res.status(400).json({
      success: false,
      message: 'Soru kimligi eksik.',
    });
  }

  const targetQuestion = await getQuestionById(questionId);
  if (!targetQuestion) {
    return res.status(404).json({
      success: false,
      message: 'Soru bulunamadi.',
    });
  }

  const existingQuestions = await listQuestions({
    includeInactive: true,
    includeUnapproved: true,
  });
  const targetKey = getQuestionTextKey(targetQuestion);
  const relatedQuestions = existingQuestions.filter(
    (question) => getQuestionTextKey(question) === targetKey
  );

  const deletedQuestions = await Promise.all(
    relatedQuestions.map((question) => deleteQuestion(question.id))
  );
  const deleted = deletedQuestions[0];

  await createAdminLog({
    actionType: 'ADMIN_QUESTION_DELETED',
    actionDetail: `Soru silindi: ${questionId}`,
    ipAddress: resolveIpAddress(req),
  }).catch(() => {});

  return res.json({
    success: true,
    message: 'Soru silindi.',
    data: deleted,
  });
}

async function getAdminTeams(_req, res) {
  const teams = await getPairSummaries();

  return res.json({
    success: true,
    data: teams,
  });
}

async function getAdminTeamParticipants(req, res) {
  const pairKey = normalizeLookupKey(req.params?.pairKey);
  if (!pairKey) {
    return res.status(400).json({
      success: false,
      message: 'Takim kimligi eksik.',
    });
  }

  const submissions = await getSubmissionsByPairKey(pairKey);

  return res.json({
    success: true,
    data: {
      pairKey,
      teamName: submissions[0]?.pairName || '',
      participants: submissions
        .map((submission) => ({
          id: submission.id,
          participantName: submission.respondentName,
          respondentName: submission.respondentName,
          answerCount: Array.isArray(submission.answersJson) ? submission.answersJson.length : 0,
          createdAt: submission.createdAt,
        }))
        .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || ''))),
    },
  });
}

async function getAdminSubmissionDetail(req, res) {
  const submissionId = normalizeText(req.params?.submissionId);
  if (!submissionId) {
    return res.status(400).json({
      success: false,
      message: 'Kisi kimligi eksik.',
    });
  }

  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    return res.status(404).json({
      success: false,
      message: 'Kisi kaydi bulunamadi.',
    });
  }

  return res.json({
    success: true,
    data: {
      id: submission.id,
      teamName: submission.pairName,
      pairKey: submission.pairNameLower,
      participantName: submission.respondentName,
      createdAt: submission.createdAt,
      answers: submission.answersJson || [],
    },
  });
}

async function removeAdminSubmission(req, res) {
  const submissionId = normalizeText(req.params?.submissionId);
  if (!submissionId) {
    return res.status(400).json({
      success: false,
      message: 'Kisi kimligi eksik.',
    });
  }

  const deleted = await deleteSubmission(submissionId);

  await createAdminLog({
    actionType: 'ADMIN_SUBMISSION_DELETED',
    actionDetail: `Kisi kaydi silindi: ${deleted.respondentName} / ${deleted.pairName}`,
    ipAddress: resolveIpAddress(req),
  }).catch(() => {});

  return res.json({
    success: true,
    message: 'Kisi kaydi silindi.',
    data: {
      id: deleted.id,
      teamName: deleted.pairName,
      participantName: deleted.respondentName,
      pairKey: deleted.pairNameLower,
    },
  });
}

module.exports = {
  adminLogin,
  adminLogout,
  getAdminSessionInfo,
  getAdminSettings,
  patchAdminSettings,
  getAdminQuestions,
  createAdminQuestion,
  patchAdminQuestion,
  removeAdminQuestion,
  getAdminTeams,
  getAdminTeamParticipants,
  getAdminSubmissionDetail,
  removeAdminSubmission,
};
