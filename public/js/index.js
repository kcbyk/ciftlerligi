(async () => {
  const shared = window.ContestShared;
  const settings = await shared.loadSettings();
  shared.applyBranding(settings);

  const form = document.querySelector('#entry-form');
  const feedback = document.querySelector('#form-feedback');
  const params = new URLSearchParams(window.location.search);

  if (!form) {
    return;
  }

  const timeoutMessage = sessionStorage.getItem('entryError');
  if (timeoutMessage) {
    shared.showMessage(feedback, timeoutMessage, 'error');
    sessionStorage.removeItem('entryError');
  } else if (params.get('timeout') === '1') {
    shared.showMessage(feedback, 'Suren bitti. Anket basarisiz oldu. Lutfen yeniden basla.', 'error');
  }

  if (params.has('timeout')) {
    const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
    window.history.replaceState({}, '', cleanUrl);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    shared.hideMessage(feedback);

    const formData = new FormData(form);
    const payload = {
      participantName: String(formData.get('participantName') || '').trim(),
      teamName: String(formData.get('teamName') || '').trim(),
    };

    if (!payload.participantName || !payload.teamName) {
      shared.showMessage(feedback, 'Isim ve takim ismi zorunludur.', 'error');
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
