import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { input } from '@inquirer/prompts';
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer';
import { createTask, sequential, parallel } from './util.task.js';
import fs from 'fs';
import path from 'path';

const EMULATOR_DATA_DIR = path.join(process.cwd(), '.ryziz/emulator-data');

export function createPullTasks(task) {
  let serviceAccountPath = '';
  let collections = [];

  return sequential(task, [
    createTask('Enter service account path', async (task) => {
      serviceAccountPath = await task.prompt(ListrInquirerPromptAdapter).run(input, {
        message: 'Paste absolute path to service account JSON file'
      });

      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Service account file not found: ${serviceAccountPath}`);
      }
    }),
    createTask('Connect to production', async () => {
      collections = await pullFirestore(serviceAccountPath);
    }),
    createTask('Export collections', (task) => {
      return parallel(task, collections.map(c =>
        createTask(c.id, async () => {
          await c.export();
        })
      ));
    }),
    createTask('Done', (task) => {
      task.title = 'Pull completed';
      task.output = 'Production data synced to .ryziz/emulator-data';
    })
  ]);
}

async function pullFirestore(serviceAccountPath) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  initializeApp({ credential: cert(serviceAccount) });

  const db = getFirestore();
  const collections = await db.listCollections();

  if (fs.existsSync(EMULATOR_DATA_DIR)) {
    fs.rmSync(EMULATOR_DATA_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(EMULATOR_DATA_DIR, { recursive: true });

  return collections.map(collection => ({
    id: collection.id,
    export: async () => {
      const data = await exportCollection(collection);
      fs.writeFileSync(
        `${EMULATOR_DATA_DIR}/${collection.id}.json`,
        JSON.stringify(data, null, 2)
      );
    }
  }));
}

async function exportCollection(collection) {
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
