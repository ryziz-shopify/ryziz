# Your Ryziz Project

## Quick Start

```bash
# Install and configure
npm install
# Edit .env.development with Shopify API key and secret

# Develop
npm run dev

# Deploy
npm run deploy
```

## Project Structure

```
your-project/
├── src/routes/           # Your routes
│   ├── index.jsx        # Public page (/)
│   └── app/             # Admin routes with Polaris
│       └── index.jsx    # Dashboard (/app)
├── .ryziz/              # Auto-generated (don't edit)
├── .env.development
└── .env.production
```

## Routing

Files in `src/routes/` become URLs automatically:

| File | URL | Type |
|------|-----|------|
| `routes/index.jsx` | `/` | Public |
| `routes/contact.jsx` | `/contact` | Public |
| `routes/app/index.jsx` | `/app` | Admin (Polaris) |
| `routes/app/products.jsx` | `/app/products` | Admin (Polaris) |

**Public routes** - Marketing pages, custom styles
**Admin routes** (`/app/*`) - Automatic Polaris, authenticated

[Public Routes Guide →](./src/routes/README.md)
[Admin Routes Guide →](./src/routes/app/README.md)

## Basic Route File

```jsx
// 1. loader() - Fetch data on server
export async function loader({ params, query, shopify }) {
  return { message: 'Hello World' };
}

// 2. action() - Handle form submissions
export async function action({ body, shopify }) {
  return { success: true };
}

// 3. head() - Page metadata
export async function head({ data }) {
  return { title: 'My Page' };
}

// 4. React component
export default function MyPage({ message }) {
  return <h1>{message}</h1>;
}
```

All exports are optional.

## Environment Setup

Create `.env.development` and `.env.production`:

```bash
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_products,write_products
SHOPIFY_HOST=https://your-app-url.web.app
NODE_ENV=development
```

Get credentials from [Shopify Partners](https://partners.shopify.com/)

## Development

```bash
npm run dev
```

Starts Firebase Emulators at http://localhost:5001

For Shopify testing, tunnel to localhost:

```bash
# Cloudflare (recommended)
npx cloudflared tunnel --url http://localhost:5001

# Or ngrok
ngrok http 5001
```

Set public URL as `SHOPIFY_HOST` in `.env.development`

## Deployment

```bash
npm run deploy
```

First time:
```bash
npm install -g firebase-tools
firebase login
firebase projects:create
npm run deploy
```

Update Shopify app settings:
- **App URL**: `https://your-project.web.app`
- **Redirect URLs**: `https://your-project.web.app/auth/callback`

## Common Patterns

### Fetch Shop Data
```jsx
export async function loader({ shopify }) {
  const response = await shopify.graphql(`
    query {
      shop { name email currencyCode }
    }
  `);
  return response.body.data;
}
```

### Handle Forms
```jsx
export async function action({ shopify, body }) {
  const { title } = body;
  await shopify.graphql(`
    mutation {
      productCreate(input: { title: "${title}" }) {
        product { id }
      }
    }
  `);
  return { success: true };
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

**"Polaris components can only be imported in /app/* routes"**
Move file to `src/routes/app/` or use custom components

**Changes not appearing**
Restart `npm run dev` and clear browser cache

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development |
| `npm run deploy` | Deploy to Firebase |

## Next Steps

1. Read [Public Routes Guide](./src/routes/README.md)
2. Read [Admin Routes Guide](./src/routes/app/README.md)
3. Configure environment variables
4. Start building!
