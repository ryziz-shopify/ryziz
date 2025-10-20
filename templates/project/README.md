# Your Ryziz Project

## Quick Start

```bash
# Install dependencies
npm install

# Link to Shopify app (if not done during init)
npx shopify app config link

# Start development
npm run dev

# Deploy to production
npm run deploy
```

## Project Structure

```
your-project/
├── src/routes/              # Your routes
│   ├── index.jsx           # Public page (/)
│   └── app/                # Admin routes with Polaris
│       └── index.jsx       # Dashboard (/app)
├── shopify.app.toml        # Shopify app configuration
├── .env                    # Secrets (auto-pulled, git-ignored)
├── .env.local              # Custom variables (optional, git-ignored)
├── .env.local.example      # Template for custom variables
└── .ryziz/                 # Auto-generated (don't edit)
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

### Shopify Configuration

Ryziz uses Shopify CLI to manage app configuration and secrets:

```bash
# Link to your Shopify Partner app
npx shopify app config link

# This creates/updates shopify.app.toml with your app info
# Secrets are automatically pulled when you run: npm run dev
```

### Multiple Environments (Optional)

Create multiple configurations for different environments:

```bash
shopify.app.toml           # Default
shopify.app.dev.toml       # Development
shopify.app.staging.toml   # Staging
shopify.app.production.toml # Production
```

When you run `npm run dev` or `npm run deploy`, Ryziz will prompt you to select an environment.

### Custom Variables (Optional)

For non-Shopify variables (Firebase config, feature flags, etc.), create `.env.local`:

```bash
# Copy the example
cp .env.local.example .env.local

# Add your custom variables
FIREBASE_PROJECT_ID=my-project
FEATURE_FLAG_BETA=true
```

**Note:** `.env` and `.env.local` are git-ignored for security.

## Development

```bash
npm run dev
```

This command:
1. Selects your environment (if you have multiple `.toml` files)
2. Pulls latest secrets from Shopify
3. Starts Firebase Emulators at http://localhost:6601

### Testing with Shopify

For Shopify embedded app testing, you'll need to tunnel to localhost:

```bash
# Option 1: Cloudflare (recommended, free)
npx cloudflared tunnel --url http://localhost:6601

# Option 2: ngrok (requires account)
ngrok http 6601
```

Update your `shopify.app.toml` with the public tunnel URL:

```toml
application_url = "https://your-tunnel-url.trycloudflare.com"
```

## Deployment

```bash
npm run deploy
```

This command:
1. Selects your environment (production, staging, etc.)
2. Pulls latest secrets from Shopify
3. Builds and deploys to Firebase

### First Time Setup

```bash
# Login to Firebase
firebase login

# Create a Firebase project
firebase projects:create

# Deploy
npm run deploy
```

### After Deployment

Update your `shopify.app.toml` with production URLs:

```toml
application_url = "https://your-project.web.app"

[auth]
redirect_urls = [
  "https://your-project.web.app/auth/callback"
]
```

Then push the config to Shopify:

```bash
npx shopify app deploy
```

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
