const { ensureSettings } = require('./settingsService');
const { ensureDefaultQuestions } = require('./questionService');

async function bootstrapData() {
  await ensureSettings();
  await ensureDefaultQuestions();
}

module.exports = {
  bootstrapData,
};
