/**
 * Listr helpers for creating tasks with automatic console interception
 * Allows step functions to use console.log normally while Listr captures output
 */

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
  return {
    title,
    task: async (ctx, task) => {
      // Store original console methods
      const originalLog = console.log;
      const originalError = console.error;

      // Redirect console output to Listr task.output
      console.log = (...args) => {
        const message = args.map(arg =>
          typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ');
        task.output = message;
        syncDelay(150); // Small delay for readability
      };

      console.error = (...args) => {
        const message = args.map(arg =>
          typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ');
        task.output = message;
        syncDelay(150); // Small delay for readability
      };

      try {
        return await taskFn(ctx, task);
      } finally {
        // Always restore original console methods
        console.log = originalLog;
        console.error = originalError;
      }
    },
    options: {
      persistentOutput: true,
      ...options
    }
  };
}
