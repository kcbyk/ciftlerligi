(() => {
  const state = {
    settings: null,
    questions: {
      male: [],
      female: [],
    },
    submissions: [],
    logs: [],
  };

  const refs = {
    message: document.querySelector('#admin-message'),
    logoutBtn: document.querySelector('#admin-logout-btn'),
    refreshBtn: document.querySelector('#refresh-dashboard-btn'),
    settingsForm: document.querySelector('#settings-form'),
    questionForm: document.querySelector('#question-form'),
    questionFormMode: document.querySelector('#question-form-mode'),
    questionId: document.querySelector('#question-id'),
    maleList: document.querySelector('#male-questions-list'),
    femaleList: document.querySelector('#female-questions-list'),
    submissionList: document.querySelector('#submission-list'),
    submissionDetail: document.querySelector('#submission-detail'),
    logList: document.querySelector('#log-list'),
    telegramForm: document.querySelector('#telegram-form'),
    telegramTestBtn: document.querySelector('#telegram-test-btn'),
    logoForm: document.querySelector('#logo-upload-form'),
    backgroundForm: document.querySelector('#background-upload-form'),
  };

  function showMessage(message, type = 'info') {
    if (!refs.message) {
      return;
    }

    refs.message.textContent = message;
    refs.message.className = type;
    refs.message.classList.remove('hidden');
  }

  function hideMessage() {
    if (!refs.message) {
      return;
    }

    refs.message.classList.add('hidden');
    refs.message.textContent = '';
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      const error = new Error(payload.message || 'Islem basarisiz oldu.');
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  async function uploadFile(url, fieldName, file) {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Dosya yuklenemedi.');
    }

    return payload;
  }

  function parseRules(rawRules) {
    return String(rawRules || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function parseOptions(rawOptions) {
    return String(rawOptions || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function renderSettings() {
    if (!state.settings || !refs.settingsForm) {
      return;
    }

    const settings = state.settings;

    refs.settingsForm.heroTitle.value = settings.heroTitle || '';
    refs.settingsForm.heroDescription.value = settings.heroDescription || '';
    refs.settingsForm.rulesText.value = (settings.rules || []).join('\n');
    refs.settingsForm.completionMessage.value = settings.completionMessage || '';
    refs.settingsForm.infoText.value = settings.infoText || '';
    refs.settingsForm.primaryButtonText.value = settings.primaryButtonText || '';
    refs.settingsForm.submitButtonText.value = settings.submitButtonText || '';
    refs.settingsForm.instagramUrl.value = settings.instagramUrl || '';
    refs.settingsForm.youtubeUrl.value = settings.youtubeUrl || '';
    refs.settingsForm.logoSize.value = settings.logoSize || 116;
    refs.settingsForm.watermarkEnabled.checked = Boolean(settings.watermarkEnabled);
  }

  function questionBadges(question) {
    const activeBadge = question.isActive
      ? '<span class="badge ok">Aktif</span>'
      : '<span class="badge warn">Pasif</span>';
    const approvedBadge = question.approved
      ? '<span class="badge ok">Onayli</span>'
      : '<span class="badge warn">Bekliyor</span>';

    return `${activeBadge} ${approvedBadge}`;
  }

  function renderQuestionList(target, items = []) {
    if (!target) {
      return;
    }

    target.innerHTML = '';
    if (!items.length) {
      target.innerHTML = '<div class="info">Bu kategori icin soru yok.</div>';
      return;
    }

    items.forEach((question, index) => {
      const card = document.createElement('div');
      card.className = 'item';
      card.innerHTML = `
        <div class="item-head">
          <strong>${index + 1}. ${question.questionText}</strong>
          <div>${questionBadges(question)}</div>
        </div>
        <div class="info">Tip: ${question.questionType} | ID: ${question.id}</div>
        <div class="inline-actions">
          <button data-action="edit" data-id="${question.id}">Duzenle</button>
          <button class="secondary" data-action="toggle-active" data-id="${question.id}">
            ${question.isActive ? 'Pasif Yap' : 'Aktif Yap'}
          </button>
          <button class="secondary" data-action="toggle-approved" data-id="${question.id}">
            ${question.approved ? 'Onayi Kaldir' : 'Onayla/Yayinla'}
          </button>
          <button class="secondary" data-action="move-up" data-id="${question.id}">Yukari</button>
          <button class="secondary" data-action="move-down" data-id="${question.id}">Asagi</button>
          <button class="danger" data-action="delete" data-id="${question.id}">Sil</button>
        </div>
      `;

      target.appendChild(card);
    });
  }

  function renderSubmissions() {
    if (!refs.submissionList) {
      return;
    }

    refs.submissionList.innerHTML = '';

    if (!state.submissions.length) {
      refs.submissionList.innerHTML = '<div class="info">Henuz basvuru yok.</div>';
      if (refs.submissionDetail) {
        refs.submissionDetail.innerHTML = '<div class="info">Detay icin bir kayit secin.</div>';
      }
      return;
    }

    state.submissions.forEach((submission) => {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div class="item-head">
          <strong>${submission.pairName}</strong>
          <span class="badge ok">${submission.genderType}</span>
        </div>
        <div>${submission.respondentName} - ${submission.createdAt}</div>
        <div class="inline-actions">
          <button data-action="submission-detail" data-id="${submission.id}">Detay</button>
        </div>
      `;

      refs.submissionList.appendChild(item);
    });
  }

  function renderSubmissionDetail(submission) {
    if (!refs.submissionDetail) {
      return;
    }

    if (!submission) {
      refs.submissionDetail.innerHTML = '<div class="info">Detay icin bir kayit secin.</div>';
      return;
    }

    const answers = (submission.answersJson || [])
      .map((row, index) => {
        const value = Array.isArray(row.answer) ? row.answer.join(', ') : row.answer;
        return `<div class="item"><strong>${index + 1}. ${row.questionText}</strong><div>${value}</div></div>`;
      })
      .join('');

    refs.submissionDetail.innerHTML = `
      <div class="item">
        <h3>${submission.pairName}</h3>
        <div>1. Kisi: ${submission.personOneName}</div>
        <div>2. Kisi: ${submission.personTwoName}</div>
        <div>Cevaplayan: ${submission.respondentName}</div>
        <div>Cinsiyet: ${submission.genderType}</div>
        <div>Tarih: ${submission.createdAt}</div>
        <div>IP: ${submission.ipAddress || '-'}</div>
        <div>Cihaz: ${submission.deviceInfo || '-'}</div>
      </div>
      <div class="list">${answers || '<div class="info">Cevap yok.</div>'}</div>
    `;
  }

  function renderLogs() {
    if (!refs.logList) {
      return;
    }

    refs.logList.innerHTML = '';
    if (!state.logs.length) {
      refs.logList.innerHTML = '<div class="info">Log kaydi yok.</div>';
      return;
    }

    state.logs.forEach((log) => {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <strong>${log.actionType}</strong>
        <div>${log.actionDetail}</div>
        <small>${log.createdAt}</small>
      `;
      refs.logList.appendChild(item);
    });
  }

  function renderTelegram(telegram) {
    if (!telegram || !refs.telegramForm) {
      return;
    }

    refs.telegramForm.botToken.value = telegram.botToken || '';
    refs.telegramForm.chatId.value = telegram.chatId || '';

    const statusBadge = document.querySelector('#telegram-status');
    if (statusBadge) {
      statusBadge.textContent = telegram.status?.isActive
        ? 'Bot aktif'
        : 'Bot pasif';
    }
  }

  async function refreshDashboard() {
    const payload = await api('/api/admin/dashboard');
    state.settings = payload.data.settings;
    state.questions = payload.data.questions;
    state.submissions = payload.data.submissions;
    state.logs = payload.data.logs;

    renderSettings();
    renderQuestionList(refs.maleList, state.questions.male || []);
    renderQuestionList(refs.femaleList, state.questions.female || []);
    renderSubmissions();
    renderSubmissionDetail(null);
    renderLogs();
    renderTelegram(payload.data.telegram);
  }

  function getQuestionFromState(questionId) {
    const male = state.questions.male || [];
    const female = state.questions.female || [];
    return [...male, ...female].find((question) => question.id === questionId);
  }

  function getGenderBucket(genderType) {
    return genderType === 'male' ? state.questions.male : state.questions.female;
  }

  async function handleQuestionAction(action, questionId) {
    const question = getQuestionFromState(questionId);
    if (!question) {
      return;
    }

    if (action === 'edit') {
      refs.questionFormMode.textContent = 'Duzenleme';
      refs.questionId.value = question.id;
      refs.questionForm.genderType.value = question.genderType;
      refs.questionForm.questionText.value = question.questionText;
      refs.questionForm.questionType.value = question.questionType;
      refs.questionForm.optionsText.value = (question.options || []).join('\n');
      refs.questionForm.isActive.checked = Boolean(question.isActive);
      refs.questionForm.approved.checked = Boolean(question.approved);
      refs.questionForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (action === 'delete') {
      const confirmed = window.confirm('Bu soruyu silmek istediginize emin misiniz?');
      if (!confirmed) {
        return;
      }

      await api(`/api/admin/questions/${question.id}`, {
        method: 'DELETE',
      });
      await refreshDashboard();
      showMessage('Soru silindi.', 'success');
      return;
    }

    if (action === 'toggle-active') {
      await api(`/api/admin/questions/${question.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !question.isActive }),
      });
      await refreshDashboard();
      showMessage('Soru aktiflik durumu guncellendi.', 'success');
      return;
    }

    if (action === 'toggle-approved') {
      await api(`/api/admin/questions/${question.id}`, {
        method: 'PUT',
        body: JSON.stringify({ approved: !question.approved }),
      });
      await refreshDashboard();
      showMessage('Soru onay durumu guncellendi.', 'success');
      return;
    }

    if (action === 'move-up' || action === 'move-down') {
      const bucket = [...getGenderBucket(question.genderType)];
      const index = bucket.findIndex((row) => row.id === question.id);
      const targetIndex = action === 'move-up' ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= bucket.length) {
        return;
      }

      [bucket[index], bucket[targetIndex]] = [bucket[targetIndex], bucket[index]];

      await api('/api/admin/questions/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          genderType: question.genderType,
          orderedIds: bucket.map((row) => row.id),
        }),
      });

      await refreshDashboard();
      showMessage('Soru sirasi guncellendi.', 'success');
    }
  }

  async function handleSubmissionDetail(submissionId) {
    const payload = await api(`/api/admin/submissions/${submissionId}`);
    renderSubmissionDetail(payload.data);
  }

  function bindQuestionListEvents(container) {
    if (!container) {
      return;
    }

    container.addEventListener('click', async (event) => {
      const target = event.target.closest('button[data-action]');
      if (!target) {
        return;
      }

      const action = target.dataset.action;
      const id = target.dataset.id;

      try {
        hideMessage();
        await handleQuestionAction(action, id);
      } catch (error) {
        showMessage(error.message, 'error');
      }
    });
  }

  function bindSubmissionEvents() {
    if (!refs.submissionList) {
      return;
    }

    refs.submissionList.addEventListener('click', async (event) => {
      const target = event.target.closest('button[data-action="submission-detail"]');
      if (!target) {
        return;
      }

      try {
        await handleSubmissionDetail(target.dataset.id);
      } catch (error) {
        showMessage(error.message, 'error');
      }
    });
  }

  function resetQuestionForm() {
    refs.questionFormMode.textContent = 'Yeni';
    refs.questionId.value = '';
    refs.questionForm.reset();
    refs.questionForm.genderType.value = 'male';
  }

  function initSettingsForm() {
    if (!refs.settingsForm) {
      return;
    }

    refs.settingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideMessage();

      const payload = {
        heroTitle: refs.settingsForm.heroTitle.value,
        heroDescription: refs.settingsForm.heroDescription.value,
        rules: parseRules(refs.settingsForm.rulesText.value),
        completionMessage: refs.settingsForm.completionMessage.value,
        infoText: refs.settingsForm.infoText.value,
        primaryButtonText: refs.settingsForm.primaryButtonText.value,
        submitButtonText: refs.settingsForm.submitButtonText.value,
        instagramUrl: refs.settingsForm.instagramUrl.value,
        youtubeUrl: refs.settingsForm.youtubeUrl.value,
        logoSize: Number(refs.settingsForm.logoSize.value),
        watermarkEnabled: refs.settingsForm.watermarkEnabled.checked,
      };

      try {
        await api('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        await refreshDashboard();
        showMessage('Ayarlar kaydedildi.', 'success');
      } catch (error) {
        showMessage(error.message, 'error');
      }
    });
  }

  function initQuestionForm() {
    if (!refs.questionForm) {
      return;
    }

    refs.questionForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideMessage();

      const payload = {
        genderType: refs.questionForm.genderType.value,
        questionText: refs.questionForm.questionText.value,
        questionType: refs.questionForm.questionType.value,
        options: parseOptions(refs.questionForm.optionsText.value),
        isActive: refs.questionForm.isActive.checked,
        approved: refs.questionForm.approved.checked,
      };

      const currentId = refs.questionId.value;

      try {
        if (currentId) {
          await api(`/api/admin/questions/${currentId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          showMessage('Soru guncellendi.', 'success');
        } else {
          await api('/api/admin/questions', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          showMessage('Yeni soru eklendi.', 'success');
        }

        resetQuestionForm();
        await refreshDashboard();
      } catch (error) {
        showMessage(error.message, 'error');
      }
    });

    const cancelButton = document.querySelector('#question-form-cancel');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        resetQuestionForm();
      });
    }
  }

  function initTelegramForm() {
    if (!refs.telegramForm) {
      return;
    }

    refs.telegramForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideMessage();

      const payload = {
        botToken: refs.telegramForm.botToken.value,
        chatId: refs.telegramForm.chatId.value,
      };

      try {
        await api('/api/admin/telegram-settings', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        await refreshDashboard();
        showMessage('Telegram ayarlari guncellendi.', 'success');
      } catch (error) {
        showMessage(error.message, 'error');
      }
    });

    if (refs.telegramTestBtn) {
      refs.telegramTestBtn.addEventListener('click', async () => {
        hideMessage();
        try {
          await api('/api/admin/telegram-test', {
            method: 'POST',
          });
          showMessage('Test mesaji gonderildi.', 'success');
        } catch (error) {
          showMessage(error.message, 'error');
        }
      });
    }
  }

  function initAssetForms() {
    if (refs.logoForm) {
      refs.logoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const file = refs.logoForm.logo.files[0];
        if (!file) {
          showMessage('Logo secmeden yukleme yapamazsiniz.', 'error');
          return;
        }

        try {
          await uploadFile('/api/admin/assets/logo', 'logo', file);
          await refreshDashboard();
          showMessage('Logo yuklendi.', 'success');
          refs.logoForm.reset();
        } catch (error) {
          showMessage(error.message, 'error');
        }
      });
    }

    if (refs.backgroundForm) {
      refs.backgroundForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const file = refs.backgroundForm.background.files[0];
        if (!file) {
          showMessage('Arka plan secmeden yukleme yapamazsiniz.', 'error');
          return;
        }

        try {
          await uploadFile('/api/admin/assets/background', 'background', file);
          await refreshDashboard();
          showMessage('Arka plan yuklendi.', 'success');
          refs.backgroundForm.reset();
        } catch (error) {
          showMessage(error.message, 'error');
        }
      });
    }
  }

  function initTopActions() {
    if (refs.logoutBtn) {
      refs.logoutBtn.addEventListener('click', async () => {
        try {
          await api('/api/admin/logout', {
            method: 'POST',
          });
          const loginPath = window.location.pathname.replace(/\/dashboard\/?$/, '');
          window.location.href = loginPath || '/';
        } catch (error) {
          showMessage(error.message, 'error');
        }
      });
    }

    if (refs.refreshBtn) {
      refs.refreshBtn.addEventListener('click', async () => {
        hideMessage();
        try {
          await refreshDashboard();
          showMessage('Panel verileri guncellendi.', 'success');
        } catch (error) {
          showMessage(error.message, 'error');
        }
      });
    }
  }

  async function ensureSession() {
    try {
      await api('/api/admin/session');
      return true;
    } catch (_error) {
      const loginPath = window.location.pathname.replace(/\/dashboard\/?$/, '');
      window.location.href = loginPath || '/';
      return false;
    }
  }

  async function initialize() {
    const isSessionValid = await ensureSession();
    if (!isSessionValid) {
      return;
    }

    initTopActions();
    initSettingsForm();
    initQuestionForm();
    initTelegramForm();
    initAssetForms();
    bindQuestionListEvents(refs.maleList);
    bindQuestionListEvents(refs.femaleList);
    bindSubmissionEvents();

    try {
      await refreshDashboard();
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  initialize();
})();
