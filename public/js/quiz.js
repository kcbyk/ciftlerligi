(async () => {
  const shared = window.ContestShared;
  const settings = await shared.loadSettings();
  shared.applyBranding(settings);

  const token = sessionStorage.getItem('surveyToken');
  if (!token) {
    window.location.href = '/form';
    return;
  }

  const profileRaw = sessionStorage.getItem('surveyProfile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;

  const state = {
    questions: [],
    answers: {},
    index: 0,
    submitting: false,
  };

  const refs = {
    quizStep: document.querySelector('#quiz-step'),
    progressText: document.querySelector('#quiz-progress-text'),
    progressFill: document.querySelector('#quiz-progress-fill'),
    backBtn: document.querySelector('#quiz-back-btn'),
    nextBtn: document.querySelector('#quiz-next-btn'),
    feedback: document.querySelector('#quiz-feedback'),
    personTitle: document.querySelector('#quiz-person-title'),
  };

  if (refs.personTitle && profile) {
    refs.personTitle.textContent = `${profile.respondentName} icin anket`;
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

  function isAnswerEmpty(question, value) {
    if (!question) {
      return true;
    }

    if (question.questionType === 'multi_choice') {
      return !Array.isArray(value) || value.length === 0;
    }

    if (question.questionType === 'rating') {
      return value === null || typeof value === 'undefined' || value === '';
    }

    return !String(value || '').trim();
  }

  function renderSingleChoice(question, currentValue) {
    const list = document.createElement('div');
    list.className = 'choice-list';

    (question.options || []).forEach((option, optionIndex) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'choice-item';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `question-${question.id}`;
      input.value = option;
      input.checked = String(currentValue || '') === option;
      input.addEventListener('change', () => setAnswer(question.id, option));

      const text = document.createElement('span');
      text.textContent = option || `Secenek ${optionIndex + 1}`;

      wrapper.appendChild(input);
      wrapper.appendChild(text);
      list.appendChild(wrapper);
    });

    return list;
  }

  function renderMultiChoice(question, currentValue) {
    const selected = Array.isArray(currentValue) ? [...currentValue] : [];
    const list = document.createElement('div');
    list.className = 'choice-list';

    (question.options || []).forEach((option) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'choice-item';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = option;
      input.checked = selected.includes(option);
      input.addEventListener('change', () => {
        const current = Array.isArray(getAnswer(question.id)) ? [...getAnswer(question.id)] : [];
        if (input.checked) {
          if (!current.includes(option)) {
            current.push(option);
          }
        } else {
          const next = current.filter((item) => item !== option);
          setAnswer(question.id, next);
          return;
        }

        setAnswer(question.id, current);
      });

      const text = document.createElement('span');
      text.textContent = option;

      wrapper.appendChild(input);
      wrapper.appendChild(text);
      list.appendChild(wrapper);
    });

    return list;
  }

  function renderOpenText(question, currentValue) {
    const input = document.createElement('textarea');
    input.placeholder = 'Cevabinizi buraya yazin...';
    input.value = currentValue || '';
    input.addEventListener('input', () => {
      setAnswer(question.id, input.value);
    });

    return input;
  }

  function renderRating(question, currentValue) {
    const list = document.createElement('div');
    list.className = 'rating-row';

    for (let score = 1; score <= 10; score += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rating-btn';
      btn.textContent = score;
      if (Number(currentValue) === score) {
        btn.classList.add('is-active');
      }

      btn.addEventListener('click', () => {
        setAnswer(question.id, score);
        renderQuestion();
      });

      list.appendChild(btn);
    }

    return list;
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

    let control;
    if (question.questionType === 'single_choice') {
      control = renderSingleChoice(question, answerValue);
    } else if (question.questionType === 'multi_choice') {
      control = renderMultiChoice(question, answerValue);
    } else if (question.questionType === 'rating') {
      control = renderRating(question, answerValue);
    } else {
      control = renderOpenText(question, answerValue);
    }

    refs.quizStep.appendChild(indexText);
    refs.quizStep.appendChild(questionTitle);
    refs.quizStep.appendChild(control);

    const progress = ((state.index + 1) / state.questions.length) * 100;
    refs.progressFill.style.width = `${Math.max(progress, 2)}%`;
    refs.progressText.textContent = `${state.index + 1}/${state.questions.length}`;

    refs.backBtn.disabled = state.index === 0;
    refs.nextBtn.textContent =
      state.index === state.questions.length - 1
        ? settings.submitButtonText || 'Anketi Tamamla'
        : settings.primaryButtonText || 'Devam Et';
  }

  async function submitSurvey() {
    if (state.submitting) {
      return;
    }

    state.submitting = true;
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
      window.location.href = '/tamamlandi';
    } catch (error) {
      shared.showMessage(refs.feedback, error.message, 'error');
    } finally {
      state.submitting = false;
      refs.nextBtn.disabled = false;
    }
  }

  refs.backBtn.addEventListener('click', () => {
    if (state.index > 0) {
      state.index -= 1;
      renderQuestion();
    }
  });

  refs.nextBtn.addEventListener('click', async () => {
    const question = getCurrentQuestion();
    const answerValue = getAnswer(question.id);

    if (isAnswerEmpty(question, answerValue)) {
      shared.showMessage(refs.feedback, 'Bu soruyu bos birakamazsiniz.', 'error');
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

    if (!state.questions.length) {
      shared.showMessage(
        refs.feedback,
        'Su anda aktif soru bulunmuyor. Lutfen daha sonra tekrar deneyin.',
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
})();
