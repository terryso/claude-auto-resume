/**
 * Shared utilities module
 */

export {
  createError,
  isCustomError,
  CLIError,
  ClaudeAutoResumeError,
  ErrorCategory,
  ErrorCodes,
  Errors,
  EnhancedErrors,
} from './errors';
export { Logger, logger, LogLevel } from './logger';
export {
  validatePrompt,
  validateTimeout,
  validateTimestamp,
  validateArgs,
  isCLIConfig,
  isCLIOptions,
  validateCLIConfig,
  validateCLIOptions,
  validateFilePath,
  validateWritableDirectory,
  validateConfigurationPrecedence,
} from './validators';
