/**
 * Input validation utilities and type guards
 */

import type { CLIConfig } from '../config/types';
import type { CLIOptions } from '../cli/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validates a prompt string
 */
export function validatePrompt(prompt: string): boolean {
  if (typeof prompt !== 'string') {
    return false;
  }

  // Check if prompt is not empty and not just whitespace
  return prompt.trim().length > 0;
}

/**
 * Validates a timeout value
 */
export function validateTimeout(timeout: number): boolean {
  return typeof timeout === 'number' && timeout > 0 && Number.isFinite(timeout);
}

/**
 * Validates a timestamp string
 */
export function validateTimestamp(timestamp: string): boolean {
  if (typeof timestamp !== 'string') {
    return false;
  }

  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Validates command line arguments
 */
export function validateArgs(args: string[]): boolean {
  return Array.isArray(args) && args.every((arg) => typeof arg === 'string');
}

/**
 * Type guard to check if an object is a valid CLIConfig
 */
export function isCLIConfig(obj: unknown): obj is CLIConfig {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const config = obj as Record<string, unknown>;

  return (
    typeof config.defaultPrompt === 'string' &&
    typeof config.defaultTimeout === 'number' &&
    typeof config.maxRetries === 'number' &&
    typeof config.claudeCliPath === 'string' &&
    typeof config.waitBuffer === 'number' &&
    typeof config.skipPermissions === 'boolean' &&
    (config.logFile === undefined || typeof config.logFile === 'string') &&
    config.defaultTimeout > 0 &&
    config.maxRetries > 0 &&
    config.waitBuffer >= 0
  );
}

/**
 * Type guard to check if an object is valid CLIOptions
 */
export function isCLIOptions(obj: unknown): obj is CLIOptions {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const options = obj as Record<string, unknown>;

  return (
    (options.prompt === undefined || typeof options.prompt === 'string') &&
    (options.continue === undefined || typeof options.continue === 'boolean') &&
    (options.execute === undefined || typeof options.execute === 'string') &&
    (options.cmd === undefined || typeof options.cmd === 'string') &&
    (options.testMode === undefined || typeof options.testMode === 'number') &&
    (options.version === undefined || typeof options.version === 'boolean') &&
    (options.help === undefined || typeof options.help === 'boolean') &&
    (options.check === undefined || typeof options.check === 'boolean')
  );
}

/**
 * Validates CLI configuration at runtime
 */
export function validateCLIConfig(config: CLIConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate defaultPrompt
  if (!validatePrompt(config.defaultPrompt)) {
    errors.push('defaultPrompt must be a non-empty string');
  }

  // Validate defaultTimeout
  if (!validateTimeout(config.defaultTimeout)) {
    errors.push('defaultTimeout must be a positive number');
  }

  // Validate maxRetries
  if (
    typeof config.maxRetries !== 'number' ||
    config.maxRetries < 0 ||
    !Number.isInteger(config.maxRetries)
  ) {
    errors.push('maxRetries must be a non-negative integer');
  }

  // Validate claudeCliPath
  if (typeof config.claudeCliPath !== 'string' || config.claudeCliPath.trim() === '') {
    errors.push('claudeCliPath must be a non-empty string');
  }

  // Validate waitBuffer
  if (
    typeof config.waitBuffer !== 'number' ||
    config.waitBuffer < 0 ||
    !Number.isInteger(config.waitBuffer)
  ) {
    errors.push('waitBuffer must be a non-negative integer');
  }

  // Validate skipPermissions
  if (typeof config.skipPermissions !== 'boolean') {
    errors.push('skipPermissions must be a boolean');
  }

  // Validate logFile (optional)
  if (config.logFile !== undefined) {
    if (typeof config.logFile !== 'string' || config.logFile.trim() === '') {
      errors.push('logFile must be a non-empty string or undefined');
    } else {
      // Check if log file directory is writable
      try {
        const logDir = path.dirname(config.logFile);
        fs.accessSync(logDir, fs.constants.F_OK | fs.constants.W_OK);
      } catch {
        errors.push(`logFile directory is not writable: ${path.dirname(config.logFile)}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates CLI options at runtime
 */
export function validateCLIOptions(options: CLIOptions): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate prompt (optional)
  if (options.prompt !== undefined && !validatePrompt(options.prompt)) {
    errors.push('prompt must be a non-empty string');
  }

  // Validate execute command (optional)
  if (options.execute !== undefined) {
    if (typeof options.execute !== 'string' || options.execute.trim() === '') {
      errors.push('execute command must be a non-empty string');
    }
  }

  // Validate cmd command (optional)
  if (options.cmd !== undefined) {
    if (typeof options.cmd !== 'string' || options.cmd.trim() === '') {
      errors.push('cmd command must be a non-empty string');
    }
  }

  // Validate testMode (optional)
  if (options.testMode !== undefined) {
    if (
      typeof options.testMode !== 'number' ||
      options.testMode <= 0 ||
      !Number.isInteger(options.testMode)
    ) {
      errors.push('testMode must be a positive integer');
    }
  }

  // Validate conflicting options
  if (options.execute && options.continue) {
    errors.push('execute and continue options cannot be used together');
  }

  if (options.cmd && options.continue) {
    errors.push('cmd and continue options cannot be used together');
  }

  if (options.execute && options.cmd) {
    errors.push('execute and cmd options cannot be used together');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates file path permissions
 */
export function validateFilePath(filePath: string, mode: 'read' | 'write' | 'execute'): boolean {
  try {
    const accessMode =
      mode === 'read'
        ? fs.constants.R_OK
        : mode === 'write'
          ? fs.constants.W_OK
          : fs.constants.X_OK;

    fs.accessSync(filePath, accessMode);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a directory exists and is writable
 */
export function validateWritableDirectory(dirPath: string): boolean {
  try {
    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      return false;
    }

    fs.accessSync(dirPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Configuration precedence validation - ensures proper override order
 */
export function validateConfigurationPrecedence(
  cliArgs: Partial<CLIOptions>,
  envVars: Record<string, string | undefined>,
  defaults: CLIConfig
): { valid: boolean; precedenceOrder: string[] } {
  const precedenceOrder: string[] = [];

  // Check CLI arguments (highest priority)
  if (Object.keys(cliArgs).length > 0) {
    precedenceOrder.push('CLI arguments');
  }

  // Check environment variables
  const relevantEnvVars = [
    'CLAUDE_AUTO_RESUME_WAIT_BUFFER',
    'CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS',
    'CLAUDE_AUTO_RESUME_LOG_FILE',
  ];

  if (relevantEnvVars.some((envVar) => envVars[envVar] !== undefined)) {
    precedenceOrder.push('Environment variables');
  }

  // Defaults are always present
  precedenceOrder.push('Default values');

  return {
    valid: true,
    precedenceOrder,
  };
}
