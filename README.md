# Ryziz

Framework for building Shopify embedded apps on Firebase with file-based routing.

## For End Users

```bash
npx @ryziz-shopify/ryziz@latest init
```

See [templates/ryziz/README.md](templates/ryziz/README.md) for usage documentation.

## Monorepo Structure

**templates/ryziz/** - User project template, source of truth for package versions

**packages/cli/** - Build tools and CLI commands (init, dev, link)

**packages/router/** - Frontend routing and Shopify App Bridge exports

**packages/functions/** - Firebase Cloud Functions with OAuth and webhook handling

## For Contributors

Read [docs/contribution-guide.md](docs/contribution-guide.md) for architecture overview and contribution workflow.

Read [docs/coding-standards.md](docs/coding-standards.md) for code patterns and conventions.

## Version Management

Automatic version bumping and publishing handled by git hooks:
- **pre-commit**: Auto-increment patch version for changed packages
- **pre-push**: Auto-publish packages with version changes (master branch only)
