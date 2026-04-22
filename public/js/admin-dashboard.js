(async () => {
  const shared = window.ContestShared;
  const settings = await shared.loadSettings();
  shared.applyBranding(settings);

  const state = {
    settings: null,
    teamsLoaded: false,
    teams: [],
    selectedTeamKey: '',
    selectedTeamName: '',
    participants: [],
    selectedSubmission: null,
  };

  const refs = {
    logoutButton: document.querySelector('#admin-logout-btn'),
    refreshButton: document.querySelector('#admin-refresh-btn'),
    teamsCount: document.querySelector('#admin-teams-count'),
    teamsList: document.querySelector('#admin-teams-list'),
    participantsCount: document.querySelector('#admin-participants-count'),
    participantsList: document.querySelector('#admin-participants-list'),
    answerDetail: document.querySelector('#admin-answer-detail'),
    resultsFeedback: document.querySelector('#admin-results-feedback'),
    siteSettingsForm: document.querySelector('#admin-site-settings-form'),
    siteSettingsFeedback: document.querySelector('#admin-site-settings-feedback'),
    rulesList: document.querySelector('#admin-rules-list'),
    addRuleButton: document.querySelector('#admin-add-rule-btn'),
  };

  const currentPath = window.location.pathname.replace(/\/+$/, '');
  const loginPath = currentPath.replace(/\/dashboard$/, '');

  function handleAuthError(error) {
    if (error && error.status === 401) {
      window.location.href = loginPath;
      return true;
    }

    return false;
  }

  function formatAnswerValue(value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return String(value ?? '-');
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

  function renderSiteSettings(settingsPayload = {}) {
    if (!refs.siteSettingsForm) {
      return;
    }

    const fields = [
      'heroTitle',
      'heroDescription',
      'landingHeadline',
      'infoText',
      'entryFormTitle',
      'participantLabel',
      'participantPlaceholder',
      'teamLabel',
      'teamPlaceholder',
      'primaryButtonText',
      'submitButtonText',
      'completionMessage',
      'flowTitle',
      'flowStepOne',
      'flowStepTwo',
      'flowStepThree',
    ];

    fields.forEach((fieldName) => {
      const input = refs.siteSettingsForm.elements.namedItem(fieldName);
      if (input) {
        input.value = settingsPayload[fieldName] || '';
      }
    });

    renderRules(settingsPayload.rules || []);
  }

  async function loadAdminSettings() {
    const payload = await shared.apiFetch('/api/admin/settings', {
      method: 'GET',
    });

    state.settings = payload.data || {};
    renderSiteSettings(state.settings);
  }

  function renderTeams() {
    if (!refs.teamsList || !refs.teamsCount) {
      return;
    }

    refs.teamsCount.textContent = String(state.teams.length);
    refs.teamsList.innerHTML = '';

    if (!state.teamsLoaded) {
      const info = document.createElement('div');
      info.className = 'info-box';
      info.textContent = 'Kayitlar yukleniyor...';
      refs.teamsList.appendChild(info);
      return;
    }

    if (!state.teams.length) {
      const empty = document.createElement('div');
      empty.className = 'info-box';
      empty.textContent = 'Henuz takim kaydi bulunmuyor.';
      refs.teamsList.appendChild(empty);
      return;
    }

    state.teams.forEach((team) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'admin-browser-item';
      button.classList.toggle('is-active', state.selectedTeamKey === team.pairKey);

      const title = document.createElement('strong');
      title.textContent = team.teamName || team.pairName || 'Takim';

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

    if (!state.teamsLoaded) {
      const info = document.createElement('div');
      info.className = 'info-box';
      info.textContent = 'Kayitlar yukleniyor...';
      refs.participantsList.appendChild(info);
      return;
    }

    if (!state.selectedTeamKey) {
      const info = document.createElement('div');
      info.className = 'info-box';
      info.textContent = 'Soldan bir takim sec.';
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
      const card = document.createElement('article');
      card.className = 'admin-browser-item';
      card.classList.toggle('is-active', state.selectedSubmission?.id === participant.id);

      const mainButton = document.createElement('button');
      mainButton.type = 'button';
      mainButton.className = 'admin-item-main';

      const title = document.createElement('strong');
      title.textContent = participant.participantName || 'Katilimci';

      const meta = document.createElement('span');
      meta.className = 'admin-browser-meta';
      meta.textContent = `${participant.answerCount || 0} cevap`;

      mainButton.appendChild(title);
      mainButton.appendChild(meta);
      mainButton.addEventListener('click', async () => {
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

      card.appendChild(mainButton);
      card.appendChild(deleteButton);
      refs.participantsList.appendChild(card);
    });
  }

  function renderAnswerDetail() {
    if (!refs.answerDetail) {
      return;
    }

    refs.answerDetail.innerHTML = '';

    if (!state.teamsLoaded) {
      const info = document.createElement('div');
      info.className = 'info-box';
      info.textContent = 'Kayitlar yukleniyor...';
      refs.answerDetail.appendChild(info);
      return;
    }

    if (!state.selectedSubmission) {
      const info = document.createElement('div');
      info.className = 'info-box';
      info.textContent = 'Bir kisi secince cevaplar burada gorunur.';
      refs.answerDetail.appendChild(info);
      return;
    }

    const summary = document.createElement('div');
    summary.className = 'info-box';
    summary.innerHTML = `Takim: <strong>${state.selectedSubmission.teamName}</strong><br/>Kisi: <strong>${state.selectedSubmission.participantName}</strong><br/>Tarih: <strong>${state.selectedSubmission.createdAt || '-'}</strong>`;

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
      title.textContent = `${index + 1}. ${answer.questionText || 'Soru'}`;

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
      empty.textContent = 'Bu kayitta cevap bulunmuyor.';
      list.appendChild(empty);
    }

    refs.answerDetail.appendChild(summary);
    refs.answerDetail.appendChild(actions);
    refs.answerDetail.appendChild(list);
  }

  async function loadTeams({ preserveSelection = false, preserveSubmission = false } = {}) {
    if (refs.refreshButton) {
      refs.refreshButton.disabled = true;
    }

    shared.hideMessage(refs.resultsFeedback);

    try {
      const payload = await shared.apiFetch('/api/admin/teams', {
        method: 'GET',
      });

      state.teams = Array.isArray(payload.data) ? payload.data : [];
      state.teamsLoaded = true;

      const selectedTeamStillExists =
        preserveSelection && state.teams.some((team) => team.pairKey === state.selectedTeamKey);

      renderTeams();

      if (selectedTeamStillExists) {
        await loadParticipants(state.selectedTeamKey, { preserveSubmission });
        return;
      }

      state.selectedTeamKey = '';
      state.selectedTeamName = '';
      state.participants = [];
      state.selectedSubmission = null;
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
      if (refs.refreshButton) {
        refs.refreshButton.disabled = false;
      }
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

      const selectedSubmissionId = preserveSubmission ? state.selectedSubmission?.id : '';
      const selectedSubmissionStillExists = selectedSubmissionId
        ? state.participants.some((participant) => participant.id === selectedSubmissionId)
        : false;

      renderTeams();
      renderParticipants();

      if (selectedSubmissionStillExists) {
        await loadSubmission(selectedSubmissionId);
        return;
      }

      state.selectedSubmission = null;
      renderAnswerDetail();
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(
          refs.resultsFeedback,
          error.message || 'Takim kisileri yuklenemedi.',
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
          error.message || 'Cevaplar yuklenemedi.',
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

      if (pairKey) {
        state.selectedTeamKey = pairKey;
      }

      await loadTeams({ preserveSelection: true, preserveSubmission: true });
      shared.showMessage(refs.resultsFeedback, 'Kisi kaydi silindi.', 'success');
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(refs.resultsFeedback, error.message, 'error');
      }
    }
  }

  refs.refreshButton?.addEventListener('click', async () => {
    await loadTeams({ preserveSelection: true, preserveSubmission: true });
  });

  refs.addRuleButton?.addEventListener('click', () => {
    refs.rulesList?.appendChild(createRuleInput(''));
  });

  refs.siteSettingsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    shared.hideMessage(refs.siteSettingsFeedback);

    const formData = new FormData(refs.siteSettingsForm);
    const payload = Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value || '').trim()])
    );
    payload.rules = collectRulesFromForm();

    const submitButton = refs.siteSettingsForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const response = await shared.apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      state.settings = response.data || {};
      renderSiteSettings(state.settings);
      shared.showMessage(refs.siteSettingsFeedback, 'Ayarlar kaydedildi.', 'success');
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
      await Promise.all([loadAdminSettings(), loadTeams()]);
    } catch (error) {
      if (!handleAuthError(error)) {
        shared.showMessage(
          refs.resultsFeedback,
          error.message || 'Panel verileri yuklenemedi.',
          'error'
        );
      }
    }
  }

  await bootstrapDashboard();
})();
