# Ryziz

Framework for building Shopify embedded apps on Firebase with file-based routing.

## For End Users

```bash
npx @ryziz-shopify/ryziz@latest init
```

See [templates/ryziz/README.md](templates/ryziz/README.md) for usage documentation.

## Monorepo Structure

**templates/ryziz/** - User project template, source of truth for package versions

**packages/** - Framework packages (cli, router, functions, etc)

## For Contributors

Read [docs/contribution-guide.md](docs/contribution-guide.md) for architecture overview and contribution workflow.

Read [docs/coding-standards.md](docs/coding-standards.md) for code patterns and conventions.

## Backlog

- [ ] Don't show console or reload status outside terminal in dev command
  - **Problem:** Dev command currently displays console logs or reload status in browser/external UI
  - **Expected:** All status messages and logs should only appear in the terminal where `ryziz dev` was run
  - **Goal:** Keep development feedback centralized in the terminal for cleaner debugging experience
- [x] ~~Refactor deploy domain files for better code organization~~ (Completed 2025-11-07)
- [ ] Create template for Shopify private apps
- [x] ~~Implement Polaris Web Components in app template~~ (Completed 2025-11-07)
- [ ] Fix Firebase emulator not stopping when dev command is interrupted
- [ ] Improve error messages when Shopify CLI commands fail
  - **Problem:** When using protected customer data webhooks without approval, error shows: `"shopify app deploy failed with code 1"` (not helpful)
  - **Root cause:** `spawnWithCallback` doesn't capture/display stdout/stderr from child process
  - **Expected:** Show actual Shopify CLI error: `"This app is not approved to subscribe to webhook topics containing protected customer data"`
  - **Solution:** Capture and display last N lines of output when spawn fails, or buffer full output for error context
- [ ] Fix Firebase deploy error handling to show authentication errors
  - **Problem:** When Firebase authentication is missing, deploy shows: `"firebase deploy --only hosting,functions failed with code 1"` (not helpful)
  - **Root cause:** `util.spawn.js` throws generic error without capturing Firebase CLI stderr
  - **Expected:** Show actual Firebase error: `"Failed to authenticate, have you run firebase login?"`
  - **Solution:** Capture stderr from spawn and include in error message, or check Firebase auth status before deployment
- [x] ~~Add support for firestore.indexes.json~~ (Completed 2025-11-07)
- [x] ~~Production deploy must always prompt for environment selection~~ (Completed 2025-11-07)

## Version Management

Automatic version bumping and publishing:
- **pre-commit hook**: Auto-increment patch version for changed packages only
- **GitHub Actions**: Auto-publish packages with version changes (master branch only)
