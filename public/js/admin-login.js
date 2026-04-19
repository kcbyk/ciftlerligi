(async () => {
  const shared = window.ContestShared;
  const settings = await shared.loadSettings();
  shared.applyBranding(settings);

  const form = document.querySelector('#admin-login-form');
  const feedback = document.querySelector('#admin-login-feedback');
  const currentPath = window.location.pathname.replace(/\/+$/, '');
  const dashboardPath = `${currentPath}/dashboard`;

  if (!form) {
    return;
  }

  try {
    await shared.apiFetch('/api/admin/me', {
      method: 'GET',
    });
    window.location.href = dashboardPath;
    return;
  } catch (_error) {
    // Sessiz gec.
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    shared.hideMessage(feedback);

    const formData = new FormData(form);
    const password = String(formData.get('password') || '').trim();
    if (!password) {
      shared.showMessage(feedback, 'Lutfen sifreyi girin.', 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.style.opacity = '0.7';

    try {
      await shared.apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });

      shared.showMessage(feedback, 'Giris basarili. Yonetim paneline yonlendiriliyorsunuz.', 'success');
      window.setTimeout(() => {
        window.location.href = dashboardPath;
      }, 350);
    } catch (error) {
      shared.showMessage(feedback, error.message, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.style.opacity = '1';
    }
  });
})();
