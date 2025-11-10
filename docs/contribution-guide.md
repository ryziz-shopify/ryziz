# Contribution Guide

Architecture overview and contribution workflow for Ryziz framework.

## Architecture Overview

Ryziz is a monorepo framework for building Shopify embedded apps on Firebase.

### Monorepo Structure

**templates/ryziz/** - User project template, source of truth for package versions

**packages/** - Framework packages (cli, router, functions, etc)

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

**packages/** - Framework packages with specific responsibilities (commands, routing, backend runtime, etc)

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

## File Organization Principles

### Filename Patterns

**Simple descriptive names without prefixes**

Examples: cli.js, build.js, shopify.js, init.js, dev.js, deploy.js, entry.js, entry.jsx

**Avoid prefixes or compound names**

❌ util.shopify.js, functions.entry.js, exports.shopify.js, router.routes.jsx

**Package-specific patterns:**
- CLI: cli.js, build.js, init.js, dev.js, deploy.js, pull.js, patches.js
- Functions: index.js (SDK), entry.js (build entry), src/shopify.js (shared)
- Router: index.js (SDK), entry.jsx (build entry)

**Why** - Single responsibility per file makes purpose clear from name alone. Flat structure enables easy finding without nested navigation.

### Import Style

**Use named imports for Node.js built-ins:**

```js
import { join, basename } from 'path';
import { readFileSync, existsSync } from 'fs';
import { cp, copyFile } from 'fs/promises';
```

**Not default imports:**

```js
// ❌ Avoid
import path from 'path';
import fs from 'fs';

// ✅ Prefer
import { join } from 'path';
import { readFileSync } from 'fs';
```

**Why** - More explicit, shows exactly what functions are used, enables better tree-shaking.

### Utils Extraction Philosophy

**Minimum utils approach** - Only extract complex logic that provides real value

**Extract when:**
- Logic spans 10+ lines with multiple steps
- Complex parsing or transformation (TOML, glob patterns)
- Needs monkey patching or advanced Node.js APIs (createRequire)
- Used across multiple commands

**Keep inline when:**
- Simple library calls (fs.writeFileSync, JSON.parse)
- One-liner operations
- Only used once

**Quote from Sandi Metz:** "Duplication is far cheaper than the wrong abstraction"

**Example - Don't extract:**

```js
// ❌ Over-abstraction
await writeJson(path, data);

// ✅ Keep inline
fs.writeFileSync(path, JSON.stringify(data, null, 2));
```

**Example - Do extract:**

```js
// ✅ Complex logic deserves extraction
const { configs, fromCache } = await scanConfigs({ skipCache });
```

**Why** - Avoids abstraction layers that hide simple operations. Developers familiar with fs/path APIs don't need wrappers. Utils should solve real complexity, not wrap standard library.

### Code Organization

**Main function at top, helpers below:**

```js
export async function buildWeb(options = {}) {
  const watch = options.watch || false;
  const outdir = path.join(RYZIZ_DIR, 'public');

  const buildOptions = {
    plugins: [
      reactShimPlugin(),
      cleanDistPlugin(outdir)
    ]
  };

  await esbuild.build(buildOptions);
}

function reactShimPlugin() {
  return {
    name: 'react-shim',
    setup(build) {
      // implementation
    }
  };
}

function cleanDistPlugin(outdir) {
  return {
    name: 'clean-dist',
    setup(build) {
      // implementation
    }
  };
}
```

**Why** - Hoisting style makes main function immediately visible. Helpers follow in order of usage for natural reading flow.

### Variable Usage

**Inline single-use values:**

```js
// ❌ Unnecessary intermediate variable
const source = join(cwd, 'public');
await cp(source, target);

// ✅ Inline directly
await cp(join(cwd, 'public'), target);
```

**Create variables for:**
- Values used multiple times
- Complex expressions that need clarity
- Values that change during execution

**Why** - Reduces visual noise, keeps code concise without sacrificing readability.

### Source of Trust

**Main entry point handles validation and errors:**

```js
// packages/cli/index.js
program
  .command('dev')
  .action(async (options) => {
    try {
      // validation logic
      if (!fs.existsSync(configPath)) {
        throw new Error('Config not found');
      }
      // orchestration logic
      await runTasks([...]);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });
```

**Utility functions stay pure:**

```js
// packages/cli/src/dev.js
export async function updateConfig(tunnelUrl, configPath) {
  // Just do the work, return data
  const tomlContent = fs.readFileSync(configPath, 'utf8');
  const tomlData = parse(tomlContent);
  // ...
  fs.writeFileSync(configPath, updatedContent);
}
```

**Why** - Single source of truth for error handling. Utils remain reusable across different contexts. Index.js orchestrates, utils execute.

## Init Command Flow

When user runs `npx @ryziz-shopify/ryziz@latest init`:

### Package Resolution

npm/npx downloads ryziz package → reads bin field → installs dependencies → executes CLI

**Why bin points to CLI** - Ryziz package is the template, CLI package owns command logic. Bin field delegates execution to CLI directly without wrapper.

### Init Command Execution

Search for `command('init')` in CLI package to see implementation.

**Conceptual flow:**
1. **Copy template** - Framework resolves template package location and copies all files to target directory
2. **Install dependencies** - Run npm install to set up project with all required packages
3. **Clean metadata** - Remove template-specific config (bin field, etc.) from user's package.json

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

Implementation in `packages/cli/src/build.js` (`buildWeb` function)

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

Implementation in `packages/cli/src/build.js` (`buildFunctions` function)

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

### Cloud Functions

Implementation in `packages/functions/entry.js`

Framework exports separate Cloud Functions for different concerns:

**auth** - OAuth flow handler (GET /auth, GET /auth/callback)

**webhooks** - Webhook processor (POST /webhook)

**api** - Custom endpoints from src/api.*.js files

**Why separate functions** - Independent scaling. Different traffic patterns require different scaling policies and cold start optimization.

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

Combines all configuration variables and writes to `.ryziz/functions/.env`. Variables include API credentials from .toml file, secrets from Shopify CLI, and runtime URLs from tunnel.

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

Git pre-commit hook (`.husky/pre-commit`) automatically detects and bumps only packages with changes.

**How it works** - Scans staged files for each package in `packages/*`. If a package has changes (excluding package.json), runs `npm version patch` for that package only. Then syncs template dependencies for bumped packages.

**Why selective bumping** - Only changed packages get new versions. Unchanged packages maintain current version. Reduces unnecessary version churn.

**Why automatic** - Eliminates manual version management. Every change gets a version bump. No forgotten version updates.

**Why patch only** - Breaking changes (major) and features (minor) should be intentional. Patch is safe default for fixes and improvements.

### Automatic Publishing

GitHub Actions workflow (`.github/workflows/publish.yml`) auto-publishes packages when pushed to master.

**How it works** - On push to master, compares package.json versions between HEAD and HEAD~1. If version field changed, runs `npm publish` for that package.

**Why automatic** - Publishing happens at push time. Ensures all commits on master = published versions. No unpublished changes on master branch.

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

**Rule** - Each package defines its own dependencies based on responsibility.

**Templates package** - Lists all framework packages that users will receive.

**Why strict separation** - Keep package sizes small, clear responsibilities, avoid bloat.

**Where to add** - Add dependency to the package that uses it, not to parent or siblings.

### Modifying Build Pipeline

**Frontend build**:
- Modify when: Adding new page types, changing bundle format, altering route discovery
- Search for: `buildWeb`, `virtualRoutesPlugin` in CLI package

**Backend build**:
- Modify when: Adding new API route types, changing function exports, webhook handling
- Search for: `buildFunctions`, `virtualWebhooksPlugin`, `virtualApiRoutesPlugin` in CLI package

**Cloud Functions entry**:
- Modify when: Adding new Cloud Function, changing middleware, modifying auth/webhook handlers
- Search for: Exported function names `auth`, `webhooks`, `api` in functions package

**Tip** - Search by function/plugin names rather than file paths or line numbers.

### Adding New Packages

To add a new package to the monorepo:

**Create package directory:**
```bash
mkdir packages/your-package
cd packages/your-package
npm init -y
```

**Configure package.json:**
```json
{
  "name": "@ryziz-shopify/your-package",
  "version": "0.1.0",
  "license": "MIT"
}
```

**Add to template (optional):**

If users need this package, add to `templates/ryziz/package.json`:
```bash
cd templates/ryziz
npm pkg set dependencies.@ryziz-shopify/your-package="^0.1.0"
```

**Version management is automatic:**
- Pre-commit hook auto-detects all packages in `packages/*`
- Only packages with changes get version bumps
- Template dependencies auto-sync for bumped packages
- GitHub Actions auto-publishes changed packages to npm

No configuration needed in git hooks or workflows.

### Adding New Commands

To add new CLI command, follow existing command patterns in `packages/cli/index.js`.

**Structure** - Use Commander.js `.command()` API with `.action()` handler

**Task UI** - Use TaskContext from `packages/cli/src/cli.js` for consistent visual output and progress tracking

**Reference** - Study existing commands (init, dev, link, deploy) for structure and patterns. Each demonstrates different task organization (sequential, parallel, nested).

## Finding Implementation

Use search patterns to locate implementations in the codebase:

**CLI commands** - Search for `command('init')`, `command('dev')`, `command('deploy')` in CLI package

**Build pipeline** - Search for `buildWeb`, `buildFunctions` in CLI package

**Cloud Functions** - Search for exported function names `auth`, `webhooks`, `api` in functions package

**Route plugins** - Search for plugin names like `virtualRoutesPlugin`, `virtualWebhooksPlugin` in build files

**Shopify integration** - Search for `shopify` exports in functions package

**Config files** - Look for `.toml`, `.firebaserc`, `jsconfig.json` in templates directory

**Tip** - Search by function/plugin names or patterns (command names, export names) rather than file paths, as file organization may change.
