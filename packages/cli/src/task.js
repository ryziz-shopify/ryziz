import { Listr } from 'listr2';

export function runTasks(tasks, options = {}) {
  return new Listr(tasks, {
    rendererOptions: { showTimer: true },
    ...options
  }).run();
}

export function createTask(title, fn, options = {}) {
  return {
    title,
    task: (ctx, task) => fn(task, ctx),
    ...options
  };
}

export function sequential(task, tasks, options = {}) {
  return task.newListr(tasks, { concurrent: false, ...options });
}

export function parallel(task, tasks, options = {}) {
  return task.newListr(tasks, { concurrent: true, ...options });
}
