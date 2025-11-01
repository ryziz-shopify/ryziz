import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import apiRoutes from './routes.config.js';

initializeApp();

const app = express();

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

apiRoutes.forEach(route => {
  HTTP_METHODS.forEach(method => {
    if (route.module[method]) {
      app[method.toLowerCase()](route.path, route.module[method]);
    }
  });
});

export const api = onRequest(app);
