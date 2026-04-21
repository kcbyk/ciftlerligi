(() => {
  const FORCED_LOGO_URL = '/assets/site-logo.jpeg';
  const FORCED_HERO_TITLE = 'Ciftler Ligi';
  const state = {
    settings: null,
  };

  const FALLBACK_SETTINGS = {
    heroTitle: FORCED_HERO_TITLE,
    heroDescription: 'Takimini ankete hazirla.',
    landingHeadline: 'Ismini yaz, takimina katil, ankete gec',
    rules: [
      'Ismini ve takim adini dogru yaz.',
      'Kiz ve erkek sorulari birbirinden ayridir.',
      'Tum sorular zorunludur.',
      'Ayni isim ayni takimda tekrar kullanilamaz.',
      'Admin panelinden takimlar ve cevaplar gorulur.',
    ],
    completionMessage: 'Anketin kaydedildi. Sonuclar admin panelinden gorulebilir.',
    primaryButtonText: 'Ankete Basla',
    submitButtonText: 'Anketi Bitir',
    instagramUrl:
      'https://www.instagram.com/digi.showofficial?igsh=ZXFnMnduY3lnZ2Mw',
    youtubeUrl: 'https://youtube.com/@digishow_00?si=t9kXqy4HMYgN3-6p',
    logoUrl: FORCED_LOGO_URL,
    backgroundImageUrl: '/assets/bg-placeholder.svg',
    watermarkEnabled: true,
    logoSize: 116,
    infoText: 'Ankete baslamak icin kendi adini, takim adini ve rolu sec.',
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
    flowStepOne: '1. Ana sayfada iki kutuyu doldur ve tarafini sec.',
    flowStepTwo: '2. Sistemde senin tarafina ait 30 soru acilir.',
    flowStepThree: '3. Admin panelde takimlar, kisiler ve cevaplar tek tek izlenir.',
  };

  function isMojibake(value) {
    return /Ã|Ä|Å|�/.test(String(value || ''));
  }

  async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      const error = new Error(payload.message || 'Istek sirasinda hata olustu.');
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  async function loadSettings() {
    if (state.settings) {
      return state.settings;
    }

    try {
      const payload = await apiFetch('/api/public/settings', {
        method: 'GET',
      });
      state.settings = {
        ...FALLBACK_SETTINGS,
        ...(payload.data || {}),
      };
    } catch (_error) {
      state.settings = { ...FALLBACK_SETTINGS };
    }

    return state.settings;
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function renderRules(rules = []) {
    const targets = document.querySelectorAll('[data-rules-list]');
    targets.forEach((target) => {
      target.innerHTML = '';
      const activeRules = Array.isArray(rules) && rules.length ? rules : FALLBACK_SETTINGS.rules;

      activeRules.forEach((ruleText) => {
        const item = document.createElement('div');
        item.className = 'rule-chip';
        item.textContent = ruleText;
        target.appendChild(item);
      });
    });
  }

  function applyBranding(settings) {
    if (!settings) {
      return;
    }

    const resolvedHeroTitle =
      isMojibake(settings.heroTitle) || !String(settings.heroTitle || '').trim()
        ? FORCED_HERO_TITLE
        : settings.heroTitle;
    const resolvedHeroDescription = isMojibake(settings.heroDescription)
      ? FALLBACK_SETTINGS.heroDescription
      : settings.heroDescription || '';

    setText('[data-site-title]', resolvedHeroTitle);
    setText('[data-site-description]', resolvedHeroDescription);
    setText('[data-landing-headline]', settings.landingHeadline || FALLBACK_SETTINGS.landingHeadline);
    setText('[data-info-text]', settings.infoText || FALLBACK_SETTINGS.infoText);
    setText('[data-entry-form-title]', settings.entryFormTitle || FALLBACK_SETTINGS.entryFormTitle);
    setText('[data-participant-label]', settings.participantLabel || FALLBACK_SETTINGS.participantLabel);
    setText('[data-team-label]', settings.teamLabel || FALLBACK_SETTINGS.teamLabel);
    setText('[data-role-prompt]', settings.rolePrompt || FALLBACK_SETTINGS.rolePrompt);
    setText('[data-female-card-title]', settings.femaleCardTitle || FALLBACK_SETTINGS.femaleCardTitle);
    setText(
      '[data-female-card-description]',
      settings.femaleCardDescription || FALLBACK_SETTINGS.femaleCardDescription
    );
    setText('[data-male-card-title]', settings.maleCardTitle || FALLBACK_SETTINGS.maleCardTitle);
    setText(
      '[data-male-card-description]',
      settings.maleCardDescription || FALLBACK_SETTINGS.maleCardDescription
    );
    setText('[data-flow-title]', settings.flowTitle || FALLBACK_SETTINGS.flowTitle);
    setText('[data-flow-step-one]', settings.flowStepOne || FALLBACK_SETTINGS.flowStepOne);
    setText('[data-flow-step-two]', settings.flowStepTwo || FALLBACK_SETTINGS.flowStepTwo);
    setText('[data-flow-step-three]', settings.flowStepThree || FALLBACK_SETTINGS.flowStepThree);
    setText(
      '[data-completion-message]',
      settings.completionMessage || FALLBACK_SETTINGS.completionMessage
    );

    document.querySelectorAll('[data-site-description]').forEach((node) => {
      node.style.display = resolvedHeroDescription ? '' : 'none';
    });

    renderRules(settings.rules || FALLBACK_SETTINGS.rules);

    document.documentElement.style.setProperty('--logo-size', `${settings.logoSize || 116}px`);
    document.documentElement.style.setProperty(
      '--romantic-background-url',
      `url('${settings.backgroundImageUrl || FALLBACK_SETTINGS.backgroundImageUrl}')`
    );

    document.querySelectorAll('[data-logo]').forEach((node) => {
      node.src = FORCED_LOGO_URL;
      node.alt = resolvedHeroTitle || 'Logo';
    });

    document.querySelectorAll('[data-watermark-logo]').forEach((node) => {
      node.src = FORCED_LOGO_URL;
      node.classList.toggle('hidden', !settings.watermarkEnabled);
    });

    document.querySelectorAll('[data-instagram-link]').forEach((node) => {
      node.href = settings.instagramUrl || FALLBACK_SETTINGS.instagramUrl;
    });

    document.querySelectorAll('[data-youtube-link]').forEach((node) => {
      node.href = settings.youtubeUrl || FALLBACK_SETTINGS.youtubeUrl;
    });

    document.querySelectorAll('[data-primary-button-text]').forEach((node) => {
      node.textContent = settings.primaryButtonText || FALLBACK_SETTINGS.primaryButtonText;
    });

    document.querySelectorAll('[data-submit-button-text]').forEach((node) => {
      node.textContent = settings.submitButtonText || FALLBACK_SETTINGS.submitButtonText;
    });

    document.querySelectorAll('[data-participant-placeholder]').forEach((node) => {
      node.placeholder = settings.participantPlaceholder || FALLBACK_SETTINGS.participantPlaceholder;
    });

    document.querySelectorAll('[data-team-placeholder]').forEach((node) => {
      node.placeholder = settings.teamPlaceholder || FALLBACK_SETTINGS.teamPlaceholder;
    });

    document.title = `${resolvedHeroTitle} | Ciftler Ligi`;
  }

  function showMessage(target, message, type = 'info') {
    if (!target) {
      return;
    }

    target.className = `${type}-box`;
    target.textContent = message;
    target.classList.remove('hidden');
  }

  function hideMessage(target) {
    if (!target) {
      return;
    }

    target.classList.add('hidden');
    target.textContent = '';
  }

  window.ContestShared = {
    apiFetch,
    loadSettings,
    applyBranding,
    showMessage,
    hideMessage,
  };
})();
