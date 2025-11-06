# Getting Started

Complete guide to building Shopify apps with Ryziz file-based routing.

## File-Based Routing

Routes are automatically generated from filenames. No configuration needed.

### Conventions

**src/page.*.jsx** → Public routes (no Shopify authentication)

**src/app.*.jsx** → Embedded app routes (requires Shopify session, runs inside Admin)

**src/api.*.js** → API endpoints (backend, has access to Shopify session)

**src/webhooks.*.js** → Webhook handlers (auto-registered with Shopify)

## Frontend Routes

### Public Pages

Public pages accessible without Shopify authentication.

**Pattern:** `page.<name>.jsx` → `/<name>`

**Examples:**
```
page.index.jsx     → /
page.about.jsx     → /about
page.pricing.jsx   → /pricing
```

**Example file (src/page.index.jsx):**
```jsx
export default function Index() {
  return <div>hello world</div>
}
```

### Embedded App Routes

Routes that run inside Shopify Admin with App Bridge access.

**Pattern:** `app.<name>.jsx` → `/app/<name>`

**Examples:**
```
app.index.jsx       → /app/
app.products.jsx    → /app/products
app.settings.jsx    → /app/settings
```

**Example file (src/app.index.jsx):**
```jsx
import { shopify } from "@ryziz-shopify/router";

export default function AppIndex() {
  const openProductPicker = async () => {
    const products = await shopify.resourcePicker({ type: 'product' });
    shopify.toast.show('Selected ' + products.length + ' products');
  };

  return (
    <div>
      <h1>App Bridge Demo</h1>
      <button onClick={openProductPicker}>Open Product Picker</button>
    </div>
  );
}
```

### Dynamic Routes

Use `$` prefix for route parameters.

**Pattern:** `$<param>` converts to `:<param>` in route path

**Examples:**
```
app.products.$id.jsx           → /app/products/:id
app.customers.$id.jsx          → /app/customers/:id
app.orders.$id.details.jsx     → /app/orders/:id/details
```

**Access params in component:**
```jsx
import { useParams } from "@ryziz-shopify/router";

export default function ProductDetail() {
  const { id } = useParams();
  return <div>Product ID: {id}</div>;
}
```

### Nested Routes

Create nested paths with dot notation. Dots become slashes.

**Examples:**
```
app.settings.general.jsx    → /app/settings/general
app.settings.billing.jsx    → /app/settings/billing
app.products.list.jsx       → /app/products/list
```

## Shopify App Bridge

The `shopify` export from `@ryziz-shopify/router` provides access to Shopify App Bridge APIs.

### Available APIs

**Resource Picker:**
```jsx
const products = await shopify.resourcePicker({ type: 'product' });
const collections = await shopify.resourcePicker({ type: 'collection' });
```

**Toast Notifications:**
```jsx
shopify.toast.show('Success message');
shopify.toast.show('Error message', { isError: true });
```

**Modal:**
```jsx
const confirmed = await shopify.modal.show('Are you sure?');
if (confirmed) {
  // User clicked OK
}
```

**Navigation:**
```jsx
shopify.navigate('/app/products');
```

### React Router Hooks

Standard React Router hooks available from `@ryziz-shopify/router`:

```jsx
import {
  useParams,
  useNavigate,
  useLocation,
  Link
} from "@ryziz-shopify/router";
```

## Backend Routes

### API Endpoints

Export HTTP method functions from `src/api.*.js` files.

**Pattern:** `api.<name>.js` → `/api/<name>`

**Supported methods:** GET, POST, PUT, DELETE

**Examples:**
```
api.index.js        → /api/
api.products.js     → /api/products
api.customers.js    → /api/customers
```

**Dynamic params work the same:**
```
api.products.$id.js → /api/products/:id
```

**Example file (src/api.index.js):**
```js
export function GET(req, res) {
  res.json({ message: 'hello world' });
}

export function POST(req, res) {
  const data = req.body;
  res.json({ received: data });
}
```

### Access Shopify Session

Wrap your API route with `withShopify` to get access to authenticated Shopify session and GraphQL client.

**Example - Fetch products from Shopify:**
```js
import { withShopify } from '@ryziz-shopify/functions';

export const GET = withShopify(async (req, res) => {
  // req.shopify is now available with authenticated session
  const products = await req.shopify.graphql(`
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  `);

  res.json(products);
});
```

**Example - Public API (no auth required):**
```js
export function GET(req, res) {
  // No withShopify wrapper = no auth required
  res.json({ message: 'Public endpoint' });
}
```

### Access Firestore

Firestore database available via `db` export:

```js
import { db } from '@ryziz-shopify/functions';

export async function GET(req, res) {
  const snapshot = await db.collection('settings').get();
  const data = snapshot.docs.map(doc => doc.data());

  res.json(data);
}
```

### Error Handling

Use try/catch with proper status codes:

