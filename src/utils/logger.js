import ora from 'ora';

/**
 * Minimal spinner-first logger
 * Global singleton pattern (like console)
 */
class Logger {
  constructor() {
    this.activeSpinner = null;
  }

  /**
   * Start spinner with message
   */
  spinner(message) {
    this.activeSpinner = ora(message).start();
  }

  /**
   * Update spinner text (while active)
   */
  update(message) {
    if (this.activeSpinner) {
      this.activeSpinner.text = message;
    }
  }

  /**
   * Complete spinner successfully
   */
  succeed(message) {
    if (this.activeSpinner) {
      this.activeSpinner.succeed(message);
      this.activeSpinner = null;
    }
  }

  /**
   * Fail spinner with error
   */
  fail(message) {
    if (this.activeSpinner) {
      this.activeSpinner.fail(message);
      this.activeSpinner = null;
    }
  }

  /**
   * Stop spinner without status
   */
  stop() {
    if (this.activeSpinner) {
      this.activeSpinner.stop();
      this.activeSpinner = null;
    }
  }

  /**
   * Direct console log (no spinner)
   */
  log(message, ...args) {
    this.stop();
    console.log(message, ...args);
  }

  /**
   * Error logging (stops spinner first)
   */
  error(message, ...args) {
    this.stop();
    console.error(message, ...args);
  }
}

// Global singleton (like console)
const logger = new Logger();
export default logger;
