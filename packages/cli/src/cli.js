import { spawn as nodeSpawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { Command } from 'commander';
import { Listr } from 'listr2';
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer';
import { select, input } from '@inquirer/prompts';

const activeProcesses = new Set();

export { CLI, spawn };

// Implementation

class CLI {
  constructor(name, description, version) {
    this.program = new Command();
    this.program.name(name).description(description).version(version);
  }

  command(name, description) {
    return new CommandBuilder(this.program.command(name).description(description));
  }

  run() {
    this.program.parse();
  }
}

class CommandBuilder {
  constructor(cmd) {
    this.cmd = cmd;
  }

  option(flags, description) {
    this.cmd.option(flags, description);
    return this;
  }

  action(fn) {
    this.cmd.action(async (options) => {
      const ctx = new TaskContext();
      await fn(options, ctx);
      if (ctx.subtasks.length > 0) {
        await new Listr(ctx.subtasks, { rendererOptions: { showTimer: true } }).run();
      }
    });
    return this;
  }
}

class TaskContext {
  constructor(listrTask = null) {
    this.listrTask = listrTask;
    this.subtasks = [];
  }

  get title() {
    return this.listrTask?.title;
  }

  set title(value) {
    if (this.listrTask) this.listrTask.title = value;
  }

  get output() {
    return this.listrTask?.output;
  }

  set output(value) {
    if (this.listrTask) this.listrTask.output = value;
  }

  task(title, fn, options = {}) {
    this.subtasks.push(_createTask(title, fn, options, false));
  }

  parallel(title, fn) {
    this.subtasks.push(_createTask(title, fn, {}, true));
  }

  spawn(title, command, args, options = {}) {
    const { skip, enabled, onLine, ...spawnOptions } = options;

    this.task(title, (task) => {
      const defaultOnLine = onLine || ((line) => {
        task.output = line;
      });

      return spawn(command, args, { ...spawnOptions, onLine: defaultOnLine });
    }, { skip, enabled });
  }

  async select(options) {
    return this.prompt(select, options);
  }

  async input(options) {
    return this.prompt(input, options);
  }

  async prompt(promptFn, options) {
    if (!this.listrTask) throw new Error('prompt() can only be called within a task');
    return this.listrTask.prompt(ListrInquirerPromptAdapter).run(promptFn, options);
  }
}

function spawn(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const { onLine, ...spawnOptions } = options;
    const [cmd, extraArgs] = _resolveCommand(command);
    const child = nodeSpawn(cmd, [...extraArgs, ...args], {
      stdio: onLine ? ['inherit', 'pipe', 'pipe'] : 'inherit',
      ...spawnOptions
    });

    activeProcesses.add(child);

    let resolved = false;
    const controls = {
      resolve: (value) => {
        if (!resolved) {
          resolved = true;
          resolve(value);
        }
      },
      reject: (err) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      }
    };

    if (onLine) {
      const handleStream = (stream) => {
        let buffer = '';

        const flushBuffer = () => {
          if (buffer) {
            try {
              onLine(buffer, controls);
            } catch (err) {
              controls.reject(err);
            }
            buffer = '';
          }
        };

        stream.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';

          lines.forEach(line => {
            try {
              onLine(line, controls);
            } catch (err) {
              controls.reject(err);
            }
          });
        });

        stream.on('end', flushBuffer);
        stream.on('error', flushBuffer);
      };

      handleStream(child.stdout);
      handleStream(child.stderr);
    }

    const cleanup = () => activeProcesses.delete(child);

    child.on('close', (code) => {
      cleanup();
      if (!resolved) {
        code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
      }
    });

    child.on('error', (err) => {
      cleanup();
      if (!resolved) reject(err);
    });
  });
}

function _createTask(title, fn, options, concurrent) {
  return {
    title,
    task: async (_, listrTask) => {
      const ctx = new TaskContext(listrTask);
      await fn(ctx);
      return ctx.subtasks.length > 0
        ? listrTask.newListr(ctx.subtasks, { concurrent })
        : undefined;
    },
    rendererOptions: { outputBar: Infinity, persistentOutput: true },
    ...options
  };
}

function _resolveCommand(command) {
  if (['npm', 'node', 'npx'].includes(command)) return [command, []];

  const localBin = join(process.cwd(), 'node_modules', '.bin', command);
  const binPath = process.platform === 'win32' ? `${localBin}.cmd` : localBin;

  return existsSync(binPath) ? [binPath, []] : ['npx', ['--yes', command]];
}

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => activeProcesses.forEach(child => child.kill(signal)));
});
