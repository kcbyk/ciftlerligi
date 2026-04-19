(async () => {
  const shared = window.ContestShared;
  const settings = await shared.loadSettings();
  shared.applyBranding(settings);

  const state = {
    activeGender: 'male',
    settings: null,
    questionsByGender: {
      male: [],
      female: [],
    },
  };

  const refs = {
    logoutButton: document.querySelector('#admin-logout-btn'),
    rulesList: document.querySelector('#admin-rules-list'),
    addRuleButton: document.querySelector('#admin-add-rule-btn'),
    saveRulesButton: document.querySelector('#admin-save-rules-btn'),
    rulesFeedback: document.querySelector('#admin-rules-feedback'),
    genderTabs: document.querySelectorAll('[data-gender-tab]'),
    newQuestionForm: document.querySelector('#admin-new-question-form'),
    questionsList: document.querySelector('#admin-questions-list'),
    questionsFeedback: document.querySelector('#admin-questions-feedback'),
  };

  const currentPath = window.location.pathname.replace(/\/+$/, '');
  const loginPath = currentPath.replace(/\/dashboard$/, '');

  function parseOptionsText(rawText) {
    return String(rawText || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function optionsToTextarea(options) {
    if (!Array.isArray(options)) {
      return '';
    }
    return options.join('\n');
  }

  function requiresOptions(questionType) {
    return questionType === 'single_choice' || questionType === 'multi_choice';
  }

  function getGenderLabel(genderType) {
    return genderType === 'female' ? 'Kadın' : 'Erkek';
  }

  function handleAuthError(error) {
    if (error && error.status === 401) {
      window.location.href = loginPath;
      return true;
    }

    return false;
  }

  function createRuleInput(initialValue = '') {
    const row = document.createElement('div');
    row.className = 'admin-rule-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'admin-rule-input';
    input.maxLength = 180;
    input.placeholder = 'Kural metni';
    input.value = initialValue;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'ghost-btn admin-mini-btn';
    removeButton.textContent = 'Sil';
    removeButton.addEventListener('click', () => {
      row.remove();
    });

    row.appendChild(input);
    row.appendChild(removeButton);
    return row;
  }

  function renderRules(ruleList = []) {
    if (!refs.rulesList) {
      return;
    }

    refs.rulesList.innerHTML = '';
    const rules = Array.isArray(ruleList) && ruleList.length ? ruleList : [''];
    rules.forEach((ruleText) => {
      refs.rulesList.appendChild(createRuleInput(ruleText));
    });
  }

  function collectRulesFromForm() {
    if (!refs.rulesList) {
      return [];
    }

    return Array.from(refs.rulesList.querySelectorAll('.admin-rule-input'))
      .map((input) => String(input.value || '').trim())
      .filter(Boolean)
      .slice(0, 15);
  }

  async function loadAdminSettings() {
    const payload = await shared.apiFetch('/api/admin/settings', { method: 'GET' });
    state.settings = payload.data || {};
    renderRules(state.settings.rules || []);
  }

  function normalizeQuestionPayloadFromForm(form, genderType) {
    const formData = new FormData(form);
    const questionType = String(formData.get('questionType') || '').trim();
    const options = parseOptionsText(formData.get('optionsText'));
    const orderValue = Number(formData.get('orderIndex'));

    const payload = {
      genderType,
      questionText: String(formData.get('questionText') || '').trim(),
      questionType,
      orderIndex: Number.isFinite(orderValue) && orderValue > 0 ? Math.floor(orderValue) : 1,
      isActive: formData.get('isActive') === 'on',
      approved: formData.get('approved') === 'on',
      options: requiresOptions(questionType) ? options : [],
    };

    if (!payload.questionText) {
      const error = new Error('Soru metni bos olamaz.');
      error.status = 400;
      throw error;
    }

    if (!payload.questionType) {
      const error = new Error('Soru tipi secmelisiniz.');
      error.status = 400;
      throw error;
    }

    if (requiresOptions(questionType) && !payload.options.length) {
      const error = new Error('Secmeli sorularda en az bir secenek olmalidir.');
      error.status = 400;
      throw error;
    }

    return payload;
  }

  async function loadQuestionsForGender(genderType) {
    const payload = await shared.apiFetch(
      `/api/admin/questions?genderType=${encodeURIComponent(genderType)}`,
      {
        method: 'GET',
      }
    );

    const questions = Array.isArray(payload.data) ? payload.data : [];
    state.questionsByGender[genderType] = questions;
  }

  function getActiveQuestions() {
    return state.questionsByGender[state.activeGender] || [];
  }

  function buildQuestionCard(question) {
    const card = document.createElement('article');
    card.className = 'admin-question-card';
    card.dataset.questionId = question.id;

    const heading = document.createElement('h3');
    heading.textContent = `${getGenderLabel(question.genderType)} - ${question.questionText}`;

    const textLabel = document.createElement('label');
    textLabel.textContent = 'Soru metni';
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = question.questionText || '';
    textInput.maxLength = 260;
    textLabel.appendChild(textInput);

    const grid = document.createElement('div');
    grid.className = 'admin-question-grid';

    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Soru tipi';
    const typeSelect = document.createElement('select');
    ['single_choice', 'multi_choice', 'open_text', 'rating'].forEach((typeValue) => {
      const option = document.createElement('option');
      option.value = typeValue;
      option.textContent = typeValue;
      option.selected = question.questionType === typeValue;
      typeSelect.appendChild(option);
    });
    typeLabel.appendChild(typeSelect);

    const orderLabel = document.createElement('label');
    orderLabel.textContent = 'Sıra';
    const orderInput = document.createElement('input');
    orderInput.type = 'number';
    orderInput.min = '1';
    orderInput.value = Number(question.orderIndex || 1);
    orderLabel.appendChild(orderInput);

    grid.appendChild(typeLabel);
    grid.appendChild(orderLabel);

    const optionsLabel = document.createElement('label');
    optionsLabel.textContent = 'Seçenekler (her satıra bir seçenek)';
    const optionsTextarea = document.createElement('textarea');
    optionsTextarea.value = optionsToTextarea(question.options);
    optionsLabel.appendChild(optionsTextarea);

    const checks = document.createElement('div');
    checks.className = 'admin-inline-checks';

    const activeLabel = document.createElement('label');
    activeLabel.className = 'admin-check-item';
    const activeInput = document.createElement('input');
    activeInput.type = 'checkbox';
    activeInput.checked = Boolean(question.isActive);
    activeLabel.appendChild(activeInput);
    activeLabel.append(' Aktif');

    const approvedLabel = document.createElement('label');
    approvedLabel.className = 'admin-check-item';
    const approvedInput = document.createElement('input');
    approvedInput.type = 'checkbox';
    approvedInput.checked = Boolean(question.approved);
    approvedLabel.appendChild(approvedInput);
    approvedLabel.append(' Onaylı');

    checks.appendChild(activeLabel);
    checks.appendChild(approvedLabel);

    const actions = document.createElement('div');
    actions.className = 'admin-actions-row';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'primary-btn';
    saveButton.textContent = 'Güncelle';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'ghost-btn';
    deleteButton.textContent = 'Soruyu Sil';

    actions.appendChild(saveButton);
    actions.appendChild(deleteButton);

    const localFeedback = document.createElement('div');
    localFeedback.className = 'hidden';

    async function handleSave() {
      shared.hideMessage(localFeedback);
      const questionType = String(typeSelect.value || '').trim();
      const payload = {
        questionText: String(textInput.value || '').trim(),
        questionType,
        orderIndex: Math.max(1, Number(orderInput.value || 1)),
        options: requiresOptions(questionType) ? parseOptionsText(optionsTextarea.value) : [],
        isActive: activeInput.checked,
        approved: approvedInput.checked,
      };

      if (!payload.questionText) {
        shared.showMessage(localFeedback, 'Soru metni bos olamaz.', 'error');
        return;
      }

      if (requiresOptions(questionType) && !payload.options.length) {
        shared.showMessage(localFeedback, 'Secmeli soru icin en az bir secenek gerekli.', 'error');
        return;
      }

      saveButton.disabled = true;
      deleteButton.disabled = true;

      try {
        await shared.apiFetch(`/api/admin/questions/${encodeURIComponent(question.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        shared.showMessage(localFeedback, 'Soru guncellendi.', 'success');
        await loadQuestionsForGender(state.activeGender);
        renderQuestions();
      } catch (error) {
        if (!handleAuthError(error)) {
          shared.showMessage(localFeedback, error.message, 'error');
        }
      } finally {
        saveButton.disabled = false;
        deleteButton.disabled = false;
      }
    }

    async function handleDelete() {
      shared.hideMessage(localFeedback);
      const confirmed = window.confirm('Bu soruyu silmek istiyor musunuz?');
      if (!confirmed) {
        return;
      }

      saveButton.disabled = true;
      deleteButton.disabled = true;

      try {
        await shared.apiFetch(`/api/admin/questions/${encodeURIComponent(question.id)}`, {
          method: 'DELETE',
        });

        shared.showMessage(refs.questionsFeedback, 'Soru silindi.', 'success');
        await loadQuestionsForGender(state.activeGender);
        renderQuestions();
      } catch (error) {
        if (!handleAuthError(error)) {
          shared.showMessage(localFeedback, error.message, 'error');
        }
      } finally {
        saveButton.disabled = false;
        deleteButton.disabled = false;
      }
    }

    saveButton.addEventListener('click', handleSave);
    deleteButton.addEventListener('click', handleDelete);

    card.appendChild(heading);
    card.appendChild(textLabel);
    card.appendChild(grid);
    card.appendChild(optionsLabel);
    card.appendChild(checks);
    card.appendChild(actions);
    card.appendChild(localFeedback);
    return card;
  }

  function renderQuestions() {
    if (!refs.questionsList) {
      return;
    }

    refs.questionsList.innerHTML = '';
    const list = getActiveQuestions();
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'info-box';
      empty.textContent = 'Bu cinsiyet grubu icin soru bulunmuyor.';
      refs.questionsList.appendChild(empty);
      return;
    }

    list.forEach((question) => {
      refs.questionsList.appendChild(buildQuestionCard(question));
    });
  }

  async function bootstrapDashboard() {
    try {
      await shared.apiFetch('/api/admin/me', {
        method: 'GET',
      });
    } catch (_error) {
      window.location.href = loginPath;
      return;
    }

    try {
      await Promise.all([
        loadAdminSettings(),
        loadQuestionsForGender('male'),
        loadQuestionsForGender('female'),
      ]);
      renderQuestions();
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(
          refs.questionsFeedback,
          error.message || 'Panel verileri yuklenemedi.',
          'error'
        );
      }
    }
  }

  refs.addRuleButton?.addEventListener('click', () => {
    refs.rulesList?.appendChild(createRuleInput(''));
  });

  refs.saveRulesButton?.addEventListener('click', async () => {
    shared.hideMessage(refs.rulesFeedback);
    const rules = collectRulesFromForm();
    if (!rules.length) {
      shared.showMessage(refs.rulesFeedback, 'En az bir kural girmelisiniz.', 'error');
      return;
    }

    refs.saveRulesButton.disabled = true;
    try {
      const payload = await shared.apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ rules }),
      });

      state.settings = payload.data || state.settings;
      renderRules(state.settings?.rules || rules);
      shared.showMessage(refs.rulesFeedback, 'Kurallar kaydedildi.', 'success');
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(refs.rulesFeedback, error.message, 'error');
      }
    } finally {
      refs.saveRulesButton.disabled = false;
    }
  });

  refs.genderTabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      const nextGender = tab.dataset.genderTab === 'female' ? 'female' : 'male';
      if (state.activeGender === nextGender) {
        return;
      }

      state.activeGender = nextGender;
      refs.genderTabs.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.genderTab === state.activeGender);
      });

      renderQuestions();
      shared.hideMessage(refs.questionsFeedback);
    });
  });

  refs.newQuestionForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    shared.hideMessage(refs.questionsFeedback);

    let payload;
    try {
      payload = normalizeQuestionPayloadFromForm(refs.newQuestionForm, state.activeGender);
    } catch (error) {
      shared.showMessage(refs.questionsFeedback, error.message, 'error');
      return;
    }

    const submitButton = refs.newQuestionForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      await shared.apiFetch('/api/admin/questions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      shared.showMessage(
        refs.questionsFeedback,
        `${getGenderLabel(state.activeGender)} soru listesine yeni soru eklendi.`,
        'success'
      );

      refs.newQuestionForm.reset();
      const orderInput = refs.newQuestionForm.querySelector('#new-question-order');
      if (orderInput) {
        orderInput.value = '1';
      }

      const activeInput = refs.newQuestionForm.querySelector('#new-question-active');
      const approvedInput = refs.newQuestionForm.querySelector('#new-question-approved');
      if (activeInput) {
        activeInput.checked = true;
      }
      if (approvedInput) {
        approvedInput.checked = true;
      }

      await loadQuestionsForGender(state.activeGender);
      renderQuestions();
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(refs.questionsFeedback, error.message, 'error');
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });

  refs.logoutButton?.addEventListener('click', async () => {
    refs.logoutButton.disabled = true;
    try {
      await shared.apiFetch('/api/admin/logout', {
        method: 'POST',
      });
    } catch (_error) {
      // Sessiz gec.
    } finally {
      window.location.href = loginPath;
    }
  });

  await bootstrapDashboard();
})();
