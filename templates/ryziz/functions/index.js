import { onRequest } from 'firebase-functions/v2/https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { shopifyApp } from '@shopify/shopify-app-express';
import '@shopify/shopify-api/adapters/node';
import { Session } from '@shopify/shopify-api';
import admin from 'firebase-admin';
import fs from 'fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '@shopify/polaris';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const app = createExpressApp({
  routesDir: path.join(__dirname, 'src', 'routes'),
});

export const ssr = onRequest({
  cors: true,
  maxInstances: 10,
}, app);

function createExpressApp(options = {}) {
  const { routesDir = './src/routes' } = options;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const shopifyHost = process.env.SHOPIFY_HOST || 'http://localhost:6601';
  const hostUrl = new URL(shopifyHost);

  const shopify = shopifyApp({
    api: {
      apiKey: process.env.SHOPIFY_API_KEY || 'dummy-key-for-dev',
      apiSecretKey: process.env.SHOPIFY_API_SECRET || 'dummy-secret-for-dev',
      scopes: process.env.SHOPIFY_SCOPES?.split(',') || ['read_products', 'write_products'],
      hostScheme: hostUrl.protocol.replace(':', ''),
      hostName: hostUrl.host,
      isEmbeddedApp: true,
      apiVersion: '2025-07',
    },
    auth: {
      path: '/auth',
      callbackPath: '/auth/callback',
    },
    webhooks: {
      path: '/webhooks',
    },
    sessionStorage: createFirestoreSessionStorage(),
  });

  app.get('/auth', shopify.auth.begin());
  app.get('/auth/callback',
    shopify.auth.callback(),
    shopify.redirectToShopifyOrAppRoot()
  );

  app.get('/exitiframe', (req, res) => {
    const { redirectUri } = req.query;

    if (!redirectUri || !redirectUri.includes('shop=')) {
      return res.status(400).send('Invalid redirect URI');
    }

    const escapedUri = escapeHtml(redirectUri);

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="shopify-api-key" content="${process.env.SHOPIFY_API_KEY || ''}" />
          <title>Session Expired</title>
          <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
          <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
        </head>
        <body>
          <s-page>
            <s-banner heading="Your session has expired" tone="info">
              <span id="banner-message">Redirecting in <span id="countdown">5</span> seconds or <a href="${escapedUri}" target="_top">click here to reload now</a></span>
            </s-banner>
          </s-page>
          <script>
            let seconds = 5;
            const countdownEl = document.getElementById('countdown');
            const bannerMessage = document.getElementById('banner-message');
            const interval = setInterval(function() {
              seconds--;
              if (seconds > 0) {
                countdownEl.textContent = seconds;
              } else {
                bannerMessage.innerHTML = 'Redirecting now...';
                clearInterval(interval);
                window.open('${escapedUri}', '_top');
              }
            }, 1000);
          </script>
        </body>
      </html>
    `);
  });

  app.post('/webhooks', shopify.processWebhooks({ webhookHandlers: {} }));

  app.use('/app', shopify.ensureInstalledOnShop());

  app.use(createFileBasedRouter({ routesDir, shopify }));

  app.use(errorHandler);

  return app;
}

function createFirestoreSessionStorage() {
  const db = initializeFirebase();
  const COLLECTION = 'shopify-sessions';

  return {
    async storeSession(session) {
      await db.collection(COLLECTION).doc(session.id).set({
        id: session.id,
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        accessToken: session.accessToken,
        scope: session.scope,
        expires: session.expires?.toISOString() || null,
        onlineAccessInfo: session.onlineAccessInfo || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    },

    async loadSession(id) {
      const doc = await db.collection(COLLECTION).doc(id).get();
      if (!doc.exists) return undefined;

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
      return snapshot.docs.map(doc => {
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
      });
    }
  };
}

function initializeFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

function createFileBasedRouter({ routesDir, shopify }) {
  const router = express.Router();
  const routes = scanRoutes(routesDir);

  routes.forEach(({ routePath, filePath }) => {
    router.get(routePath, async (req, res, next) => {
      await handleRouteRequest(req, res, next, filePath, routePath, shopify);
    });

    router.post(routePath, async (req, res, next) => {
      await handleRouteAction(req, res, next, filePath, shopify);
    });
  });

  return router;
}

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
        const routePath = basename !== 'index'
          ? `${urlPath}/${paramName}`
          : urlPath || '/';

        routes.push({ routePath, filePath: fullPath });
      }
    });
  }

  scan(dir);

  routes.sort((a, b) => {
    const aHasParam = a.routePath.includes(':');
    const bHasParam = b.routePath.includes(':');
    if (aHasParam !== bHasParam) return aHasParam ? 1 : -1;
    return b.routePath.split('/').length - a.routePath.split('/').length;
  });

  return routes;
}

async function handleRouteRequest(req, res, next, filePath, routePath, shopify) {
  try {
    const routeModule = await import(path.resolve(filePath));
    const isAppRoute = routePath.startsWith('/app');
    const context = createRequestContext(req, res, shopify);

    let data = {};
    if (routeModule.loader) {
      data = await routeModule.loader(context);
      if (data?.redirect) {
        return res.redirect(303, data.redirect);
      }
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
    res.send(createHTMLDocument(html, headData, data, routeName, req));

  } catch (error) {
    next(error);
  }
}

async function handleRouteAction(req, res, next, filePath, shopify) {
  try {
    const routeModule = await import(path.resolve(filePath));

    if (!routeModule.action) {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const context = createRequestContext(req, res, shopify);
    const result = await routeModule.action(context);

    if (result?.redirect) {
      return res.redirect(303, result.redirect);
    }

    res.json(result || { success: true });

  } catch (error) {
    next(error);
  }
}

function createRequestContext(req, res, shopify) {
  const session = res.locals.shopify?.session;

  return {
    params: req.params,
    query: req.query,
    body: req.body,
    request: req,
    shopify: session ? {
      graphql: async (query) => {
        const client = new shopify.api.clients.Graphql({ session });
        return await client.query({ data: query });
      },
      session,
    } : null,
    shopifyApi: shopify.api,
  };
}

function createHTMLDocument(content, head = {}, data = {}, routeName = 'index', req) {
  const { title = 'Shopify App', description = '' } = head;
  const { shop } = req.query;

  const appBridgeScript = shop ? `
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
    <script>
      window.shopOrigin = "${escapeHtml(shop)}";
      window.apiKey = "${escapeHtml(process.env.SHOPIFY_API_KEY || '')}";
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

function escapeHtml(str) {
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };
  return String(str).replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}

function errorHandler(err, _req, res, _next) {
  console.error('Server error:', err);

  res.status(err.status || 500).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: system-ui; padding: 2rem; max-width: 800px; margin: 0 auto; }
          h1 { color: #c41e3a; }
          pre { background: #f5f5f5; padding: 1rem; overflow: auto; border-radius: 4px; }
          .message { margin: 1rem 0; }
        </style>
      </head>
      <body>
        <h1>Server Error</h1>
        <div class="message">${escapeHtml(err.message)}</div>
        ${process.env.NODE_ENV !== 'production' ? `<pre>${escapeHtml(err.stack)}</pre>` : ''}
      </body>
    </html>
  `);
}