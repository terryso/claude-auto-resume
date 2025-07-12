/**
 * Input validation utilities and type guards
 */

import type { CLIConfig } from '../config/types';
import type { CLIOptions } from '../cli/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validates a prompt string with detailed feedback
 */
export function validatePrompt(prompt: string): boolean {
  if (typeof prompt !== 'string') {
    return false;
  }

  // Check if prompt is not empty and not just whitespace
  return prompt.trim().length > 0;
}

/**
 * Enhanced prompt validation with detailed error messages
 */
export function validatePromptWithFeedback(prompt: string): { valid: boolean; error?: string; suggestion?: string } {
  if (prompt === null || prompt === undefined) {
    return {
      valid: false,
      error: 'Prompt cannot be null or undefined',
      suggestion: 'Provide a prompt string like "continue" or "help me with..."'
    };
  }

  if (typeof prompt !== 'string') {
    return {
      valid: false,
      error: `Prompt must be a string, got ${typeof prompt}`,
      suggestion: 'Wrap your prompt in quotes, e.g., "continue with the task"'
    };
  }

  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'Prompt cannot be empty or only whitespace',
      suggestion: 'Use a meaningful prompt like "continue", "help", or describe what you need'
    };
  }

  if (trimmed.length > 1000) {
    return {
      valid: false,
      error: 'Prompt is too long (maximum 1000 characters)',
      suggestion: 'Shorten your prompt to be more concise and focused'
    };
  }

  // Check for potentially problematic characters
  const problematicChars = /[<>"|&;`$(){}[\]\\]/;
  if (problematicChars.test(prompt)) {
    return {
      valid: true, // Still valid but with warning
      suggestion: 'Your prompt contains special characters that may need escaping in shell commands'
    };
  }

  return { valid: true };
}

/**
 * Validates a timeout value
 */
export function validateTimeout(timeout: number): boolean {
  return typeof timeout === 'number' && timeout > 0 && Number.isFinite(timeout);
}

/**
 * Enhanced timeout validation with detailed feedback
 */
export function validateTimeoutWithFeedback(timeout: unknown): { valid: boolean; error?: string; suggestion?: string } {
  if (timeout === null || timeout === undefined) {
    return {
      valid: false,
      error: 'Timeout cannot be null or undefined',
      suggestion: 'Provide a timeout value in seconds, e.g., 60 for 1 minute'
    };
  }

  if (typeof timeout !== 'number') {
    return {
      valid: false,
      error: `Timeout must be a number, got ${typeof timeout}`,
      suggestion: 'Use a numeric value in seconds, e.g., 30, 60, 120'
    };
  }

  if (!Number.isFinite(timeout)) {
    return {
      valid: false,
      error: 'Timeout must be a finite number',
      suggestion: 'Avoid Infinity, -Infinity, or NaN values'
    };
  }

  if (timeout <= 0) {
    return {
      valid: false,
      error: 'Timeout must be positive',
      suggestion: 'Use a positive number of seconds, e.g., 30 for 30 seconds'
    };
  }

  if (timeout < 1) {
    return {
      valid: false,
      error: 'Timeout too small (minimum 1 second)',
      suggestion: 'Use at least 1 second for timeout'
    };
  }

  if (timeout > 86400) { // 24 hours
    return {
      valid: false,
      error: 'Timeout too large (maximum 24 hours)',
      suggestion: 'Use a timeout of 86400 seconds (24 hours) or less'
    };
  }

  if (!Number.isInteger(timeout)) {
    return {
      valid: true, // Valid but with suggestion
      suggestion: 'Consider using whole seconds for easier readability'
    };
  }

  return { valid: true };
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
 * Enhanced timestamp validation with detailed feedback
 */
export function validateTimestampWithFeedback(timestamp: unknown): { valid: boolean; error?: string; suggestion?: string } {
  if (timestamp === null || timestamp === undefined) {
    return {
      valid: false,
      error: 'Timestamp cannot be null or undefined',
      suggestion: 'Provide a timestamp as ISO string or Unix timestamp'
    };
  }

  if (typeof timestamp !== 'string' && typeof timestamp !== 'number') {
    return {
      valid: false,
      error: `Timestamp must be a string or number, got ${typeof timestamp}`,
      suggestion: 'Use ISO date string like "2023-12-25T10:30:00Z" or Unix timestamp'
    };
  }

  let date: Date;
  if (typeof timestamp === 'string') {
    if (timestamp.trim().length === 0) {
      return {
        valid: false,
        error: 'Timestamp string cannot be empty',
        suggestion: 'Use format like "2023-12-25T10:30:00Z" or Unix timestamp'
      };
    }
    date = new Date(timestamp);
  } else {
    // Number timestamp
    if (!Number.isFinite(timestamp)) {
      return {
        valid: false,
        error: 'Timestamp number must be finite',
        suggestion: 'Use a valid Unix timestamp in seconds or milliseconds'
      };
    }
    date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000); // Handle both seconds and milliseconds
  }

  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: 'Invalid timestamp format',
      suggestion: 'Use ISO format "2023-12-25T10:30:00Z" or Unix timestamp'
    };
  }

  // Check if timestamp is reasonable (not too far in past or future)
  const now = Date.now();
  const year1970 = new Date('1970-01-01').getTime();
  const year2100 = new Date('2100-01-01').getTime();

  if (date.getTime() < year1970) {
    return {
      valid: false,
      error: 'Timestamp is too far in the past (before 1970)',
      suggestion: 'Use a timestamp after January 1, 1970'
    };
  }

  if (date.getTime() > year2100) {
    return {
      valid: false,
      error: 'Timestamp is too far in the future (after 2100)',
      suggestion: 'Use a reasonable timestamp within the next century'
    };
  }

  return { valid: true };
}

