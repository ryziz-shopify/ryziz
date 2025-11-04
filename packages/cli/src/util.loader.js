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
	// Detect failures in deeply nested task hierarchies
	hasAnyNestedFailedSubtasks(task) {
		if (!task.hasSubtasks()) return false;
		for (const subtask of task.subtasks) {
			if (subtask.hasFailed()) return true;
			if (this.hasAnyNestedFailedSubtasks(subtask)) return true;
		}
		return false;
	}
	`;

  let result = replaceAll(
    source,
    'style(task, output = false) {',
    newMethod + 'style(task, output = false) {'
  );

  // Enable nested subtask failure detection
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
