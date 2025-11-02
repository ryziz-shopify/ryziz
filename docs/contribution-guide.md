# Contribution Guide

## Architecture Overview

Ryziz is a monorepo framework for building Shopify embedded apps on Firebase.

### Package Structure

**cli** - Build tools and commands (init, dev, link)

**router** - Frontend routing and Shopify App Bridge exports

**functions** - Firebase Cloud Functions with OAuth and webhook handling

**ryziz** - Template for new projects and **source of truth for package versions**

### Why Monorepo

**Single source of truth**: All packages share the same workspace, unified versioning via npm workspaces

**Dependency hoisting**: npm workspaces hoist shared dependencies to root node_modules

**Consistent development**: Changes across packages tested together

### Why File-Based Routing

**Convention over configuration**: No route config files needed, filename determines route path

**Automatic route discovery**: Build pipeline scans files at build time

**Clear structure**: `page.*.jsx` = public routes, `app.*.jsx` = embedded routes, `api.*.js` = API endpoints

### Why Firebase

**Serverless auto-scaling**: Cloud Functions scale automatically based on traffic

**Integrated platform**: Hosting + Functions + Firestore in one place

**Built-in CDN**: Global content delivery for static assets

### Package Roles

**cli**: Owns all commands (init, dev, link), build pipelines, and deployment logic

**router**: Provides React routing setup and Shopify App Bridge exports for frontend

**functions**: Provides Firebase Cloud Functions setup with Shopify OAuth and webhook handling

**ryziz**: Template for new projects and **source of truth for package versions**

### Why Ryziz is Source of Truth

**Single version management**: When upgrading internal packages (`@ryziz-shopify/*`), update only `packages/ryziz/package.json`. All new projects initialized via `ryziz init` inherit these exact versions.

**Template inheritance**: Users don't manually configure dependencies. They run `npx @ryziz-shopify/ryziz init`, which copies the entire template including `package.json` with pre-defined versions.

**Version strategy**: All `@ryziz-shopify/*` packages set to `"latest"` in ryziz package.json.

**WHY "latest"**: Ensures every new project gets the newest framework features. During init, `npm install` resolves "latest" to current registry version and pins it in user's package-lock.json.

**Upgrade workflow**:
1. Developer updates shared dependency in `packages/ryziz/package.json`
2. Test in ryziz package with `npm run dev`
3. Publish all packages to npm
4. All future `ryziz init` commands get updated version automatically

**NOT in CLI or functions packages**: These packages define their own dependencies for internal use. Only ryziz package defines what users receive.

**Monorepo benefit**: In development, npm workspaces hoist dependencies to root. All packages share the same versions defined in ryziz, ensuring consistency during development AND in production.

## Init Command Flow

When user runs `npx @ryziz-shopify/ryziz init`, here's what happens:

### Package Resolution

**Flow**: npm/npx downloads ryziz package → reads bin field → installs dependencies → executes CLI

**WHY bin points to CLI**: Ryziz package is the template, CLI package owns command logic. Bin field delegates execution to CLI directly without wrapper.

**WHY "latest" versions**: Always install newest package versions when initializing new project.

### Init Command Execution

**Implementation**: See `packages/cli/index.js` - Search for `.command('init')`

**High-level flow**:
1. **Scaffold**: Locate template package and copy files to current directory
2. **Dependencies**: Install packages from template, then update to latest versions
3. **Finalize**: Initialize git repository and clean template-specific config

### Key Architecture Decisions

**Template Resolution via Node.js Module System**

Init command must locate the ryziz template package. Uses `createRequire(import.meta.url).resolve()` to leverage Node.js module resolution algorithm.

**WHY**: When user runs `npx @ryziz-shopify/ryziz init`, npm installs both ryziz and CLI packages in same node_modules. Node.js resolution automatically finds sibling packages without hardcoded paths.

**Async File Operations**

Copy files using `fsPromises.cp()` and `fsPromises.copyFile()` instead of sync versions.

**WHY**: Non-blocking operations prevent freezing UI during copy. Parallel task execution shows visual progress for each file/folder.

**Sequential Dependency Installation**

Install all packages first, then update Ryziz packages to latest versions.

**WHY**: Template package.json contains all dependencies (react, firebase, etc.) with specific versions. Must install these first before updating framework packages to ensure compatible dependency tree.

**Template Exclusions**

Exclude `node_modules` when copying template files.

**WHY**: User will install fresh dependencies via npm. Copying node_modules wastes time and disk space, and may cause platform-specific binary incompatibilities.

**Bin Field Cleanup**

Remove `bin` field from user's package.json after init completes.

**WHY**: Bin field only needed to execute init command. User's project doesn't need it - they'll use npm scripts (`npm run dev`) instead. Use npm CLI (`npm pkg delete bin`) for atomic, safe updates.

## Frontend Build Pipeline

**Implementation**: See `packages/cli/src/build.frontend.js`

### File-Based Routing Convention

**Patterns**: `page.*.jsx` for public routes, `app.*.jsx` for embedded app routes

