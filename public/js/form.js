(async () => {
  const shared = window.ContestShared;
  const settings = await shared.loadSettings();
  shared.applyBranding(settings);

  const form = document.querySelector('#pair-form');
  const feedback = document.querySelector('#form-feedback');

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    shared.hideMessage(feedback);

    const formData = new FormData(form);
    const payload = {
      pairName: (formData.get('pairName') || '').trim(),
      personOneName: (formData.get('personOneName') || '').trim(),
      personTwoName: (formData.get('personTwoName') || '').trim(),
      respondentName: (formData.get('respondentName') || '').trim(),
      genderType: (formData.get('genderType') || '').trim(),
    };

    const requiredFields = Object.values(payload);
    if (requiredFields.some((value) => !value)) {
      shared.showMessage(feedback, 'Lutfen tum alanlari doldurun.', 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.style.opacity = '0.7';

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
      submitButton.disabled = false;
      submitButton.style.opacity = '1';
    }
  });
})();
