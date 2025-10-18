import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import React from 'react';
import { renderToString } from 'react-dom/server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createRouter({ routesDir, shopify }) {
  const router = Router();

  // Scan routes on startup
  const routes = scanRoutes(routesDir);
  console.log(`Found ${routes.length} routes:`, routes.map(r => r.routePath));

  // Register each route
  routes.forEach(({ routePath, filePath }) => {
    // Register GET handler
    router.get(routePath, async (req, res, next) => {
      try {
        // Dynamic import of the route module
        const routeModule = await import(path.resolve(filePath));

        // Prepare context
        const context = {
          params: req.params,
          query: req.query,
          request: req,
          shopify: req.shopify,
          shopifyApi: req.shopifyApi,
        };

        // Run loader if exists
        let data = {};
        if (routeModule.loader) {
          data = await routeModule.loader(context);

          // Handle redirect from loader
          if (data?.redirect) {
            return res.redirect(303, data.redirect);
          }
        }

        // Get head metadata
        let headData = {
          title: 'Shopify App',
          description: '',
        };
        if (routeModule.head) {
          headData = { ...headData, ...await routeModule.head({ ...context, data }) };
        }

        // Render component if exists
        let html = '';
        if (routeModule.default) {
          const Component = routeModule.default;
          html = renderToString(React.createElement(Component, data));
        }

        // Send full HTML response
        res.send(wrapHTML(html, headData, req));
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

        // Handle redirect
        if (result?.redirect) {
          return res.redirect(303, result.redirect);
        }

        // Return JSON response
        res.json(result || { success: true });
      } catch (error) {
        next(error);
      }
    });
  });

  return router;
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

function wrapHTML(content, head = {}, req) {
  const { title = 'Shopify App', description = '' } = head;
  const { shop } = req.query;

  const appBridgeScript = shop ? `
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
    <script>
      window.shopOrigin = "${shop}";
      window.apiKey = "${process.env.SHOPIFY_API_KEY || ''}";
    </script>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
  ${appBridgeScript}
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
<body>
  <div id="app">${content}</div>
</body>
</html>`;
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
