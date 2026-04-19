(() => {
  const state = {
    settings: null,
  };

  const FALLBACK_SETTINGS = {
    heroTitle: '[SITE_BASLIGI]',
    heroDescription: '[ALT_BASLIK]',
    rules: ['[KURAL_1]', '[KURAL_2]', '[KURAL_3]', '[KURAL_4]', '[KURAL_5]'],
    completionMessage: '[BASARI_MESAJI]',
    primaryButtonText: 'Devam Et',
    submitButtonText: 'Anketi Tamamla',
    instagramUrl:
      'https://www.instagram.com/digi.showofficial?igsh=ZXFnMnduY3lnZ2Mw',
    youtubeUrl: 'https://youtube.com/@digishow_00?si=t9kXqy4HMYgN3-6p',
    logoUrl: '/assets/logo-placeholder.svg',
    backgroundImageUrl: '/assets/bg-placeholder.svg',
    watermarkEnabled: true,
    logoSize: 116,
    infoText: '[BILGILENDIRME_METNI]',
  };

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
    } catch (error) {
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

    setText('[data-site-title]', settings.heroTitle || FALLBACK_SETTINGS.heroTitle);
    setText('[data-site-description]', settings.heroDescription || FALLBACK_SETTINGS.heroDescription);
    setText('[data-info-text]', settings.infoText || FALLBACK_SETTINGS.infoText);
    setText('[data-completion-message]', settings.completionMessage || FALLBACK_SETTINGS.completionMessage);

    renderRules(settings.rules || FALLBACK_SETTINGS.rules);

    document.documentElement.style.setProperty('--logo-size', `${settings.logoSize || 116}px`);
    document.documentElement.style.setProperty(
      '--romantic-background-url',
      `url('${settings.backgroundImageUrl || FALLBACK_SETTINGS.backgroundImageUrl}')`
    );

    document.querySelectorAll('[data-logo]').forEach((node) => {
      node.src = settings.logoUrl || FALLBACK_SETTINGS.logoUrl;
      node.alt = settings.heroTitle || 'Logo';
    });

    document.querySelectorAll('[data-watermark-logo]').forEach((node) => {
      node.src = settings.logoUrl || FALLBACK_SETTINGS.logoUrl;
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

    document.title = `${settings.heroTitle || FALLBACK_SETTINGS.heroTitle} | Cift Yarismasi`;
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
