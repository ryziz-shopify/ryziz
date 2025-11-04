/**
 * Runtime module patcher using Node.js ESM loader hooks
 * Applies patches to firebase-tools and listr2 without modifying node_modules
 */

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

function patchFirebaseTools(source) {
  // Remove dotfile ignore pattern to allow watching .env files
  // Before: /(^|[\/\\])\../,
  // After:  (removed)
  return replaceAll(source, '/(^|[\\/\\\\])\\../, ', '');
}

function patchListr2(source) {
  const newMethod = `
	// CUSTOM: Helper to recursively check for failed subtasks (including nested)
	hasAnyNestedFailedSubtasks(task) {
		if (!task.hasSubtasks()) return false;
		for (const subtask of task.subtasks) {
			if (subtask.hasFailed()) return true;
			if (this.hasAnyNestedFailedSubtasks(subtask)) return true;
		}
		return false;
	}
	`;

  // Insert method before style()
  let result = replaceAll(
    source,
    'style(task, output = false) {',
    newMethod + 'style(task, output = false) {'
  );

  // Replace shallow check with deep check
  result = replaceAll(
    result,
    'task.subtasks.some((subtask) => subtask.hasFailed())',
    'this.hasAnyNestedFailedSubtasks(task)'
  );

  return result;
}

function replaceAll(source, find, replace) {
  return source.split(find).join(replace);
}
