function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeLookupKey(value) {
  return normalizeText(value).toLocaleLowerCase('tr-TR');
}

function ensureGenderType(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'erkek' || normalized === 'male') {
    return 'male';
  }
  if (normalized === 'kadin' || normalized === 'female') {
    return 'female';
  }
  return '';
}

function parseQuestionOptions(options) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => normalizeText(option))
    .filter(Boolean)
    .slice(0, 12);
}

module.exports = {
  normalizeText,
  normalizeLookupKey,
  ensureGenderType,
  parseQuestionOptions,
};
