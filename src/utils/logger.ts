/**
 * Logging utilities with file output support and enhanced formatting
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
 * Enhanced logger implementation with file output and formatting
 */
export class Logger {
  private logFile?: string;
  private logStream?: fs.WriteStream;
  private maxLogSize = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 3;

  constructor(private level: LogLevel = LogLevel.INFO) {}

  /**
   * Sets the log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Sets file output for logging
   */
  setFileOutput(filePath?: string): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = undefined;
    }

    if (filePath) {
      this.logFile = filePath;
      this.ensureLogDirectory();
      this.rotateLogIfNeeded();
      this.logStream = fs.createWriteStream(filePath, { flags: 'a' });
    } else {
      this.logFile = undefined;
    }
  }

  /**
   * Ensures the log directory exists
   */
  private ensureLogDirectory(): void {
    if (!this.logFile) return;

    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Rotates log file if it exceeds size limit
   */
  private rotateLogIfNeeded(): void {
    if (!this.logFile || !fs.existsSync(this.logFile)) return;

    const stats = fs.statSync(this.logFile);
    if (stats.size >= this.maxLogSize) {
      this.rotateLogFiles();
    }
  }

  /**
   * Rotates log files by renaming existing files
   */
  private rotateLogFiles(): void {
    if (!this.logFile) return;

    const logDir = path.dirname(this.logFile);
    const logName = path.basename(this.logFile, path.extname(this.logFile));
    const logExt = path.extname(this.logFile);

    // Remove oldest log file
    const oldestLog = path.join(logDir, `${logName}.${this.maxLogFiles}${logExt}`);
    if (fs.existsSync(oldestLog)) {
      fs.unlinkSync(oldestLog);
    }

    // Rotate existing log files
    for (let i = this.maxLogFiles - 1; i >= 1; i--) {
      const currentLog = path.join(logDir, `${logName}.${i}${logExt}`);
      const nextLog = path.join(logDir, `${logName}.${i + 1}${logExt}`);
      if (fs.existsSync(currentLog)) {
        fs.renameSync(currentLog, nextLog);
      }
    }

    // Move current log to .1
    const rotatedLog = path.join(logDir, `${logName}.1${logExt}`);
    if (fs.existsSync(this.logFile)) {
      fs.renameSync(this.logFile, rotatedLog);
    }
  }

  /**
   * Formats a log message with timestamp and level
   */
  private formatMessage(level: string, message: string, context?: object): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  /**
   * Writes to both console and file if configured
   */
  private writeLog(
    level: string,
    message: string,
    context?: object,
    consoleMethod: (...args: any[]) => void = console.log
  ): void {
    const formattedMessage = this.formatMessage(level, message, context);

    // Console output
    consoleMethod(`[${level}] ${message}`, context ? context : '');

    // File output
    if (this.logStream) {
      this.logStream.write(formattedMessage + os.EOL);
    }
  }

  /**
   * Logs an error message
   */
  error(message: string, context?: object): void {
    if (this.level >= LogLevel.ERROR) {
      this.writeLog('ERROR', message, context, console.error);
    }
  }

  /**
   * Logs a warning message
   */
  warn(message: string, context?: object): void {
    if (this.level >= LogLevel.WARN) {
      this.writeLog('WARN', message, context, console.warn);
    }
  }

  /**
   * Logs an info message
   */
  info(message: string, context?: object): void {
    if (this.level >= LogLevel.INFO) {
      this.writeLog('INFO', message, context);
    }
  }

  /**
   * Logs a debug message
   */
  debug(message: string, context?: object): void {
    if (this.level >= LogLevel.DEBUG) {
      this.writeLog('DEBUG', message, context);
    }
  }

  /**
   * Closes the log stream and cleans up resources
   */
  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = undefined;
    }
  }

  /**
   * Gets the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Gets the current log file path
   */
  getLogFile(): string | undefined {
    return this.logFile;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();
