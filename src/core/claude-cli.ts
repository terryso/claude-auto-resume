/**
 * Claude CLI interaction utilities
 */

import { execSync } from 'child_process';
import { ClaudeAutoResumeError } from '../utils/errors';
import { withSpinner } from '../utils/progress';
import { logger } from '../utils';

/**
 * Interface for usage limit result parsing
 */
export interface UsageLimitResult {
  /** Whether a usage limit was detected */
  hasLimit: boolean;
  /** Resume timestamp if usage limit detected */
  resumeTimestamp?: number;
  /** Raw output from Claude CLI */
  rawOutput: string;
  /** Calculated wait seconds until resume */
  waitSeconds?: number;
}

/**
 * Handles interactions with the Claude CLI
 */
export class ClaudeCLI {
  constructor(private readonly cliPath = 'claude') {}

  /**
   * Builds properly escaped command string from arguments
   */
  private buildCommandString(args: string[]): string {
    const quotedArgs = args.map((arg) => {
      // Only quote arguments that contain spaces or special characters
      // Don't quote flags like -p, -c, --dangerously-skip-permissions
      if (arg.startsWith('-') || !/[\s'"\\|&;<>()$`]/.test(arg)) {
        return arg;
      }
      // Use JSON.stringify for proper shell escaping of user content
      return JSON.stringify(arg);
    });

    return `${this.cliPath} ${quotedArgs.join(' ')}`;
  }

  /**
   * Creates execution options for execSync
   */
  private createExecutionOptions(timeoutMs: number): any {
    const execOptions: any = {
      encoding: 'utf8',
      env: process.env, // Use complete environment as-is
      cwd: process.cwd(),
      shell: process.env.SHELL || '/bin/bash', // Explicitly use shell
      stdio: ['inherit', 'pipe', 'pipe'], // Inherit stdin, pipe stdout/stderr
    };

    // Only set timeout if timeoutMs > 0 (0 means no timeout)
    if (timeoutMs > 0) {
      execOptions.timeout = timeoutMs;
    }

    return execOptions;
  }

  /**
   * Handles execution errors and converts them to ClaudeAutoResumeError
   */
  private handleExecutionError(error: any, command: string, timeoutMs: number): never {
    if (error.status === null) {
      // Timeout or signal
      const timeoutMessage =
        timeoutMs > 0
          ? `Claude CLI command timed out after ${timeoutMs}ms`
          : 'Claude CLI command was terminated by signal';
      throw new ClaudeAutoResumeError(timeoutMessage, 1, `Command: ${command}`);
    } else if (error.code === 'ENOENT') {
      throw new ClaudeAutoResumeError(
        'Claude CLI not found in PATH',
        1,
        `Make sure Claude CLI is installed and available in PATH. Command: ${command}`
      );
    } else {
      throw new ClaudeAutoResumeError(
        `${error.stdout}`,
        1,
        `Command: ${command}\\nStderr: ${error.stderr || ''}\\nError: ${error.message}`
      );
    }
  }

  /**
   * Logs debug information for check commands
   */
  private logDebugInfo(args: string[], isPreExecution = true): void {
    const isCheckCommand = args.includes('check');
    
    if (process.env.NODE_ENV !== 'test' && isCheckCommand) {
      if (isPreExecution) {
        const proxyVars = {
          http_proxy: process.env.http_proxy,
          https_proxy: process.env.https_proxy,
        };
        logger.debug(`Proxy settings: ${JSON.stringify(proxyVars)}`);
        logger.debug(`Executing: ${this.cliPath} ${args.join(' ')}`);
      } else {
        logger.debug(`Executing with shell: ${this.cliPath} ${args.join(' ')}`);
        logger.debug(`Working directory: ${process.cwd()}`);
      }
    }
  }

  /**
   * Executes Claude CLI command synchronously
   */
  private executeCommand(command: string, timeoutMs: number): string {
    try {
      const execOptions = this.createExecutionOptions(timeoutMs);
      return execSync(command, execOptions);
    } catch (error: any) {
      this.handleExecutionError(error, command, timeoutMs);
    }
  }

  /**
   * Executes a Claude CLI command with timeout protection and optional progress indication
   * @param args - Command line arguments
   * @param timeoutMs - Timeout in milliseconds (default: 180000)
   * @param showProgress - Whether to show progress spinner (default: true for operations >2s)
   */
  async executeClaudeCommand(
    args: string[],
    timeoutMs = 180000,
    showProgress = timeoutMs >= 2000 && process.env.NODE_ENV !== 'test'
  ): Promise<string> {
    // Log debug info before execution
    this.logDebugInfo(args, true);

    const command = this.buildCommandString(args);
    
    const operation = () => Promise.resolve(this.executeCommand(command, timeoutMs));

    if (showProgress) {
      const message = `Executing Claude CLI command: ${args.join(' ')}`;
      const result = await withSpinner(operation, message, 'dots');
      
      // Log debug info after execution
      this.logDebugInfo(args, false);
      
      return result;
    } else {
      return operation();
    }
  }

  /**
   * Extracts timestamp string from usage limit message
   */
  private extractTimestampFromOutput(output: string): string | null {
    const limitPattern = /Claude AI usage limit reached\|(.+)/i;
    const match = output.match(limitPattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return null;
  }

  /**
   * Parses timestamp string into Unix timestamp (seconds)
   */
  private parseTimestamp(timestampStr: string): number {
    let timestamp: number;

    // Try parsing as ISO string first
    if (timestampStr.includes('T')) {
      timestamp = new Date(timestampStr).getTime() / 1000;
    } else {
      // Try parsing as Unix timestamp
      timestamp = parseInt(timestampStr, 10);

      // If it looks like milliseconds, convert to seconds
      if (timestamp > 1e12) {
        timestamp = Math.floor(timestamp / 1000);
      }
    }

    if (isNaN(timestamp) || timestamp <= 0) {
      throw new Error('Invalid timestamp format');
    }

    return timestamp;
  }

  /**
   * Calculates wait time until resume timestamp
   */
  private calculateWaitTime(resumeTimestamp: number): number {
    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, resumeTimestamp - currentTime);
  }

  /**
   * Parses Claude output for usage limit messages
   * Format: "Claude AI usage limit reached|<timestamp>"
   */
  parseUsageLimitOutput(output: string): UsageLimitResult {
    const result: UsageLimitResult = {
      hasLimit: false,
      rawOutput: output,
    };

    if (!output.trim()) {
      return result;
    }

    const timestampStr = this.extractTimestampFromOutput(output);
    
    if (timestampStr) {
      try {
        const timestamp = this.parseTimestamp(timestampStr);
        const waitSeconds = this.calculateWaitTime(timestamp);

        result.hasLimit = true;
        result.resumeTimestamp = timestamp;
        result.waitSeconds = waitSeconds;
      } catch {
        throw new ClaudeAutoResumeError(
          `Invalid timestamp extraction from Claude output: ${timestampStr}`,
          2,
          `Failed to parse timestamp from usage limit message. Raw output: ${output}`
        );
      }
    }

    return result;
  }

  /**
   * Checks if Claude usage limit is reached by running check command
   */
  async checkUsageLimit(): Promise<UsageLimitResult> {
    try {
      const args = this.buildClaudeCommand('check', false, false);
      const output = await this.executeClaudeCommand(args);
      return this.parseUsageLimitOutput(output);
    } catch (error) {
      if (error instanceof ClaudeAutoResumeError) {
        return this.parseUsageLimitOutput(error.message);
      }
      throw new ClaudeAutoResumeError(
        `Failed to check Claude usage limit: ${error}`,
        1,
        'Try running "claude --help" to verify CLI is working properly.'
      );
    }
  }

  /**
   * Builds Claude command with conditional flags
   */
  buildClaudeCommand(prompt: string, continueMode: boolean, skipPermissions: boolean): string[] {
    const args: string[] = [];

    if (continueMode) {
      args.push('-c');
    }

    if (skipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    // Add -p flag for print mode and prompt as positional argument
    args.push('-p', prompt);
    return args;
  }

  /**
   * Resumes a Claude session with the given prompt
   */
  async resume(prompt: string, continueMode = false, skipPermissions = true): Promise<string> {
    const args = this.buildClaudeCommand(prompt, continueMode, skipPermissions);

    try {
      // For resume operations, use a much longer timeout or no timeout
      // Claude interactions can take a very long time depending on the task
      const output = await this.executeClaudeCommand(args, 0); // 0 means no timeout
      return output;
    } catch (error) {
      if (error instanceof ClaudeAutoResumeError) {
        throw error;
      }
      throw new ClaudeAutoResumeError(
        `Resume command failed: ${error}`,
        4,
        `Command: ${this.cliPath} ${args.join(' ')}`
      );
    }
  }

  /**
   * Legacy execute method for backwards compatibility
   */
  async execute(args: string[]): Promise<string> {
    return this.executeClaudeCommand(args);
  }
}
