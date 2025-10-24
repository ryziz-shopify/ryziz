import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

/**
 * Spawn a process with basic error handling
 * If DEBUG=true, logs stdout/stderr to .ryziz/debug.log
 */
export function spawnWithLogs({ command, args, options = {} }) {
  const proc = spawn(command, args, {
    ...options,
    stdio: options.stdio || 'pipe'
  });

  // Enable debug logging if DEBUG=true
  if (process.env.DEBUG === 'true') {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const commandName = path.basename(command);
    const logDir = path.join(process.cwd(), '.ryziz', 'logs');
    const logFile = path.join(logDir, `${commandName}-${timestamp}.log`);

    // Ensure log directory exists
    fs.ensureDirSync(logDir);

    const logStream = fs.createWriteStream(logFile, { flags: 'w' });

    logStream.write(`=== Command Log ===\n`);
    logStream.write(`Time: ${new Date().toISOString()}\n`);
    logStream.write(`Command: ${command} ${args.join(' ')}\n`);
    logStream.write(`CWD: ${options.cwd || process.cwd()}\n`);
    logStream.write(`\n=== Output ===\n\n`);

    // Pipe stdout and stderr to log file
    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        logStream.write(`[STDOUT] ${data}`);
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        logStream.write(`[STDERR] ${data}`);
      });
    }

    // Close log stream when process exits
    proc.on('close', (code) => {
      logStream.write(`\n=== Process exited with code ${code} ===\n`);
      logStream.end();
    });
  }

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
