import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const patches = {
  'firebase-tools/lib/emulator/functionsEmulator.js': [
    { find: '/(^|[\\/\\\\])\\../,', replaceWith: '' }
  ],

  'listr2/dist/index.js': [
    {
      find: 'class DefaultRenderer {',
      replaceWith: 'class DefaultRenderer { hasAnyNestedFailedSubtasks(task) { if (!task.hasSubtasks()) return false; for (const subtask of task.subtasks) { if (subtask.hasFailed()) return true; if (this.hasAnyNestedFailedSubtasks(subtask)) return true; } return false; }'
    },
    {
      find: 'task.isCompleted() && task.subtasks.some((subtask) => subtask.hasFailed())',
      replaceWith: 'task.isCompleted() && this.hasAnyNestedFailedSubtasks(task)'
    },
    {
      find: 'task.subtasks.some((subtask) => subtask.hasFailed()) || task.subtasks.some((subtask) => subtask.hasRolledBack())',
      replaceWith: 'this.hasAnyNestedFailedSubtasks(task) || task.subtasks.some((subtask) => subtask.hasRolledBack())'
    }
  ],

  '@shopify/cli/dist/index.js': [
    {
      find: 'headline: `${configFileName} is now linked to "${appName}" on Shopify`',
      replaceWith: 'headline: `Linked successfully to "${appName}"`'
    },
    {
      find: 'body: `Using ${configFileName} as your default config.`,',
      replaceWith: ''
    },
    {
      find: '`Make updates to ${configFileName} in your local project`',
      replaceWith: '`Edit ${configFileName} locally`'
    },
    {
      find: '"To upload your config, run"',
      replaceWith: '"Run to start development"'
    },
    {
      find: 'formatPackageManagerCommand(packageManager, "shopify app deploy")',
      replaceWith: 'formatPackageManagerCommand(packageManager, "dev")'
    },
    {
      find: `reference: [
              {
                link: {
                  label: "App configuration",
                  url: "https://shopify.dev/docs/apps/tools/cli/configuration"
                }
              }
            ]`,
      replaceWith: ''
    }
  ]
};

// Main execution - apply patches on import
const nodeModulesPath = findNodeModules();

if (nodeModulesPath) {
  for (const [relativePath, patchList] of Object.entries(patches)) {
    const filePath = path.join(nodeModulesPath, relativePath);

    if (!fs.existsSync(filePath)) continue;
    if (fs.existsSync(filePath + '.ryziz-patched')) continue;

    const originalContent = fs.readFileSync(filePath, 'utf-8');

    let patchedContent = originalContent;
    for (const { find, replaceWith } of patchList) {
      patchedContent = patchedContent.replaceAll(find, replaceWith);
    }

    fs.writeFileSync(filePath, patchedContent, 'utf-8');
    fs.writeFileSync(filePath + '.ryziz-patched', `Patched by Ryziz at ${new Date().toISOString()}\n`);
  }
}

// Helpers
function findNodeModules() {
  let dir = __dirname;
  while (dir !== path.parse(dir).root) {
    const nodeModulesPath = path.join(dir, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) return nodeModulesPath;
    dir = path.dirname(dir);
  }
  return null;
}
