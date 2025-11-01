import { shopifyApp } from '@shopify/shopify-app-express';
import { Session } from '@shopify/shopify-api';
import { getFirestore } from 'firebase-admin/firestore';

const hostName = process.env.SHOPIFY_HOST_NAME || 'localhost:8080';
const isLocalhost = hostName.includes('localhost') || hostName.includes('127.0.0.1');

const shopify = shopifyApp({
  sessionStorage: createSessionStorage(),
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
    hostName: hostName,
    hostScheme: isLocalhost ? 'http' : 'https',
    apiVersion: '2025-10'
  },
  auth: {
    path: '/auth',
    callbackPath: '/auth/callback',
  },
  webhooks: {
    path: '/webhook',
  },
});

export default shopify;

export const cookieStorage = createCookieStorage();

function createSessionStorage() {
  // Lazy init: getFirestore() called at runtime, not import time
  // Firebase must be initialized before accessing Firestore
  let collection;

  const getCollection = () => {
    if (!collection) {
      collection = getFirestore().collection('shopify-sessions');
    }
    return collection;
  };

  return {
    async storeSession(session) {
      await getCollection().doc(session.id).set(session.toObject());
      return true;
    },
    async loadSession(id) {
      const doc = await getCollection().doc(id).get();
      if (!doc.exists) return undefined;
      return new Session(doc.data());
    },
    async deleteSession(id) {
      await getCollection().doc(id).delete();
      return true;
    },
    async deleteSessions(ids) {
      await Promise.all(ids.map((id) => getCollection().doc(id).delete()));
      return true;
    },
    async findSessionsByShop(shop) {
      const docs = await getCollection().where('shop', '==', shop).get();
      return docs.docs.map((doc) => new Session(doc.data()));
    },
  };
}

function createCookieStorage() {
  // Lazy init: getFirestore() called at runtime, not import time
  // Firebase must be initialized before accessing Firestore
  let collection;

  const getCollection = () => {
    if (!collection) {
      collection = getFirestore().collection('shopify-cookies');
    }
    return collection;
  };

  return {
    async storeCookie(shop, cookie) {
      await getCollection().doc(shop).set({ cookie });
      return true;
    },
    async loadCookie(shop) {
      const doc = await getCollection().doc(shop).get();
      if (!doc.exists) return undefined;
      return doc.data().cookie;
    },
    async deleteCookie(shop) {
      await getCollection().doc(shop).delete();
      return true;
    },
  };
}
