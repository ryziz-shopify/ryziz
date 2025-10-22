import { spawn } from 'child_process';

/**
 * Spawn a process with basic error handling
 */
export function spawnWithLogs({ command, args, options = {} }) {
  const proc = spawn(command, args, {
    ...options,
    stdio: options.stdio || 'pipe'
  });

  return proc;
}

/**
 * Spawn a process and wait for it to complete
 * Returns exit code
 */
export async function spawnAndWait({ command, args, options, errorMessage }) {
  const proc = spawnWithLogs({ command, args, options });

  return new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        const error = new Error(errorMessage || `${command} exited with code ${code}`);
        error.code = code;
        reject(error);
      }
    });

    proc.on('error', reject);
  });
}
