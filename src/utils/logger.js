function logInfo(message, meta = {}) {
  console.log(`[INFO] ${new Date().toISOString()} ${message}`, meta);
}

function logWarn(message, meta = {}) {
  console.warn(`[WARN] ${new Date().toISOString()} ${message}`, meta);
}

function logError(message, error) {
  const payload = {
    message: error?.message,
    stack: error?.stack,
  };

  console.error(`[ERROR] ${new Date().toISOString()} ${message}`, payload);
}

module.exports = {
  logInfo,
  logWarn,
  logError,
};
