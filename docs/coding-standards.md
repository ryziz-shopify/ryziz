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
- Examples: buildBackend() ↔ buildFrontend() in build.js
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
- Files: Simple descriptive names without prefixes
  - Examples: cli.js, build.js, shopify.js, init.js, dev.js, deploy.js, entry.js, entry.jsx
  - ❌ Avoid: util.shopify.js, functions.entry.js, exports.shopify.js, router.routes.jsx
  - Pattern: CLI (cli.js, build.js, init.js, dev.js), Functions (shopify.js, entry.js), Router (shopify.js, entry.jsx)
- Single responsibility per file
- Flat structure for easy finding
- Variables: camelCase
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
3. **Exports** - All export statements (functions, classes, or variables)
4. **Private helpers** - Non-exported helper functions

**Example:**
```js
// 1. Imports
import fs from 'fs';
import path from 'path';

// 2. Constants
const CACHE_PATH = path.join(process.cwd(), '.ryziz/cache.json');

// 3. Exports
export async function connectToFirestore(path) {
  const data = await readServiceAccount(path);
  return initializeApp(data);
}

export const db = lazyFirestore();

// 4. Private helpers
function readServiceAccount(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function lazyFirestore() {
  let _db;
  return new Proxy({}, {
    get(_target, prop) {
      if (!_db) _db = getFirestore();
      return _db[prop];
    }
  });
}
```

**Why** - Read first few lines to know exactly what the file exports. No scrolling needed.

### Export Patterns
**For lazy initialization or complex setup:**
- ❌ Don't: `let _db; export const db = new Proxy(...)`
- ✅ Do: `export const db = lazyFirestore();` then define `function lazyFirestore()` below

**Reason** - Exports stay at top, implementation details in helper functions below

### Function Organization
- Main/exported functions at top
- Helper functions below in order of usage
- Hoisting style for readability

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
