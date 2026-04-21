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
    resultsLoaded: false,
    teams: [],
    selectedTeamKey: '',
    selectedTeamName: '',
    participants: [],
    selectedSubmission: null,
  };

  const refs = {
    logoutButton: document.querySelector('#admin-logout-btn'),
    panelTabs: document.querySelectorAll('[data-admin-tab]'),
    tabPanels: document.querySelectorAll('[data-admin-panel]'),
    loadTeamsButton: document.querySelector('#admin-load-teams-btn'),
    teamsCount: document.querySelector('#admin-teams-count'),
    teamsList: document.querySelector('#admin-teams-list'),
    participantsCount: document.querySelector('#admin-participants-count'),
    participantsList: document.querySelector('#admin-participants-list'),
    answerDetail: document.querySelector('#admin-answer-detail'),
    resultsFeedback: document.querySelector('#admin-results-feedback'),
    rulesList: document.querySelector('#admin-rules-list'),
    addRuleButton: document.querySelector('#admin-add-rule-btn'),
    saveRulesButton: document.querySelector('#admin-save-rules-btn'),
    rulesFeedback: document.querySelector('#admin-rules-feedback'),
    genderTabs: document.querySelectorAll('[data-gender-tab]'),
    newQuestionForm: document.querySelector('#admin-new-question-form'),
    questionsList: document.querySelector('#admin-questions-list'),
    questionsFeedback: document.querySelector('#admin-questions-feedback'),
    siteSettingsForm: document.querySelector('#admin-site-settings-form'),
    siteSettingsFeedback: document.querySelector('#admin-site-settings-feedback'),
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
    return genderType === 'female' ? 'Kiz' : 'Erkek';
  }

  function formatAnswerValue(value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return String(value ?? '-');
  }

  function handleAuthError(error) {
    if (error && error.status === 401) {
      window.location.href = loginPath;
      return true;
    }

    return false;
  }

  function switchTab(nextTab) {
    refs.panelTabs.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.adminTab === nextTab);
    });

    refs.tabPanels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.adminPanel === nextTab);
    });
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
    renderSiteSettings(state.settings);
  }

  function renderSiteSettings(settingsPayload = {}) {
    if (!refs.siteSettingsForm) {
      return;
    }

    const formFields = [
      'heroTitle',
      'heroDescription',
      'landingHeadline',
      'infoText',
      'entryFormTitle',
      'primaryButtonText',
      'participantLabel',
      'participantPlaceholder',
      'teamLabel',
      'teamPlaceholder',
      'rolePrompt',
      'femaleCardTitle',
      'femaleCardDescription',
      'maleCardTitle',
      'maleCardDescription',
      'flowTitle',
      'flowStepOne',
      'flowStepTwo',
      'flowStepThree',
      'submitButtonText',
      'completionMessage',
    ];

    formFields.forEach((fieldName) => {
      const input = refs.siteSettingsForm.elements.namedItem(fieldName);
      if (input) {
        input.value = settingsPayload[fieldName] || '';
      }
    });
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
      const error = new Error('Soru tipi secmelisin.');
      error.status = 400;
      throw error;
    }

    if (requiresOptions(questionType) && !payload.options.length) {
      const error = new Error('Secmeli sorularda en az bir secenek gerekli.');
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
    orderLabel.textContent = 'Sira';
    const orderInput = document.createElement('input');
    orderInput.type = 'number';
    orderInput.min = '1';
    orderInput.value = Number(question.orderIndex || 1);
    orderLabel.appendChild(orderInput);

    grid.appendChild(typeLabel);
    grid.appendChild(orderLabel);

    const optionsLabel = document.createElement('label');
    optionsLabel.textContent = 'Secenekler (her satira bir secenek)';
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
    approvedLabel.append(' Onayli');

    checks.appendChild(activeLabel);
    checks.appendChild(approvedLabel);

    const actions = document.createElement('div');
    actions.className = 'admin-actions-row';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'primary-btn';
    saveButton.textContent = 'Guncelle';

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
      if (!window.confirm('Bu soruyu silmek istiyor musun?')) {
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
      empty.textContent = 'Bu grup icin soru bulunmuyor.';
      refs.questionsList.appendChild(empty);
      return;
    }

    list.forEach((question) => {
      refs.questionsList.appendChild(buildQuestionCard(question));
    });
  }

  function renderTeams() {
    if (!refs.teamsList || !refs.teamsCount) {
      return;
    }

    refs.teamsCount.textContent = String(state.teams.length);
    refs.teamsList.innerHTML = '';

    if (!state.resultsLoaded) {
      const info = document.createElement('div');
      info.className = 'info-box';
      info.textContent = 'Takimlari gormek icin Baslat butonuna bas.';
      refs.teamsList.appendChild(info);
      return;
    }

    if (!state.teams.length) {
      const empty = document.createElement('div');
      empty.className = 'info-box';
      empty.textContent = 'Henuz kayitli takim bulunmuyor.';
      refs.teamsList.appendChild(empty);
      return;
    }

    state.teams.forEach((team) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'admin-browser-item';
      button.classList.toggle('is-active', state.selectedTeamKey === team.pairKey);

      const title = document.createElement('strong');
      title.textContent = team.teamName || team.pairName;

      const meta = document.createElement('span');
      meta.className = 'admin-browser-meta';
      meta.textContent = `${team.participantCount || team.respondentCount || 0} kisi`;

      button.appendChild(title);
      button.appendChild(meta);

      button.addEventListener('click', async () => {
        shared.hideMessage(refs.resultsFeedback);
        await loadParticipants(team.pairKey);
      });

      refs.teamsList.appendChild(button);
    });
  }

  function renderParticipants() {
    if (!refs.participantsList || !refs.participantsCount) {
      return;
    }

    refs.participantsCount.textContent = String(state.participants.length);
    refs.participantsList.innerHTML = '';

    if (!state.resultsLoaded) {
      const info = document.createElement('div');
      info.className = 'info-box';
      info.textContent = 'Baslat butonundan sonra takim secerek kisileri gorebilirsin.';
      refs.participantsList.appendChild(info);
      return;
    }

    if (!state.selectedTeamKey) {
      const info = document.createElement('div');
      info.className = 'info-box';
      info.textContent = 'Once bir takim sec.';
      refs.participantsList.appendChild(info);
      return;
    }

    if (!state.participants.length) {
      const empty = document.createElement('div');
      empty.className = 'info-box';
      empty.textContent = 'Bu takimda kisi kaydi bulunmuyor.';
      refs.participantsList.appendChild(empty);
      return;
    }

    state.participants.forEach((participant) => {
      const item = document.createElement('article');
      item.className = 'admin-browser-item';
      item.classList.toggle('is-active', state.selectedSubmission?.id === participant.id);

      const infoWrap = document.createElement('button');
      infoWrap.type = 'button';
      infoWrap.className = 'admin-item-main';

      const title = document.createElement('strong');
      title.textContent = participant.participantName;

      const meta = document.createElement('span');
      meta.className = 'admin-browser-meta';
      meta.textContent = `${getGenderLabel(participant.genderType)} - ${participant.answerCount} cevap`;

      infoWrap.appendChild(title);
      infoWrap.appendChild(meta);
      infoWrap.addEventListener('click', async () => {
        shared.hideMessage(refs.resultsFeedback);
        await loadSubmission(participant.id);
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ghost-btn admin-mini-btn';
      deleteButton.textContent = 'Sil';
      deleteButton.addEventListener('click', async () => {
        await deleteParticipant(participant.id, state.selectedTeamKey);
      });

      item.appendChild(infoWrap);
      item.appendChild(deleteButton);
      refs.participantsList.appendChild(item);
    });
  }

  function renderAnswerDetail() {
    if (!refs.answerDetail) {
      return;
    }

    refs.answerDetail.innerHTML = '';

    if (!state.resultsLoaded) {
      const info = document.createElement('div');
      info.className = 'info-box';
      info.textContent = 'Cevaplari gormek icin Baslat ile verileri ac.';
      refs.answerDetail.appendChild(info);
      return;
    }

    if (!state.selectedSubmission) {
      const info = document.createElement('div');
      info.className = 'info-box';
      info.textContent = 'Bir kisi secildiginde cevaplar burada gosterilir.';
      refs.answerDetail.appendChild(info);
      return;
    }

    const summary = document.createElement('div');
    summary.className = 'info-box';
    summary.innerHTML = `Takim: <strong>${state.selectedSubmission.teamName}</strong><br/>Kisi: <strong>${state.selectedSubmission.participantName}</strong><br/>Taraf: <strong>${getGenderLabel(state.selectedSubmission.genderType)}</strong><br/>Tarih: <strong>${state.selectedSubmission.createdAt || '-'}</strong>`;

    const actions = document.createElement('div');
    actions.className = 'admin-actions-row';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'ghost-btn';
    deleteButton.textContent = 'Bu Kisiyi Sil';
    deleteButton.addEventListener('click', async () => {
      await deleteParticipant(state.selectedSubmission.id, state.selectedSubmission.pairKey);
    });

    actions.appendChild(deleteButton);

    const list = document.createElement('div');
    list.className = 'admin-answer-list';

    const answers = Array.isArray(state.selectedSubmission.answers)
      ? state.selectedSubmission.answers
      : [];

    answers.forEach((answer, index) => {
      const item = document.createElement('article');
      item.className = 'admin-answer-item';

      const title = document.createElement('h4');
      title.className = 'admin-answer-title';
      title.textContent = `${index + 1}. ${answer.questionText}`;

      const value = document.createElement('p');
      value.className = 'admin-answer-value';
      value.textContent = formatAnswerValue(answer.answer);

      item.appendChild(title);
      item.appendChild(value);
      list.appendChild(item);
    });

    if (!answers.length) {
      const empty = document.createElement('div');
      empty.className = 'info-box';
      empty.textContent = 'Bu kayitta gosterilecek cevap bulunmuyor.';
      list.appendChild(empty);
    }

    refs.answerDetail.appendChild(summary);
    refs.answerDetail.appendChild(actions);
    refs.answerDetail.appendChild(list);
  }

  async function loadTeams({ preserveSelection = false } = {}) {
    refs.loadTeamsButton.disabled = true;
    shared.hideMessage(refs.resultsFeedback);

    try {
      const payload = await shared.apiFetch('/api/admin/teams', {
        method: 'GET',
      });

      state.resultsLoaded = true;
      state.teams = Array.isArray(payload.data) ? payload.data : [];

      const selectedStillExists = preserveSelection
        ? state.teams.find((team) => team.pairKey === state.selectedTeamKey)
        : null;

      if (!selectedStillExists) {
        state.selectedTeamKey = '';
        state.selectedTeamName = '';
        state.participants = [];
        state.selectedSubmission = null;
      }

      renderTeams();
      renderParticipants();
      renderAnswerDetail();
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(
          refs.resultsFeedback,
          error.message || 'Takimlar yuklenemedi.',
          'error'
        );
      }
    } finally {
      refs.loadTeamsButton.disabled = false;
    }
  }

  async function loadParticipants(pairKey, { preserveSubmission = false } = {}) {
    try {
      const payload = await shared.apiFetch(`/api/admin/teams/${encodeURIComponent(pairKey)}`, {
        method: 'GET',
      });

      state.selectedTeamKey = payload.data?.pairKey || pairKey;
      state.selectedTeamName = payload.data?.teamName || '';
      state.participants = Array.isArray(payload.data?.participants) ? payload.data.participants : [];

      const submissionStillExists = preserveSubmission
        ? state.participants.find((participant) => participant.id === state.selectedSubmission?.id)
        : null;

      if (!submissionStillExists) {
        state.selectedSubmission = null;
      }

      renderTeams();
      renderParticipants();
      renderAnswerDetail();

      if (submissionStillExists) {
        await loadSubmission(submissionStillExists.id);
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(
          refs.resultsFeedback,
          error.message || 'Takimdaki kisiler yuklenemedi.',
          'error'
        );
      }
    }
  }

  async function loadSubmission(submissionId) {
    try {
      const payload = await shared.apiFetch(
        `/api/admin/submissions/${encodeURIComponent(submissionId)}`,
        {
          method: 'GET',
        }
      );

      state.selectedSubmission = payload.data || null;
      renderParticipants();
      renderAnswerDetail();
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(
          refs.resultsFeedback,
          error.message || 'Kisi cevaplari yuklenemedi.',
          'error'
        );
      }
    }
  }

  async function deleteParticipant(submissionId, pairKey) {
    const targetParticipant =
      state.participants.find((participant) => participant.id === submissionId) ||
      state.selectedSubmission;
    const participantName = targetParticipant?.participantName || 'Bu kisi';

    if (!window.confirm(`${participantName} kaydini silmek istiyor musun?`)) {
      return;
    }

    shared.hideMessage(refs.resultsFeedback);

    try {
      await shared.apiFetch(`/api/admin/submissions/${encodeURIComponent(submissionId)}`, {
        method: 'DELETE',
      });

      await loadTeams({ preserveSelection: true });
      const teamStillExists = state.teams.find((team) => team.pairKey === pairKey);

      if (teamStillExists) {
        await loadParticipants(pairKey);
      } else {
        state.selectedTeamKey = '';
        state.selectedTeamName = '';
        state.participants = [];
        state.selectedSubmission = null;
        renderTeams();
        renderParticipants();
        renderAnswerDetail();
      }

      shared.showMessage(refs.resultsFeedback, 'Kisi kaydi silindi.', 'success');
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(refs.resultsFeedback, error.message, 'error');
      }
    }
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
      renderTeams();
      renderParticipants();
      renderAnswerDetail();
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

  refs.loadTeamsButton?.addEventListener('click', async () => {
    await loadTeams();
  });

  refs.panelTabs.forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      switchTab(tabButton.dataset.adminTab || 'results');
    });
  });

  refs.addRuleButton?.addEventListener('click', () => {
    refs.rulesList?.appendChild(createRuleInput(''));
  });

  refs.saveRulesButton?.addEventListener('click', async () => {
    shared.hideMessage(refs.rulesFeedback);
    const rules = collectRulesFromForm();
    if (!rules.length) {
      shared.showMessage(refs.rulesFeedback, 'En az bir kural girmelisin.', 'error');
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

  refs.siteSettingsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    shared.hideMessage(refs.siteSettingsFeedback);

    const formData = new FormData(refs.siteSettingsForm);
    const payload = Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value || '').trim()])
    );

    const submitButton = refs.siteSettingsForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const response = await shared.apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      state.settings = response.data || state.settings;
      renderSiteSettings(state.settings);
      shared.showMessage(refs.siteSettingsFeedback, 'Ana sayfa metinleri kaydedildi.', 'success');
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(refs.siteSettingsFeedback, error.message, 'error');
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });

  refs.genderTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
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
