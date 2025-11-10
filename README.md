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

- [ ] Auto-rebuild public folder when files change in dev mode
- [ ] Keep all dev output in terminal only (no browser console/status display)
- [ ] Create template for Shopify private apps
- [ ] Fix Firebase emulator not stopping when dev command is interrupted
- [ ] Improve error messages when spawned CLI commands fail (capture and display stderr)
- [ ] Better error handling for authentication failures (Shopify and Firebase CLI)

## Version Management

Automatic version bumping and publishing:
- **pre-commit hook**: Auto-increment patch version for changed packages only
- **GitHub Actions**: Auto-publish packages with version changes (master branch only)