```js
import { withShopify } from '@ryziz-shopify/functions';

export const POST = withShopify(async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId required' });
    }

    // Process request with Shopify API
    const product = await req.shopify.graphql(`
      query getProduct($id: ID!) {
        product(id: $id) { id title }
      }
    `, { id: productId });

    res.json({ success: true, product });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Webhooks

### Webhook Handlers

Export `TOPIC` constant and `handle` function from `src/webhooks.*.js` files.

**Pattern:** Filename determines handler name, TOPIC determines which webhook event

**Examples:**
```
webhooks.app-uninstalled.js     → Handles APP_UNINSTALLED
webhooks.orders-create.js       → Handles ORDERS_CREATE
webhooks.products-update.js     → Handles PRODUCTS_UPDATE
```

**Example file (src/webhooks.app-uninstalled.js):**
```js
import { db } from '@ryziz-shopify/functions';

export const TOPIC = 'APP_UNINSTALLED';

export async function handle(topic, shop, body) {
  console.log('App uninstalled:', { topic, shop, body });

  // Clean up shop data
  await db.collection('shops').doc(shop).delete();
}
```

### GDPR Webhooks

Required webhooks for GDPR compliance:

**CUSTOMERS_DATA_REQUEST** - Respond within 30 days
```js
export const TOPIC = 'CUSTOMERS_DATA_REQUEST';

export async function handle(topic, shop, body) {
  // Return customer data for the shop
}
```

**CUSTOMERS_REDACT** - Delete customer personal data
```js
export const TOPIC = 'CUSTOMERS_REDACT';

export async function handle(topic, shop, body) {
  // Delete customer data
}
```

**SHOP_REDACT** - Delete all shop data (48 hours after uninstall)
```js
export const TOPIC = 'SHOP_REDACT';

export async function handle(topic, shop, body) {
  // Delete all shop data
}
```

### Webhook Auto-Registration

Webhooks are automatically registered with Shopify during `npm run dev`. The framework scans `src/webhooks.*.js` files and registers the TOPIC with Shopify.

No manual webhook configuration needed.

## Common Patterns

### Fetch Data from API

Standard fetch from frontend to your API:

```jsx
import { useState, useEffect } from 'react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {products.map(p => (
        <div key={p.id}>{p.title}</div>
      ))}
    </div>
  );
}
```

### Form Handling

Standard controlled inputs with submit handler:

```jsx
import { useState } from 'react';
import { shopify } from '@ryziz-shopify/router';

export default function CreateProduct() {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });

    if (res.ok) {
      shopify.toast.show('Product created');
      setTitle('');
    } else {
      shopify.toast.show('Error creating product', { isError: true });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Product title"
      />
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Store Data in Firestore

From API endpoint:

```js
import { withShopify, db } from '@ryziz-shopify/functions';

export const POST = withShopify(async (req, res) => {
  const { shop } = req.shopify.session;
  const { productId, metadata } = req.body;

  await db.collection('products').doc(productId).set({
    shop,
    metadata,
    createdAt: new Date()
  });

  res.json({ success: true });
});
```

### Query Firestore

From API endpoint:

```js
import { withShopify, db } from '@ryziz-shopify/functions';

export const GET = withShopify(async (req, res) => {
  const { shop } = req.shopify.session;

  const snapshot = await db
    .collection('products')
    .where('shop', '==', shop)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.json(products);
});
```

## Development Workflow

### Start Development Server

```bash
npm run dev
```

This starts:
- Frontend build in watch mode
- Backend build in watch mode
- Firebase emulators (Functions, Hosting, Firestore)
- Cloudflare tunnel for HTTPS

### Hot Reload

Save any file in `src/` and the framework automatically rebuilds:
- Frontend changes → Browser auto-refreshes
- Backend changes → Functions auto-reload

### Link to Shopify App

First time only:

```bash
npm run link
```

This connects your local project to a Shopify Partner app.

## Deployment

Deploy your app to production:

```bash
npm run deploy
```

This will:
- Build frontend and backend in production mode (minified, no source maps)
- Deploy to Firebase (Hosting + Functions)
- Update and deploy Shopify app configuration

### Deploy Options

**Full deployment** (default):
```bash
npm run deploy
```

**Shopify config only** (skip build and Firebase):
```bash
npm run deploy -- --shopify-only
```

Use `--shopify-only` when you only need to update Shopify app settings (scopes, webhooks) without deploying code.

**Reset config selection**:
```bash
npm run deploy -- --reset
```

Use `--reset` to choose a different Shopify config file if you have multiple environments.

### Prerequisites

Before deploying, ensure you have:
- Firebase project configured (`.firebaserc` exists)
- Production URLs set in `shopify.app.toml`
- Firebase CLI installed and authenticated

## Project Configuration

### Shopify Config (shopify.app.toml)

```toml
name = "my-app"
client_id = "your-api-key"
scopes = "read_products,write_products"
```

### Firebase Config (.firebaserc)

```json
{
  "projects": {
    "default": "your-firebase-project"
  }
}
```

### JavaScript Config (jsconfig.json)

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

No other configuration needed. The framework handles build, routing, and deployment automatically.

## Next Steps

Explore the example files in `src/`:
- `page.index.jsx` - Public page example
- `app.index.jsx` - Embedded app with App Bridge
- `api.index.js` - API endpoint example
- `webhooks.app-uninstalled.js` - Webhook handler example

Start building by adding new files following the naming conventions. The framework will automatically discover and route them.
