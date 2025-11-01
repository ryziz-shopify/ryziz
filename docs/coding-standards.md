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
- Examples: build.backend.js ↔ build.frontend.js
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
- Files: domain.action.js (frontend.build.js, api.handler.js)
- Single responsibility per file
- Flat structure for easy finding
- Variables: camelCase
- Clear, concise names
- No intermediate variables if used once (use inline)

## Domain Rules
- Maximum 3 domains per package
- Use minimal domains needed

## Code Organization
- Main function at top
- Helper functions below
- Hoisting style for readability

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
