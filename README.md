# Ryziz

**Zero-config Shopify SSR framework with automatic Polaris integration**

Build production-ready Shopify apps with file-based routing, server-side rendering, and zero configuration.

## What is Ryziz?

Ryziz is a batteries-included framework for building Shopify embedded apps. It combines:

- **File-based routing** - Create a `.jsx` file, get a route
- **Server-side rendering** - Built-in React SSR with data loading
- **Automatic Polaris** - Admin routes (`/app/*`) get Shopify Polaris UI automatically
- **Shopify integration** - OAuth, webhooks, GraphQL client included
- **Firebase deployment** - Functions + Firestore + Hosting ready to go
- **Zero configuration** - No webpack, babel, or config files needed

## Why Ryziz?

**Traditional Shopify app:**
```
Configure webpack → Set up babel → Configure Polaris providers
→ Set up OAuth → Configure sessions → Set up routing
→ Configure deployment → Write app
```

**With Ryziz:**
```
npx ryziz init → Write app → Deploy
```

## The Magic

Create a file in `src/routes/app/` and you automatically get:

```jsx
// src/routes/app/products.jsx
import { Page, Card, Button } from '@shopify/polaris';

export async function loader({ shopify }) {
  const data = await shopify.graphql(`query { products { ... } }`);
  return data;
}

export default function Products({ products }) {
  return (
    <Page title="Products">
      <Card>
        {/* Polaris components just work! */}
        <Button primary>Add Product</Button>
      </Card>
    </Page>
  );
}
```

**No provider setup. No configuration. Just works.**

The framework automatically:
- ✅ Wraps `/app/*` routes with `<AppProvider>` and `<AppBridgeProvider>`
- ✅ Loads Polaris CSS
- ✅ Handles Shopify authentication
- ✅ Provides GraphQL client
- ✅ Server-renders everything

## Quick Start

```bash
# Create new project
npx ryziz init

# Install dependencies
npm install

# Start development
npm run dev

# Deploy to production
npm run deploy
```

## Project Structure

```
my-shopify-app/
├── src/
│   └── routes/
│       ├── index.jsx          # Public page at /
│       ├── contact.jsx        # Public page at /contact
│       └── app/               # Admin routes (Polaris enabled)
│           ├── index.jsx      # Dashboard at /app
│           ├── products.jsx   # Products at /app/products
│           └── settings.jsx   # Settings at /app/settings
├── .env.development
├── .env.production
└── package.json
```

**Route types:**
- **Public routes** (`/`, `/contact`) → Regular React, custom styles
- **Admin routes** (`/app/*`) → Automatic Polaris + App Bridge

## Philosophy

**Convention over configuration**
File location determines behavior. No config files needed.

**Framework-level magic**
Polaris wrapping, authentication, deployment - handled automatically.

**Escape hatches everywhere**
Direct access to Express, Shopify API, Firebase when needed.

## Documentation

After running `ryziz init`, see the README.md in your project for full documentation.

Or browse: [Project Documentation](./templates/project/README.md)

## Features

- ✨ **Zero-config initialization** - `ryziz init` and you're ready
- 📁 **File-based routing** - Files map to URLs automatically
- ⚛️ **Server-side rendering** - React SSR with data loaders
- 🎨 **Automatic Polaris** - `/app/*` routes get Polaris UI
- 🔐 **Built-in auth** - Shopify OAuth and session management
- 🔥 **Firebase ready** - Deploy to Functions + Hosting + Firestore
- 📦 **All dependencies included** - No hunting for packages
- 🚀 **One command deploy** - `ryziz deploy`

## What's Included

- **Routing** - File-based with SSR
- **Shopify API** - GraphQL client, REST, webhooks
- **Polaris** - Automatic for admin routes
- **App Bridge** - Embedded app navigation
- **Sessions** - Firestore-backed storage
- **OAuth** - Complete flow handled
- **Development** - Local emulators
- **Deployment** - Firebase Functions + Hosting

## Requirements

- Node.js 18+
- Firebase project (free tier works)
- Shopify Partner account

## License

MIT

---

**Get started:** `npx ryziz init`

**Questions?** See [Project Docs](./templates/project/README.md) after initialization
