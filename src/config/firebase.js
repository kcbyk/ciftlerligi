const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');
const env = require('./env');
const { createLocalFirestore, resolveStoragePath } = require('./localFirestore');

let db;
let runtimeMode = '';

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

function hasFirebaseCredentialSource() {
  return Boolean(
    env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

function initializeLocalDatastore() {
  runtimeMode = 'local';
  db = createLocalFirestore();
  return db;
}

function initializeFirebase() {
  if (db) {
    return db;
  }

  if (env.USE_LOCAL_DATASTORE || !hasFirebaseCredentialSource()) {
    return initializeLocalDatastore();
  }

  const credential =
    buildCredentialFromPath() ||
    buildCredentialFromEnv() ||
    admin.credential.applicationDefault();

  try {
    admin.initializeApp({
      credential,
      storageBucket: env.FIREBASE_STORAGE_BUCKET || undefined,
    });

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    runtimeMode = 'firebase';
  } catch (error) {
    console.warn(
      `Firebase baslatilamadi, yerel veri deposuna geciliyor: ${error.message}`
    );
    return initializeLocalDatastore();
  }

  return db;
}

function getFirestore() {
  if (!db) {
    initializeFirebase();
  }

  return db;
}

function getAdminSdk() {
  if (!db) {
    initializeFirebase();
  }

  if (runtimeMode === 'local') {
    return null;
  }

  if (!admin.apps.length) {
    initializeFirebase();
  }

  return admin;
}

function getDatastoreMode() {
  if (!db) {
    initializeFirebase();
  }

  return runtimeMode || 'firebase';
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAdminSdk,
  getDatastoreMode,
  resolveLocalDatastorePath: resolveStoragePath,
};
