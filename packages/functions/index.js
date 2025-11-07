import { getFirestore } from 'firebase-admin/firestore';

export { withShopify } from './src/middleware.js';

// Lazy init: Firebase must be initialized before accessing Firestore
let _db;

export const db = new Proxy({}, {
  get(_target, prop) {
    if (!_db) _db = getFirestore();
    return _db[prop];
  }
});
