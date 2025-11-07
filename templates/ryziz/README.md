# Ryziz

Framework for building Shopify embedded apps on Firebase with file-based routing.

## Quick Start

```bash
# Initialize new project
npx @ryziz-shopify/ryziz@latest init

# Link to your Shopify Partner app
npm run link

# Start development server
npm run dev

# Deploy to production
npm run deploy
```

Development server starts on localhost with Firebase emulators and Cloudflare tunnel for HTTPS.

## What You Get

When you run `npm run dev`, you'll have a fully working Shopify app with example files:

### Frontend Pages (src/)

- **page.index.jsx** - Public landing page
- **app.index.jsx** - Dashboard with App Bridge demos
- **app.components.jsx** - Polaris component showcase
- **app.items.jsx** - CRUD list page with Firestore
- **app.items.$id.jsx** - Dynamic detail/edit page
- **app.settings.general.jsx** - Settings page (nested route)

### Backend APIs (src/)

- **api.index.js** - Example API with Shopify GraphQL
- **api.items.js** - CRUD endpoints (GET, POST)
- **api.items.$id.js** - Dynamic endpoints (GET, PUT, DELETE)

### Webhooks (src/)

- **webhooks.app-uninstalled.js** - Cleanup on app uninstall
- **webhooks.customers-data-request.js** - GDPR data request
- **webhooks.customers-redact.js** - GDPR customer redaction
- **webhooks.shop-redact.js** - GDPR shop redaction

All examples demonstrate real-world patterns and best practices.

## File-Based Routing

**page.*.jsx** - Public routes (no auth)
```
page.index.jsx → /
page.about.jsx → /about
```

**app.*.jsx** - Embedded app routes (Shopify Admin)
```
app.index.jsx → /app
app.items.jsx → /app/items
app.items.$id.jsx → /app/items/:id
app.settings.general.jsx → /app/settings/general
```

**api.*.js** - API endpoints
```
api.items.js → /api/items
api.items.$id.js → /api/items/:id
```

**webhooks.*.js** - Webhook handlers (auto-registered)
```
webhooks.orders-create.js → ORDERS_CREATE webhook
```

## Project Structure

```
src/               Example files (routes, APIs, webhooks)
public/            Static assets and HTML templates
shopify.app.toml   Shopify app configuration
.firebaserc        Firebase project ID
```

## Learning from Examples

Explore `src/` files to see:
- Polaris Web Components usage
- App Bridge API integration
- Firestore database operations
- Form handling and validation
- Dynamic routing patterns
- Shopify GraphQL queries

All examples include inline comments explaining key patterns.

## Commands

**npm run dev** - Start development with hot reload

**npm run link** - Link to Shopify Partner app

**npm run deploy** - Deploy to Firebase + Shopify

## Features

- **File-based routing** - Convention over configuration
- **Shopify OAuth** - Automatic authentication
- **App Bridge** - Full API access
- **Polaris Components** - TypeScript autocomplete
- **Firebase** - Functions, Hosting, Firestore
- **Hot reload** - Fast development
- **Zero config** - Works out of the box
