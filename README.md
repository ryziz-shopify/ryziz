# Ryziz v0.0.1

**Shopify SSR Framework** - Zero-config, Express-based, Firebase-powered

Build Shopify apps with Server-Side Rendering, file-based routing, and zero configuration.

## Features

- ✅ **Zero-config** - No firebase.json, no build setup needed
- ✅ **SSR-first** - Pure server-side rendering with React
- ✅ **File-based routing** - Automatic routing from `src/routes/`
- ✅ **Shopify-native** - Built-in OAuth, webhooks, GraphQL
- ✅ **Firebase-powered** - Functions + Hosting + Firestore
- ✅ **Express foundation** - Standard Express patterns

## Quick Start

```bash
# Install globally
npm install -g ryziz@0.0.1

# Create new project
mkdir my-shopify-app && cd my-shopify-app
ryziz init

# Configure credentials
# Edit .env.development with your Shopify app credentials

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
│       ├── index.jsx          # Landing page (/)
│       └── app.jsx             # Dashboard (/app)
├── .env.development           # Dev credentials
├── .env.production            # Prod credentials
└── package.json               # Simple dependencies
```

## Route Files

### Basic Route (`src/routes/index.jsx`)

```jsx
import React from 'react';

// Server-side data loading
export async function loader({ query }) {
  return { message: 'Hello World' };
}

// Page metadata
export async function head() {
  return {
    title: 'My App',
    description: 'Welcome to my Shopify app'
  };
}

// React component
export default function Home({ message }) {
  return <h1>{message}</h1>;
}
```

### Protected Route with Shopify (`src/routes/app.jsx`)

```jsx
import React from 'react';

export async function loader({ shopify }) {
  const response = await shopify.graphql(`
    query {
      shop { name }
      products(first: 10) {
        edges {
          node { id title }
        }
      }
    }
  `);

  return response.body.data;
}

export default function Dashboard({ shop, products }) {
  return (
    <div>
      <h1>{shop.name}</h1>
      {products.edges.map(({ node }) => (
        <div key={node.id}>{node.title}</div>
      ))}
    </div>
  );
}
```

## Commands

### `ryziz init`
Initialize a new project with template files

### `ryziz dev`
Start Firebase emulators for local development
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Hosting: http://localhost:5000 ← Your app
- UI: http://localhost:4000

### `ryziz deploy`
Deploy to Firebase (Functions + Hosting)

## Environment Variables

```bash
# .env.development
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SHOPIFY_SCOPES=read_products,write_products
SHOPIFY_HOST=http://localhost:5000
NODE_ENV=development
```

## Local Development

Ryziz uses `npm link` for local development:

```bash
# In ryziz package directory
npm link

# In your project directory
ryziz init
npm install
npm run dev
```

## Architecture

- **Express** - Web server framework
- **@shopify/shopify-app-express** - Shopify integration
- **Firebase Functions** - Serverless hosting
- **Firestore** - Session storage
- **React SSR** - Server-side rendering

## License

MIT
