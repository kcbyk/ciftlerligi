const { getFirestore } = require('../config/firebase');
const { SUBMISSIONS_COLLECTION } = require('../constants/collections');
const { getQuestionMapByIds } = require('./questionService');
const { normalizeLookupKey, normalizeText } = require('../utils/sanitize');

function nowIso() {
  return new Date().toISOString();
}

function submissionsCollection() {
  return getFirestore().collection(SUBMISSIONS_COLLECTION);
}

function sanitizeAnswerValue(questionType, value) {
  if (questionType === 'multi_choice') {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .slice(0, 12);
  }

  if (questionType === 'rating') {
    const score = Number(value);
    if (!Number.isFinite(score)) {
      return null;
    }

    return Math.min(Math.max(Math.round(score), 1), 10);
  }

  return normalizeText(value);
}

async function checkDuplicate(pairName, respondentName) {
  const pairKey = normalizeLookupKey(pairName);
  const respondentKey = normalizeLookupKey(respondentName);

  const snapshot = await submissionsCollection()
    .where('pairNameLower', '==', pairKey)
    .limit(50)
    .get();

  return snapshot.docs.some((doc) => {
    const row = doc.data();
    return row.respondentNameLower === respondentKey;
  });
}

async function createSubmission({
  pairName,
  personOneName,
  personTwoName,
  respondentName,
  genderType,
  answers,
  ipAddress,
  deviceInfo,
}) {
  const safePairName = normalizeText(pairName);
  const safePersonOneName = normalizeText(personOneName);
  const safePersonTwoName = normalizeText(personTwoName);
  const safeRespondentName = normalizeText(respondentName);

  if (!safePairName || !safePersonOneName || !safePersonTwoName || !safeRespondentName) {
    const error = new Error('Kayit bilgileri eksik.');
    error.statusCode = 400;
    throw error;
  }

  const duplicateExists = await checkDuplicate(safePairName, safeRespondentName);
  if (duplicateExists) {
    const error = new Error('Bu kisi icin tekrar gonderim algilandi.');
    error.statusCode = 409;
    throw error;
  }

  if (!Array.isArray(answers) || !answers.length) {
    const error = new Error('En az bir soruya cevap verilmelidir.');
    error.statusCode = 400;
    throw error;
  }

  const questionMap = await getQuestionMapByIds(answers.map((row) => row.questionId));

  const sanitizedAnswers = answers
    .map((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        return null;
      }

      if (!question.isActive || !question.approved || question.genderType !== genderType) {
        return null;
      }

      const sanitizedValue = sanitizeAnswerValue(question.questionType, answer.answer);
      const isEmptyValue =
        sanitizedValue === null ||
        sanitizedValue === '' ||
        (Array.isArray(sanitizedValue) && sanitizedValue.length === 0);

      if (isEmptyValue) {
        return null;
      }

      return {
        questionId: answer.questionId,
        questionText: question.questionText,
        questionType: question.questionType,
        answer: sanitizedValue,
      };
    })
    .filter(Boolean);

  if (!sanitizedAnswers.length) {
    const error = new Error('Gecerli bir soru-cevap listesi bulunamadi.');
    error.statusCode = 400;
    throw error;
  }

  const submissionRef = submissionsCollection().doc();
  const submission = {
    pairName: safePairName,
    pairNameLower: normalizeLookupKey(safePairName),
    personOneName: safePersonOneName,
    personTwoName: safePersonTwoName,
    respondentName: safeRespondentName,
    respondentNameLower: normalizeLookupKey(safeRespondentName),
    genderType,
    answersJson: sanitizedAnswers,
    createdAt: nowIso(),
    ipAddress: ipAddress || '',
    deviceInfo: deviceInfo || '',
  };

  await submissionRef.set(submission);

  return {
    id: submissionRef.id,
    ...submission,
  };
}

async function listSubmissions({ limit = 100 } = {}) {
  const snapshot = await submissionsCollection().orderBy('createdAt', 'desc').limit(limit).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function getSubmissionById(submissionId) {
  const snapshot = await submissionsCollection().doc(submissionId).get();
  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

async function getPairSummaries() {
  const submissions = await listSubmissions({ limit: 300 });
  const map = new Map();

  submissions.forEach((submission) => {
    if (!map.has(submission.pairNameLower)) {
      map.set(submission.pairNameLower, {
        pairName: submission.pairName,
        pairKey: submission.pairNameLower,
        sampleSubmissionId: submission.id,
        people: new Map(),
      });
    }

    const bucket = map.get(submission.pairNameLower);
    bucket.people.set(submission.respondentNameLower, {
      respondentName: submission.respondentName,
      submissionId: submission.id,
    });
  });

  return Array.from(map.values()).map((item) => ({
    pairName: item.pairName,
    pairKey: item.pairKey,
    sampleSubmissionId: item.sampleSubmissionId,
    respondentCount: item.people.size,
  }));
}

async function getSubmissionsByPairKey(pairKey) {
  const safePairKey = normalizeLookupKey(pairKey);
  const snapshot = await submissionsCollection()
    .where('pairNameLower', '==', safePairKey)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

module.exports = {
  createSubmission,
  listSubmissions,
  getSubmissionById,
  getPairSummaries,
  getSubmissionsByPairKey,
};
