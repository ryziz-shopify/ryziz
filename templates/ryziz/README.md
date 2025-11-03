# Ryziz

Framework for building Shopify embedded apps on Firebase with file-based routing.

## Installation

```bash
npx @ryziz-shopify/ryziz init
```

This will:
- Scaffold a new Shopify app project
- Install all dependencies
- Set up file-based routing
- Configure Firebase and Shopify integration

## Quick Start

After initialization:

```bash
# Link to your Shopify app
npm run link

# Start development server
npm run dev
```

Development server starts on localhost with Firebase emulators and Cloudflare tunnel for HTTPS.

## What's Included

- **File-based routing** - Convention-based routes from filenames
- **Shopify OAuth** - Automatic authentication flow
- **App Bridge** - Shopify UI components and APIs
- **Firebase** - Cloud Functions, Hosting, Firestore
- **Hot reload** - Automatic rebuild on file changes
- **Zero config** - Works out of the box
- **Best practices** - From 10 years of production experience

## Documentation

**[docs/getting-started.md](docs/getting-started.md)** - Complete guide to file-based routing, APIs, webhooks, and Shopify integration

## Commands

**npm run dev** - Start development with hot reload

**npm run link** - Link project to Shopify Partner app

## File-Based Routing

**src/page.*.jsx** - Public routes (no Shopify auth required)

**src/app.*.jsx** - Embedded app routes (inside Shopify Admin)

**src/api.*.js** - API endpoints with Shopify session

**src/webhooks.*.js** - Webhook handlers with auto-registration

See [docs/getting-started.md](docs/getting-started.md) for complete routing guide with examples.

## Project Structure

**src/** - Your application code (routes, APIs, webhooks)

**public/** - Static assets served by Firebase Hosting

**shopify.app.toml** - Shopify app configuration

**.firebaserc** - Firebase project ID

## Next Steps

Read [docs/getting-started.md](docs/getting-started.md) to learn how to:
- Add new pages and routes
- Create API endpoints
- Handle webhooks
- Access Shopify API
- Store data in Firestore
