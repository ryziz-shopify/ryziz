// Runtime module patching via Node.js hooks + CommonJS monkey-patch
// Patches applied:
// - firebase-tools: enable dot folder watching
// - listr2: nested task failure detection
// - shopify/cli: simplified success messages

import Module from 'module';
import fs from 'fs';
import path from 'path';

export const patches = {
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

// CommonJS hook: intercept require() calls
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  const filename = Module._resolveFilename(request, parent, isMain);
  const modulePatches = findPatches(filename);

  if (modulePatches && !Module._cache[filename]) {
    try {
      let source = fs.readFileSync(filename, 'utf-8');
      source = applyPatches(source, modulePatches);

      if (source.length < fs.statSync(filename).size) {
        const module = new Module(filename, parent);
        module.filename = filename;
        module.paths = Module._nodeModulePaths(path.dirname(filename));
        Module._cache[filename] = module;
        module._compile(source, filename);
        return module.exports;
      }
    } catch (e) {}
  }

  return originalLoad.apply(this, arguments);
};

// ESM hook: intercept import statements
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  const modulePatches = findPatches(url);

  if (modulePatches && result.source) {
    const source = getSource(result);
    return {
      ...result,
      source: Buffer.from(applyPatches(source, modulePatches), 'utf-8')
    };
  }

  return result;
}

function applyPatches(source, replacements) {
  let result = source;
  for (const { find, replaceWith } of replacements) {
    result = result.replaceAll(find, replaceWith);
  }
  return result;
}

function findPatches(url) {
  for (const [pattern, patternPatches] of Object.entries(patches)) {
    if (url.includes(pattern)) return patternPatches;
  }
  return null;
}

function getSource(result) {
  if (Buffer.isBuffer(result.source)) return result.source.toString('utf-8');
  if (typeof result.source === 'string') return result.source;
  return new TextDecoder().decode(result.source);
}
