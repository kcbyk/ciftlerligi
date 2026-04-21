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
    const profileRaw = sessionStorage.getItem('surveyProfile');
    const profile = profileRaw ? JSON.parse(profileRaw) : null;

    if (parsed.submissionId) {
      const participantName = profile?.participantName || profile?.respondentName || '-';
      const teamName = profile?.teamName || profile?.pairName || '-';
      resultBox.innerHTML = `Takim: <strong>${teamName}</strong><br/>Kisi: <strong>${participantName}</strong><br/>Kayit kodu: <strong>${parsed.submissionId}</strong><br/>Olusturma tarihi: <strong>${parsed.createdAt || '-'}</strong>`;
    }
  } catch (_error) {
    resultBox.textContent = '';
  }
})();
