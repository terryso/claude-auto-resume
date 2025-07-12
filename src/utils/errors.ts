/**
 * Error handling utilities
 */

/**
 * Custom error class for application-specific errors
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

/**
 * Creates a standardized error object
 */
export function createError(message: string, code: string, exitCode = 1): CLIError {
  return new CLIError(message, code, exitCode);
}

/**
 * Type guard to check if an error is a custom CLI error
 */
export function isCustomError(error: unknown): error is CLIError {
  return error instanceof CLIError;
}

/**
 * Common error codes and factory functions
 */
export const ErrorCodes = {
  INVALID_TIMESTAMP: 'INVALID_TIMESTAMP',
  CLAUDE_CLI_FAILED: 'CLAUDE_CLI_FAILED',
  RESUME_FAILED: 'RESUME_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export const Errors = {
  invalidTimestamp: (timestamp: string) =>
    createError(`Invalid timestamp format: ${timestamp}`, ErrorCodes.INVALID_TIMESTAMP, 2),

  claudeCliFailed: (message: string) =>
    createError(`Claude CLI execution failed: ${message}`, ErrorCodes.CLAUDE_CLI_FAILED, 1),

  resumeFailed: (message: string) =>
    createError(`Resume command failed: ${message}`, ErrorCodes.RESUME_FAILED, 4),

  networkError: (message: string) =>
    createError(`Network error: ${message}`, ErrorCodes.NETWORK_ERROR, 3),
};
