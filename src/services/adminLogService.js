const { getFirestore } = require('../config/firebase');
const { ADMIN_LOGS_COLLECTION } = require('../constants/collections');

function nowIso() {
  return new Date().toISOString();
}

async function logAdminAction({ actionType, actionDetail, req }) {
  const payload = {
    actionType: actionType || 'UNKNOWN_ACTION',
    actionDetail: actionDetail || '',
    createdAt: nowIso(),
    adminIp: req.headers['x-forwarded-for'] || req.ip || '',
    userAgent: req.headers['user-agent'] || '',
  };

  await getFirestore().collection(ADMIN_LOGS_COLLECTION).add(payload);
  return payload;
}

async function listAdminLogs({ limit = 80 } = {}) {
  const snapshot = await getFirestore()
    .collection(ADMIN_LOGS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

module.exports = {
  logAdminAction,
  listAdminLogs,
};
