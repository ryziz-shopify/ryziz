import { spawn } from 'child_process';

const activeProcesses = new Set();

export async function spawnWithCallback(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const { onLine, ...spawnOptions } = options;
    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
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

    const handleStream = (stream) => {
      let buffer = '';
      stream.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        lines.forEach((line) => {
          if (onLine) onLine(line, controls);
        });
      });
      stream.on('end', () => {
        if (buffer && onLine) {
          onLine(buffer, controls);
        }
      });
    };

    handleStream(child.stdout);
    handleStream(child.stderr);

    child.on('close', (code) => {
      if (!resolved) {
        activeProcesses.delete(child);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
        }
      }
    });

    child.on('error', (err) => {
      if (!resolved) {
        activeProcesses.delete(child);
        reject(err);
      }
    });
  });
}

process.on('SIGINT', () => {
  activeProcesses.forEach(child => {
    child.kill('SIGTERM');
  });
  process.exit(0);
});

process.on('SIGTERM', () => {
  activeProcesses.forEach(child => {
    child.kill('SIGTERM');
  });
  process.exit(0);
});
