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

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
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

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create Express server with Shopify app integration
 */
function createServer(options = {}) {
  const { routesDir = './src/routes', publicDir = './public' } = options;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (publicDir) {
    app.use(express.static(publicDir));
  }

  const shopifyHost = process.env.SHOPIFY_HOST || 'http://localhost:6601';
  const shopify = shopifyApp({
    api: {
      apiKey: process.env.SHOPIFY_API_KEY || 'dummy-key-for-dev',
      apiSecretKey: process.env.SHOPIFY_API_SECRET || 'dummy-secret-for-dev',
      scopes: process.env.SHOPIFY_SCOPES?.split(',') || ['read_products', 'write_products'],
      hostScheme: shopifyHost.startsWith('https://') ? 'https' : 'http',
      hostName: shopifyHost.replace(/https?:\/\//, ''),
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
  app.get('/auth/callback', shopify.auth.callback(), shopify.redirectToShopifyOrAppRoot());
  app.post('/webhooks', shopify.processWebhooks({ webhookHandlers: {} }));

  app.use('/app', shopify.ensureInstalledOnShop());
  app.use('/app', shopify.validateAuthenticatedSession());
  app.use((req, res, next) => {
    req.shopifyApi = shopify.api;
    next();
  });

  app.use(createRouter({ routesDir, shopify }));
  app.use(errorHandler);

  return app;
}

/**
 * Create Express router with file-based routing
 */
function createRouter({ routesDir, shopify }) {
  const router = Router();
  const routes = scanRoutes(routesDir);

  routes.forEach(({ routePath, filePath }) => {
    router.get(routePath, (req, res, next) => handleGet(req, res, next, filePath, routePath));
    router.post(routePath, (req, res, next) => handlePost(req, res, next, filePath));
  });

  return router;
}

/**
 * Create Firestore session storage adapter
 */
function firestoreSessionStorage() {
  const db = initializeFirebase();
  const COLLECTION = 'shopify-sessions';

  return {
    async storeSession(session) {
      await db.collection(COLLECTION).doc(session.id).set(serializeSession(session));
      return true;
    },

    async loadSession(id) {
      const doc = await db.collection(COLLECTION).doc(id).get();
      return doc.exists ? deserializeSession(doc.data()) : undefined;
    },

    async deleteSession(id) {
      await db.collection(COLLECTION).doc(id).delete();
      return true;
    },

    async deleteSessions(ids) {
      const batch = db.batch();
      ids.forEach(id => batch.delete(db.collection(COLLECTION).doc(id)));
      await batch.commit();
      return true;
    },

    async findSessionsByShop(shop) {
      const snapshot = await db.collection(COLLECTION).where('shop', '==', shop).get();
      return snapshot.docs.map(doc => deserializeSession(doc.data()));
    }
  };
}

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

/**
 * Serialize Shopify session for Firestore
 */
function serializeSession(session) {
  return {
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
}

/**
 * Deserialize Firestore data to Shopify session
 */
function deserializeSession(data) {
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
}

/**
 * Check if file imports Polaris components
 */
function checkPolarisImports(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return fileContent.includes('@shopify/polaris');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return false;
  }
}

/**
 * Scan directory for route files
 */
function scanRoutes(dir) {
  const routes = [];

  function scan(currentDir, urlPath = '') {
    if (!fs.existsSync(currentDir)) return;

    fs.readdirSync(currentDir).forEach(entry => {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath, `${urlPath}/${entry}`);
      } else if (entry.endsWith('.jsx') || entry.endsWith('.js')) {
        const basename = path.basename(entry, path.extname(entry));
        const paramName = basename.replace(/\[([^\]]+)\]/g, ':$1');
        const routePath = basename !== 'index' ? `${urlPath}/${paramName}` : urlPath || '/';

        routes.push({ routePath, filePath: fullPath });
      }
    });
  }

  scan(dir);

  // Sort routes: static first, then by segment count
  routes.sort((a, b) => {
    const aHasParam = a.routePath.includes(':');
    const bHasParam = b.routePath.includes(':');
    if (aHasParam !== bHasParam) return aHasParam ? 1 : -1;
    return b.routePath.split('/').length - a.routePath.split('/').length;
  });

  return routes;
}

/**
 * Escape HTML special characters
 */
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

/**
 * Wrap rendered content in HTML document
 */
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
  </style>
</head>
<body data-route="${routeName}">
  <div id="root">${content}</div>
  <script>window.__RYZIZ_DATA__ = ${serializedData};</script>
  <script type="module" src="/runtime.js"></script>
</body>
</html>`;
}

/**
 * Create request context object
 */
function createContext(req) {
  return {
    params: req.params,
    query: req.query,
    body: req.body,
    request: req,
    shopify: req.shopify,
    shopifyApi: req.shopifyApi,
  };
}

/**
 * Handle GET requests for routes
 */
async function handleGet(req, res, next, filePath, routePath) {
  try {
    const hasPolarisImports = checkPolarisImports(filePath);
    const isAppRoute = routePath.startsWith('/app');

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
    const context = createContext(req);

    let data = {};
    if (routeModule.loader) {
      data = await routeModule.loader(context);
      if (data?.redirect) return res.redirect(303, data.redirect);
    }

    let headData = { title: 'Shopify App', description: '' };
    if (routeModule.head) {
      headData = { ...headData, ...await routeModule.head({ ...context, data }) };
    }

    let html = '';
    if (routeModule.default) {
      const Component = routeModule.default;
      const element = isAppRoute
        ? React.createElement(AppProvider, { i18n: {} }, React.createElement(Component, data))
        : React.createElement(Component, data);
      html = renderToString(element);
    }

    const routeName = path.basename(filePath, path.extname(filePath));
    res.send(wrapHTML(html, headData, data, routeName, req));
  } catch (error) {
    next(error);
  }
}

/**
 * Handle POST requests for route actions
 */
async function handlePost(req, res, next, filePath) {
  try {
    const routeModule = await import(path.resolve(filePath));

    if (!routeModule.action) {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const context = createContext(req);
    const result = await routeModule.action(context);

    if (result?.redirect) {
      return res.redirect(303, result.redirect);
    }

    res.json(result || { success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * Express error handler middleware
 */
function errorHandler(err, req, res, next) {
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
}
