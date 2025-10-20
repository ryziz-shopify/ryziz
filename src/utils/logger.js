import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

class Logger {
  constructor(logDir, verbose = false) {
    this.isVerbose = verbose;
    this.logDir = logDir;
    this.logFile = null;
    this.logStream = null;
    this.stepStartTime = null;
    this.sessionStartTime = Date.now();
    this.commandLogStreams = new Map(); // Track command-specific log streams
    this.logTimestamp = null; // Store timestamp for command log files

    this._initLogFile();
  }

  _initLogFile() {
    try {
      // Ensure log directory exists
      fs.ensureDirSync(this.logDir);

      // Create timestamped log file
      const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .replace('T', '-');

      this.logTimestamp = timestamp; // Store for command log files
      this.logFile = path.join(this.logDir, `ryziz-dev-${timestamp}.log`);

      // Create write stream
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
    // Defensive check: only write if stream exists and is still writable
    if (this.logStream && !this.logStream.destroyed && this.logStream.writable) {
      // Strip ANSI color codes for file output
      const plainMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
      this.logStream.write(plainMessage + '\n');
    }
  }

  _formatTimestamp() {
    const now = Date.now();
    const elapsed = ((now - this.sessionStartTime) / 1000).toFixed(2);
    return `[${new Date().toISOString()}] [+${elapsed}s]`;
  }

  log(message, ...args) {
    // Always show in console
    console.log(message, ...args);

    // Write to file with timestamp
    if (this.isVerbose) {
      const timestamp = this._formatTimestamp();
      this._writeToFile(`${timestamp} ${message} ${args.join(' ')}`);
    } else {
      this._writeToFile(`${message} ${args.join(' ')}`);
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
      // Show in console with gray color
      console.log(chalk.gray(fullMessage));
    }

    // Always write to file
    this._writeToFile(fullMessage);
  }

  startStep(stepName) {
    this.stepStartTime = Date.now();
    if (this.isVerbose) {
      const timestamp = this._formatTimestamp();
      this._writeToFile(`${timestamp} ▶ STEP START: ${stepName}`);
    }
  }

  endStep(stepName, success = true) {
    if (this.stepStartTime && this.isVerbose) {
      const duration = ((Date.now() - this.stepStartTime) / 1000).toFixed(2);
      const timestamp = this._formatTimestamp();
      const status = success ? '✓ COMPLETED' : '✗ FAILED';
      this._writeToFile(`${timestamp} ◀ STEP END: ${stepName} - ${status} (${duration}s)`);
      this._writeToFile('');
    }
    this.stepStartTime = null;
  }

  logFileOperation(operation, filePath) {
    if (this.isVerbose) {
      const timestamp = this._formatTimestamp();
      this._writeToFile(`${timestamp} 📁 FILE: ${operation} - ${filePath}`);
    }
  }

  logEnvVar(key, value, source = 'unknown') {
    if (this.isVerbose) {
      const timestamp = this._formatTimestamp();
      // Mask sensitive values
      const maskedValue = this._maskSensitiveValue(key, value);
      this._writeToFile(`${timestamp} 🔐 ENV: ${key}=${maskedValue} (source: ${source})`);
    }
  }

  logCommand(command, args = []) {
    if (this.isVerbose) {
      const timestamp = this._formatTimestamp();
      const fullCommand = `${command} ${args.join(' ')}`;
      this._writeToFile(`${timestamp} 💻 CMD: ${fullCommand}`);
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
      // In non-verbose mode, still log to file but without timestamp
      this._writeToFile(data.toString());
    }
  }

  _maskSensitiveValue(key, value) {
    const sensitiveKeys = ['secret', 'key', 'token', 'password', 'api'];
    const isSensitive = sensitiveKeys.some(k => key.toLowerCase().includes(k));

    if (isSensitive && value) {
      // Show first 4 and last 4 characters
      if (value.length > 12) {
        return `${value.slice(0, 4)}...${value.slice(-4)}`;
      }
      return '***';
    }

    return value || '(empty)';
  }

  section(title) {
    const line = '-'.repeat(60);
    this.log('');
    this._writeToFile(line);
    this._writeToFile(`  ${title.toUpperCase()}`);
    this._writeToFile(line);
  }

  createCommandLogger(commandName) {
    // Only create command-specific logs in verbose mode
    if (!this.isVerbose) {
      return null;
    }

    try {
      const commandLogFile = path.join(
        this.logDir,
        `ryziz-dev-${this.logTimestamp}-${commandName}.log`
      );

      const stream = fs.createWriteStream(commandLogFile, { flags: 'a' });

      // Write header
      stream.write('='.repeat(80) + '\n');
      stream.write(`COMMAND LOG: ${commandName}\n`);
      stream.write(`Started: ${new Date().toISOString()}\n`);
      stream.write('='.repeat(80) + '\n\n');

      // Track the stream for cleanup
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
    // Close all command log streams first
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

export function createLogger(logDir, verbose = false) {
  return new Logger(logDir, verbose);
}
