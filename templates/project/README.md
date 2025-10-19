# Your Ryziz Project

Welcome to your Shopify app built with Ryziz! This guide covers everything you need to know.

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Routing System](#routing-system)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Deployment](#deployment)
- [Route Documentation](#route-documentation)

## Quick Start

```bash
# Install dependencies
npm install

# Configure your Shopify app credentials
# Edit .env.development with your app's API key and secret

# Start development server
npm run dev

# Deploy to production
npm run deploy
```

## Project Structure

```
your-project/
├── src/
│   ├── routes/              # Your application routes
│   │   ├── index.jsx        # Public landing page (/)
│   │   └── app/             # Admin routes with Polaris
│   │       └── index.jsx    # Dashboard (/app)
│   └── lib/                 # Optional: Shared utilities
├── .ryziz/                  # Auto-generated (don't edit)
│   └── functions/           # Generated Firebase functions
├── .env.development         # Development credentials
├── .env.production          # Production credentials
├── .gitignore
└── package.json
```

**Important folders:**
- `src/routes/` - All your application routes ([Guide](./src/routes/README.md))
- `src/routes/app/` - Admin routes with Polaris ([Guide](./src/routes/app/README.md))
- `.ryziz/` - Auto-generated, committed to git, don't manually edit

## Routing System

Ryziz uses **file-based routing**. The file structure in `src/routes/` automatically becomes your URL structure.

### Route Mapping

| File | URL | Type |
|------|-----|------|
| `routes/index.jsx` | `/` | Public |
| `routes/contact.jsx` | `/contact` | Public |
| `routes/pricing.jsx` | `/pricing` | Public |
| `routes/app/index.jsx` | `/app` | Admin (Polaris) |
| `routes/app/products.jsx` | `/app/products` | Admin (Polaris) |
| `routes/app/settings.jsx` | `/app/settings` | Admin (Polaris) |

### Route Types

**Public Routes** (`src/routes/*.jsx`)
- For marketing pages, landing pages, install flows
- Regular React with custom styles
- No Polaris (will error if you import it)
- [Full Guide →](./src/routes/README.md)

**Admin Routes** (`src/routes/app/*.jsx`)
- For Shopify admin embedded pages
- Automatic Polaris + App Bridge integration
- Protected by Shopify authentication
- [Full Guide →](./src/routes/app/README.md)

### Basic Route File

Every route file can export three things:

```jsx
import React from 'react';

// 1. loader() - Fetch data on the server
export async function loader({ params, query, shopify }) {
  return { message: 'Hello World' };
}

// 2. action() - Handle form submissions (POST requests)
export async function action({ body, shopify }) {
  // Handle form submission
  return { success: true };
}

// 3. head() - Set page title and meta tags
export async function head({ data }) {
  return {
    title: 'My Page',
    description: 'Page description'
  };
}

// 4. default export - React component
export default function MyPage({ message }) {
  return <h1>{message}</h1>;
}
```

**All exports are optional!** You can have a route with just a React component.

## Environment Setup

### Required Environment Variables

Create `.env.development` and `.env.production` files:

```bash
# Shopify App Credentials
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_SCOPES=read_products,write_products,read_customers
SHOPIFY_HOST=https://your-app-url.web.app

# Environment
NODE_ENV=development
```

### Getting Shopify Credentials

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create a new app
3. Copy the **API key** and **API secret**
4. Set **App URL** to your deployment URL
5. Add required **Scopes** for your app

### Firebase Setup

Ryziz uses Firebase for:
- **Functions** - Server-side code execution
- **Firestore** - Session storage
- **Hosting** - Static asset serving

No manual Firebase configuration needed! Just run `ryziz dev` or `ryziz deploy`.

## Development

### Start Development Server

```bash
npm run dev
```

This starts:
- **Firebase Emulators** - Local Firebase environment
- **Functions** - Your server at http://localhost:5001
- **Firestore** - Database at http://localhost:8080
- **Auto-reload** - Changes trigger rebuild

### Development Workflow

1. Edit files in `src/routes/`
2. Save - auto-generates `.ryziz/` folder
3. Refresh browser to see changes

### Testing Your App

For local Shopify testing, you need a public URL:

**Option 1: Cloudflare Tunnel (Recommended)**
```bash
npx cloudflared tunnel --url http://localhost:5001
```

**Option 2: ngrok**
```bash
ngrok http 5001
```

Copy the public URL and set it as `SHOPIFY_HOST` in `.env.development`.

## Deployment

### Deploy to Firebase

```bash
npm run deploy
```

This will:
1. Generate `.ryziz/` folder with optimized code
2. Deploy Functions + Hosting to Firebase
3. Output your production URL

### First Time Deployment

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Create project: `firebase projects:create`
4. Deploy: `npm run deploy`

### Update Shopify App URLs

After deployment, update your Shopify app settings:
- **App URL**: `https://your-project.web.app`
- **Allowed redirect URLs**: `https://your-project.web.app/auth/callback`

## Route Documentation

**Public Routes Guide**: [src/routes/README.md](./src/routes/README.md)
- Creating landing pages
- Marketing pages
- Install flows
- Custom styling

**Admin Routes Guide**: [src/routes/app/README.md](./src/routes/app/README.md)
- Shopify Polaris components
- App Bridge features
- Dashboard pages
- Protected routes

## Common Patterns

### Fetching Shop Data

```jsx
// In any /app/* route
export async function loader({ shopify }) {
  const response = await shopify.graphql(`
    query {
      shop {
        name
        email
        currencyCode
      }
    }
  `);

  return response.body.data;
}
```

### Handling Form Submissions

```jsx
export async function action({ shopify, body }) {
  const { productTitle } = body;

  const response = await shopify.graphql(`
    mutation {
      productCreate(input: { title: "${productTitle}" }) {
        product { id }
      }
    }
  `);

  return { success: true };
}

export default function MyPage() {
  return (
    <form method="POST">
      <input name="productTitle" />
      <button type="submit">Create</button>
    </form>
  );
}
```

### Redirects

```jsx
export async function loader({ query }) {
  if (!query.shop) {
    return { redirect: '/install' };
  }

  return { data: 'something' };
}
```

## Troubleshooting

### "Polaris components can only be imported in /app/* routes"

You tried to import Polaris in a public route. Move the file to `src/routes/app/` or use custom components.

### "Session not found"

Make sure you've installed the app in a Shopify store and completed OAuth flow.

### Changes not appearing

1. Check that `.ryziz/` folder was regenerated
2. Restart `npm run dev`
3. Clear browser cache

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local development with Firebase emulators |
| `npm run deploy` | Deploy to Firebase production |
| `ryziz dev` | Same as npm run dev (if ryziz installed globally) |
| `ryziz deploy` | Same as npm run deploy |

## Getting Help

- **Public Routes**: See [src/routes/README.md](./src/routes/README.md)
- **Admin Routes**: See [src/routes/app/README.md](./src/routes/app/README.md)
- **Ryziz Framework**: See [Ryziz GitHub](https://github.com/ryziz-shopify/ryziz)

## Next Steps

1. ✅ Read the [Public Routes Guide](./src/routes/README.md)
2. ✅ Read the [Admin Routes Guide](./src/routes/app/README.md)
3. ✅ Set up your environment variables
4. ✅ Start building your app!

---

**Happy building with Ryziz!** 🚀
