import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Create a new logger instance
 */
export function createLogger(logDir, verbose = false) {
  return new Logger(logDir, verbose);
}

/**
 * Logger class - handles console and file logging
 */
class Logger {
  constructor(logDir, verbose = false) {
    this.isVerbose = verbose;
    this.logDir = logDir;
    this.logFile = null;
    this.logStream = null;
    this.stepStartTime = null;
    this.sessionStartTime = Date.now();
    this.commandLogStreams = new Map();
    this.logTimestamp = null;

    this._initLogFile();
  }

  _initLogFile() {
    try {
      fs.ensureDirSync(this.logDir);

      // Create timestamped log file
      const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .replace('T', '-');

      this.logTimestamp = timestamp;
      this.logFile = path.join(this.logDir, `ryziz-dev-${timestamp}.log`);
      this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });

      // Write session header
      this._writeToFile('='.repeat(80));
      this._writeToFile(`RYZIZ DEV SESSION - ${new Date().toISOString()}`);
      this._writeToFile(`Verbose Mode: ${this.isVerbose ? 'ENABLED' : 'DISABLED'}`);
      this._writeToFile('='.repeat(80));
      this._writeToFile('');
    } catch (error) {
      console.error(chalk.yellow(`⚠️  Could not initialize log file: ${error.message}`));
      console.error(chalk.gray('   Continuing without file logging...'));
    }
  }

  _writeToFile(message) {
    if (this.logStream && !this.logStream.destroyed && this.logStream.writable) {
      const plainMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
      this.logStream.write(plainMessage + '\n');
    }
  }

  _formatTimestamp() {
    const elapsed = ((Date.now() - this.sessionStartTime) / 1000).toFixed(2);
    return `[${new Date().toISOString()}] [+${elapsed}s]`;
  }

  log(message, ...args) {
    console.log(message, ...args);

    const fullMessage = `${message} ${args.join(' ')}`;
    if (this.isVerbose) {
      this._writeToFile(`${this._formatTimestamp()} ${fullMessage}`);
    } else {
      this._writeToFile(fullMessage);
    }
  }

  error(message, ...args) {
    console.error(message, ...args);
    const timestamp = this._formatTimestamp();
    this._writeToFile(`${timestamp} ERROR: ${message} ${args.join(' ')}`);
  }

  verbose(message, ...args) {
    const timestamp = this._formatTimestamp();
    const fullMessage = `${timestamp} ${message} ${args.join(' ')}`;

    if (this.isVerbose) {
      console.log(chalk.gray(fullMessage));
    }

    this._writeToFile(fullMessage);
  }

  startStep(stepName) {
    this.stepStartTime = Date.now();
    if (this.isVerbose) {
      this._writeToFile(`${this._formatTimestamp()} ▶ STEP START: ${stepName}`);
    }
  }

  endStep(stepName, success = true) {
    if (this.stepStartTime && this.isVerbose) {
      const duration = ((Date.now() - this.stepStartTime) / 1000).toFixed(2);
      const status = success ? '✓ COMPLETED' : '✗ FAILED';
      this._writeToFile(`${this._formatTimestamp()} ◀ STEP END: ${stepName} - ${status} (${duration}s)`);
      this._writeToFile('');
    }
    this.stepStartTime = null;
  }

  logFileOperation(operation, filePath) {
    if (this.isVerbose) {
      this._writeToFile(`${this._formatTimestamp()} 📁 FILE: ${operation} - ${filePath}`);
    }
  }

  logEnvVar(key, value, source = 'unknown') {
    if (this.isVerbose) {
      const maskedValue = maskSensitiveValue(key, value);
      this._writeToFile(`${this._formatTimestamp()} 🔐 ENV: ${key}=${maskedValue} (source: ${source})`);
    }
  }

  logCommand(command, args = []) {
    if (this.isVerbose) {
      this._writeToFile(`${this._formatTimestamp()} 💻 CMD: ${command} ${args.join(' ')}`);
    }
  }

  logCommandOutput(data) {
    if (this.isVerbose) {
      const timestamp = this._formatTimestamp();
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        this._writeToFile(`${timestamp}    │ ${line}`);
      });
    } else {
      this._writeToFile(data.toString());
    }
  }

  section(title) {
    const line = '-'.repeat(60);
    this.log('');
    this._writeToFile(line);
    this._writeToFile(`  ${title.toUpperCase()}`);
    this._writeToFile(line);
  }

  createCommandLogger(commandName) {
    if (!this.isVerbose) return null;

    try {
      const commandLogFile = path.join(
        this.logDir,
        `ryziz-dev-${this.logTimestamp}-${commandName}.log`
      );

      const stream = fs.createWriteStream(commandLogFile, { flags: 'a' });

      stream.write('='.repeat(80) + '\n');
      stream.write(`COMMAND LOG: ${commandName}\n`);
      stream.write(`Started: ${new Date().toISOString()}\n`);
      stream.write('='.repeat(80) + '\n\n');

      this.commandLogStreams.set(commandName, { stream, file: commandLogFile });
      this.verbose(`Created command log: ${commandLogFile}`);

      return stream;
    } catch (error) {
      this.error(chalk.yellow(`⚠️  Could not create command log for ${commandName}: ${error.message}`));
      return null;
    }
  }

  logToCommandFile(stream, data) {
    if (stream) {
      try {
        stream.write(data);
      } catch (error) {
        // Silently fail - command logs are optional
      }
    }
  }

  getCommandLogFile(commandName) {
    const entry = this.commandLogStreams.get(commandName);
    return entry ? entry.file : null;
  }

  close() {
    // Close command log streams
    const commandLogCount = this.commandLogStreams.size;
    if (commandLogCount > 0) {
      this.verbose(`Closing ${commandLogCount} command log file(s)`);

      for (const [commandName, { stream, file }] of this.commandLogStreams) {
        try {
          stream.write('\n' + '='.repeat(80) + '\n');
          stream.write(`Ended: ${new Date().toISOString()}\n`);
          stream.write('='.repeat(80) + '\n');
          stream.end();
          this.verbose(`Closed: ${file}`);
        } catch (error) {
          // Silently fail
        }
      }
      this.commandLogStreams.clear();
    }

    // Close main log stream
    if (this.logStream) {
      this._writeToFile('');
      this._writeToFile('='.repeat(80));
      this._writeToFile(`SESSION ENDED - ${new Date().toISOString()}`);
      const totalDuration = ((Date.now() - this.sessionStartTime) / 1000).toFixed(2);
      this._writeToFile(`Total Duration: ${totalDuration}s`);
      this._writeToFile('='.repeat(80));

      this.logStream.end();

      if (this.isVerbose) {
        console.log(chalk.gray(`\n📝 Log file: ${this.logFile}`));
        if (commandLogCount > 0) {
          console.log(chalk.gray(`📝 Command logs: ${commandLogCount} files`));
        }
      }
    }
  }
}

/**
 * Mask sensitive values in log output
 */
function maskSensitiveValue(key, value) {
  const sensitiveKeys = ['secret', 'key', 'token', 'password', 'api'];
  const isSensitive = sensitiveKeys.some(k => key.toLowerCase().includes(k));

  if (isSensitive && value) {
    if (value.length > 12) {
      return `${value.slice(0, 4)}...${value.slice(-4)}`;
    }
    return '***';
  }

  return value || '(empty)';
}
