// Modify dependency behavior at runtime to avoid maintaining forked packages
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);

  if (!result.source || typeof result.source === 'string' && !url.endsWith('.js')) {
    return result;
  }

  const source = result.source.toString();
  let patched = source;

  if (url.includes('firebase-tools') && url.includes('functionsEmulator.js')) {
    patched = patchFirebaseTools(source);
  } else if (url.includes('listr2') && url.includes('dist/index.js')) {
    patched = patchListr2(source);
  } else if (url.includes('@shopify/cli') && url.includes('dist/index.js')) {
    patched = patchShopifyCli(source);
  }

  if (patched !== source) {
    return {
      ...result,
      source: patched,
      shortCircuit: true
    };
  }

  return result;
}

// Patch: to enable watching files in .ryziz folder
function patchFirebaseTools(source) {
  return replaceAll(source, '/(^|[\\/\\\\])\\../, ', '');
}

// Patch: to show task errors without collapsing
function patchListr2(source) {
  let result = replaceAll(
    source,
    'style(task, output = false) {',
    `
	// Detect failures in deeply nested task hierarchies
	hasAnyNestedFailedSubtasks(task) {
		if (!task.hasSubtasks()) return false;
		for (const subtask of task.subtasks) {
			if (subtask.hasFailed()) return true;
			if (this.hasAnyNestedFailedSubtasks(subtask)) return true;
		}
		return false;
	}
	` + 'style(task, output = false) {'
  );

  result = replaceAll(
    result,
    'task.subtasks.some((subtask) => subtask.hasFailed())',
    'this.hasAnyNestedFailedSubtasks(task)'
  );

  return result;
}

// Patch: to show clean message with dev/deploy commands
function patchShopifyCli(source) {
  let result = source;

  result = replaceAll(
    result,
    'headline: `${configFileName} is now linked to "${appName}" on Shopify`',
    'headline: `Linked successfully to "${appName}"`'
  );

  result = replaceAll(
    result,
    'body: `Using ${configFileName} as your default config.`,',
    ''
  );

  result = replaceAll(
    result,
    `nextSteps: [
      [\`Make updates to \${configFileName} in your local project\`],
      [
        "To upload your config, run",
        {
          command: formatPackageManagerCommand(packageManager, "shopify app deploy")
        }
      ]
    ]`,
    `nextSteps: [
      [\`Edit \${configFileName} locally\`],
      [
        "Run to start development",
        {
          command: formatPackageManagerCommand(packageManager, "dev")
        }
      ],
      [
        "Run to deploy",
        {
          command: formatPackageManagerCommand(packageManager, "deploy")
        }
      ]
    ]`
  );

  result = replaceAll(
    result,
    `,
    reference: [
      {
        link: {
          label: "App configuration",
          url: "https://shopify.dev/docs/apps/tools/cli/configuration"
        }
      }
    ]`,
    ''
  );

  return result;
}

function replaceAll(source, find, replace) {
  return source.split(find).join(replace);
}
