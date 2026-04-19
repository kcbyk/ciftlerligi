const { getFirestore } = require('../config/firebase');
const { ADMIN_LOGS_COLLECTION } = require('../constants/collections');
const { normalizeText } = require('../utils/sanitize');

function nowIso() {
  return new Date().toISOString();
}

function logCollection() {
  return getFirestore().collection(ADMIN_LOGS_COLLECTION);
}

async function createAdminLog({
  actionType,
  actionDetail,
  actor = 'admin',
  ipAddress = '',
} = {}) {
  const safeActionType = normalizeText(actionType || 'UNKNOWN');
  const safeActionDetail = normalizeText(actionDetail || '');
  const safeActor = normalizeText(actor || 'admin');
  const safeIp = normalizeText(ipAddress || '');

  if (!safeActionType) {
    return null;
  }

  const ref = logCollection().doc();
  await ref.set({
    actionType: safeActionType,
    actionDetail: safeActionDetail,
    actor: safeActor,
    ipAddress: safeIp,
    createdAt: nowIso(),
  });

  return ref.id;
}

module.exports = {
  createAdminLog,
};
