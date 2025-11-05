// Runtime module patching via Node.js hooks
// Patches applied:
// - firebase-tools: enable dot folder watching
// - listr2: nested task failure detection
// - shopify/cli: simplified success messages

const patches = {
  'firebase-tools/lib/emulator/functionsEmulator.js': [
    { find: '/(^|[\\/\\\\])\\\\.../,', replaceWith: '' }
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

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);

  const modulePatches = findPatches(url);
  if (!modulePatches || !result.source) return result;

  let source = getSource(result);
  source = replaceAll(source, modulePatches);

  return {
    ...result,
    source: Buffer.from(source, 'utf-8')
  };
}

export function replaceAll(source, replacements) {
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
  if (Buffer.isBuffer(result.source)) {
    return result.source.toString('utf-8');
  }
  if (typeof result.source === 'string') {
    return result.source;
  }
  return new TextDecoder().decode(result.source);
}
