(async () => {
  const shared = window.ContestShared;
  const settings = await shared.loadSettings();
  shared.applyBranding(settings);

  const resultBox = document.querySelector('#submission-result');
  const raw = sessionStorage.getItem('submissionResult');

  if (!raw || !resultBox) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed.submissionId) {
      resultBox.innerHTML = `Kayit kodu: <strong>${parsed.submissionId}</strong><br/>Olusturma tarihi: <strong>${parsed.createdAt || '-'}</strong>`;
    }
  } catch (_error) {
    resultBox.textContent = '';
  }
})();