**Dynamic params**: `$` prefix converts to `:` (e.g., `app.products.$id.jsx` → `/app/products/:id`)

**Examples**: See `packages/ryziz/src/` for route files

### Build Strategy

**Virtual Routes Module**

Build pipeline scans `src/` for route files and generates a virtual module with dynamic imports at build time.

**WHY**: Routes discovered automatically from filesystem. No manual route configuration needed. Add new page → automatic routing.

**Virtual Esbuild Plugin**

Uses esbuild plugin API to inject virtual module during bundle process. Module never exists on disk, generated in-memory.

**WHY**: Avoids committing generated files. Build always reflects current filesystem state.

**Code Splitting**

Each route becomes separate JavaScript chunk, loaded on-demand.

**WHY**: Faster initial page load. Users only download code for routes they visit. Critical for embedded apps with size constraints.

**API Key Injection**

Shopify API key injected into HTML template during build.

**WHY**: App Bridge requires API key at runtime. Injection ensures correct key for each environment (dev tunnel vs production domain).

## Backend Build Pipeline

**Implementation**: See `packages/cli/src/build.backend.js`

### File-Based API Routing

**Patterns**: `api.*.js` for API endpoints, `webhooks.*.js` for webhook handlers

**Dynamic params**: `$` prefix for parameters (same as frontend)

**HTTP methods**: Export GET, POST, PUT, DELETE functions from API files

**Examples**: See `packages/ryziz/src/` for API and webhook files

### Build Strategy

**Virtual Routes Plugin**

Scans `src/api.*.js` files and generates route mappings. Detects exported HTTP methods to determine supported operations per endpoint.

**WHY**: No route configuration file. Add new API file → automatic endpoint. Method detection enables RESTful API design.

**Webhook Auto-Discovery**

Scans `src/webhooks.*.js` and extracts TOPIC constant via regex parsing.

**WHY**: Webhook registration derived from source code. TOPIC constant serves as both code documentation and build configuration.

**CommonJS Output**

Bundles to CommonJS format, not ESM.

**WHY**: Firebase Cloud Functions v2 runtime requires Node.js CommonJS modules. Attempting ESM results in deployment errors.

**Dependency Externalization**

All dependencies marked as external during bundle, not included in output.

**WHY**: Smaller bundle = faster cold starts. Dependencies installed separately via npm in deployment environment. Enables native module support.

**Package.json Generation**

Build generates new package.json with dependencies copied from functions package.

**WHY**: Deployment environment needs dependency list. Generated file ensures deployed function has correct dependencies without manual sync.

### Three Cloud Functions

**Implementation**: See `packages/functions/src/functions.entry.js`

Framework exports three separate Cloud Functions:

**auth**: OAuth flow handler (GET /auth, GET /auth/callback)
**webhooks**: Webhook processor (POST /webhook)
**api**: Custom endpoints from src/api.*.js files

**WHY separate functions**: Independent scaling. Auth rarely called (only during install), webhooks moderate traffic, API high traffic. Separate functions = separate scaling policies.

## Dev Command Flow

**Implementation**: See `packages/cli/index.js` - Search for `.command('dev')`

When user runs `npm run dev`:

### Multi-Config Support

Framework supports multiple Shopify apps in same project via `shopify.app*.toml` pattern.

**Config selection**: Scans for .toml files, prompts if multiple found, caches selection in `.ryziz/cache.json`

**WHY caching**: Faster subsequent runs. Use `--reset` flag to change selected config.

**WHY multiple configs**: Test different app configurations, manage staging/production, or develop multiple apps in same codebase.

### Environment Setup

**Parallel Secret Fetching**

API secret and tunnel URL fetched simultaneously.

**WHY parallel**: Reduces startup time. Tunnel creation takes 2-3 seconds, secret fetching takes 1-2 seconds. Parallel = ~3 seconds total instead of 5 seconds sequential.

**Cloudflare Tunnel**

Auto-generates secure HTTPS URL pointing to localhost:8080.

**WHY needed**: Shopify OAuth requires HTTPS redirect URLs. Cannot use http://localhost in production-like testing.

**WHY Cloudflare**: Zero configuration, no account required, auto-generated URL. Alternative (ngrok) requires account and configuration.

**Environment File**

Combines all variables and writes to `.ryziz/functions/.env`:
- `SHOPIFY_API_KEY` - From .toml file
- `SHOPIFY_API_SECRET` - From Shopify CLI
- `SHOPIFY_SCOPES` - From .toml file
- `SHOPIFY_HOST_NAME` - From tunnel URL

**WHY .env in functions directory**: Firebase emulators auto-load .env files. Environment variables only needed by backend (Cloud Functions), not frontend.

### Build & Watch

**Watch Mode**

Both frontend and backend run in watch mode, rebuilding automatically on file changes.

**WHY**: Hot reload during development. Save file → automatic rebuild → changes reflected in browser.

**Parallel Build**

Frontend and backend build simultaneously.

**WHY**: Faster initial startup. Builds are independent, no need for sequential execution.

### Emulators & Deployment

