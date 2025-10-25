/**
 * Listr helpers for creating tasks
 */

/**
 * Create a Listr task
 * Simple helper to create task objects for Listr
 */
export function createTask(title, task, options = {}) {
  return { ...options, title, task };
}

/**
 * Create sequential sub-tasks (run one after another)
 */
export function sequential(task, tasks, options = {}) {
  return task.newListr(tasks, { concurrent: false, ...options });
}

/**
 * Create parallel sub-tasks (run simultaneously)
 */
export function parallel(task, tasks, options = {}) {
  return task.newListr(tasks, { concurrent: true, ...options });
}
