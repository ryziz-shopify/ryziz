# ryziz

## Structure

```
ryziz/
├── .gitignore                        ← Ignore node_modules for clean repo
├── README.md                         ← Project documentation
├── package.json                      ← Enable monorepo workspace
├── package-lock.json                 ← Lock versions for reproducible builds
├── docs/
│   └── coding-standards.md           ← Enforce consistency across codebase
└── packages/
    ├── cli/                          ← @ryziz-shopify/cli
    │   ├── index.js                  ← CLI entry point for bin command
    │   ├── package.json              ← Declare build dependencies
    │   └── src/
    │       ├── build.frontend.js     ← Bundle pages with esbuild
    │       ├── build.backend.js      ← Bundle API routes with esbuild
    │       ├── util.task.js          ← Generic task utilities for all commands
    │       └── util.spawn.js         ← Spawn processes for emulators
    │
    ├── router/                       ← @ryziz-shopify/router
    │   ├── package.json              ← Declare runtime dependencies
    │   └── src/
    │       ├── router.routes.jsx     ← Mount app to DOM and setup routing
    │       └── router.exports.js     ← Expose router utilities to users
    │
    ├── functions/                    ← @ryziz-shopify/functions
    │   ├── firebase.json             ← Configure emulators and hosting
    │   ├── package.json              ← Declare Firebase dependencies
    │   └── src/
    │       └── functions.entry.js    ← Setup Express app for Cloud Functions
    │
    └── ryziz/                        ← @ryziz-shopify/ryziz (test project)
        ├── .firebaserc               ← Firebase project config
        ├── .gitignore                ← Ignore build output
        ├── package.json              ← Link to CLI and router packages
        ├── public/
        │   └── index.html            ← HTML template for bundle
        └── src/
            ├── page.index.jsx        ← Frontend page example
            └── api.index.js          ← Backend API example
```
