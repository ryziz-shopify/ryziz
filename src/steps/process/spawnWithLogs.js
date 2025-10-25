import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

/**
 * Spawn a child process with automatic debug logging
 * When DEBUG=true, streams output to both console and .ryziz/logs/ files
 * This helps troubleshoot issues with external commands (npm, firebase, shopify, etc.)
 */
export function spawnWithLogs({ command, args, options = {} }) {
  // Step 1: Spawn the child process with piped stdio
  const proc = spawn(command, args, {
    ...options,
    stdio: options.stdio || 'pipe'
  });

  // Step 2: Setup debug logging if enabled
  if (process.env.DEBUG === 'true') {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const commandName = path.basename(command);
    const logDir = path.join(process.cwd(), '.ryziz', 'logs');
    const logFile = path.join(logDir, `${commandName}-${timestamp}.log`);

    fs.ensureDirSync(logDir);
    const logStream = fs.createWriteStream(logFile, { flags: 'w' });

    logStream.write(`=== Command Log ===\n`);
    logStream.write(`Time: ${new Date().toISOString()}\n`);
    logStream.write(`Command: ${command} ${args.join(' ')}\n`);
    logStream.write(`CWD: ${options.cwd || process.cwd()}\n`);
    logStream.write(`\n=== Output ===\n\n`);

    // Step 3: Stream stdout to both console and log file
    // This allows real-time debugging while preserving complete logs
    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        const output = data.toString();
        logStream.write(`[STDOUT] ${output}`);
        console.log(output.trimEnd());
      });
    }

    // Step 4: Stream stderr to both console and log file
    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        const output = data.toString();
        logStream.write(`[STDERR] ${output}`);
        console.error(output.trimEnd());
      });
    }

    // Step 5: Cleanup on process exit
    proc.on('close', (code) => {
      logStream.write(`\n=== Process exited with code ${code} ===\n`);
      logStream.end();
    });
  }

  return proc;
}

/**
 * Spawn a process and wait for it to complete
 * Throws error if process exits with non-zero code
 * Used for critical build steps that must succeed (npm install, shopify deploy, etc.)
 */
export async function spawnAndWait({ command, args, options, errorMessage }) {
  // Step 1: Start the process with debug logging
  const proc = spawnWithLogs({ command, args, options });

  // Step 2: Wait for process to complete
  return new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        // Provide custom error context for better debugging
        const error = new Error(errorMessage || `${command} exited with code ${code}`);
        error.code = code;
        reject(error);
      }
    });

    // Handle spawn failures (command not found, permission denied, etc.)
    proc.on('error', reject);
  });
}
