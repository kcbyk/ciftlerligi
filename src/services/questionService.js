const { getFirestore } = require('../config/firebase');
const { buildDefaultQuestions } = require('../constants/defaultData');
const { QUESTIONS_COLLECTION } = require('../constants/collections');
const {
  normalizeText,
  ensureGenderType,
  parseQuestionOptions,
} = require('../utils/sanitize');

const ALLOWED_QUESTION_TYPES = new Set(['single_choice', 'multi_choice', 'open_text', 'rating']);

function nowIso() {
  return new Date().toISOString();
}

function questionCollection() {
  return getFirestore().collection(QUESTIONS_COLLECTION);
}

function isQuestionUsable(question = {}) {
  const questionText = normalizeText(question.questionText);
  const questionType = normalizeText(question.questionType).toLowerCase();

  if (!questionText || /^\[[A-Z0-9_]+\]$/.test(questionText) || !ALLOWED_QUESTION_TYPES.has(questionType)) {
    return false;
  }

  if (questionType === 'single_choice' || questionType === 'multi_choice') {
    return Array.isArray(question.options) && question.options.some((option) => normalizeText(option));
  }

  return true;
}

function getQuestionSeedKey(question = {}) {
  const genderType = ensureGenderType(question.genderType) || 'shared';
  const questionType = normalizeText(question.questionType).toLowerCase();
  const questionText = normalizeText(question.questionText).toLocaleLowerCase('tr-TR');
  return `${genderType}::${questionType}::${questionText}`;
}

function getUniqueQuestionCount(questions = []) {
  const keys = new Set();

  questions
    .filter((question) => question.isActive && question.approved && isQuestionUsable(question))
    .forEach((question) => {
      keys.add(`${normalizeText(question.questionType).toLowerCase()}::${normalizeText(question.questionText).toLocaleLowerCase('tr-TR')}`);
    });

  return keys.size;
}

async function ensureDefaultQuestions() {
  return;
}

function shapeQuestion(document) {
  return {
    id: document.id,
    ...document.data(),
  };
}

async function listQuestions({
  genderType,
  includeInactive = false,
  includeUnapproved = false,
} = {}) {
  await ensureDefaultQuestions();

  let query = questionCollection();

  if (genderType) {
    query = query.where('genderType', '==', genderType);
  }

  const snapshot = await query.get();
  const questions = snapshot.docs.map(shapeQuestion);

  return questions
    .filter((question) => (includeInactive ? true : question.isActive))
    .filter((question) => (includeUnapproved ? true : question.approved))
    .sort((a, b) => {
      if (a.orderIndex === b.orderIndex) {
        return a.questionText.localeCompare(b.questionText, 'tr-TR');
      }
      return a.orderIndex - b.orderIndex;
    });
}

async function getQuestionById(questionId) {
  const snapshot = await questionCollection().doc(questionId).get();
  if (!snapshot.exists) {
    return null;
  }
  return shapeQuestion(snapshot);
}

function sanitizeQuestionPayload(payload = {}, { partial = false } = {}) {
  const sanitized = {};

  if (typeof payload.genderType === 'string') {
    sanitized.genderType = ensureGenderType(payload.genderType);
  }

  if (typeof payload.questionText === 'string') {
    sanitized.questionText = normalizeText(payload.questionText);
  }

  if (typeof payload.questionType === 'string') {
    const normalizedType = normalizeText(payload.questionType).toLowerCase();
    sanitized.questionType = ALLOWED_QUESTION_TYPES.has(normalizedType)
      ? normalizedType
      : '';
  }

  if (typeof payload.isActive !== 'undefined') {
    sanitized.isActive = Boolean(payload.isActive);
  }

  if (typeof payload.approved !== 'undefined') {
    sanitized.approved = Boolean(payload.approved);
  }

  if (typeof payload.orderIndex !== 'undefined') {
    const order = Number(payload.orderIndex);
    if (Number.isFinite(order)) {
      sanitized.orderIndex = Math.max(1, Math.floor(order));
    }
  }

  if (typeof payload.options !== 'undefined') {
    sanitized.options = parseQuestionOptions(payload.options);
  }

  if (!partial) {
    if (!sanitized.genderType || !sanitized.questionText || !sanitized.questionType) {
      const error = new Error('Soru olusturmak icin gerekli alanlar eksik.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (Object.prototype.hasOwnProperty.call(sanitized, 'questionType')) {
    if (!ALLOWED_QUESTION_TYPES.has(sanitized.questionType)) {
      const error = new Error('Gecersiz soru tipi gonderildi.');
      error.statusCode = 400;
      throw error;
    }

    if (sanitized.questionType === 'single_choice' || sanitized.questionType === 'multi_choice') {
      if (!Array.isArray(sanitized.options) || !sanitized.options.length) {
        const error = new Error('Secmeli sorularda en az 1 secenek olmali.');
        error.statusCode = 400;
        throw error;
      }
    }
  }

  return sanitized;
}

async function createQuestion(payload) {
  const sanitized = sanitizeQuestionPayload(payload);
  const ref = questionCollection().doc();

  const question = {
    genderType: sanitized.genderType,
    questionText: sanitized.questionText,
    questionType: sanitized.questionType,
    options: sanitized.options || [],
    isActive: typeof sanitized.isActive === 'boolean' ? sanitized.isActive : true,
    approved: typeof sanitized.approved === 'boolean' ? sanitized.approved : false,
    orderIndex: sanitized.orderIndex || Date.now(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await ref.set(question);
  return {
    id: ref.id,
    ...question,
  };
}

async function updateQuestion(questionId, payload) {
  const existing = await getQuestionById(questionId);
  if (!existing) {
    const error = new Error('Soru bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const sanitized = sanitizeQuestionPayload(payload, { partial: true });
  if (!Object.keys(sanitized).length) {
    return existing;
  }

  sanitized.updatedAt = nowIso();
  await questionCollection().doc(questionId).set(sanitized, { merge: true });

  const updated = await getQuestionById(questionId);
  return updated;
}

async function deleteQuestion(questionId) {
  const existing = await getQuestionById(questionId);
  if (!existing) {
    const error = new Error('Soru bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  await questionCollection().doc(questionId).delete();
  return existing;
}

async function reorderQuestions(genderType, orderedIds = []) {
  const normalizedGender = ensureGenderType(genderType);
  if (!normalizedGender) {
    const error = new Error('Siralama icin gecerli cinsiyet bilgisi gerekli.');
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    const error = new Error('Siralama listesi bos olamaz.');
    error.statusCode = 400;
    throw error;
  }

  const batch = getFirestore().batch();
  orderedIds.forEach((questionId, index) => {
    const ref = questionCollection().doc(questionId);
    batch.set(
      ref,
      {
        orderIndex: index + 1,
        updatedAt: nowIso(),
      },
      { merge: true }
    );
  });

  await batch.commit();
  return listQuestions({
    genderType: normalizedGender,
    includeInactive: true,
    includeUnapproved: true,
  });
}

async function getQuestionMapByIds(questionIds = []) {
  const uniqueIds = [...new Set(questionIds.filter(Boolean))];
  const result = new Map();

  await Promise.all(
    uniqueIds.map(async (questionId) => {
      const question = await getQuestionById(questionId);
      if (question) {
        result.set(questionId, question);
      }
    })
  );

  return result;
}

module.exports = {
  ALLOWED_QUESTION_TYPES,
  ensureDefaultQuestions,
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  getQuestionMapByIds,
  isQuestionUsable,
};
