# 🚀 Quick Style Reference

## 📌 The Golden Rule
> **"Code đơn giản là code tốt nhất"**
> *Simple code is the best code*

---

## ⚡ Quick Patterns

### Function Template
```javascript
/**
 * What it does
 */
async function functionName(params) {
  // Step 1: Initialize
  const config = setup();

  try {
    // Step 2: Main logic
    await doWork();

    // Step 3: Success
    return result;
  } catch (error) {
    // Single error handler
    handleError(error);
  }
}
```

### Command Template
```javascript
export async function commandName(options = {}) {
  // Initialize
  const config = setupConfig();

  try {
    // Linear steps
    await step1();
    await step2();
    await step3();

    console.log(chalk.green('✅ Success!'));
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}
```

### Build Pipeline
```javascript
const buildSteps = [
  { message: 'Step 1...', action: () => doStep1() },
  { message: 'Step 2...', action: () => doStep2(), optional: true }
];

for (const step of buildSteps) {
  console.log(step.message);
  try {
    await step.action();
    console.log('✓ Done');
  } catch (error) {
    console.error('✗', error.message);
    if (!step.optional) throw error;
  }
}
```

### Process Cleanup
```javascript
let process1 = null;
let process2 = null;

const shutdown = () => {
  logger.log(chalk.yellow('Stopping...'));
  if (process1) process1.kill();
  if (process2) process2.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

---

## 📏 Rules at a Glance

| Rule | ✅ Do | ❌ Don't |
|------|-------|----------|
| **Functions** | < 50 lines | > 100 lines |
| **Nesting** | Max 2 levels | Deep nesting |
| **Names** | `cloudflareResult` | `result2` |
| **Comments** | `// Step 1: Load config` | `// load` |
| **Errors** | One try-catch at top | Multiple try-catch |
| **Flow** | Linear top-to-bottom | Jump around |

---

## 🎯 Before You Commit

```bash
✓ Can a junior dev understand this?
✓ Is it under 50 lines per function?
✓ Are names self-explanatory?
✓ Is the flow linear?
✓ Could it be simpler?
```

---

## 💡 Remember

- **Write for humans, not computers**
- **Clarity > Cleverness**
- **Less code = Less bugs**
- **If you need to explain it, simplify it**

> *"Make it work, make it right, make it simple."*