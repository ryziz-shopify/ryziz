import { Session } from '@shopify/shopify-api';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
function initializeFirebase() {
  if (!admin.apps.length) {
    // In production, this uses Application Default Credentials
    // In development (emulators), uses FIRESTORE_EMULATOR_HOST env var
    admin.initializeApp();
  }
  return admin.firestore();
}

export function firestoreSessionStorage() {
  const db = initializeFirebase();
  const SESSIONS_COLLECTION = 'shopify-sessions';

  return {
    async storeSession(session) {
      try {
        const sessionData = {
          id: session.id,
          shop: session.shop,
          state: session.state,
          isOnline: session.isOnline,
          accessToken: session.accessToken,
          scope: session.scope,
          expires: session.expires?.toISOString() || null,
          onlineAccessInfo: session.onlineAccessInfo || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection(SESSIONS_COLLECTION).doc(session.id).set(sessionData);

        console.log(`Session stored for shop: ${session.shop}`);
        return true;
      } catch (error) {
        console.error('Error storing session:', error);
        throw error;
      }
    },

    async loadSession(id) {
      try {
        const doc = await db.collection(SESSIONS_COLLECTION).doc(id).get();

        if (!doc.exists) {
          console.log(`Session not found: ${id}`);
          return undefined;
        }

        const data = doc.data();

        return new Session({
          id: data.id,
          shop: data.shop,
          state: data.state,
          isOnline: data.isOnline,
          accessToken: data.accessToken,
          scope: data.scope,
          expires: data.expires ? new Date(data.expires) : undefined,
          onlineAccessInfo: data.onlineAccessInfo,
        });
      } catch (error) {
        console.error('Error loading session:', error);
        throw error;
      }
    },

    async deleteSession(id) {
      try {
        await db.collection(SESSIONS_COLLECTION).doc(id).delete();
        console.log(`Session deleted: ${id}`);
        return true;
      } catch (error) {
        console.error('Error deleting session:', error);
        throw error;
      }
    },

    async deleteSessions(ids) {
      try {
        const batch = db.batch();

        ids.forEach(id => {
          const docRef = db.collection(SESSIONS_COLLECTION).doc(id);
          batch.delete(docRef);
        });

        await batch.commit();
        console.log(`Deleted ${ids.length} sessions`);
        return true;
      } catch (error) {
        console.error('Error deleting sessions:', error);
        throw error;
      }
    },

    async findSessionsByShop(shop) {
      try {
        const snapshot = await db.collection(SESSIONS_COLLECTION)
          .where('shop', '==', shop)
          .get();

        const sessions = [];

        snapshot.forEach(doc => {
          const data = doc.data();
          sessions.push(new Session({
            id: data.id,
            shop: data.shop,
            state: data.state,
            isOnline: data.isOnline,
            accessToken: data.accessToken,
            scope: data.scope,
            expires: data.expires ? new Date(data.expires) : undefined,
            onlineAccessInfo: data.onlineAccessInfo,
          }));
        });

        console.log(`Found ${sessions.length} sessions for shop: ${shop}`);
        return sessions;
      } catch (error) {
        console.error('Error finding sessions by shop:', error);
        throw error;
      }
    },
  };
}
