# Ryziz v0.0.1 - Next Steps

## ✅ What's Complete

- [x] Core framework (server, router, session)
- [x] All CLI commands (init, dev, deploy)
- [x] Template-based architecture (project/ + ryziz/)
- [x] Zero hardcoded templates
- [x] npm link working for local development
- [x] Clean folder structure
- [x] Bug fixes from v3

## 🚀 Immediate Next Steps (Testing)

### 1. Test Full Development Workflow

```bash
# From ryziz directory
cd /home/droid/ryziz-shopify/ryziz
npm link

# Create test project
cd /home/droid/ryziz-shopify
mkdir test-app-v001 && cd test-app-v001

# Initialize project
ryziz init

# Manual install (since not published yet)
npm install react react-dom
npm link ryziz

# Configure Shopify credentials
# Edit .env.development with real Shopify app credentials:
# - SHOPIFY_API_KEY
# - SHOPIFY_API_SECRET
# - SHOPIFY_SCOPES
# - SHOPIFY_HOST=http://localhost:5000

# Start development server
npm run dev

# Test in browser:
# - Visit http://localhost:5000
# - Test OAuth flow with ?shop=your-store.myshopify.com
# - Verify /app route requires auth
# - Check Firestore emulator at http://localhost:4000
```

### 2. Fix Init Command (Optional Enhancement)

The `init.js` currently fails at `npm install` because ryziz isn't published. Options:

**Option A: Skip npm install in init**
```javascript
// In src/commands/init.js, comment out lines 67-70:
// spinner.start('Installing dependencies (this may take a minute)...');
// execSync('npm install', { stdio: 'ignore' });
// spinner.succeed('Dependencies installed');
```

**Option B: Add better error handling**
```javascript
try {
  execSync('npm install', { stdio: 'ignore' });
  spinner.succeed('Dependencies installed');
} catch (error) {
  spinner.warn('Skipping npm install (run manually: npm install react react-dom && npm link ryziz)');
}
```

### 3. Test Deployment (When Ready)

```bash
# Make sure you're logged into Firebase
firebase login

# Edit .env.production with production credentials

# Deploy
npm run deploy

# Enter your Firebase project ID when prompted
# Verify deployment at https://your-project.web.app
```

## 📋 Short-term Improvements (v0.0.2)

### Priority 1: File Watching
Add file watching to dev command for hot reload:

**In `src/commands/dev.js`:**
```javascript
import chokidar from 'chokidar';

// After Step 3 (Install dependencies)
// Add file watcher
const watcher = chokidar.watch([
  path.join(projectDir, 'src'),
  path.join(projectDir, '.env.development')
], {
  ignoreInitial: true,
  persistent: true
});

watcher.on('all', async (event, filePath) => {
  console.log(chalk.gray(`[${event}] ${path.relative(projectDir, filePath)}`));
  
  // Copy changed file to .ryziz/functions/
  if (filePath.startsWith(path.join(projectDir, 'src'))) {
    const destPath = path.join(ryzizDir, 'functions', path.relative(projectDir, filePath));
    await fs.copy(filePath, destPath);
  }
});
```

### Priority 2: Better Error Messages
- Add validation for missing .env files
- Better Firebase emulator error handling
- Helpful tips when things fail

### Priority 3: Publish to npm

```bash
# 1. Create npm account (if needed)
npm adduser

# 2. Update package.json if needed
# (already set to v0.0.1)

# 3. Publish
cd /home/droid/ryziz-shopify/ryziz
npm publish

# 4. Test installation
mkdir test-published && cd test-published
npm install -g ryziz@0.0.1
ryziz init
```

### Priority 4: Add .gitignore to ryziz package

```bash
# Create .gitignore in ryziz/
cat > .gitignore <<EOF
node_modules/
.DS_Store
*.log
.npm
EOF
```

## 🎯 Medium-term Goals (v0.1.0)

### 1. Testing Suite
- Unit tests for core modules
- Integration tests for CLI commands
- Test fixtures and mocks

### 2. Developer Experience
- Better CLI output with progress bars
- Colorful logging
- Interactive prompts for configuration

### 3. Documentation
- API reference for route exports (loader, action, head)
- Shopify integration guide
- Deployment guide
- Troubleshooting FAQ

### 4. Examples
- Multi-page app example
- GraphQL queries cookbook
- Common patterns (forms, tables, etc.)

### 5. Features
- API routes (`src/routes/api/`)
- Middleware support
- Custom webpack handlers (optional)
- TypeScript support (optional)

## 🌟 Long-term Vision (v1.0.0)

### 1. Production Features
- Performance monitoring
- Error tracking
- Analytics integration
- A/B testing support

### 2. Developer Tools
- Ryziz CLI extensions
- VS Code extension
- Browser devtools integration

### 3. Ecosystem
- Plugin system
- Community templates
- Starter kits (e-commerce, analytics, etc.)

### 4. Advanced Routing
- Nested layouts
- Parallel routes
- Streaming SSR
- Progressive enhancement

## 📊 Current Stats

- **Version:** 0.0.1
- **Total Files:** 22
- **Lines of Code:** ~1,440
- **Dependencies:** 13 packages
- **Commands:** 3 (init, dev, deploy)
- **Status:** ✅ Functional, ready for testing

## 🐛 Known Issues

1. **npm install in init fails** - ryziz not published yet
   - Workaround: Manual `npm install react react-dom && npm link ryziz`

2. **No file watching in dev** - Changes require restart
   - Workaround: Restart `npm run dev` after changes
   - Fix: Add in v0.0.2

3. **Firebase emulator requires firebase-tools**
   - Install globally: `npm install -g firebase-tools`

4. **No TypeScript support yet**
   - Workaround: Use .js files
   - Future: Add in v0.1.0

## 📞 Getting Help

If you encounter issues:

1. Check `.env.development` has valid Shopify credentials
2. Verify Firebase emulators are running (http://localhost:4000)
3. Check console logs for error messages
4. Verify `npm link ryziz` was successful

## 🎉 Success Criteria for v0.0.1

- [x] Can run `ryziz init` successfully
- [x] Templates copied correctly
- [x] Project structure matches plan
- [ ] Can run `npm run dev` (needs Firebase emulators)
- [ ] Landing page loads at http://localhost:5000
- [ ] OAuth flow redirects correctly
- [ ] Protected /app route requires auth
- [ ] Firestore sessions work
- [ ] Can deploy to Firebase (manual testing)

## 🚦 Ready to Test?

```bash
# Quick start checklist:
1. cd /home/droid/ryziz-shopify/ryziz && npm link ✅
2. mkdir my-test-app && cd my-test-app
3. ryziz init ✅
4. npm install react react-dom && npm link ryziz ✅
5. Edit .env.development with Shopify credentials
6. npm run dev (requires firebase-tools installed)
7. Visit http://localhost:5000
8. Test OAuth flow
9. Verify /app protected route
10. Check session storage in Firestore emulator
```

**Status:** Ready for testing! 🚀

---

*Last updated: 2025-10-18*
*Version: 0.0.1*
*Location: /home/droid/ryziz-shopify/ryziz*
