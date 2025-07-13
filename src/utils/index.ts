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
  Spinner,
  ProgressBar,
  LoadingDots,
  createSpinner,
  createProgressBar,
  withSpinner,
  withProgress,
  type ProgressIndicator,
} from './progress';
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
  validatePromptWithFeedback,
  validateTimeoutWithFeedback,
  validateTimestampWithFeedback,
  validateCommandWithFeedback,
} from './validators';
