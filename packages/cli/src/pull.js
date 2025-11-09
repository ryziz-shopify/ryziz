import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const EMULATOR_DATA_DIR = path.join(process.cwd(), '.ryziz/emulator-data');

export const connect = _connect;
export const prepareDir = _prepareDir;
export const exportCollection = _exportCollection;

// Implementation

async function _connect(serviceAccountPath) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });

  const db = getFirestore();
  const collections = await db.listCollections();

  return collections;
}

function _prepareDir() {
  if (fs.existsSync(EMULATOR_DATA_DIR)) {
    fs.rmSync(EMULATOR_DATA_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(EMULATOR_DATA_DIR, { recursive: true });
}

async function _exportCollection(collection) {
  const data = await _fetchCollectionData(collection);
  fs.writeFileSync(
    `${EMULATOR_DATA_DIR}/${collection.id}.json`,
    JSON.stringify(data, null, 2)
  );
}

async function _fetchCollectionData(collection) {
  const data = {};
  let lastDoc = null;
  const batchSize = 1000;

  while (true) {
    let query = collection.limit(batchSize);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    snapshot.forEach(doc => {
      data[doc.id] = doc.data();
    });

    lastDoc = snapshot.docs[snapshot.size - 1];
    if (snapshot.size < batchSize) break;
  }

  return data;
}
