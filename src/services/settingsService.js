const { getFirestore } = require('../config/firebase');
const { DEFAULT_SETTINGS } = require('../constants/defaultData');
const { SETTINGS_COLLECTION } = require('../constants/collections');
const { normalizeText } = require('../utils/sanitize');

const SETTINGS_DOC_ID = 'main';

function nowIso() {
  return new Date().toISOString();
}

function getSettingsRef() {
  return getFirestore().collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID);
}

function sanitizeSettingsPatch(payload = {}) {
  const patch = {};

  if (typeof payload.heroTitle === 'string') {
    patch.heroTitle = normalizeText(payload.heroTitle) || 'Çiftler Ligi Anketi';
  }

  if (typeof payload.heroDescription === 'string') {
    patch.heroDescription = normalizeText(payload.heroDescription) || '';
  }

  if (typeof payload.landingHeadline === 'string') {
    patch.landingHeadline =
      normalizeText(payload.landingHeadline) || 'Ismini yaz, takimina katil, ankete gec';
  }

  if (typeof payload.completionMessage === 'string') {
    patch.completionMessage = normalizeText(payload.completionMessage) || '[BASARI_MESAJI]';
  }

  if (typeof payload.infoText === 'string') {
    patch.infoText = normalizeText(payload.infoText) || '[BILGILENDIRME_METNI]';
  }

  if (typeof payload.entryFormTitle === 'string') {
    patch.entryFormTitle = normalizeText(payload.entryFormTitle) || 'Anket Girisi';
  }

  if (typeof payload.participantLabel === 'string') {
    patch.participantLabel = normalizeText(payload.participantLabel) || 'Kendi ismin';
  }

  if (typeof payload.participantPlaceholder === 'string') {
    patch.participantPlaceholder =
      normalizeText(payload.participantPlaceholder) || 'Orn: Ayse';
  }

  if (typeof payload.teamLabel === 'string') {
    patch.teamLabel = normalizeText(payload.teamLabel) || 'Takim ismi';
  }

  if (typeof payload.teamPlaceholder === 'string') {
    patch.teamPlaceholder = normalizeText(payload.teamPlaceholder) || 'Orn: Yildiz Takim';
  }

  if (typeof payload.rolePrompt === 'string') {
    patch.rolePrompt =
      normalizeText(payload.rolePrompt) || 'Hangi tarafin anketini dolduruyorsun?';
  }

  if (typeof payload.femaleCardTitle === 'string') {
    patch.femaleCardTitle = normalizeText(payload.femaleCardTitle) || 'Kiz Tarafi';
  }

  if (typeof payload.femaleCardDescription === 'string') {
    patch.femaleCardDescription =
      normalizeText(payload.femaleCardDescription) || 'Sadece kiz sorulari acilir.';
  }

  if (typeof payload.maleCardTitle === 'string') {
    patch.maleCardTitle = normalizeText(payload.maleCardTitle) || 'Erkek Tarafi';
  }

  if (typeof payload.maleCardDescription === 'string') {
    patch.maleCardDescription =
      normalizeText(payload.maleCardDescription) || 'Sadece erkek sorulari acilir.';
  }

  if (typeof payload.flowTitle === 'string') {
    patch.flowTitle = normalizeText(payload.flowTitle) || 'Nasil Calisiyor?';
  }

  if (typeof payload.flowStepOne === 'string') {
    patch.flowStepOne =
      normalizeText(payload.flowStepOne) ||
      '1. Ana sayfada iki kutuyu doldur ve tarafini sec.';
  }

  if (typeof payload.flowStepTwo === 'string') {
    patch.flowStepTwo =
      normalizeText(payload.flowStepTwo) || '2. Sistemde senin tarafina ait 30 soru acilir.';
  }

  if (typeof payload.flowStepThree === 'string') {
    patch.flowStepThree =
      normalizeText(payload.flowStepThree) ||
      '3. Admin panelde takimlar, kisiler ve cevaplar tek tek izlenir.';
  }

  if (typeof payload.primaryButtonText === 'string') {
    patch.primaryButtonText = normalizeText(payload.primaryButtonText) || 'Devam Et';
  }

  if (typeof payload.submitButtonText === 'string') {
    patch.submitButtonText = normalizeText(payload.submitButtonText) || 'Anketi Tamamla';
  }

  if (Array.isArray(payload.rules)) {
    patch.rules = payload.rules
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .slice(0, 15);
  }

  if (typeof payload.instagramUrl === 'string') {
    patch.instagramUrl = normalizeText(payload.instagramUrl);
  }

  if (typeof payload.youtubeUrl === 'string') {
    patch.youtubeUrl = normalizeText(payload.youtubeUrl);
  }

  if (typeof payload.logoUrl === 'string') {
    patch.logoUrl = normalizeText(payload.logoUrl);
  }

  if (typeof payload.backgroundImageUrl === 'string') {
    patch.backgroundImageUrl = normalizeText(payload.backgroundImageUrl);
  }

  if (typeof payload.logoSize !== 'undefined') {
    const size = Number(payload.logoSize);
    if (Number.isFinite(size)) {
      patch.logoSize = Math.min(Math.max(Math.round(size), 48), 220);
    }
  }

  if (typeof payload.watermarkEnabled !== 'undefined') {
    patch.watermarkEnabled = Boolean(payload.watermarkEnabled);
  }

  if (Object.keys(patch).length) {
    patch.updatedAt = nowIso();
  }

  return patch;
}

async function ensureSettings() {
  const ref = getSettingsRef();
  const snapshot = await ref.get();

  if (snapshot.exists) {
    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  }

  const initialSettings = {
    ...DEFAULT_SETTINGS,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await ref.set(initialSettings);

  return {
    id: SETTINGS_DOC_ID,
    ...initialSettings,
  };
}

async function getSettings() {
  return ensureSettings();
}

async function updateSettings(payload) {
  const patch = sanitizeSettingsPatch(payload);

  if (!Object.keys(patch).length) {
    return getSettings();
  }

  const ref = getSettingsRef();
  await ref.set(patch, { merge: true });

  const snapshot = await ref.get();
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

module.exports = {
  SETTINGS_DOC_ID,
  getSettings,
  ensureSettings,
  updateSettings,
};
