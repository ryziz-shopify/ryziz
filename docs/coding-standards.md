# Coding Standards

## Principles
- Do exactly what is asked, nothing more
- No assumptions or "best practices"
- Ask when unclear

## Write only what is required
- Minimal code only
- No unnecessary abstractions
- Remove if not essential

## Same Pattern Rule
- When similar files exist, use identical patterns
- Examples: buildWeb() ↔ buildFunctions() in build.js, loadEnv() ↔ writeEnv()
- Ask user before applying pattern to other files
- Maintain consistency: structure, naming, variable placement

## Workflow
1. Plan the task
2. Review standards
3. Check for similar files (same pattern)
4. Ask for confirmation
5. Write code
6. Apply same changes to similar files (ask first)

## Naming

### Files
- Simple descriptive names without prefixes
  - Examples: cli.js, build.js, shopify.js, init.js, dev.js, deploy.js, entry.js, entry.jsx, patches.js
  - ❌ Avoid: util.shopify.js, functions.entry.js, exports.shopify.js, router.routes.jsx
  - Pattern: CLI (cli.js, build.js, init.js, dev.js, patches.js), Functions (shopify.js, entry.js), Router (entry.jsx)
- Single responsibility per file
- Flat structure for easy finding

### Functions & Exports

**Verb-First Pattern (Internal Utils):**
- Format: `verb + [qualifier] + noun` (max 2-3 words)
- Examples: `scanConfigs`, `loadEnv`, `buildWeb`, `copy`
- ❌ Avoid: `scanShopifyConfigs`, `loadEnvironment`, `buildFrontend`, `copyFileToProject`

**Naming Rules:**

1. **Remove redundant context** - File/domain context implies details
   ```js
   // ❌ Bad - redundant "Shopify" in build.js
   scanShopifyConfigs()

   // ✅ Good - "Shopify" implied by context
   scanConfigs()
   ```

2. **Drop prepositions** - Destination/source implied by parameters
   ```js
   // ❌ Bad - "To" adds no value
   saveConfigToCache(config)
   copyFileToProject(file, target)

   // ✅ Good - use parameters instead
   saveCache(config)
   copy(file, target)
   ```

3. **Simplify qualifiers** - Use shorter, common abbreviations
   ```js
   // ❌ Bad - too verbose
   loadEnvironment()
   buildFrontend()
   prepareEmulatorDataDir()

   // ✅ Good - concise and clear
   loadEnv()
   buildWeb()
   prepareDir()
   ```

4. **Max 3 parts rule** - Keep names short
   ```
   Format: verb + [qualifier] + noun
           │        │          │
           └─ action  1 word    required
                      (optional)

   ✅ Good: loadEnv, saveCache, buildWeb
   ⚠️  OK: ensureAccess (3 parts)
   ❌ Bad: prepareEmulatorDataDir (4+ parts)
   ```

**Noun Pattern (Public API & Services):**
- Use nouns for: classes, instances, services, middleware
- Examples: `CLI`, `db`, `shopify`, `withShopify`, `auth`, `api`
- Keep standard conventions: `with*` for middleware, uppercase for constants

**Convention-Based Patterns:**
- HTTP methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Constants: `TOPIC`, `CACHE_PATH` (SCREAMING_SNAKE_CASE)
- Handlers: `handle` (for webhooks, events)

### Variables
- camelCase
- Clear, concise names
- No intermediate variables if used once (use inline)

## Domain Rules
- Maximum 3 domains per package
- Use minimal domains needed

## Code Organization

### File Structure Order
Always organize files in this exact order:
1. **Imports** - All import statements
2. **Constants** - Module-level constants (const CACHE_PATH, const COMPLIANCE_TOPICS, etc.)
3. **Exports** - All export statements only (no implementation)
4. **Implementation comment** - `// Implementation` separator
5. **Implementations** - Function/constant implementations with `_` prefix

**Example:**
```js
// 1. Imports
import fs from 'fs';
import path from 'path';

// 2. Constants
const CACHE_PATH = path.join(process.cwd(), '.ryziz/cache.json');

// 3. Exports
export const connectToFirestore = _connectToFirestore;
export const db = _lazyFirestore();

// Implementation

async function _connectToFirestore(path) {
  const data = _readServiceAccount(path);
  return initializeApp(data);
}

function _lazyFirestore() {
  let _db;
  return new Proxy({}, {
    get(_target, prop) {
      if (!_db) _db = getFirestore();
      return _db[prop];
    }
  });
}

function _readServiceAccount(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
```

**Why** - Read first few lines to know exactly what the file exports. No scrolling needed.

### Export Patterns

**Standard Export Pattern:**

All exports must follow this structure:
1. **Exports at top** - All export statements together
2. **Implementation comment** - `// Implementation` separator
3. **Implementations below** - Functions/constants with `_` prefix

```js
// 1. Imports
import fs from 'fs';
import path from 'path';

// 2. Constants (if any)
const CACHE_PATH = '.ryziz/cache.json';

// 3. Exports
export const scanConfigs = _scanConfigs;
export const saveCache = _saveCache;
export const loadEnv = _loadEnv;

// Implementation

async function _scanConfigs(options = {}) {
  // ... implementation
}

function _saveCache(configPath) {
  // ... implementation
}

function _loadEnv(configPath) {
  // ... implementation
}
```

**Exceptions (keep as-is):**
- `export default` - React components, pages
  ```jsx
  export default function HomePage() { ... }
  ```
- `export { ... } from '...'` - Re-exports from other modules
  ```js
  export { useNavigate, Link } from 'react-router-dom';
  ```
- `export const metadata = { ... }` - Static metadata objects
  ```js
  export const metadata = { title: 'Home', description: '...' };
  ```
- `export const TOPIC = 'STRING'` - String/simple constants
  ```js
  export const TOPIC = 'CUSTOMERS_DATA_REQUEST';
  ```

**For lazy initialization or complex setup:**
- ❌ Don't: `let _db; export const db = new Proxy(...)`
- ✅ Do: `export const db = _lazyFirestore();` then define `function _lazyFirestore()` below

**Reason** - Read file top to see all exports. Implementation details stay below separator.

## Source of Trust
- Main entry point (index.js) handles validation and errors
- Utility functions stay pure, return data only
- Don't throw errors in utilities
- One source of trust principle

## README Structure
- Use tree format with ├──, │, └── symbols
- Annotations use ← symbol
- Explain WHY (purpose) not WHAT (description)
- Annotate key files only
- Consistent spacing after arrows (align annotations)

## Task Patterns
**Title structure:**
- Parent: Noun (Dev, Build, Deploy)
- Subtasks: Verb + object (Watch frontend, Bundle pages)
- Final parent: Past tense (Dev started, Build completed)

**Pattern:**
```js
createTask('Dev', (task) => {
  return sequential(task, [
    createTask('Watch frontend', async () => {
      await buildFrontend({ watch: true });
    }),
    createTask('Done', () => {
      task.title = 'Dev started';
      task.output = 'Watching: src/';
    })
  ]);
}, {
  rendererOptions: {
    outputBar: Infinity,
    persistentOutput: true
  }
});
```

## .gitignore Rules
- No comments, no blank lines (minimal)
- Folders first (with trailing slash), then files
- Sort alphabetically within each group

**Example:**
```gitignore
.firebase/
.ryziz/
.shopify/
node_modules/
.DS_Store
*.log
```
