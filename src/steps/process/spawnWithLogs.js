import { spawn } from 'child_process';
import chalk from 'chalk';

/**
 * Spawn a process with integrated logging support
 * Automatically pipes output to logger if provided
 */
export function spawnWithLogs({ command, args, options = {}, logger, logName }) {
  // Log the command being run
  logger?.logCommand?.(command, args);

  // Create command-specific log stream if logger supports it
  const logStream = logger?.createCommandLogger?.(logName);

  // Show log file location in verbose mode
  if (logStream && logger?.getCommandLogFile) {
    const logFile = logger.getCommandLogFile(logName);
    logger.log?.(chalk.gray(`📝 Detailed output → ${logFile}\n`));
  }

  // Spawn the process
  const proc = spawn(command, args, {
    ...options,
    stdio: options.stdio || 'pipe' // Default to pipe for logging
  });

  // Setup logging pipes if logger available
  if (logger && logStream) {
    proc.stdout?.on('data', (data) => {
      logger.logCommandOutput?.(data);
      logger.logToCommandFile?.(logStream, data);
    });

    proc.stderr?.on('data', (data) => {
      logger.logCommandOutput?.(data);
      logger.logToCommandFile?.(logStream, data);
    });
  }

  return proc;
}

/**
 * Spawn a process and wait for it to complete
 * Returns exit code
 */
export async function spawnAndWait({ command, args, options, logger, logName, errorMessage }) {
  const proc = spawnWithLogs({ command, args, options, logger, logName });

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
