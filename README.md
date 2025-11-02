# Ryziz

Framework for building Shopify embedded apps on Firebase with file-based routing.

## Quick Start

```bash
# Create new project
npx @ryziz-shopify/ryziz init

# Link to Shopify app
npm run link

# Start development
npm run dev
```

## What You Get

- **File-based routing** - `page.*.jsx` for public routes, `app.*.jsx` for embedded app, `api.*.js` for endpoints
- **Shopify integration** - OAuth, webhooks, App Bridge built-in
- **Firebase deployment** - Cloud Functions + Hosting + Firestore
- **Hot reload** - Watch mode with automatic rebuild
- **Zero config** - Convention over configuration

## Documentation

- **Getting Started** - `packages/ryziz/docs/getting-started.md` (file-based routing guide)
- **Contributing** - `docs/contribution-guide.md` (architecture & build pipeline)
- **Coding Standards** - `docs/coding-standards.md` (code patterns)

## Commands

```bash
npm run dev   # Start development with hot reload
npm run link  # Link project to Shopify app
```
