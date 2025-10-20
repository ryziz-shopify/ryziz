import { onRequest } from 'firebase-functions/v2/https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Router } from 'express';
import { shopifyApp } from '@shopify/shopify-app-express';
import '@shopify/shopify-api/adapters/node';
import { Session } from '@shopify/shopify-api';
import admin from 'firebase-admin';
import fs from 'fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '@shopify/polaris';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables (if .env exists - for production deployments)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// ============================================================================
// SESSION STORAGE (from src/core/session.js)
// ============================================================================

function initializeFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

function firestoreSessionStorage() {
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

// ============================================================================
// ROUTER (from src/core/router.js)
// ============================================================================

function checkPolarisImports(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return fileContent.includes('@shopify/polaris');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return false;
  }
}

function scanRoutes(dir) {
  const routes = [];

  function scan(currentDir, urlPath = '') {
    if (!fs.existsSync(currentDir)) {
      return;
    }

    const entries = fs.readdirSync(currentDir);

    entries.forEach(entry => {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath, `${urlPath}/${entry}`);
      } else if (entry.endsWith('.jsx') || entry.endsWith('.js')) {
        let routePath = urlPath;
        const basename = path.basename(entry, path.extname(entry));

        if (basename !== 'index') {
          const paramName = basename.replace(/\[([^\]]+)\]/g, ':$1');
          routePath = `${urlPath}/${paramName}`;
        }

        routePath = routePath || '/';

        routes.push({
          routePath,
          filePath: fullPath,
        });
      }
    });
  }

  scan(dir);

  routes.sort((a, b) => {
    const aHasParam = a.routePath.includes(':');
    const bHasParam = b.routePath.includes(':');

    if (aHasParam !== bHasParam) {
      return aHasParam ? 1 : -1;
    }

    const aSegments = a.routePath.split('/').length;
    const bSegments = b.routePath.split('/').length;

    return bSegments - aSegments;
  });

  return routes;
}

function escapeHtml(str) {
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27'
  };

  return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}

function wrapHTML(content, head = {}, data = {}, routeName = 'index', req) {
  const { title = 'Shopify App', description = '' } = head;
  const { shop } = req.query;

  const appBridgeScript = shop ? `
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
    <script>
      window.shopOrigin = "${shop}";
      window.apiKey = "${process.env.SHOPIFY_API_KEY || ''}";
    </script>
  ` : '';

  const serializedData = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  const hydrationScripts = `
    <script>
      window.__RYZIZ_DATA__ = ${serializedData};
    </script>
    <script type="module" src="/runtime.js"></script>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
  ${appBridgeScript}
  <link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@13/build/esm/styles.css" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }
  </style>
</head>
<body data-route="${routeName}">
  <div id="root">${content}</div>
  ${hydrationScripts}
</body>
</html>`;
}

