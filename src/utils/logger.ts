/**
 * Logging utilities
 */

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * Simple logger implementation
 */
export class Logger {
  constructor(private level: LogLevel = LogLevel.INFO) {}

  /**
   * Sets the log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Logs an error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * Logs a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Logs an info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Logs a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();
