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

function sanitizeAnswerValue(_questionType, value) {
  if (Array.isArray(value)) {
    return normalizeText(value.join(', '));
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

      if (
        !question.isActive ||
        !question.approved ||
        (genderType && question.genderType !== genderType)
      ) {
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
        questionType: 'open_text',
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
    teamName: safePairName,
    pairNameLower: normalizeLookupKey(safePairName),
    personOneName: safePersonOneName,
    personTwoName: safePersonTwoName,
    respondentName: safeRespondentName,
    participantName: safeRespondentName,
    respondentNameLower: normalizeLookupKey(safeRespondentName),
    participantNameLower: normalizeLookupKey(safeRespondentName),
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
        teamName: submission.pairName,
        pairKey: submission.pairNameLower,
        people: new Map(),
        lastSubmissionAt: submission.createdAt,
      });
    }

    const bucket = map.get(submission.pairNameLower);
    bucket.people.set(submission.respondentNameLower, {
      respondentName: submission.respondentName,
      submissionId: submission.id,
      genderType: submission.genderType,
      createdAt: submission.createdAt,
    });

    if (String(submission.createdAt || '') > String(bucket.lastSubmissionAt || '')) {
      bucket.lastSubmissionAt = submission.createdAt;
    }
  });

  return Array.from(map.values())
    .map((item) => ({
      pairName: item.pairName,
      teamName: item.teamName,
      pairKey: item.pairKey,
      respondentCount: item.people.size,
      participantCount: item.people.size,
      lastSubmissionAt: item.lastSubmissionAt,
    }))
    .sort((left, right) => left.teamName.localeCompare(right.teamName, 'tr-TR'));
}

async function getSubmissionsByPairKey(pairKey) {
  const safePairKey = normalizeLookupKey(pairKey);
  const snapshot = await submissionsCollection().where('pairNameLower', '==', safePairKey).get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
}

async function deleteSubmission(submissionId) {
  const existing = await getSubmissionById(submissionId);
  if (!existing) {
    const error = new Error('Kisi kaydi bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  await submissionsCollection().doc(submissionId).delete();
  return existing;
}

module.exports = {
  createSubmission,
  listSubmissions,
  getSubmissionById,
  getPairSummaries,
  getSubmissionsByPairKey,
  deleteSubmission,
};
