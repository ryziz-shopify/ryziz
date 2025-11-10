# Ryziz

Build Shopify apps on Firebase with file-based routing.

## Quick Start

```bash
npx @ryziz-shopify/ryziz@latest init  # Create new project
npm run link                           # Link to your Shopify app
npm run dev                            # Start development server
npm run deploy                         # Deploy to production
```

Development server runs on localhost with Firebase emulators and Cloudflare tunnel for HTTPS.

## File-Based Routing

Name your files, get your routes:

**Frontend**
```
page.index.jsx              → /                 (public page)
page.about.jsx              → /about            (public page)
app.index.jsx               → /app              (embedded app)
app.settings.jsx            → /app/settings     (embedded app)
app.items.$id.jsx           → /app/items/:id    (dynamic route)
```

**Backend**
```
api.hello.js                → /api/hello        (API endpoint)
api.items.$id.js            → /api/items/:id    (dynamic API)
webhooks.orders-create.js   → auto-registered   (webhook handler)
```

## Explore Demo

Run `npm run dev` to see working examples:

- **Full page layouts** - Homepage, index table, details page, settings
- **15+ UI patterns** - Polaris components ready to copy
- **Live code** - See routing, App Bridge, and Firestore in action

All demo files are in `src/` and can be deleted when you're ready to build your app.

### Demo Files You'll Get

**Frontend Pages**
- `app.index.jsx` - Welcome page with links to all demos
- `app.demo.homepage.jsx` - Complete homepage layout
- `app.demo.index.jsx` - Index table with data
- `app.demo.details.jsx` - Details page with form
- `app.demo.settings.jsx` - Settings page example
- `app.demo.$pattern.jsx` - Pattern viewer (dynamic route)
- `patterns/` - 15 reusable UI component examples

**Backend APIs**
- `api.index.js` - Simple API endpoint
- `api.demo.js` - Demo API (can delete)

**Webhooks**
- `webhooks.app-uninstalled.js` - Cleanup on uninstall
- `webhooks.customers-data-request.js` - GDPR data request
- `webhooks.customers-redact.js` - GDPR customer redaction
- `webhooks.shop-redact.js` - GDPR shop redaction

**Cleanup Instructions**

When ready to build, delete these files:
- `app.demo.*.jsx` - All demo pages
- `patterns/*.jsx` - All pattern files
- `api.demo.js` - Demo API

## Project Structure

```
src/                 Your route files (pages, APIs, webhooks)
public/              Static assets and HTML templates
shopify.app.toml     Shopify app config
.firebaserc          Firebase project ID
```

## Features

- **File-based routing** - Name your file, get your route
- **Shopify OAuth** - Authentication handled for you
- **App Bridge** - Full Shopify Admin API access
- **Polaris Components** - TypeScript autocomplete built-in
- **Firebase** - Functions, Hosting, Firestore included
- **Hot reload** - See changes instantly
- **Zero config** - Works out of the box

## Commands

**npm run dev** - Start dev server with hot reload

**npm run link** - Connect to your Shopify Partner app

**npm run deploy** - Deploy to Firebase and Shopify

## Learn More

All example files include comments showing:
- How to use Polaris Web Components
- How to call App Bridge APIs
- How to read/write Firestore data
- How to handle forms
- How to create dynamic routes
- How to query Shopify GraphQL

Start exploring `src/` after running `npm run dev`.
