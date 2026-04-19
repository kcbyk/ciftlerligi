(() => {
  const form = document.querySelector('#admin-login-form');
  const feedback = document.querySelector('#admin-login-feedback');

  function showMessage(message, type = 'info') {
    feedback.textContent = message;
    feedback.className = type;
    feedback.classList.remove('hidden');
  }

  async function checkSession(basePath) {
    try {
      const response = await fetch('/api/admin/session', {
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = `${basePath}/dashboard`;
      }
    } catch (_error) {
      // ignore
    }
  }

  if (!form) {
    return;
  }

  const basePath = window.location.pathname.replace(/\/$/, '');
  checkSession(basePath);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = form.password.value;
    if (!password) {
      showMessage('Sifre alani bos olamaz.', 'error');
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Giris basarisiz.');
      }

      showMessage('Giris basarili, panele yonlendiriliyorsunuz...', 'success');
      setTimeout(() => {
        window.location.href = `${basePath}/dashboard`;
      }, 350);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });
})();
