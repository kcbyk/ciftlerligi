const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');
const env = require('./env');

let db;

function buildCredentialFromEnv() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return null;
  }

  return admin.credential.cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
}

function buildCredentialFromPath() {
  if (!env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return null;
  }

  const absolutePath = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Firebase service account not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf8');
  const serviceAccount = JSON.parse(raw);

  return admin.credential.cert(serviceAccount);
}

function initializeFirebase() {
  if (db) {
    return db;
  }

  const credential =
    buildCredentialFromPath() ||
    buildCredentialFromEnv() ||
    admin.credential.applicationDefault();

  admin.initializeApp({
    credential,
    storageBucket: env.FIREBASE_STORAGE_BUCKET || undefined,
  });

  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });

  return db;
}

function getFirestore() {
  if (!db) {
    initializeFirebase();
  }

  return db;
}

function getAdminSdk() {
  if (!admin.apps.length) {
    initializeFirebase();
  }

  return admin;
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAdminSdk,
};
