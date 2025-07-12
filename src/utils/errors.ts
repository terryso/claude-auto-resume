/**
 * Error handling utilities with enhanced contextual guidance
 */

/**
 * Error categories for better user understanding
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  CONFIGURATION = 'CONFIGURATION',
  CLAUDE_CLI = 'CLAUDE_CLI',
  COMMAND_EXECUTION = 'COMMAND_EXECUTION',
  FILE_SYSTEM = 'FILE_SYSTEM',
  VALIDATION = 'VALIDATION',
  TIMEOUT = 'TIMEOUT',
  PERMISSION = 'PERMISSION'
}

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
 * Enhanced error class for Claude Auto Resume application
 * Includes contextual guidance, suggestions, and troubleshooting information
 */
export class ClaudeAutoResumeError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    public readonly context?: string,
    public readonly hint?: string,
    public readonly suggestion?: string,
    public readonly troubleshootingGuide?: string,
    public readonly category?: ErrorCategory
  ) {
    super(message);
    this.name = 'ClaudeAutoResumeError';
  }

  /**
   * Formats error message with enhanced contextual guidance
   */
  getFormattedMessage(): string {
    let formatted = `[ERROR] ${this.message}`;

    if (this.category) {
      formatted += `\n[CATEGORY] ${this.category}`;
    }

    if (this.context) {
      formatted += `\n[CONTEXT] ${this.context}`;
    }

    if (this.hint) {
      formatted += `\n[HINT] ${this.hint}`;
    }

    if (this.suggestion) {
      formatted += `\n[SUGGESTION] ${this.suggestion}`;
    }

    if (this.troubleshootingGuide) {
      formatted += `\n[TROUBLESHOOTING] ${this.troubleshootingGuide}`;
    }

    return formatted;
  }

  /**
   * Gets error recovery recommendations based on category
   */
  getRecoveryRecommendations(): string[] {
    const recommendations: string[] = [];

    switch (this.category) {
      case ErrorCategory.NETWORK:
        recommendations.push(
          'Check your internet connection',
          'Verify firewall settings',
          'Try again in a few moments',
          'Use --debug flag for network diagnostics'
        );
        break;

      case ErrorCategory.CLAUDE_CLI:
        recommendations.push(
          'Ensure Claude CLI is installed: npm install -g @anthropic/claude-cli',
          'Check Claude CLI version compatibility',
          'Verify Claude CLI is in your PATH',
          'Try running: claude --version'
        );
        break;

      case ErrorCategory.CONFIGURATION:
        recommendations.push(
          'Check environment variables',
          'Verify configuration file format',
          'Use --check flag for system diagnostics',
          'Review configuration precedence'
        );
        break;

      case ErrorCategory.COMMAND_EXECUTION:
        recommendations.push(
          'Test the command manually first',
          'Check command syntax and permissions',
          'Use absolute paths for files and commands',
          'Verify the command exists and is executable'
        );
        break;

      case ErrorCategory.FILE_SYSTEM:
        recommendations.push(
          'Check file and directory permissions',
          'Verify file paths exist',
          'Ensure sufficient disk space',
          'Check file locking and access issues'
        );
        break;

      case ErrorCategory.VALIDATION:
        recommendations.push(
          'Review input format requirements',
          'Check parameter values and ranges',
          'Consult help documentation with --help',
          'Use examples from help text as reference'
        );
        break;

      case ErrorCategory.TIMEOUT:
        recommendations.push(
          'Increase timeout values if appropriate',
          'Check network connectivity',
          'Retry the operation',
          'Consider breaking down into smaller operations'
        );
        break;

      case ErrorCategory.PERMISSION:
        recommendations.push(
          'Check file and directory permissions',
          'Run with appropriate user privileges',
          'Verify access to required resources',
          'Set CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false for manual control'
        );
        break;

      default:
        recommendations.push(
          'Use --debug flag for detailed diagnostics',
          'Check system with --check flag',
          'Review documentation and examples'
        );
    }

    return recommendations;
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

/**
 * Enhanced error factory functions with contextual guidance
 */
export const EnhancedErrors = {
  invalidTimestamp: (timestamp: string, context?: string) =>
    new ClaudeAutoResumeError(
      `Invalid timestamp format: ${timestamp}`,
      2,
      context || `Received timestamp: ${timestamp}`,
      'Expected format: ISO 8601 (e.g., 2023-01-01T12:00:00Z) or Unix timestamp',
      'Check Claude CLI output format and ensure version compatibility',
      'Use --debug flag for detailed timestamp parsing information',
      ErrorCategory.VALIDATION
    ),

  claudeCliFailed: (message: string, context?: string) =>
    new ClaudeAutoResumeError(
      `Claude CLI execution failed: ${message}`,
      1,
      context || `Command output: ${message}`,
      'Claude CLI command returned non-zero exit code',
      'Ensure Claude CLI is properly installed and configured',
      'Install: npm install -g @anthropic/claude-cli\nCheck: claude --version',
      ErrorCategory.CLAUDE_CLI
    ),

  resumeFailed: (message: string, context?: string) =>
    new ClaudeAutoResumeError(
      `Resume command failed: ${message}`,
      4,
      context || `Resume operation: ${message}`,
      'Failed to resume Claude session after usage limit wait',
      'Verify Claude CLI connectivity and authentication',
      'Check network connection and Claude CLI authentication status',
      ErrorCategory.COMMAND_EXECUTION
    ),

  networkError: (message: string, context?: string) =>
    new ClaudeAutoResumeError(
      `Network connectivity issue: ${message}`,
      3,
      context || `Network diagnostic: ${message}`,
      'Unable to establish reliable network connection',
      'Check internet connection and firewall settings',
      'Test with: ping google.com\nOr: curl -s https://httpbin.org/get',
      ErrorCategory.NETWORK
    ),

  configurationError: (message: string, context?: string) =>
    new ClaudeAutoResumeError(
      `Configuration error: ${message}`,
      1,
      context || `Configuration issue: ${message}`,
      'Invalid configuration detected',
      'Review configuration settings and environment variables',
      'Use --check flag for configuration diagnostics',
      ErrorCategory.CONFIGURATION
    ),

  fileSystemError: (message: string, filePath: string, context?: string) =>
    new ClaudeAutoResumeError(
      `File system error: ${message}`,
      1,
      context || `File path: ${filePath}`,
      'Unable to access file or directory',
      'Check file permissions and path existence',
      `Verify: ls -la ${filePath}\nPermissions: chmod/chown as needed`,
      ErrorCategory.FILE_SYSTEM
    ),

  permissionError: (message: string, resource: string, context?: string) =>
    new ClaudeAutoResumeError(
      `Permission denied: ${message}`,
      1,
      context || `Resource: ${resource}`,
      'Insufficient permissions to access resource',
      'Run with appropriate privileges or adjust permissions',
      'Consider: sudo access or permission modifications',
      ErrorCategory.PERMISSION
    ),

  timeoutError: (operation: string, timeoutMs: number, context?: string) =>
    new ClaudeAutoResumeError(
      `Operation timed out: ${operation}`,
      1,
      context || `Timeout: ${timeoutMs}ms`,
      'Operation exceeded maximum allowed time',
      'Increase timeout value or check for blocking issues',
      'Set timeout environment variables or use --debug for diagnostics',
      ErrorCategory.TIMEOUT
    )
};

// Legacy error functions for backward compatibility
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
