# Getting Started

File-based routing guide for building Shopify apps with Ryziz.

## File-Based Routing

Routes automatically generated from filenames. No configuration needed.

**Convention:**
- `src/page.*.jsx` → Public routes
- `src/app.*.jsx` → Embedded app routes
- `src/api.*.js` → API endpoints
- `src/webhooks.*.js` → Webhook handlers

## Frontend Routes

### Public Pages

Public pages accessible without Shopify authentication.

**Pattern:** `page.<name>.jsx` → `/<name>`

**Examples:**
- `page.index.jsx` → `/`
- `page.about.jsx` → `/about`

### Embedded App Routes

Embedded routes run inside Shopify Admin with App Bridge access.

**Pattern:** `app.<name>.jsx` → `/app/<name>`

**Examples:**
- `app.index.jsx` → `/app/`
- `app.products.jsx` → `/app/products`

### Dynamic Routes

Use `$` prefix for parameters.

**Pattern:** `$<param>` → `:<param>`

**Example:** `app.products.$id.jsx` → `/app/products/:id`

### Nested Routes

Create nested paths with dot notation.

**Pattern:** Dots become slashes

**Examples:**
- `app.settings.general.jsx` → `/app/settings/general`
- `app.settings.billing.jsx` → `/app/settings/billing`

## Backend Routes

### API Endpoints

Export HTTP method functions from `src/api.*.js` files.

**Pattern:** `api.<name>.js` → `/api/<name>`

**Supported methods:** GET, POST, PUT, DELETE

**Examples:**
- `api.index.js` → `/api/`
- `api.products.js` → `/api/products`
- `api.products.$id.js` → `/api/products/:id`

### Access Session & Shopify API

All API routes have access to Shopify session via `req.shopify`.

**See:** `src/api.*.js` files for implementation examples

## Webhooks

### Webhook Handlers

Export `TOPIC` constant and handler function.

**Pattern:** Filename determines handler name, TOPIC constant determines which webhook

**Examples:**
- `webhooks.app-uninstalled.js` with `TOPIC = 'APP_UNINSTALLED'`
- `webhooks.orders-create.js` with `TOPIC = 'ORDERS_CREATE'`

### GDPR Webhooks

Required webhooks for GDPR compliance.

**Required topics:**
- `CUSTOMERS_DATA_REQUEST` - Respond within 30 days
- `CUSTOMERS_REDACT` - Delete customer personal data
- `SHOP_REDACT` - Delete all shop data (48 hours after uninstall)

**See:** `src/webhooks.*.js` files for implementation examples

## Shopify Integration

### App Bridge

Access Shopify App Bridge via `shopify` import from `@ryziz-shopify/router` in embedded routes.

**Available features:**
- Resource picker
- Toast notifications
- Modal dialogs
- Navigation

**See:** `src/app.*.jsx` files for usage examples

### TypeScript Support

Shopify types available via `@ryziz-shopify/router`.

**See:** `packages/router/index.d.ts` for available types

## Common Patterns

### Loading States

Standard pattern: data state + loading state + error state

**See:** `src/app.*.jsx` files for implementation

### Error Handling

API routes: try/catch with proper status codes

**See:** `src/api.*.js` files for implementation

### Form Handling

Standard pattern: controlled inputs + submit handler + loading state

**See:** `src/app.*.jsx` files for implementation

## Common Tasks

### Fetch Products from Shopify

Use Shopify GraphQL client with session from `req.shopify`.

**See:** `src/api.products.js` for implementation

### Store Data in Firestore

Firebase Admin SDK available via standard import.

**See:** `src/api.*.js` files for Firestore usage

### Read Data from Firestore

Standard Firestore query patterns with error handling.

**See:** `src/api.*.js` files for query examples

## Next Steps

- **Architecture** - See `docs/contribution-guide.md` for build pipeline details
- **Standards** - Follow `docs/coding-standards.md` for code patterns
- **Source Examples** - Explore `src/` directory for working code