function createRouter({ routesDir, shopify }) {
  const router = Router();

  const routes = scanRoutes(routesDir);
  console.log(`Found ${routes.length} routes:`, routes.map(r => r.routePath));

  routes.forEach(({ routePath, filePath }) => {
    // Register GET handler
    router.get(routePath, async (req, res, next) => {
      try {
        // Check for Polaris imports
        const hasPolarisImports = checkPolarisImports(filePath);
        const isAppRoute = routePath.startsWith('/app');

        // Validate: Polaris only allowed in /app/* routes
        if (hasPolarisImports && !isAppRoute) {
          const error = new Error(
            `Polaris components can only be imported in /app/* routes.\n` +
            `Found '@shopify/polaris' import in: ${routePath}\n\n` +
            `Move this route to /app/ or use custom components instead.`
          );
          error.code = 'POLARIS_IMPORT_VIOLATION';
          throw error;
        }

        const routeModule = await import(path.resolve(filePath));

        const context = {
          params: req.params,
          query: req.query,
          request: req,
          shopify: req.shopify,
          shopifyApi: req.shopifyApi,
        };

        let data = {};
        if (routeModule.loader) {
          data = await routeModule.loader(context);

          if (data?.redirect) {
            return res.redirect(303, data.redirect);
          }
        }

        let headData = {
          title: 'Shopify App',
          description: '',
        };
        if (routeModule.head) {
          headData = { ...headData, ...await routeModule.head({ ...context, data }) };
        }

        let html = '';
        if (routeModule.default) {
          const Component = routeModule.default;

          // Wrap /app/* routes with Polaris provider
          // Note: App Bridge initializes client-side via script tag
          if (isAppRoute) {
            const wrappedComponent = React.createElement(
              AppProvider,
              { i18n: {} },
              React.createElement(Component, data)
            );

            html = renderToString(wrappedComponent);
          } else {
            // Regular routes without Polaris wrapper
            html = renderToString(React.createElement(Component, data));
          }
        }

        const routeName = path.basename(filePath, path.extname(filePath));
        res.send(wrapHTML(html, headData, data, routeName, req));
      } catch (error) {
        next(error);
      }
    });

    // Register POST handler for actions
    router.post(routePath, async (req, res, next) => {
      try {
        const routeModule = await import(path.resolve(filePath));

        if (!routeModule.action) {
          return res.status(405).json({ error: 'Method not allowed' });
        }

        const context = {
          params: req.params,
          query: req.query,
          body: req.body,
          request: req,
          shopify: req.shopify,
          shopifyApi: req.shopifyApi,
        };

        const result = await routeModule.action(context);

        if (result?.redirect) {
          return res.redirect(303, result.redirect);
        }

        res.json(result || { success: true });
      } catch (error) {
        next(error);
      }
    });
  });

  return router;
}

// ============================================================================
// SERVER (from src/core/server.js)
// ============================================================================

function createServer(options = {}) {
  const { routesDir = './src/routes', publicDir = './public' } = options;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (publicDir) {
    app.use(express.static(publicDir));
  }

  const shopifyHost = process.env.SHOPIFY_HOST || 'http://localhost:6601';
  const hostScheme = shopifyHost.startsWith('https://') ? 'https' : 'http';
  const hostName = shopifyHost.replace(/https?:\/\//, '');

  const shopify = shopifyApp({
    api: {
      apiKey: process.env.SHOPIFY_API_KEY || 'dummy-key-for-dev',
      apiSecretKey: process.env.SHOPIFY_API_SECRET || 'dummy-secret-for-dev',
      scopes: process.env.SHOPIFY_SCOPES?.split(',') || ['read_products', 'write_products'],
      hostScheme: hostScheme,
      hostName: hostName,
      isEmbeddedApp: true,
      apiVersion: '2024-01',
    },
    auth: {
      path: '/auth',
      callbackPath: '/auth/callback',
    },
    webhooks: {
      path: '/webhooks',
    },
    sessionStorage: firestoreSessionStorage(),
  });

  app.get('/auth', shopify.auth.begin());
  app.get('/auth/callback',
    shopify.auth.callback(),
    shopify.redirectToShopifyOrAppRoot()
  );

  app.post('/webhooks', shopify.processWebhooks({ webhookHandlers: {} }));

  app.use('/app', shopify.ensureInstalledOnShop());
  app.use('/app', shopify.validateAuthenticatedSession());

  app.use((req, res, next) => {
    req.shopifyApi = shopify.api;
    next();
  });

  const router = createRouter({ routesDir, shopify });
  app.use(router);

  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: system-ui; padding: 2rem; }
            pre { background: #f5f5f5; padding: 1rem; overflow: auto; }
          </style>
        </head>
        <body>
          <h1>Server Error</h1>
          <pre>${err.message}</pre>
          ${process.env.NODE_ENV !== 'production' ? `<pre>${err.stack}</pre>` : ''}
        </body>
      </html>
    `);
  });

  return app;
}

// ============================================================================
// FIREBASE FUNCTION
// ============================================================================

const app = createServer({
  routesDir: path.join(__dirname, 'src', 'routes'),
  publicDir: null
});

export const ssr = onRequest({
  cors: true,
  maxInstances: 10,
}, app);
