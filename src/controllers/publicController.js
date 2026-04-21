const { getSettings } = require('../services/settingsService');
const { listQuestions } = require('../services/questionService');
const { createSubmission } = require('../services/submissionService');
const { sendSubmissionNotification } = require('../services/telegramBotService');
const { signSurveyToken } = require('../utils/surveyToken');
const { ensureGenderType, normalizeText } = require('../utils/sanitize');

function validateBasicFormFields(payload = {}) {
  const pairName = normalizeText(payload.teamName || payload.pairName);
  const respondentName = normalizeText(payload.participantName || payload.respondentName);
  const genderType = ensureGenderType(payload.genderType);

  if (!pairName || !respondentName || !genderType) {
    const error = new Error('Isim, takim ismi ve rol secimi zorunludur.');
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
    genderType,
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
        genderType: formData.genderType,
      },
    },
  });
}

async function getSurveyQuestions(req, res) {
  const { genderType } = req.surveySession;

  const questions = await listQuestions({
    genderType,
    includeInactive: false,
    includeUnapproved: false,
  });

  const safeQuestions = questions.map((question) => ({
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    options: question.options,
    orderIndex: question.orderIndex,
  }));

  res.json({
    success: true,
    data: {
      genderType,
      questions: safeQuestions,
    },
  });
}

async function submitSurvey(req, res) {
  const surveySession = req.surveySession;
  const answers = parseAnswers(req.body.answers);

  const submission = await createSubmission({
    pairName: surveySession.pairName,
    personOneName: surveySession.personOneName,
    personTwoName: surveySession.personTwoName,
    respondentName: surveySession.respondentName,
    genderType: surveySession.genderType,
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
