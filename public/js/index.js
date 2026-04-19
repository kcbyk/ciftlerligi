(async () => {
  const settings = await window.ContestShared.loadSettings();
  window.ContestShared.applyBranding(settings);
})();