/**
 * Validates shell command strings for security and safety
 */
export function validateCommandWithFeedback(command: unknown): { valid: boolean; error?: string; suggestion?: string; warnings?: string[] } {
  if (command === null || command === undefined) {
    return {
      valid: false,
      error: 'Command cannot be null or undefined',
      suggestion: 'Provide a shell command string'
    };
  }

  if (typeof command !== 'string') {
    return {
      valid: false,
      error: `Command must be a string, got ${typeof command}`,
      suggestion: 'Wrap your command in quotes'
    };
  }

  const trimmed = command.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'Command cannot be empty',
      suggestion: 'Provide a valid shell command'
    };
  }

  if (trimmed.length > 1000) {
    return {
      valid: false,
      error: 'Command is too long (maximum 1000 characters)',
      suggestion: 'Break down your command or use a script file'
    };
  }

  const warnings: string[] = [];

  // Check for potentially dangerous commands
  const dangerousCommands = [
    /\brm\s+-rf\s+\//i,
    /\bmkfs\b/i,
    /\bdd\b.*if=/i,
    /\bformat\b/i,
    /\bfdisk\b/i,
    /\bshred\b/i,
    /\bwipe\b/i
  ];

  for (const pattern of dangerousCommands) {
    if (pattern.test(trimmed)) {
      warnings.push('Command contains potentially destructive operations');
      break;
    }
  }

  // Check for suspicious patterns
  if (/\$\([^)]*\)|`[^`]*`|\$\{[^}]*\}/.test(trimmed)) {
    warnings.push('Command contains command substitution - ensure it\'s from trusted source');
  }

  if (/[;&|]\s*$/.test(trimmed)) {
    warnings.push('Command ends with shell operators - this might be incomplete');
  }

  if (/^\s*sudo\b/.test(trimmed)) {
    warnings.push('Command uses sudo - will require elevated privileges');
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
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
 * Enhanced file path validation with detailed feedback
 */
export function validateFilePathWithFeedback(filePath: unknown, mode: 'read' | 'write' | 'execute'): { valid: boolean; error?: string; suggestion?: string } {
  if (filePath === null || filePath === undefined) {
    return {
      valid: false,
      error: 'File path cannot be null or undefined',
      suggestion: 'Provide a valid file path'
    };
  }

  if (typeof filePath !== 'string') {
    return {
      valid: false,
      error: `File path must be a string, got ${typeof filePath}`,
      suggestion: 'Use a string path like "/path/to/file" or "./relative/path"'
    };
  }

  const trimmed = filePath.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'File path cannot be empty',
      suggestion: 'Provide a valid file path'
    };
  }

  // Check for path traversal attempts
  if (/\.\.\//.test(trimmed) || /\.\.\\/.test(trimmed)) {
    return {
      valid: false,
      error: 'Path traversal detected',
      suggestion: 'Use absolute paths or safe relative paths without ".."'
    };
  }

  // Check if path looks reasonable
  if (trimmed.length > 260) { // Windows MAX_PATH limit
    return {
      valid: false,
      error: 'File path is too long (maximum 260 characters)',
      suggestion: 'Use a shorter path or move files to a location with shorter path'
    };
  }

  try {
    const accessMode =
      mode === 'read'
        ? fs.constants.R_OK
        : mode === 'write'
          ? fs.constants.W_OK
          : fs.constants.X_OK;

    fs.accessSync(trimmed, accessMode);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `File path validation failed: ${error}`,
      suggestion: mode === 'read' 
        ? 'Ensure the file exists and is readable'
        : mode === 'write'
          ? 'Ensure the directory exists and is writable'
          : 'Ensure the file exists and is executable'
    };
  }
}

/**
 * Enhanced environment variable validation with range checking
 */
export function validateEnvironmentVariableWithFeedback(varName: string, value: unknown, expectedType: 'string' | 'number' | 'boolean'): { valid: boolean; error?: string; suggestion?: string } {
  if (value === undefined) {
    return { valid: true }; // Environment variables are optional
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `Environment variable ${varName} must be a string`,
      suggestion: 'Environment variables are always strings - convert if needed'
    };
  }

  const trimmed = value.trim();
  
  switch (expectedType) {
    case 'string':
      if (trimmed.length === 0) {
        return {
          valid: false,
          error: `Environment variable ${varName} cannot be empty`,
          suggestion: 'Provide a non-empty value or unset the variable'
        };
      }
      break;

    case 'number':
      const num = Number(trimmed);
      if (isNaN(num)) {
        return {
          valid: false,
          error: `Environment variable ${varName} must be a valid number`,
          suggestion: 'Use numeric values like "30", "60", "120"'
        };
      }
      if (!Number.isFinite(num)) {
        return {
          valid: false,
          error: `Environment variable ${varName} must be finite`,
          suggestion: 'Avoid Infinity or -Infinity values'
        };
      }
      break;

    case 'boolean':
      const lowerValue = trimmed.toLowerCase();
      if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lowerValue)) {
        return {
          valid: false,
          error: `Environment variable ${varName} must be a boolean value`,
          suggestion: 'Use "true", "false", "1", "0", "yes", or "no"'
        };
      }
      break;
  }

  return { valid: true };
}

/**
 * Validates command-line argument combinations and provides feedback
 */
export function validateArgumentCombinationsWithFeedback(options: CLIOptions): { valid: boolean; errors: string[]; suggestions: string[] } {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Check mutually exclusive options
  const mutuallyExclusive: Array<[string, string, string]> = [
    ['execute', 'continue', 'Cannot use execute mode with continue mode'],
    ['cmd', 'continue', 'Cannot use custom command with continue mode'],
    ['execute', 'cmd', 'Cannot use both execute and cmd options together'],
    ['version', 'help', 'Use either --version or --help, not both'],
  ];

  for (const [option1, option2, message] of mutuallyExclusive) {
    if (options[option1 as keyof CLIOptions] && options[option2 as keyof CLIOptions]) {
      errors.push(message);
      suggestions.push(`Choose either --${option1} or --${option2}, but not both`);
    }
  }

  // Check for incomplete option combinations
  if (options.execute && !options.prompt) {
    suggestions.push('Consider providing a prompt with --prompt when using --execute');
  }

  if (options.cmd && !options.prompt) {
    suggestions.push('Consider providing a prompt with --prompt when using --cmd');
  }

  // Check for potentially confusing combinations
  if (options.testMode && (options.execute || options.cmd)) {
    suggestions.push('Test mode with execute/cmd may not behave as expected - use for testing only');
  }

  return {
    valid: errors.length === 0,
    errors,
    suggestions
  };
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
