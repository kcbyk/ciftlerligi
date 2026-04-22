const { getSettings } = require('../services/settingsService');
const { listQuestions, isQuestionUsable } = require('../services/questionService');
const { createSubmission } = require('../services/submissionService');
const { sendSubmissionNotification } = require('../services/telegramBotService');
const { signSurveyToken } = require('../utils/surveyToken');
const { normalizeText } = require('../utils/sanitize');

const QUESTION_TIME_LIMIT_SECONDS = 45;

function validateBasicFormFields(payload = {}) {
  const pairName = normalizeText(payload.teamName || payload.pairName);
  const respondentName = normalizeText(payload.participantName || payload.respondentName);

  if (!pairName || !respondentName) {
    const error = new Error('Isim ve takim ismi zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  return {
    pairName,
    teamName: pairName,
    personOneName: respondentName,
    personTwoName: respondentName,
    respondentName,
    participantName: respondentName,
    genderType: '',
  };
}

function parseAnswers(payloadAnswers) {
  if (Array.isArray(payloadAnswers)) {
    return payloadAnswers
      .map((row) => ({
        questionId: normalizeText(row.questionId),
        answer: row.answer,
      }))
      .filter((row) => row.questionId);
  }

  if (payloadAnswers && typeof payloadAnswers === 'object') {
    return Object.entries(payloadAnswers)
      .map(([questionId, answer]) => ({
        questionId: normalizeText(questionId),
        answer,
      }))
      .filter((row) => row.questionId);
  }

  return [];
}

async function getPublicSettings(req, res) {
  const settings = await getSettings();

  res.json({
    success: true,
    data: settings,
  });
}

async function createSurveySession(req, res) {
  const formData = validateBasicFormFields(req.body);
  const token = signSurveyToken({
    ...formData,
    issuedAt: Date.now(),
  });

  res.json({
    success: true,
    data: {
      surveyToken: token,
      profile: {
        pairName: formData.pairName,
        teamName: formData.pairName,
        respondentName: formData.respondentName,
        participantName: formData.respondentName,
      },
    },
  });
}

function getQuestionKey(question = {}) {
  return normalizeText(question.questionText).toLocaleLowerCase('tr-TR');
}

function getUniqueQuestions(questionList = []) {
  const deduped = new Map();

  questionList.forEach((question) => {
    const key = getQuestionKey(question);
    const current = deduped.get(key);

    if (!current) {
      deduped.set(key, question);
      return;
    }

    const currentOrder = Number(current.orderIndex || Number.MAX_SAFE_INTEGER);
    const nextOrder = Number(question.orderIndex || Number.MAX_SAFE_INTEGER);

    if (nextOrder < currentOrder) {
      deduped.set(key, question);
    }
  });

  return Array.from(deduped.values()).sort((left, right) => {
    const leftOrder = Number(left.orderIndex || Number.MAX_SAFE_INTEGER);
    const rightOrder = Number(right.orderIndex || Number.MAX_SAFE_INTEGER);

    if (leftOrder === rightOrder) {
      return String(left.questionText || '').localeCompare(String(right.questionText || ''), 'tr-TR');
    }

    return leftOrder - rightOrder;
  }).slice(0, 30);
}

async function getSurveyQuestions(req, res) {
  const questions = await listQuestions({
    includeInactive: false,
    includeUnapproved: false,
  });
  const uniqueQuestions = getUniqueQuestions(questions.filter(isQuestionUsable));

  const safeQuestions = uniqueQuestions.map((question) => ({
    id: question.id,
    questionText: question.questionText,
    questionType: 'open_text',
    options: [],
    orderIndex: question.orderIndex,
  }));

  res.json({
    success: true,
    data: {
      questionTimeLimitSeconds: QUESTION_TIME_LIMIT_SECONDS,
      questions: safeQuestions,
    },
  });
}

async function submitSurvey(req, res) {
  const surveySession = req.surveySession;
  const answers = parseAnswers(req.body.answers);
  const activeQuestions = getUniqueQuestions(
    (
      await listQuestions({
        includeInactive: false,
        includeUnapproved: false,
      })
    ).filter(isQuestionUsable)
  );

  const issuedAt = Number(surveySession.issuedAt || 0);
  const allowedDurationMs = activeQuestions.length * QUESTION_TIME_LIMIT_SECONDS * 1000;

  if (issuedAt && allowedDurationMs > 0 && Date.now() - issuedAt > allowedDurationMs) {
    const error = new Error('Suren doldu. Lutfen anketi bastan baslat.');
    error.statusCode = 408;
    throw error;
  }

  const submission = await createSubmission({
    pairName: surveySession.pairName,
    personOneName: surveySession.personOneName,
    personTwoName: surveySession.personTwoName,
    respondentName: surveySession.respondentName,
    genderType: surveySession.genderType || '',
    answers,
    ipAddress: req.headers['x-forwarded-for'] || req.ip,
    deviceInfo: req.headers['user-agent'] || '',
  });

  sendSubmissionNotification(submission).catch(() => {});

  const settings = await getSettings();

  res.status(201).json({
    success: true,
    message: settings.completionMessage || 'Basvurunuz alindi.',
    data: {
      submissionId: submission.id,
      createdAt: submission.createdAt,
    },
  });
}

module.exports = {
  getPublicSettings,
  createSurveySession,
  getSurveyQuestions,
  submitSurvey,
};
