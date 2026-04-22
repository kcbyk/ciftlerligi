const DEFAULT_SETTINGS = {
  id: 'main',
  heroTitle: 'Ciftler Ligi',
  heroDescription: 'Takiminla ilgili 30 soruyu cevapla ve kaydini tamamla.',
  landingHeadline: 'Ismini yaz, takimina katil, ankete gec',
  rules: [
    'Siteye girince kendi adini ve takim adini dogru yaz.',
    'Sistemde tek bir 30 soruluk anket acilir.',
    'Tum sorulari bos birakmadan cevapla.',
    'Ayni takim ve ayni isim icin tekrar kayit olusturulamaz.',
    'Admin panelinden takimlar, kisiler ve cevaplar tek tek goruntulenebilir.',
  ],
  completionMessage: 'Anketin kaydedildi. Admin panelinden cevaplarin gorulebilir.',
  infoText: 'Ankete baslamak icin kendi adini ve takim adini yaz.',
  entryFormTitle: 'Anket Girisi',
  participantLabel: 'Kendi ismin',
  participantPlaceholder: 'Orn: Ayse',
  teamLabel: 'Takim ismi',
  teamPlaceholder: 'Orn: Yildiz Takim',
  rolePrompt: 'Hangi tarafin anketini dolduruyorsun?',
  femaleCardTitle: 'Kiz Tarafi',
  femaleCardDescription: 'Sadece kiz sorulari acilir.',
  maleCardTitle: 'Erkek Tarafi',
  maleCardDescription: 'Sadece erkek sorulari acilir.',
  flowTitle: 'Nasil Calisiyor?',
  flowStepOne: '1. Ana sayfada ismini ve takim ismini yaz.',
  flowStepTwo: '2. Sistemde tek bir 30 soruluk anket acilir.',
  flowStepThree: '3. Admin panelde takimlar, kisiler ve cevaplar tek tek izlenir.',
  primaryButtonText: 'Ankete Basla',
  submitButtonText: 'Anketi Bitir',
  instagramUrl:
    'https://www.instagram.com/digi.showofficial?igsh=ZXFnMnduY3lnZ2Mw',
  youtubeUrl: 'https://youtube.com/@digishow_00?si=t9kXqy4HMYgN3-6p',
  logoUrl: '/assets/site-logo.jpeg',
  backgroundImageUrl: '/assets/bg-placeholder.svg',
  watermarkEnabled: true,
  logoSize: 116,
  createdAt: null,
  updatedAt: null,
};

const BASE_QUESTION_SET = [
  {
    questionText: 'Takiminda seni en iyi anlatan kelime hangisi?',
    questionType: 'single_choice',
    options: ['Lider', 'Eglenceli', 'Sakin', 'Surpriz'],
  },
  {
    questionText: 'Takim arkadasinin en sevdigi icecek nedir?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Birlikte en cok gitmek istediginiz yer neresi?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Takiminiz en cok hangi aktivitede uyumludur?',
    questionType: 'single_choice',
    options: ['Sohbet', 'Gezi', 'Oyun', 'Yemek'],
  },
  {
    questionText: 'Takim arkadasinin dogum gunu ayini biliyor musun?',
    questionType: 'single_choice',
    options: ['Evet', 'Hayir', 'Emin degilim'],
  },
  {
    questionText: 'Takim arkadasinin en sevmedigi sey nedir?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Takim uyumunuza 1-10 arasinda kac puan verirsin?',
    questionType: 'rating',
    options: [],
  },
  {
    questionText: 'Takiminda ilk mesaj atan genelde kim olur?',
    questionType: 'single_choice',
    options: ['Ben', 'O', 'Degisir', 'Belli olmaz'],
  },
  {
    questionText: 'Birbirinizi en cok hangi konuda tamamlarsiniz?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Takim arkadasinin favori tatli secimi nedir?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Bos bir gunu birlikte nasil gecirirsiniz?',
    questionType: 'single_choice',
    options: ['Evde takilarak', 'Disarida gezerek', 'Film izleyerek', 'Plansiz'],
  },
  {
    questionText: 'Takiminda surpriz yapmayi kim daha cok sever?',
    questionType: 'single_choice',
    options: ['Ben', 'O', 'Ikimiz de', 'Hicbirimiz'],
  },
  {
    questionText: 'Takim arkadasin streslenince ilk ne yapar?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Takiminizin en guclu yani nedir?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Takim arkadasini ne kadar iyi tanidigini dusunuyorsun?',
    questionType: 'rating',
    options: [],
  },
  {
    questionText: 'Bir tartismada ilk yumusayan genelde kim olur?',
    questionType: 'single_choice',
    options: ['Ben', 'O', 'Ayni anda', 'Duruma gore'],
  },
  {
    questionText: 'Takim arkadasinin en sevdigi mevsim hangisi?',
    questionType: 'single_choice',
    options: ['Ilkbahar', 'Yaz', 'Sonbahar', 'Kis'],
  },
  {
    questionText: 'Birlikte en unutamadiginiz ani nedir?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Takiminda plan yapmayi kim daha cok sever?',
    questionType: 'single_choice',
    options: ['Ben', 'O', 'Ikimiz de', 'Plansiz gideriz'],
  },
  {
    questionText: 'Takim arkadasinin en sevdigi muzik turu nedir?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Takiminiz kalabalik bir ortamda nasil olur?',
    questionType: 'single_choice',
    options: ['Cok sosyal', 'Dengeli', 'Biraz cekingen', 'Duruma gore'],
  },
  {
    questionText: 'Takim arkadasin sabah mi gece mi daha enerjiktir?',
    questionType: 'single_choice',
    options: ['Sabah', 'Gece', 'Ikisi de', 'Degisir'],
  },
  {
    questionText: 'Takim uyumunuzu oyunlarda nasil buluyorsun?',
    questionType: 'rating',
    options: [],
  },
  {
    questionText: 'Takim arkadasinin en cok kullandigi cumle nedir?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Birlikte hayal ettiginiz ilk etkinlik nedir?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Takiminiz en cok hangi konuda guluyor?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Takim arkadasinin en sevdigi yemek nedir?',
    questionType: 'open_text',
    options: [],
  },
  {
    questionText: 'Bir sorunda once kim cozum arar?',
    questionType: 'single_choice',
    options: ['Ben', 'O', 'Birlikte', 'Soruna gore'],
  },
  {
    questionText: 'Takiminizin birbirine guveni sence nasil?',
    questionType: 'rating',
    options: [],
  },
  {
    questionText: 'Bu anket sonunda takimin icin tek kelimelik mesajin nedir?',
    questionType: 'open_text',
    options: [],
  },
];

function buildQuestionSet(genderType) {
  return BASE_QUESTION_SET.map((question, index) => ({
    genderType,
    questionText: question.questionText,
    questionType: question.questionType,
    options: question.options,
    isActive: true,
    orderIndex: index + 1,
    approved: true,
    createdAt: null,
    updatedAt: null,
  }));
}

function buildDefaultQuestions() {
  return [...buildQuestionSet('male'), ...buildQuestionSet('female')];
}

module.exports = {
  DEFAULT_SETTINGS,
  buildDefaultQuestions,
};
