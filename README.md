# Ryziz

**Zero-config Shopify SSR framework with automatic Polaris integration**

Build Shopify apps with file-based routing, SSR, and zero configuration.

## Quick Start

```bash
npx ryziz init
npm install
npm run dev
npm run deploy
```

## What You Get

Create `src/routes/app/products.jsx` and Polaris just works:

```jsx
import { Page, Card, Button } from '@shopify/polaris';

export async function loader({ shopify }) {
  const data = await shopify.graphql(`query { products { ... } }`);
  return data;
}

export default function Products({ products }) {
  return (
    <Page title="Products">
      <Card>
        <Button primary>Add Product</Button>
      </Card>
    </Page>
  );
}
```

**No provider setup. No configuration. Just works.**

## The Difference

**Before Ryziz:**
- Configure webpack, babel, Polaris providers
- Set up OAuth, sessions, routing
- Wire up Firebase deployment
- Write app

**With Ryziz:**
- Write app

## How It Works

| File | URL | Type |
|------|-----|------|
| `routes/index.jsx` | `/` | Public page |
| `routes/app/products.jsx` | `/app/products` | Admin (auto-Polaris) |

Routes in `/app/*` automatically get:
- Polaris UI components
- App Bridge integration
- Shopify authentication
- GraphQL client
- Server-side rendering

## Documentation

See project README after running `ryziz init` or browse [templates/project/README.md](./templates/project/README.md)

## Requirements

- Node.js 18+
- Firebase project (free tier works)
- Shopify Partner account

## License

MIT

---

**Get started:** `npx ryziz init`