**Firebase Emulators**

Starts local emulators for Hosting, Functions, and Firestore.

**WHY emulators**: Test entire stack locally without deploying to Firebase. Faster iteration, no cloud costs during development.

**Automatic Shopify Registration**

Updates `shopify.app.toml` with tunnel URL and runs `shopify app deploy --force`.

**WHY automatic**: Tunnel URL changes on every run. Automatic update ensures Shopify config always matches current tunnel.

**WHY --force flag**: Skip confirmation prompts for faster development cycle.

## Link Command

**Implementation**: See `packages/cli/index.js` - Search for `.command('link')`

Simple wrapper that spawns `shopify app config link` with inherited stdio.

**WHY exists**: User-friendly shortcut. `npm run link` easier to remember than full Shopify CLI command.

**WHY stdio inherit**: Interactive prompts from Shopify CLI need direct access to terminal input/output.

**When to use**: Run once after `ryziz init` to connect project to Shopify app in Partner Dashboard.

## Contributing New Features

### Same Pattern Rule

**Principle**: When modifying similar files (e.g., `build.frontend.js` and `build.backend.js`), use identical structure and patterns.

**Application**: Both build files follow same organization - main export function at top, helper functions below, same plugin architecture.

**Before modifying**: Ask user for confirmation to apply same changes to similar files. Prevents inconsistency across codebase.

**Reference**: See `docs/coding-standards.md` for detailed pattern rules.

### Code Organization Principle

**Hoisting Style**: Main export function at top of file, helper functions below.

**WHY**: Readers immediately see file's primary purpose. Scrolling down reveals implementation details.

**Anti-pattern**: Helper functions first, main logic buried at bottom. Forces readers to scroll before understanding file purpose.

### Source of Trust Principle

**Entry points** (`packages/cli/index.js`): Handle validation, error handling, user-facing messages. Exit process on errors.

**Utilities** (`packages/cli/src/*.js`): Pure functions that return data. No error handling, no process.exit, no console output.

**WHY**: Single place for error handling logic. Utilities reusable in different contexts without side effects.

### Testing Checklist

Before submitting changes:

- [ ] Test in development mode: `npm run dev`
- [ ] Test hot reload: Edit a file, verify rebuild
- [ ] Test OAuth flow: Install app on dev store
- [ ] Test webhooks: Trigger webhook, check logs
- [ ] Test API endpoints: Call from frontend
- [ ] Test init command: `npx @ryziz-shopify/ryziz init` in empty directory
- [ ] Verify build output in `.ryziz/`

### Package Dependencies

When to add dependencies:

- **packages/cli/** - Build tools only (esbuild, glob, firebase-tools)
- **packages/router/** - Frontend runtime only (react, react-router-dom)
- **packages/functions/** - Backend runtime only (express, firebase-admin)
- **packages/ryziz/** - Template dependencies (all packages as "latest")

**WHY strict separation**: Keep package sizes small, clear responsibilities, avoid bloat.

### Modifying Build Pipeline

**Frontend build** (`packages/cli/src/build.frontend.js`):
- Modify when: Adding new page types, changing bundle format, altering route discovery
- Key sections: Virtual routes plugin, route naming convention, esbuild configuration

**Backend build** (`packages/cli/src/build.backend.js`):
- Modify when: Adding new API route types, changing function exports, webhook handling
- Key sections: Virtual routes plugin, virtual webhooks plugin, package.json generation

**Cloud Functions entry** (`packages/functions/src/functions.entry.js`):
- Modify when: Adding new Cloud Function, changing middleware, modifying auth/webhook handlers
- Exports: auth function, webhooks function, api function

**Tip**: Search file for function names or plugin names instead of relying on line numbers.

### Adding New Commands

To add new CLI command, follow existing command patterns in `packages/cli/index.js`.

**Structure**: Use Commander.js `.command()` API with `.action()` handler.

**Task UI**: Use `createTask` from `util.task.js` for consistent visual output and progress tracking.

**Reference**: Study existing commands (init, dev, link) for structure and patterns. Each demonstrates different task organization (sequential, parallel, nested).

### Before Creating Pull Request

1. Read `docs/coding-standards.md`
2. Follow Same Pattern Rule for similar files
3. Test all affected workflows
4. Update this guide if architecture changed
5. Ask for clarification if unclear

**WHY these rules**: Maintain consistency, avoid breaking changes, easier code review.

## Reference

**Key Files**:
- CLI commands: `packages/cli/index.js`
- Frontend build: `packages/cli/src/build.frontend.js`
- Backend build: `packages/cli/src/build.backend.js`
- Cloud Functions: `packages/functions/src/functions.entry.js`
- Shopify config: `packages/functions/src/functions.shopify.js`
- Task utilities: `packages/cli/src/util.task.js`

**Configuration**:
- Shopify app: `packages/ryziz/shopify.app.toml`
- Firebase: `packages/functions/firebase.json`
- Firebase project: `packages/ryziz/.firebaserc`
- JavaScript: `packages/ryziz/jsconfig.json`
