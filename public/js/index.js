(async () => {
  const shared = window.ContestShared;
  const settings = await shared.loadSettings();
  shared.applyBranding(settings);

  const form = document.querySelector('#entry-form');
  const feedback = document.querySelector('#form-feedback');
  const genderInput = form?.querySelector('input[name="genderType"]');
  const genderButtons = Array.from(document.querySelectorAll('[data-gender-option]'));

  if (!form || !genderInput) {
    return;
  }

  function setGender(nextGender) {
    genderInput.value = nextGender;
    genderButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.genderOption === nextGender);
    });
  }

  genderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setGender(button.dataset.genderOption === 'female' ? 'female' : 'male');
      shared.hideMessage(feedback);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    shared.hideMessage(feedback);

    const formData = new FormData(form);
    const payload = {
      participantName: String(formData.get('participantName') || '').trim(),
      teamName: String(formData.get('teamName') || '').trim(),
      genderType: String(formData.get('genderType') || '').trim(),
    };

    if (!payload.participantName || !payload.teamName || !payload.genderType) {
      shared.showMessage(feedback, 'Isim, takim ismi ve taraf secimi zorunludur.', 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const response = await shared.apiFetch('/api/public/session', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      sessionStorage.setItem('surveyToken', response.data.surveyToken);
      sessionStorage.setItem('surveyProfile', JSON.stringify(response.data.profile));

      window.location.href = '/anket';
    } catch (error) {
      shared.showMessage(feedback, error.message, 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
})();
