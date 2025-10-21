# 📖 Ryziz Coding Style Guide

> **"Write code as if it's a story - clear beginning, simple middle, graceful end."**
>
> *"Viết code như kể chuyện - mở đầu rõ ràng, diễn biến đơn giản, kết thúc nhẹ nhàng."*

---

## 🎯 Core Philosophy

### The Minimal Principle
**Less code, more clarity.** Every line should have a purpose. If you can't explain why a line exists in 5 seconds, it probably shouldn't be there.

### The Story Principle
Code should read like a story from top to bottom. No jumping around, no complex inheritance, just a clear narrative flow.

---

## 📐 Architecture Patterns

### 1. **Linear Flow Pattern**
Code executes from top to bottom with clear steps.

```javascript
// ✅ GOOD: Clear step-by-step progression
export async function devCommand(options = {}) {
  // Step 1: Initialize configuration
  const projectDir = process.cwd();
  const logger = createLogger(...);

  // Step 2: Load configuration
  const config = await loadConfiguration();

  // Step 3: Build project
  await runBuildPipeline();

  // Step 4: Start services
  await startServices();
}
```

```javascript
// ❌ BAD: Jumping around with nested callbacks
export async function devCommand(options = {}) {
  const logger = createLogger(...);

  loadConfiguration().then(config => {
    runBuildPipeline().then(() => {
      startServices().catch(err => {
        // Error handling scattered
      });
    });
  });
}
```

### 2. **Single Responsibility Functions**
Each function does ONE thing well.

```javascript
// ✅ GOOD: Focused functions
async function getProjectId(configPath) {
  if (fs.existsSync(configPath)) {
    const config = await fs.readJson(configPath);
    if (config.projectId) return config.projectId;
  }

  const { projectId } = await inquirer.prompt([...]);
  await fs.writeJson(configPath, { projectId });
  return projectId;
}
```

```javascript
// ❌ BAD: Function doing too many things
async function setupAndDeployProject(options) {
  // Loading config
  // Building project
  // Setting up environment
  // Deploying
  // Handling errors
  // ... 200 lines later
}
```

### 3. **Unified Error Handling**
Handle errors at the top level, keep the happy path clean.

```javascript
// ✅ GOOD: Clean try-catch at top level
export async function initCommand() {
  const spinner = ora();

  try {
    // Happy path - all the main logic
    await validateDirectory();
    await copyTemplate();
    await installDependencies();

    console.log(chalk.green('✅ Success!'));
  } catch (error) {
    // Single place for error handling
    spinner.fail('Failed');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}
```

---

## 🎨 Code Style Rules

### 1. **Comment Style**

```javascript
// ✅ GOOD: Descriptive step comments
// Step 1: Load Shopify configuration
const config = await loadConfiguration();

// Step 2: Build production bundles
await runProductionBuild();
```

```javascript
// ❌ BAD: Redundant or cryptic comments
// Load config
const c = await lc(); // load configuration

// Do the thing
await build(); // builds
```

### 2. **Variable Naming**

```javascript
// ✅ GOOD: Descriptive names
const projectDir = process.cwd();
const tunnelProcess = result.process;
const cloudflareResult = await startCloudflare();

// ❌ BAD: Ambiguous names
const dir = process.cwd();
const p = result.process;
const result2 = await startCloudflare();
```

### 3. **Process Management**

```javascript
// ✅ GOOD: Simple, grouped process tracking
// Track child processes for cleanup
let tunnelProcess = null;
let emulators = null;
let watcher = null;

// Graceful shutdown handler
const shutdown = () => {
  logger.log(chalk.yellow('\n⏹  Stopping...'));
  if (tunnelProcess) tunnelProcess.kill();
  if (emulators) emulators.kill();
  if (watcher) watcher.close();
  logger.close();
  process.exit(0);
};
```

### 4. **Build Pipeline Pattern**

```javascript
// ✅ GOOD: Declarative build steps
const buildSteps = [
  {
    message: 'Generating Firebase configuration...',
    action: () => copyTemplateFiles({...}),
    optional: false
  },
  {
    message: 'Building client bundles...',
    action: () => buildClientBundles(ryzizDir),
    optional: true  // Can fail without stopping
  }
];

for (const step of buildSteps) {
  spinner.start(step.message);
  try {
    await step.action();
    spinner.succeed();
  } catch (error) {
    spinner.fail(error.message);
    if (!step.optional) throw error;
  }
}
```

---

## 📂 File Structure

### Command Files Structure
Each command file follows this template:

```javascript
import { dependencies } from '...';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Command description
 * What it does and why
 */
export async function commandName(options = {}) {
  // Initialize configuration
  const config = setupConfig();

  // Track resources (if needed)
  let resource1 = null;
  let resource2 = null;

  // Cleanup handler (if needed)
  const cleanup = () => { /* ... */ };

  try {
    // Step 1: First action
    await doFirstThing();

    // Step 2: Second action
    await doSecondThing();

    // Success message
    console.log(chalk.green('✅ Success!'));

  } catch (error) {
    // Error handling
    console.error(chalk.red(error.message));
    cleanup();
    process.exit(1);
  }
}
```

---

## 📊 Real Examples from Our Codebase

