const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const env = require('./env');

const DEFAULT_STORAGE_PATH = 'data/local-db.json';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveStoragePath() {
  return path.resolve(process.cwd(), env.LOCAL_DATASTORE_PATH || DEFAULT_STORAGE_PATH);
}

function ensureStorageFile() {
  const storagePath = resolveStoragePath();
  const directoryPath = path.dirname(storagePath);

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  if (!fs.existsSync(storagePath)) {
    fs.writeFileSync(
      storagePath,
      JSON.stringify(
        {
          collections: {},
        },
        null,
        2
      ),
      'utf8'
    );
  }
}

function readStore() {
  ensureStorageFile();
  const storagePath = resolveStoragePath();

  try {
    const raw = fs.readFileSync(storagePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.collections !== 'object') {
      throw new Error('Invalid local datastore structure.');
    }

    return parsed;
  } catch (_error) {
    const initialStore = { collections: {} };
    fs.writeFileSync(storagePath, JSON.stringify(initialStore, null, 2), 'utf8');
    return initialStore;
  }
}

function writeStore(store) {
  ensureStorageFile();
  fs.writeFileSync(resolveStoragePath(), JSON.stringify(store, null, 2), 'utf8');
}

function compareValues(left, right) {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left ?? '').localeCompare(String(right ?? ''), 'tr-TR', {
    sensitivity: 'base',
  });
}

class LocalDocumentSnapshot {
  constructor(id, value) {
    this.id = id;
    this._value = typeof value === 'undefined' ? undefined : clone(value);
  }

  get exists() {
    return typeof this._value !== 'undefined';
  }

  data() {
    if (!this.exists) {
      return undefined;
    }

    return clone(this._value);
  }
}

class LocalQueryDocumentSnapshot extends LocalDocumentSnapshot {
  constructor(id, value) {
    super(id, value);
  }

  get exists() {
    return true;
  }
}

class LocalQuerySnapshot {
  constructor(rows) {
    this.docs = rows.map((row) => new LocalQueryDocumentSnapshot(row.id, row.value));
    this.empty = this.docs.length === 0;
  }
}

class LocalDocumentReference {
  constructor(db, collectionName, id) {
    this.db = db;
    this.collectionName = collectionName;
    this.id = id || crypto.randomUUID();
  }

  async get() {
    const store = readStore();
    const collection = store.collections[this.collectionName] || {};
    return new LocalDocumentSnapshot(this.id, collection[this.id]);
  }

  async set(value, options = {}) {
    const nextValue = clone(value || {});

    this.db._mutate((collections) => {
      const collection = collections[this.collectionName] || {};
      const currentValue = collection[this.id];

      collection[this.id] =
        options && options.merge && currentValue
          ? {
              ...currentValue,
              ...nextValue,
            }
          : nextValue;

      collections[this.collectionName] = collection;
    });

    return this;
  }

  async delete() {
    this.db._mutate((collections) => {
      const collection = collections[this.collectionName] || {};
      delete collection[this.id];
      collections[this.collectionName] = collection;
    });
  }
}

class LocalQuery {
  constructor(db, collectionName, options = {}) {
    this.db = db;
    this.collectionName = collectionName;
    this.filters = options.filters || [];
    this.ordering = options.ordering || null;
    this.limitValue = typeof options.limitValue === 'number' ? options.limitValue : null;
  }

  where(field, operator, value) {
    if (operator !== '==') {
      throw new Error(`Local datastore only supports == filters. Received: ${operator}`);
    }

    return new LocalQuery(this.db, this.collectionName, {
      filters: [...this.filters, { field, value }],
      ordering: this.ordering,
      limitValue: this.limitValue,
    });
  }

  orderBy(field, direction = 'asc') {
    return new LocalQuery(this.db, this.collectionName, {
      filters: this.filters,
      ordering: {
        field,
        direction: String(direction || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc',
      },
      limitValue: this.limitValue,
    });
  }

  limit(value) {
    const parsed = Number(value);
    return new LocalQuery(this.db, this.collectionName, {
      filters: this.filters,
      ordering: this.ordering,
      limitValue: Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null,
    });
  }

  async get() {
    const store = readStore();
    const collection = store.collections[this.collectionName] || {};

    let rows = Object.entries(collection).map(([id, value]) => ({
      id,
      value: clone(value),
    }));

    this.filters.forEach((filter) => {
      rows = rows.filter((row) => row.value?.[filter.field] === filter.value);
    });

    if (this.ordering) {
      const directionMultiplier = this.ordering.direction === 'desc' ? -1 : 1;
      rows.sort((left, right) => {
        const leftValue = left.value?.[this.ordering.field];
        const rightValue = right.value?.[this.ordering.field];
        return compareValues(leftValue, rightValue) * directionMultiplier;
      });
    }

    if (typeof this.limitValue === 'number') {
      rows = rows.slice(0, this.limitValue);
    }

    return new LocalQuerySnapshot(rows);
  }
}

class LocalCollectionReference extends LocalQuery {
  constructor(db, collectionName) {
    super(db, collectionName);
    this.id = collectionName;
  }

  doc(id) {
    return new LocalDocumentReference(this.db, this.collectionName, id);
  }
}

class LocalWriteBatch {
  constructor() {
    this.operations = [];
  }

  set(reference, value, options = {}) {
    this.operations.push(() => reference.set(value, options));
    return this;
  }

  async commit() {
    for (const operation of this.operations) {
      await operation();
    }

    return [];
  }
}

class LocalFirestore {
  collection(collectionName) {
    return new LocalCollectionReference(this, collectionName);
  }

  batch() {
    return new LocalWriteBatch();
  }

  settings() {
    return undefined;
  }

  _mutate(mutator) {
    const store = readStore();
    mutator(store.collections);
    writeStore(store);
  }
}

function createLocalFirestore() {
  ensureStorageFile();
  return new LocalFirestore();
}

module.exports = {
  createLocalFirestore,
  resolveStoragePath,
};
