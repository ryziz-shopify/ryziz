import express from 'express';
import { shopifyApp } from '@shopify/shopify-app-express';
import { createRouter } from './router.js';
import { firestoreSessionStorage } from './session.js';
import '@shopify/shopify-api/adapters/node';

export function createServer(options = {}) {
  const { routesDir = './src/routes', publicDir = './public' } = options;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from public directory if it exists
  if (publicDir) {
    app.use(express.static(publicDir));
  }

  // Extract hostname and scheme from SHOPIFY_HOST
  const shopifyHost = process.env.SHOPIFY_HOST || 'http://localhost:5000';
  const hostScheme = shopifyHost.startsWith('https://') ? 'https' : 'http';
  const hostName = shopifyHost.replace(/https?:\/\//, '');

  // Initialize Shopify App with inline API configuration
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

  // Shopify OAuth routes (handled by library)
  app.get('/auth', shopify.auth.begin());
  app.get('/auth/callback',
    shopify.auth.callback(),
    shopify.redirectToShopifyOrAppRoot()
  );

  // Webhook endpoint - using empty handlers for now, can be configured later
  app.post('/webhooks', shopify.processWebhooks({ webhookHandlers: {} }));

  // Protected routes middleware - applied to /app routes (FIXED: removed wildcard)
  app.use('/app', shopify.ensureInstalledOnShop());
  app.use('/app', shopify.validateAuthenticatedSession());

  // Add shopify context to all routes
  app.use((req, res, next) => {
    req.shopifyApi = shopify.api;
    next();
  });

  // File-based routing
  const router = createRouter({ routesDir, shopify });
  app.use(router);

  // Error handling
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
