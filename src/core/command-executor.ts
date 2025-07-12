/**
 * Custom command execution utilities with security warnings
 */

import { spawn } from 'child_process';
import { ClaudeAutoResumeError } from '../utils/errors';
import { TimeUtils } from './time-utils';

/**
 * Command execution result interface
 */
export interface CommandExecutionResult {
  /** Exit code of the executed command */
  exitCode: number;
  /** Standard output from the command */
  stdout: string;
  /** Standard error from the command */
  stderr: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Whether the command succeeded (exit code 0) */
  success: boolean;
}

/**
 * Custom command executor with security safeguards
 */
export class CommandExecutor {
  private static readonly SECURITY_COUNTDOWN_SECONDS = 5;
  private static readonly MAX_EXECUTION_TIME_MS = 300000; // 5 minutes

  /**
   * Displays security warning and countdown before command execution
   */
  static async showSecurityWarning(command: string): Promise<void> {
    console.log('⚠️  SECURITY WARNING ⚠️');
    console.log('==========================================');
    console.log('You are about to execute a custom command:');
    console.log(`Command: ${command}`);
    console.log('');
    console.log('⚠️  This command will be executed with your current user permissions.');
    console.log('⚠️  Ensure you trust this command and understand what it does.');
    console.log('⚠️  Malicious commands can damage your system or compromise security.');
    console.log('');
    console.log('Press Ctrl+C to cancel execution.');
    console.log('');

    // 5-second countdown
    for (let i = CommandExecutor.SECURITY_COUNTDOWN_SECONDS; i > 0; i--) {
      process.stdout.write(`\rExecuting in ${i} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    process.stdout.write('\rExecuting command...\n');
  }

  /**
   * Executes a custom command with comprehensive logging and error handling
   */
  static async executeCustomCommand(
    command: string,
    showWarning = true,
    timeout: number = CommandExecutor.MAX_EXECUTION_TIME_MS
  ): Promise<CommandExecutionResult> {
    // Show security warning if enabled
    if (showWarning) {
      await CommandExecutor.showSecurityWarning(command);
    }

    const startTime = Date.now();
    const startTimestamp = Math.floor(startTime / 1000);
    const timeDisplay = TimeUtils.getTimeDisplay(startTimestamp);
    
    console.log(`[INFO] Starting command execution: ${command}`);
    console.log(`[INFO] Start time: ${timeDisplay.absolute} (${timeDisplay.relative})`);
    console.log(
      `[INFO] Maximum execution time: ${TimeUtils.formatDuration(Math.floor(timeout / 1000))}`
    );

    return new Promise((resolve) => {
      // Use shell to support complex commands with pipes and redirections
      const child = spawn('sh', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeout,
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Collect stdout
      child.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        // Real-time output for user feedback
        process.stdout.write(chunk);
      });

      // Collect stderr
      child.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        // Real-time error output
        process.stderr.write(chunk);
      });

      // Handle process completion
      child.on('close', (code) => {
        const executionTime = Date.now() - startTime;
        const exitCode = code || 0;

        const endTime = Date.now();
        const endTimestamp = Math.floor(endTime / 1000);
        const endTimeDisplay = TimeUtils.getTimeDisplay(endTimestamp);
        const durationFormatted = TimeUtils.formatDuration(Math.floor(executionTime / 1000));
        const durationShort = TimeUtils.formatDurationShort(Math.floor(executionTime / 1000));

        console.log(`\n[INFO] Command completed`);
        console.log(`[INFO] Exit code: ${exitCode}`);
        console.log(`[INFO] Execution time: ${durationFormatted} (${durationShort})`);
        console.log(`[INFO] End time: ${endTimeDisplay.absolute} (${endTimeDisplay.relative})`);

        if (timedOut) {
          console.log('[WARNING] Command was terminated due to timeout');
        }

        const result: CommandExecutionResult = {
          exitCode,
          stdout,
          stderr,
          executionTime,
          success: exitCode === 0 && !timedOut,
        };

        // Log execution summary
        if (result.success) {
          console.log('[SUCCESS] Command executed successfully');
        } else {
          console.log(`[ERROR] Command failed with exit code ${exitCode}`);
          if (stderr.trim()) {
            console.log(`[ERROR] Error output: ${stderr.trim()}`);
          }
        }

        resolve(result);
      });

      // Handle process errors
      child.on('error', (error) => {
        const executionTime = Date.now() - startTime;
        const durationFormatted = TimeUtils.formatDuration(Math.floor(executionTime / 1000));
        const durationShort = TimeUtils.formatDurationShort(Math.floor(executionTime / 1000));

        console.log(`\n[ERROR] Command execution failed: ${error.message}`);
        console.log(`[INFO] Execution time: ${durationFormatted} (${durationShort})`);

        resolve({
          exitCode: 1,
          stdout,
          stderr: error.message,
          executionTime,
          success: false,
        });
      });

      // Timeout handler
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');

        console.log(
          `\n[WARNING] Command execution timed out after ${TimeUtils.formatDuration(Math.floor(timeout / 1000))}`
        );
        console.log('[INFO] Sending SIGTERM to process...');

        // Force kill after additional 5 seconds
        setTimeout(() => {
          child.kill('SIGKILL');
          console.log('[WARNING] Force killing process (SIGKILL)');
        }, 5000);
      }, timeout);

      // Clean up timeout when process ends
      child.on('close', () => {
        clearTimeout(timeoutHandle);
      });

      // Handle user interruption (Ctrl+C)
      const handleInterrupt = () => {
        console.log('\n[INFO] User interrupt received. Terminating command...');
        child.kill('SIGINT');
        clearTimeout(timeoutHandle);
      };

      process.on('SIGINT', handleInterrupt);
      child.on('close', () => {
        process.removeListener('SIGINT', handleInterrupt);
      });
    });
  }

  /**
   * Validates a command before execution
   */
  static validateCommand(command: string): { valid: boolean; error?: string } {
    if (!command || typeof command !== 'string') {
      return { valid: false, error: 'Command must be a non-empty string' };
    }

    const trimmedCommand = command.trim();
    if (trimmedCommand === '') {
      return { valid: false, error: 'Command cannot be empty or whitespace only' };
    }

    // Basic security checks - warn about potentially dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, // rm -rf /
      /:\(\)\{\s*:\|:&\s*\}/, // Fork bomb pattern
      /mkfs/, // Format filesystem
      /dd\s+if=.*of=\/dev/, // Direct disk access
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedCommand)) {
        return {
          valid: false,
          error: `Command contains potentially dangerous pattern: ${pattern.source}. Please review carefully.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Executes command with full workflow including validation, warning, and execution
   */
  static async executeWithSafeguards(command: string): Promise<CommandExecutionResult> {
    // Validate command
    const validation = CommandExecutor.validateCommand(command);
    if (!validation.valid) {
      throw new ClaudeAutoResumeError(
        `Command validation failed: ${validation.error}`,
        1,
        `Invalid command: ${command}`,
        'Please provide a valid command string.'
      );
    }

    try {
      // Execute with security warning
      const result = await CommandExecutor.executeCustomCommand(command, true);

      // Handle failures
      if (!result.success) {
        throw new ClaudeAutoResumeError(
          `Custom command execution failed with exit code ${result.exitCode}`,
          result.exitCode,
          `Command: ${command}\nStderr: ${result.stderr}`,
          'Check the command syntax and try again. Review error output for details.'
        );
      }

      return result;
    } catch (error) {
      if (error instanceof ClaudeAutoResumeError) {
        throw error;
      }

      throw new ClaudeAutoResumeError(
        `Command execution error: ${error}`,
        1,
        `Command: ${command}`,
        'Ensure the command is valid and your system supports the required tools.'
      );
    }
  }
}