### Example 1: Clean Initialization (`init.js`)
```javascript
export async function initCommand() {
  const spinner = ora();
  const projectDir = process.cwd();
  const projectName = path.basename(projectDir);
  const templatesDir = path.join(__dirname, '../../templates/project');

  try {
    console.log(chalk.bold('\n🚀 Initializing Ryziz project...\n'));

    // Step 1: Ensure directory is empty
    spinner.start('Validating directory...');
    await validateDirectory({ projectDir });
    spinner.succeed('Directory validated');

    // Step 2: Copy project template
    spinner.start('Copying template files...');
    await copyProjectTemplate({ projectDir, templatesDir, projectName });
    spinner.succeed('Template files copied');

    // ... more steps
  } catch (error) {
    spinner.fail('Failed to initialize project');
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}
```

### Example 2: Helper Function Extraction (`deploy.js`)
```javascript
/**
 * Get Firebase project ID from config or prompt user
 */
async function getProjectId(configPath, ryzizDir) {
  // Try to load from saved config
  if (fs.existsSync(configPath)) {
    const config = await fs.readJson(configPath);
    if (config.projectId) return config.projectId;
  }

  // Prompt user for project ID
  const { projectId } = await inquirer.prompt([{
    type: 'input',
    name: 'projectId',
    message: 'Enter your Firebase project ID:',
    validate: input => input.length > 0 || 'Project ID is required'
  }]);

  // Save for future deployments
  await fs.ensureDir(ryzizDir);
  await fs.writeJson(configPath, { projectId }, { spaces: 2 });

  return projectId;
}
```

### Example 3: File Watcher with Unified Handler (`dev.js`)
```javascript
// Handle file changes with automatic rebuilding
const rebuild = async (event, filePath) => {
  const icons = { change: '♻️', add: '➕', unlink: '➖' };
  logger.log(chalk.cyan(`\n${icons[event]} ${filePath} ${event}ing...`));

  try {
    if (event !== 'unlink') {
      // Copy modified/new file and trigger rebuild
      const src = path.join(srcRoutesDir, filePath);
      const dest = path.join(ryzizDir, 'functions/src/routes', filePath);
      await fs.copy(src, dest);
      await buildJSX({ ryzizDir, logger });
      await buildClientBundles(ryzizDir);
    } else {
      // Clean up removed files
      const jsxFile = path.join(ryzizDir, 'functions/src/routes', filePath);
      const jsFile = jsxFile.replace(/\.jsx$/, '.js');
      await fs.remove(jsxFile);
      await fs.remove(jsFile);
    }
    logger.log(chalk.green('✅ Done\n'));
  } catch (error) {
    logger.log(chalk.red(`❌ Failed: ${error.message}\n`));
  }
};

// Register all events with the same handler
watcher.on('change', (file) => rebuild('change', file));
watcher.on('add', (file) => rebuild('add', file));
watcher.on('unlink', (file) => rebuild('unlink', file));
```

---

## 🚫 Anti-Patterns to Avoid

### 1. **God Functions**
```javascript
// ❌ BAD: 274-line function doing everything
export async function devCommand(options = {}) {
  // ... 274 lines of mixed concerns
}
```

### 2. **Scattered Error Handling**
```javascript
// ❌ BAD: Try-catch blocks everywhere
try {
  await step1();
} catch (e) { /* handle */ }

try {
  await step2();
} catch (e) { /* handle */ }

try {
  await step3();
} catch (e) { /* handle */ }
```

### 3. **Duplicate Code**
```javascript
// ❌ BAD: Copy-pasted handlers
watcher.on('change', async (file) => {
  logger.log(chalk.cyan(`File changed...`));
  try {
    // 20 lines of code
  } catch (error) {
    // error handling
  }
});

watcher.on('add', async (file) => {
  logger.log(chalk.cyan(`File added...`));
  try {
    // Same 20 lines of code
  } catch (error) {
    // same error handling
  }
});
```

### 4. **Complex Nested Callbacks**
```javascript
// ❌ BAD: Callback hell
startServer(() => {
  loadConfig((config) => {
    buildProject(() => {
      deployProject(() => {
        console.log('Done');
      });
    });
  });
});
```

---

## ✅ Checklist for Clean Code

Before committing, ask yourself:

- [ ] Can someone understand this code in 30 seconds?
- [ ] Is the main function under 50 lines?
- [ ] Are helper functions under 20 lines?
- [ ] Is there a clear, linear flow?
- [ ] Are variable names self-documenting?
- [ ] Is error handling centralized?
- [ ] Are comments explaining "why" not "what"?
- [ ] Would a junior developer understand this?
- [ ] Is there any duplicate code?
- [ ] Could this be simpler?

---

## 📚 Summary

> **Remember:** The best code is not the cleverest code, but the clearest code. Write for humans first, computers second.

### Key Metrics for Our Codebase:
- **Maximum function length:** 50 lines (prefer under 30)
- **Maximum file length:** 200 lines (prefer under 150)
- **Maximum nesting depth:** 2 levels
- **Naming:** Full words, no abbreviations
- **Comments:** Explain intentions, not implementations

### The Final Word
If you're writing complex code to show off your skills, you're doing it wrong. The real skill is making complex things simple.

---

*"Simplicity is the ultimate sophistication."* - Leonardo da Vinci

*"Code đơn giản là code tốt nhất. Nếu bạn phải giải thích, nghĩa là nó chưa đủ đơn giản."*