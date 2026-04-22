(async () => {
  const shared = window.ContestShared;
  const settings = await shared.loadSettings();
  shared.applyBranding(settings);

  const token = sessionStorage.getItem('surveyToken');
  if (!token) {
    window.location.href = '/';
    return;
  }

  const profileRaw = sessionStorage.getItem('surveyProfile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;

  const state = {
    questions: [],
    answers: {},
    index: 0,
    submitting: false,
    questionTimeLimitSeconds: 10,
    timerIntervalId: null,
    timerStartedAt: 0,
    failed: false,
  };

  const refs = {
    quizStep: document.querySelector('#quiz-step'),
    progressText: document.querySelector('#quiz-progress-text'),
    progressFill: document.querySelector('#quiz-progress-fill'),
    backBtn: document.querySelector('#quiz-back-btn'),
    nextBtn: document.querySelector('#quiz-next-btn'),
    feedback: document.querySelector('#quiz-feedback'),
    personTitle: document.querySelector('#quiz-person-title'),
    timerText: document.querySelector('#quiz-timer-text'),
    timerFill: document.querySelector('#quiz-timer-fill'),
  };

  if (refs.personTitle && profile) {
    const participantName = profile.participantName || profile.respondentName || 'Katilimci';
    const teamName = profile.teamName || profile.pairName || 'Takim';
    refs.personTitle.textContent = `${participantName} - ${teamName}`;
  }

  if (refs.backBtn) {
    refs.backBtn.classList.add('hidden');
    refs.backBtn.disabled = true;
  }

  function getCurrentQuestion() {
    return state.questions[state.index];
  }

  function getAnswer(questionId) {
    return state.answers[questionId];
  }

  function setAnswer(questionId, value) {
    state.answers[questionId] = value;
  }

  function clearTimer() {
    if (state.timerIntervalId) {
      window.clearInterval(state.timerIntervalId);
      state.timerIntervalId = null;
    }
  }

  function redirectToHomeWithFailure() {
    if (state.failed) {
      return;
    }

    state.failed = true;
    clearTimer();
    sessionStorage.removeItem('surveyToken');
    sessionStorage.removeItem('surveyProfile');
    sessionStorage.setItem('entryError', 'Suren bitti. Anket basarisiz oldu. Lutfen yeniden basla.');
    window.location.href = '/?timeout=1';
  }

  function updateTimerUi() {
    const limitMs = state.questionTimeLimitSeconds * 1000;
    const elapsedMs = Date.now() - state.timerStartedAt;
    const remainingMs = Math.max(limitMs - elapsedMs, 0);
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const ratio = Math.max(remainingMs / limitMs, 0);

    if (refs.timerText) {
      refs.timerText.textContent = `${remainingSeconds} sn`;
    }

    if (refs.timerFill) {
      refs.timerFill.style.width = `${ratio * 100}%`;
      refs.timerFill.classList.toggle('is-low', ratio <= 0.3);
    }

    if (remainingMs <= 0) {
      redirectToHomeWithFailure();
    }
  }

  function startQuestionTimer() {
    clearTimer();
    state.timerStartedAt = Date.now();
    updateTimerUi();
    state.timerIntervalId = window.setInterval(updateTimerUi, 200);
  }

  function isAnswerEmpty(question, value) {
    if (!question) {
      return true;
    }

    return !String(value || '').trim();
  }

  function renderOpenText(question, currentValue) {
    const wrapper = document.createElement('div');
    wrapper.className = 'quiz-answer-wrap';

    const note = document.createElement('p');
    note.className = 'quiz-answer-note';
    note.textContent = 'Cevap yazin';

    const input = document.createElement('textarea');
    input.className = 'quiz-open-answer';
    input.placeholder = 'Cevabini buraya yaz...';
    input.value = currentValue || '';
    input.maxLength = 400;
    input.addEventListener('input', () => {
      setAnswer(question.id, input.value);
    });

    wrapper.appendChild(note);
    wrapper.appendChild(input);

    window.setTimeout(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);

    return wrapper;
  }

  function renderQuestion() {
    const question = getCurrentQuestion();
    if (!question || !refs.quizStep) {
      return;
    }

    shared.hideMessage(refs.feedback);
    refs.quizStep.innerHTML = '';

    const indexText = document.createElement('p');
    indexText.className = 'info-box';
    indexText.textContent = `Soru ${state.index + 1} / ${state.questions.length}`;

    const questionTitle = document.createElement('h3');
    questionTitle.textContent = question.questionText || 'Soru';

    const answerValue = getAnswer(question.id);
    const control = renderOpenText(question, answerValue);

    refs.quizStep.appendChild(indexText);
    refs.quizStep.appendChild(questionTitle);
    refs.quizStep.appendChild(control);

    const progress = ((state.index + 1) / state.questions.length) * 100;
    refs.progressFill.style.width = `${Math.max(progress, 2)}%`;
    refs.progressText.textContent = `${state.index + 1}/${state.questions.length}`;

    refs.nextBtn.textContent =
      state.index === state.questions.length - 1
        ? settings.submitButtonText || 'Anketi Bitir'
        : settings.primaryButtonText || 'Devam Et';

    startQuestionTimer();
  }

  async function submitSurvey() {
    if (state.submitting || state.failed) {
      return;
    }

    state.submitting = true;
    clearTimer();
    refs.nextBtn.disabled = true;

    const answers = state.questions.map((question) => ({
      questionId: question.id,
      answer: getAnswer(question.id),
    }));

    try {
      const payload = await shared.apiFetch('/api/public/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });

      sessionStorage.setItem('submissionResult', JSON.stringify(payload.data || {}));
      sessionStorage.removeItem('surveyToken');
      sessionStorage.removeItem('surveyProfile');
      window.location.href = '/tamamlandi';
    } catch (error) {
      if (String(error.message || '').toLowerCase().includes('suren doldu')) {
        redirectToHomeWithFailure();
        return;
      }

      shared.showMessage(refs.feedback, error.message, 'error');
      state.submitting = false;
      refs.nextBtn.disabled = false;
      startQuestionTimer();
    }
  }

  refs.nextBtn.addEventListener('click', async () => {
    const question = getCurrentQuestion();
    const answerValue = getAnswer(question.id);

    if (isAnswerEmpty(question, answerValue)) {
      shared.showMessage(refs.feedback, 'Bu soruyu bos birakamazsin.', 'error');
      return;
    }

    if (state.index === state.questions.length - 1) {
      await submitSurvey();
      return;
    }

    state.index += 1;
    renderQuestion();
  });

  try {
    const questionPayload = await shared.apiFetch('/api/public/questions', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    state.questions = Array.isArray(questionPayload.data?.questions)
      ? questionPayload.data.questions
      : [];
    state.questionTimeLimitSeconds = Math.max(
      10,
      Number(questionPayload.data?.questionTimeLimitSeconds || 10)
    );

    if (!state.questions.length) {
      shared.showMessage(
        refs.feedback,
        'Su anda aktif soru bulunmuyor. Lutfen daha sonra tekrar dene.',
        'error'
      );
      refs.nextBtn.disabled = true;
      return;
    }

    renderQuestion();
  } catch (error) {
    shared.showMessage(refs.feedback, error.message, 'error');
    refs.nextBtn.disabled = true;
  }

  window.addEventListener('beforeunload', clearTimer);
})();
