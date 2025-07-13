/**
 * Claude CLI interaction utilities
 */

import { execSync } from 'child_process';
import { ClaudeAutoResumeError } from '../utils/errors';
import { withSpinner } from '../utils/progress';

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
   * Executes a Claude CLI command with timeout protection and optional progress indication
   * @param args - Command line arguments
   * @param timeoutMs - Timeout in milliseconds (default: 60000)
   * @param showProgress - Whether to show progress spinner (default: true for operations >2s)
   */
  async executeClaudeCommand(
    args: string[],
    timeoutMs = 180000,
    showProgress = timeoutMs >= 2000 && process.env.NODE_ENV !== 'test'
  ): Promise<string> {
    // Log proxy settings for debugging (only for check command)
    const isCheckCommand = args.includes('check');
    const proxyVars = {
      http_proxy: process.env.http_proxy,
      https_proxy: process.env.https_proxy,
    };

    if (process.env.NODE_ENV !== 'test' && isCheckCommand) {
      console.debug(`[DEBUG] Proxy settings: ${JSON.stringify(proxyVars)}`);
      console.debug(`[DEBUG] Executing: ${this.cliPath} ${args.join(' ')}`);
    }

    const operation = () =>
      new Promise<string>((resolve, reject) => {
        // Build the command string with proper shell escaping
        const quotedArgs = args.map((arg) => {
          // Only quote arguments that contain spaces or special characters
          // Don't quote flags like -p, -c, --dangerously-skip-permissions
          if (arg.startsWith('-') || !/[\s'"\\|&;<>()$`]/.test(arg)) {
            return arg;
          }
          // Use JSON.stringify for proper shell escaping of user content
          return JSON.stringify(arg);
        });

        const command = `${this.cliPath} ${quotedArgs.join(' ')}`;

        if (process.env.NODE_ENV !== 'test' && isCheckCommand) {
          console.debug(`[DEBUG] Executing with shell: ${command}`);
          console.debug(`[DEBUG] Working directory: ${process.cwd()}`);
        }

        try {
          // Use execSync for maximum compatibility with command line execution
          const result = execSync(command, {
            encoding: 'utf8',
            timeout: timeoutMs,
            env: process.env, // Use complete environment as-is
            cwd: process.cwd(),
            shell: process.env.SHELL || '/bin/bash', // Explicitly use shell
            stdio: ['inherit', 'pipe', 'pipe'], // Inherit stdin, pipe stdout/stderr
          });

          resolve(result);
        } catch (error: any) {
          if (error.status === null) {
            // Timeout or signal
            reject(
              new ClaudeAutoResumeError(
                `Claude CLI command timed out after ${timeoutMs}ms`,
                1,
                `Command: ${command}`
              )
            );
          } else if (error.code === 'ENOENT') {
            reject(
              new ClaudeAutoResumeError(
                'Claude CLI not found in PATH',
                1,
                `Make sure Claude CLI is installed and available in PATH. Command: ${command}`
              )
            );
          } else {
            reject(
              new ClaudeAutoResumeError(
                `Claude CLI execution failed with exit code ${error.status || 'unknown'}`,
                1,
                `Command: ${command}\\nStderr: ${error.stderr || ''}\\nError: ${error.message}`
              )
            );
          }
        }
      });

    if (showProgress) {
      const message = `Executing Claude CLI command: ${args.join(' ')}`;
      return withSpinner(operation, message, 'dots');
    } else {
      return operation();
    }
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

    // Look for usage limit pattern
    const limitPattern = /Claude AI usage limit reached\|(.+)/i;
    const match = output.match(limitPattern);

    if (match && match[1]) {
      const timestampStr = match[1].trim();

      try {
        // Parse timestamp - handle different formats
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

        const currentTime = Math.floor(Date.now() / 1000);
        const waitSeconds = Math.max(0, timestamp - currentTime);

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
        throw error;
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
      const output = await this.executeClaudeCommand(args);
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
