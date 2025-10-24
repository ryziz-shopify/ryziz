/**
 * Listr helpers for creating tasks with automatic console interception
 * Allows step functions to use console.log normally while Listr captures output
 */

// Store original console methods before any patching
const ORIGINAL_CONSOLE = {
  log: console.log,
  error: console.error
};

/**
 * Synchronous delay using Atomics.wait
 * Note: May not work in main thread - fallback to no delay if fails
 */
function syncDelay(ms) {
  try {
    const buffer = new SharedArrayBuffer(4);
    const view = new Int32Array(buffer);
    Atomics.wait(view, 0, 0, ms);
  } catch {
    // Fallback: Atomics.wait not available in main thread
  }
}

/**
 * Create a Listr task with automatic console interception
 * Step functions work with console.log, output is captured by Listr automatically
 */
export function createTask(title, taskFn, options = {}) {
  const { rendererOptions = {}, ...listrOptions } = options;

  return {
    ...listrOptions,
    title,
    task: async (ctx, task) => {
      // Redirect console output to Listr task.output
      console.log = (...args) => {
        const message = args.map(arg =>
          typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ');
        task.output = message;
        syncDelay(500); // Small delay for readability
      };

      console.error = (...args) => {
        const message = args.map(arg =>
          typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ');
        task.output = message;
        syncDelay(500); // Small delay for readability
      };

      try {
        return await taskFn(ctx, task);
      } finally {
        // Always restore to global original console (not local copy which might be patched)
        console.log = ORIGINAL_CONSOLE.log;
        console.error = ORIGINAL_CONSOLE.error;
      }
    },
    rendererOptions: {
      bottomBar: Infinity,
      ...rendererOptions
    }
  };
}

/**
 * Create sequential sub-tasks (run one after another)
 */
export function sequential(task, tasks) {
  return task.newListr(tasks, { concurrent: false });
}

/**
 * Create parallel sub-tasks (run simultaneously)
 */
export function parallel(task, tasks) {
  return task.newListr(tasks, { concurrent: true });
}
