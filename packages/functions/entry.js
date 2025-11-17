import 'dotenv/config';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { shopify, cookieStorage } from './src/shopify.js';
import apiRoutes from 'virtual:routes';
import webhookHandlers from 'virtual:webhooks';

initializeApp();

export const auth = onRequest({ invoker: 'public', memory: '512MiB' }, _createAuthApp());
export const webhooks = onRequest({ invoker: 'public', memory: '512MiB' }, _createWebhooksApp());
export const api = onRequest({ invoker: 'public', memory: '512MiB' }, _createApiApp());

// Implementation

function _createAuthApp() {
  const app = express();

  app.get(shopify.config.auth.path, async (req, res, next) => {
    await shopify.auth.begin()(req, res, next);
    await cookieStorage.storeCookie(req.query.shop, res.getHeader('Set-Cookie'));
  });

  app.get(
    shopify.config.auth.callbackPath,
    async (req, res, next) => {
      const cookie = await cookieStorage.loadCookie(req.query.shop);
      if (cookie) {
        req.headers.cookie = [
          req.headers.cookie,
          ...cookie.map((item) => item.split(';')[0]),
        ].join('; ');
      }
      next();
    },
    async (req, res, next) => {
      await shopify.auth.callback()(req, res, next);
      await cookieStorage.storeCookie(req.query.shop, res.getHeader('Set-Cookie'));
    },
    shopify.redirectToShopifyOrAppRoot()
  );

  return app;
}

function _createWebhooksApp() {
  const app = express();

  // Firebase Functions v2 automatically parses body as JSON
  // We need to restore rawBody for Shopify HMAC verification
  app.use((req, res, next) => {
    if (req.rawBody) {
      // Firebase provides rawBody - use it for Shopify verification
      req.body = req.rawBody;
    }
    next();
  });

  app.post(shopify.config.webhooks.path, shopify.processWebhooks({ webhookHandlers }));
  return app;
}

function _createApiApp() {
  const app = express();
  const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  apiRoutes.forEach(route => {
    HTTP_METHODS.forEach(method => {
      if (route.module[method]) {
        app[method.toLowerCase()](route.path, route.module[method]);
      }
    });
  });

  return app;
}
