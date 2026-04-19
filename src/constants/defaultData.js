const DEFAULT_SETTINGS = {
  id: 'main',
  heroTitle: '[SITE_BASLIGI]',
  heroDescription: '[ALT_BASLIK]',
  rules: ['[KURAL_1]', '[KURAL_2]', '[KURAL_3]', '[KURAL_4]', '[KURAL_5]'],
  completionMessage: '[BASARI_MESAJI]',
  infoText: '[BILGILENDIRME_METNI]',
  primaryButtonText: 'Devam Et',
  submitButtonText: 'Anketi Tamamla',
  instagramUrl:
    'https://www.instagram.com/digi.showofficial?igsh=ZXFnMnduY3lnZ2Mw',
  youtubeUrl: 'https://youtube.com/@digishow_00?si=t9kXqy4HMYgN3-6p',
  logoUrl: '/assets/logo-placeholder.svg',
  backgroundImageUrl: '/assets/bg-placeholder.svg',
  watermarkEnabled: true,
  logoSize: 116,
  createdAt: null,
  updatedAt: null,
};

const MALE_QUESTION_PLACEHOLDERS = [
  '[ERKEK_SORU_1]',
  '[ERKEK_SORU_2]',
  '[ERKEK_SORU_3]',
  '[ERKEK_SORU_4]',
];

const FEMALE_QUESTION_PLACEHOLDERS = [
  '[KADIN_SORU_1]',
  '[KADIN_SORU_2]',
  '[KADIN_SORU_3]',
  '[KADIN_SORU_4]',
];

const QUESTION_TYPE_FALLBACK = ['single_choice', 'open_text', 'multi_choice', 'rating'];

function buildDefaultQuestions() {
  const maleQuestions = MALE_QUESTION_PLACEHOLDERS.map((questionText, index) => ({
    genderType: 'male',
    questionText,
    questionType: QUESTION_TYPE_FALLBACK[index % QUESTION_TYPE_FALLBACK.length],
    options:
      index % QUESTION_TYPE_FALLBACK.length === 0
        ? ['Secenek 1', 'Secenek 2', 'Secenek 3']
        : index % QUESTION_TYPE_FALLBACK.length === 2
          ? ['Coklu 1', 'Coklu 2', 'Coklu 3', 'Coklu 4']
          : [],
    isActive: true,
    orderIndex: index + 1,
    approved: true,
    createdAt: null,
    updatedAt: null,
  }));

  const femaleQuestions = FEMALE_QUESTION_PLACEHOLDERS.map((questionText, index) => ({
    genderType: 'female',
    questionText,
    questionType: QUESTION_TYPE_FALLBACK[index % QUESTION_TYPE_FALLBACK.length],
    options:
      index % QUESTION_TYPE_FALLBACK.length === 0
        ? ['Secenek 1', 'Secenek 2', 'Secenek 3']
        : index % QUESTION_TYPE_FALLBACK.length === 2
          ? ['Coklu 1', 'Coklu 2', 'Coklu 3', 'Coklu 4']
          : [],
    isActive: true,
    orderIndex: index + 1,
    approved: true,
    createdAt: null,
    updatedAt: null,
  }));

  return [...maleQuestions, ...femaleQuestions];
}

module.exports = {
  DEFAULT_SETTINGS,
  buildDefaultQuestions,
};
