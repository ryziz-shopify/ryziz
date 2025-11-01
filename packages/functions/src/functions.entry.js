import 'dotenv/config';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import shopify, { cookieStorage } from './functions.shopify.js';
import apiRoutes from './routes.config.js';
import webhookHandlers from './webhooks.config.js';

initializeApp();

export const auth = onRequest(createAuthApp());
export const webhooks = onRequest(createWebhooksApp());
export const api = onRequest(createApiApp());

function createAuthApp() {
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

function createWebhooksApp() {
  const app = express();
  app.post(shopify.config.webhooks.path, shopify.processWebhooks({ webhookHandlers }));
  return app;
}

function createApiApp() {
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
