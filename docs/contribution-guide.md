# Contribution Guide

Architecture overview and contribution workflow for Ryziz framework.

## Architecture Overview

Ryziz is a monorepo framework for building Shopify embedded apps on Firebase.

### Monorepo Structure

**templates/ryziz/** - User project template, source of truth for package versions

**packages/cli/** - Build tools and commands (init, dev, link)

**packages/router/** - Frontend routing and Shopify App Bridge exports

**packages/functions/** - Firebase Cloud Functions with OAuth and webhook handling

### Why Monorepo

**Single source of truth** - All packages share the same workspace, unified versioning via npm workspaces

**Dependency hoisting** - npm workspaces hoist shared dependencies to root node_modules, ensuring consistency

**Consistent development** - Changes across packages tested together before publishing

### Why File-Based Routing

**Convention over configuration** - No route config files needed, filename determines route path

**Automatic route discovery** - Build pipeline scans files at build time, no manual registration

**Clear structure** - Naming patterns make routes self-documenting

### Why Firebase

**Serverless auto-scaling** - Cloud Functions scale automatically based on traffic

**Integrated platform** - Hosting + Functions + Firestore in one place, no glue code

**Built-in CDN** - Global content delivery for static assets

### Package Roles

**cli** - Owns all commands (init, dev, link), build pipelines, and deployment logic

**router** - Provides React routing setup and Shopify App Bridge exports for frontend

**functions** - Provides Firebase Cloud Functions setup with Shopify OAuth and webhook handling

**templates/ryziz** - Template for new projects and source of truth for package versions

## Why Templates/Ryziz is Source of Truth

**Single version management** - When upgrading internal packages, update only `templates/ryziz/package.json`. All new projects inherit these exact versions.

**Template inheritance** - Users don't manually configure dependencies. They run `npx @ryziz-shopify/ryziz@latest init`, which copies the entire template including package.json with pre-defined versions.

**Version strategy** - All `@ryziz-shopify/*` packages set to `"latest"` in templates/ryziz package.json.

**Why "latest"** - Ensures every new project gets the newest framework features. During init, npm install resolves "latest" to current registry version and pins it in user's package-lock.json.

**Upgrade workflow:**
1. Developer updates shared dependency in `templates/ryziz/package.json`
2. Test in templates/ryziz with `cd templates/ryziz && npm run dev`
3. Publish all packages to npm
4. All future `ryziz init` commands get updated version automatically

**Not in CLI or functions packages** - These packages define their own dependencies for internal use. Only templates/ryziz defines what users receive.

**Monorepo benefit** - In development, all packages use same versions. In production, users get tested, compatible versions.

## Init Command Flow

When user runs `npx @ryziz-shopify/ryziz@latest init`:

### Package Resolution

npm/npx downloads ryziz package → reads bin field → installs dependencies → executes CLI

**Why bin points to CLI** - Ryziz package is the template, CLI package owns command logic. Bin field delegates execution to CLI directly without wrapper.

### Init Command Execution

Implementation in `packages/cli/index.js` - Search for `.command('init')`

**High-level flow:**
1. **Scaffold** - Locate template package and copy files to current directory
2. **Dependencies** - Install packages from template, then update to latest versions
3. **Finalize** - Clean template-specific config

### Key Architecture Decisions

**Template Resolution via Node.js Module System**

Uses `createRequire(import.meta.url).resolve()` to leverage Node.js module resolution algorithm.

**Why** - When user runs `npx @ryziz-shopify/ryziz@latest init`, npm installs both ryziz and CLI packages in same node_modules. Node.js resolution automatically finds sibling packages without hardcoded paths.

**Async File Operations**

Uses `fsPromises.cp()` and `fsPromises.copyFile()` instead of sync versions.

**Why** - Non-blocking operations prevent freezing UI during copy. Parallel task execution shows visual progress for each file/folder.

**Sequential Dependency Installation**

Installs all packages first, then updates Ryziz packages to latest versions.

**Why** - Template package.json contains all dependencies (react, firebase, etc.) with specific versions. Must install these first before updating framework packages to ensure compatible dependency tree.

**Template Exclusions**

Excludes `node_modules` when copying template files.

**Why** - User will install fresh dependencies via npm. Copying node_modules wastes time and disk space, and may cause platform-specific binary incompatibilities.

**Bin Field Cleanup**

Removes `bin` field from user's package.json after init completes.

**Why** - Bin field only needed to execute init command. User's project doesn't need it - they'll use npm scripts (`npm run dev`) instead. Uses npm CLI (`npm pkg delete bin`) for atomic, safe updates.

## Frontend Build Pipeline

Implementation in `packages/cli/src/build.frontend.js`

### Build Strategy

**Virtual Routes Module**

Build pipeline scans `src/` for route files and generates a virtual module with dynamic imports at build time.

**Why** - Routes discovered automatically from filesystem. No manual route configuration needed. Add new page → automatic routing.

**Virtual Esbuild Plugin**

Uses esbuild plugin API to inject virtual module during bundle process. Module never exists on disk, generated in-memory.

**Why** - Avoids committing generated files. Build always reflects current filesystem state. No git conflicts on generated code.

**Code Splitting**

Each route becomes separate JavaScript chunk, loaded on-demand.

**Why** - Faster initial page load. Users only download code for routes they visit. Critical for embedded apps with size constraints.

**API Key Injection**

Shopify API key injected into HTML template during build.

**Why** - App Bridge requires API key at runtime. Injection ensures correct key for each environment (dev tunnel vs production domain).

## Backend Build Pipeline

Implementation in `packages/cli/src/build.backend.js`

### Build Strategy

**Virtual Routes Plugin**

Scans `src/api.*.js` files and generates route mappings. Detects exported HTTP methods to determine supported operations per endpoint.

**Why** - No route configuration file. Add new API file → automatic endpoint. Method detection enables RESTful API design without configuration.

**Webhook Auto-Discovery**

Scans `src/webhooks.*.js` and extracts TOPIC constant via regex parsing.

**Why** - Webhook registration derived from source code. TOPIC constant serves as both code documentation and build configuration. Single source of truth.

**CommonJS Output**

Bundles to CommonJS format, not ESM.

**Why** - Firebase Cloud Functions v2 runtime requires Node.js CommonJS modules. Attempting ESM results in deployment errors.

**Dependency Externalization**

All dependencies marked as external during bundle, not included in output.

**Why** - Smaller bundle = faster cold starts. Dependencies installed separately via npm in deployment environment. Enables native module support.

**Package.json Generation**

Build generates new package.json with dependencies copied from functions package.

**Why** - Deployment environment needs dependency list. Generated file ensures deployed function has correct dependencies without manual sync.

### Three Cloud Functions

Implementation in `packages/functions/src/functions.entry.js`

Framework exports three separate Cloud Functions:

**auth** - OAuth flow handler (GET /auth, GET /auth/callback)

**webhooks** - Webhook processor (POST /webhook)

**api** - Custom endpoints from src/api.*.js files

**Why separate functions** - Independent scaling. Auth rarely called (only during install), webhooks moderate traffic, API high traffic. Separate functions = separate scaling policies and cold start optimization.

## Dev Command Flow

Implementation in `packages/cli/index.js` - Search for `.command('dev')`

### Multi-Config Support

Framework supports multiple Shopify apps in same project via `shopify.app*.toml` pattern.

**Config selection** - Scans for .toml files, prompts if multiple found, caches selection in `.ryziz/cache.json`

**Why caching** - Faster subsequent runs. Use `--reset` flag to change selected config.

**Why multiple configs** - Test different app configurations, manage staging/production, or develop multiple apps in same codebase.

### Environment Setup

**Parallel Secret Fetching**

API secret and tunnel URL fetched simultaneously.

**Why parallel** - Reduces startup time. Tunnel creation takes 2-3 seconds, secret fetching takes 1-2 seconds. Parallel = ~3 seconds total instead of 5 seconds sequential.

**Cloudflare Tunnel**

Auto-generates secure HTTPS URL pointing to localhost:8080.

**Why needed** - Shopify OAuth requires HTTPS redirect URLs. Cannot use http://localhost in production-like testing.

**Why Cloudflare** - Zero configuration, no account required, auto-generated URL. Alternative (ngrok) requires account and configuration.

**Environment File**

Combines all variables and writes to `.ryziz/functions/.env`:
- `SHOPIFY_API_KEY` - From .toml file
- `SHOPIFY_API_SECRET` - From Shopify CLI
- `SHOPIFY_SCOPES` - From .toml file
- `SHOPIFY_HOST_NAME` - From tunnel URL

**Why .env in functions directory** - Firebase emulators auto-load .env files. Environment variables only needed by backend (Cloud Functions), not frontend.

### Build & Watch

**Watch Mode**

Both frontend and backend run in watch mode, rebuilding automatically on file changes.

**Why** - Hot reload during development. Save file → automatic rebuild → changes reflected in browser.

**Parallel Build**

Frontend and backend build simultaneously.

**Why** - Faster initial startup. Builds are independent, no need for sequential execution.

### Emulators & Deployment

**Firebase Emulators**

Starts local emulators for Hosting, Functions, and Firestore.

**Why emulators** - Test entire stack locally without deploying to Firebase. Faster iteration, no cloud costs during development.

**Automatic Shopify Registration**

Updates `shopify.app.toml` with tunnel URL and runs `shopify app deploy --force`.

**Why automatic** - Tunnel URL changes on every run. Automatic update ensures Shopify config always matches current tunnel.

**Why --force flag** - Skip confirmation prompts for faster development cycle.

## Link Command

Implementation in `packages/cli/index.js` - Search for `.command('link')`

Simple wrapper that spawns `shopify app config link` with inherited stdio.

**Why exists** - User-friendly shortcut. `npm run link` easier to remember than full Shopify CLI command.

**Why stdio inherit** - Interactive prompts from Shopify CLI need direct access to terminal input/output.

**When to use** - Run once after `ryziz init` to connect project to Shopify app in Partner Dashboard.

## Version Management

### Automatic Version Bumping

Git pre-commit hook (`.husky/pre-commit`) detects changed packages and auto-increments patch version.

**How it works** - Scans staged files, if package has changes (excluding package.json itself), runs `npm version patch` in that package directory.

**Why automatic** - Eliminates manual version management. Every change gets a version bump. No forgotten version updates.

**Why patch only** - Breaking changes (major) and features (minor) should be intentional. Patch is safe default for fixes and improvements.

### Automatic Publishing

Git pre-push hook (`.husky/pre-push`) detects version changes and auto-publishes to npm (master branch only).

**How it works** - Compares package.json versions between local and remote. If version field changed, runs `npm publish` for that package.

**Why automatic** - Publishing happens at push time, not commit time. Prevents unpublished commits on master. All commits on master = published versions.

**Why master only** - Feature branches can have unpublished versions. Only master branch represents published state.

## Contributing New Features

### Before Starting

1. Read `docs/coding-standards.md` for code patterns and conventions
2. Understand the same pattern rule - similar files follow identical structure
3. Ask for clarification if architecture decisions are unclear

### Testing Checklist

Before submitting changes:

- Test in development mode in templates/ryziz: `cd templates/ryziz && npm run dev`
- Test hot reload: Edit a file, verify rebuild works
- Test OAuth flow: Install app on dev store
- Test webhooks: Trigger webhook, check logs
- Test API endpoints: Call from frontend, verify response
- Test init command: `cd /tmp && npx /path/to/ryziz@latest init` in empty directory
- Verify build output in `.ryziz/`

### Package Dependencies

When to add dependencies:

- **packages/cli** - Build tools only (esbuild, glob, firebase-tools)
- **packages/router** - Frontend runtime only (react, react-router-dom)
- **packages/functions** - Backend runtime only (express, firebase-admin)
- **templates/ryziz** - Template dependencies (all packages as "latest")

**Why strict separation** - Keep package sizes small, clear responsibilities, avoid bloat.

### Modifying Build Pipeline

**Frontend build** (`packages/cli/src/build.frontend.js`):
- Modify when: Adding new page types, changing bundle format, altering route discovery
- Search for: Function names like `createVirtualRoutesPlugin` or `buildFrontend`

**Backend build** (`packages/cli/src/build.backend.js`):
- Modify when: Adding new API route types, changing function exports, webhook handling
- Search for: Function names like `createVirtualRoutesPlugin` or `buildBackend`

**Cloud Functions entry** (`packages/functions/src/functions.entry.js`):
- Modify when: Adding new Cloud Function, changing middleware, modifying auth/webhook handlers
- Search for: Exported function names `auth`, `webhooks`, `api`

**Tip** - Search files for function names or plugin names instead of relying on line numbers, which change frequently.

### Adding New Commands

To add new CLI command, follow existing command patterns in `packages/cli/index.js`.

**Structure** - Use Commander.js `.command()` API with `.action()` handler

**Task UI** - Use `createTask` from `util.task.js` for consistent visual output and progress tracking

**Reference** - Study existing commands (init, dev, link) for structure and patterns. Each demonstrates different task organization (sequential, parallel, nested).

## Key Files Reference

**CLI commands** - `packages/cli/index.js`

**Frontend build** - `packages/cli/src/build.frontend.js`

**Backend build** - `packages/cli/src/build.backend.js`

**Cloud Functions** - `packages/functions/src/functions.entry.js`

**Shopify config** - `packages/functions/src/functions.shopify.js`

**Task utilities** - `packages/cli/src/util.task.js`

**Template config** - `templates/ryziz/shopify.app.toml`

**Firebase config** - `templates/ryziz/.firebaserc`

**JavaScript config** - `templates/ryziz/jsconfig.json`

Search these files for function names mentioned in this guide to locate specific implementations.
