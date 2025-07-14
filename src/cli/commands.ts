/**
 * CLI Commands and Options Configuration
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CLIOptions } from './types';
import { loadConfiguration } from '../config';
import { ClaudeCLI, CommandExecutor, TimeUtils } from '../core';
import {
  logger,
  LogLevel,
  validatePromptWithFeedback,
  validateTimeoutWithFeedback,
  validateCommandWithFeedback,
} from '../utils';
import { DebugUtils } from '../utils/debug';
import type { CLIConfig } from '../config/types';

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  finalPrompt?: string;
  errors?: string[];
}

/**
 * Validates CLI options and arguments
 */
function validateCLIArguments(
  promptArg: string | undefined,
  options: CLIOptions,
  config: CLIConfig
): ValidationResult {
  const errors: string[] = [];

  // Handle --cmd alias for --execute
  if (options.cmd && !options.execute) {
    options.execute = options.cmd;
  }

  // Validate argument combinations
  if (options.execute && options.continue) {
    errors.push('Cannot use both custom command execution (-e/--execute/--cmd) and continue flag (-c/--continue).');
    errors.push('These options are mutually exclusive.');
    errors.push("Use 'claude-auto-resume --help' to see usage examples.");
    return { isValid: false, errors };
  }

  // Enhanced command validation
  if (options.execute) {
    const commandValidation = validateCommandWithFeedback(options.execute);
    if (!commandValidation.valid) {
      errors.push(`Invalid command: ${commandValidation.error}`);
      if (commandValidation.suggestion) {
        errors.push(`Suggestion: ${commandValidation.suggestion}`);
      }
      return { isValid: false, errors };
    }
    if (commandValidation.warnings) {
      commandValidation.warnings.forEach((warning) => {
        logger.warn(`Command warning: ${warning}`);
      });
    }
  }

  // Enhanced test mode validation
  if (typeof options.testMode === 'number') {
    const timeoutValidation = validateTimeoutWithFeedback(options.testMode);
    if (!timeoutValidation.valid) {
      errors.push(`Invalid test mode value: ${timeoutValidation.error}`);
      if (timeoutValidation.suggestion) {
        errors.push(`Suggestion: ${timeoutValidation.suggestion}`);
      }
      return { isValid: false, errors };
    }
    if (timeoutValidation.suggestion) {
      logger.warn(`Test mode suggestion: ${timeoutValidation.suggestion}`);
    }
  }

  // Use positional argument if provided, otherwise use flag or default
  const finalPrompt = promptArg || options.prompt || config.defaultPrompt;

  // Enhanced prompt validation
  const promptValidation = validatePromptWithFeedback(finalPrompt);
  if (!promptValidation.valid) {
    errors.push(`Invalid prompt: ${promptValidation.error}`);
    if (promptValidation.suggestion) {
      errors.push(`Suggestion: ${promptValidation.suggestion}`);
    }
    return { isValid: false, errors };
  }
  if (promptValidation.suggestion) {
    logger.warn(`Prompt suggestion: ${promptValidation.suggestion}`);
  }

  return { isValid: true, finalPrompt };
}

/**
 * Displays session information at startup
 */
function displaySessionInfo(options: CLIOptions, finalPrompt: string): void {
  logger.info('Claude Auto Resume - TypeScript Version');
  logger.info(`Prompt: ${finalPrompt}`);
  logger.info(`Continue mode: ${options.continue ? 'enabled' : 'disabled'}`);

  if (options.execute) {
    logger.info(`Custom command to execute: ${options.execute}`);
  }

  if (options.testMode) {
    logger.info(`[DEV] Test mode enabled - simulating ${options.testMode}s wait`);
  }
}

/**
 * Get version from package.json
 */
function getVersion(): string {
  try {
    // Try multiple possible paths for package.json
    const possiblePaths = [
      join(__dirname, '..', '..', 'package.json'),
      join(process.cwd(), 'package.json'),
      join(__dirname, 'package.json'),
      join(__dirname, '..', 'package.json'),
    ];

    for (const packagePath of possiblePaths) {
      try {
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
        if (packageJson.version) {
          return packageJson.version;
        }
      } catch {
        // Try next path
        continue;
      }
    }

    throw new Error('No package.json found in any expected location');
  } catch {
    // Fallback to reading from npm environment if available
    try {
      const { execSync } = require('child_process');
      const npmVersion = execSync('npm list claude-auto-resume --depth=0 --json 2>/dev/null', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      const npmData = JSON.parse(npmVersion);
      const version = npmData?.dependencies?.['claude-auto-resume']?.version;
      if (version) {
        return version;
      }
    } catch {
      // Ignore npm lookup errors
    }

    return '2.0.1'; // Fallback version
  }
}

/**
 * Sets up the CLI commands and options
 */
export async function setupCLI(program: Command): Promise<void> {
  const config = loadConfiguration();

  program
    .name('claude-auto-resume')
    .description('Automatically resumes Claude CLI tasks after usage limits are lifted')
    .version(getVersion())
    .option('-p, --prompt <prompt>', 'Custom prompt to send to Claude (default: "continue")')
    .option('-c, --continue', 'Continue previous conversation instead of starting new session')
    .option('-e, --execute <command>', 'Execute custom command after usage limit wait period')
    .option(
      '--cmd <command>',
      'Execute custom command after usage limit wait period (alias for -e)'
    )
    .option(
      '--test-mode <seconds>',
      '[DEV] Simulate usage limit with specified wait time in seconds',
      parseInt
    )
    .option('--check', 'Show system check information')
    .option('-v, --verbose', 'Enable verbose logging (INFO level)')
    .option('-q, --quiet', 'Enable quiet mode (ERROR level only)')
    .option('--debug', 'Enable debug mode with comprehensive diagnostic output')
    .argument('[prompt]', 'Custom prompt as positional argument')
    .addHelpText(
      'after',
      `
Examples:
  $ claude-auto-resume                          # Default prompt "continue"
  $ claude-auto-resume "fix the bug"            # Custom prompt
  $ claude-auto-resume -c "review my changes"   # Continue conversation
  $ claude-auto-resume -e "npm test"            # Run command after wait

⚠️  Uses --dangerously-skip-permissions by default. Only use in trusted environments.`
    )
    .action(async (promptArg: string | undefined, options: CLIOptions) => {
      try {
        // Configure logging first
        configureLogging(options);

        // Handle special commands early
        if (options.check) {
          await showSystemCheck();
          return;
        }

        // Validate all CLI arguments and options
        const validation = validateCLIArguments(promptArg, options, config);
        if (!validation.isValid) {
          validation.errors?.forEach(error => logger.error(error));
          process.exit(1);
        }

        const finalPrompt = validation.finalPrompt!;

        // Display session information
        displaySessionInfo(options, finalPrompt);

        // Show debug diagnostics if requested
        if (options.debug) {
          await showDebugDiagnostics(options, config, finalPrompt);
        }

        // Execute the main logic
        await executeClaudeAutoResume(options, config, finalPrompt);

      } catch (error) {
        logger.error('Failed to execute command:', { error });
        process.exit(1);
      }
    });
}

/**
 * Configures logging based on CLI options
 */
function configureLogging(options: CLIOptions): void {
  // Set log level based on flags
  if (options.debug) {
    logger.setLevel(LogLevel.DEBUG);
  } else if (options.verbose) {
    logger.setLevel(LogLevel.INFO);
  } else if (options.quiet) {
    logger.setLevel(LogLevel.ERROR);
  } else {
    logger.setLevel(LogLevel.INFO); // Default level
  }

  // Set file output if specified via environment variable
  const logFile = process.env.CLAUDE_AUTO_RESUME_LOG_FILE;
  if (logFile) {
    logger.setFileOutput(logFile);
    logger.debug('File logging enabled', { logFile });
  }

  // Log configuration if debug mode
  if (options.debug) {
    logger.debug('Logging configuration applied', {
      level: options.debug ? 'DEBUG' : options.verbose ? 'INFO' : options.quiet ? 'ERROR' : 'INFO',
      fileOutput: logFile || 'disabled',
    });
  }
}

/**
 * Shows system check information
 */
async function showSystemCheck(): Promise<void> {
  logger.info('System Check Information:');
  logger.info('========================');

  // Check Node.js version
  logger.info(`Node.js Version: ${process.version}`);

  // Check platform
  logger.info(`Platform: ${process.platform}`);
  logger.info(`Architecture: ${process.arch}`);

  // Check Claude CLI
  try {
    const { execSync } = require('child_process');
    const claudeVersion = execSync('claude --version', { encoding: 'utf8', timeout: 5000 }).trim();
    const currentTime = TimeUtils.getTimeDisplay(TimeUtils.getCurrentTimestamp());

    logger.info(`Claude CLI Version: ${claudeVersion}`);
    logger.info(`System Time: ${currentTime.absolute} (${currentTime.relative})`);

    // Check if --dangerously-skip-permissions is supported
    try {
      const claudeHelp = execSync('claude --help', { encoding: 'utf8', timeout: 5000 });
      if (claudeHelp.includes('dangerously-skip-permissions')) {
        logger.info('  --dangerously-skip-permissions: Supported');
      } else {
        logger.info('  --dangerously-skip-permissions: Not supported');
      }
    } catch {
      logger.warn('Unable to check Claude CLI help');
    }
  } catch (error) {
    logger.error(`Claude CLI: Not available or error occurred - ${error}`);
  }

  // Check environment variables
  logger.info('Environment Variables:');
  logger.info(
    `  CLAUDE_AUTO_RESUME_WAIT_BUFFER: ${process.env.CLAUDE_AUTO_RESUME_WAIT_BUFFER || 'Not set'}`
  );
  logger.info(
    `  CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS: ${process.env.CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS || 'Not set'}`
  );
  logger.info(
    `  CLAUDE_AUTO_RESUME_LOG_FILE: ${process.env.CLAUDE_AUTO_RESUME_LOG_FILE || 'Not set'}`
  );

  // Show current logging configuration
  logger.info('Logging Configuration:');
  logger.info(`  Log Level: ${LogLevel[logger.getLevel()]}`);
  logger.info(`  File Output: ${logger.getLogFile() || 'Console only'}`);
}

/**
 * Shows comprehensive debug diagnostics using enhanced DebugUtils
 */
async function showDebugDiagnostics(
  options: CLIOptions,
  config: CLIConfig,
  prompt: string
): Promise<void> {
  try {
    // Enable debug mode in DebugUtils
    DebugUtils.enableDebugMode();

    // Collect comprehensive system information
    const systemInfo = await DebugUtils.withDebugTracking('collect-system-info', async () => {
      return await DebugUtils.collectSystemInfo();
    });

    // Collect configuration debug info
    const configInfo = DebugUtils.collectConfigDebugInfo(
      options,
      process.env as Record<string, string>,
      undefined, // config file path - would need to be passed from config loader
      config,
      config
    );

    // Format and display comprehensive debug output
    const debugOutput = DebugUtils.formatDebugOutput(systemInfo, configInfo);
    console.log(debugOutput);

    // Additional prompt analysis
    logger.debug('=== PROMPT ANALYSIS ===');
    const promptValidation = validatePromptWithFeedback(prompt);
    logger.debug('Prompt Validation:', promptValidation);

    logger.debug('Prompt Details:', {
      length: prompt.length,
      trimmedLength: prompt.trim().length,
      hasSpecialChars: /[<>"|&;`$(){}[\]\\]/.test(prompt),
      wordCount: prompt.trim().split(/\s+/).length,
      lines: prompt.split('\n').length,
    });

    // Performance metrics
    logger.debug('=== PERFORMANCE METRICS ===');
    const performanceMetrics = DebugUtils.getPerformanceMetrics();
    logger.debug('Current Performance:', performanceMetrics);

    // Claude CLI analysis
    logger.debug('=== CLAUDE CLI ANALYSIS ===');
    logger.debug('Claude CLI Info:', {
      available: systemInfo.claude.available,
      version: systemInfo.claude.version,
      path: config.claudeCliPath,
      error: systemInfo.claude.error,
    });

    // Offer to export debug information
    logger.debug('=== DEBUG EXPORT ===');
    logger.info('Debug information collected successfully');
    logger.info('To export full debug info to file, use: claude-auto-resume --debug --export');
  } catch (error) {
    logger.error('Debug diagnostics failed:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Executes the core logic for handling usage limits and resuming tasks
 */
async function executeClaudeAutoResume(
  options: CLIOptions,
  config: CLIConfig,
  finalPrompt: string
): Promise<void> {
  // Initialize Claude CLI
  const claudeCli = new ClaudeCLI(config.claudeCliPath);

  // Check for usage limits and handle accordingly
  let limitStatus;
  if (options.testMode) {
    // Simulate usage limit for test mode
    const currentTime = Math.floor(Date.now() / 1000);
    limitStatus = {
      hasLimit: true,
      resumeTimestamp: currentTime + options.testMode,
      rawOutput: `Claude AI usage limit reached|${currentTime + options.testMode}`,
      waitSeconds: options.testMode,
    };
    logger.info(`[DEV] Simulating usage limit with ${options.testMode}s wait time`);
  } else {
    limitStatus = await claudeCli.checkUsageLimit();
  }

  if (limitStatus.hasLimit && limitStatus.resumeTimestamp) {
    await handleUsageLimitDetected(options, config, finalPrompt, limitStatus, claudeCli);
  } else {
    handleNoUsageLimit(options);
  }
}

/**
 * Handles the case when usage limit is detected
 */
async function handleUsageLimitDetected(
  options: CLIOptions,
  config: CLIConfig,
  finalPrompt: string,
  limitStatus: any,
  claudeCli: ClaudeCLI
): Promise<void> {
  logger.info('Usage limit detected, waiting...');

  // Calculate wait time with buffer
  const currentTime = Math.floor(Date.now() / 1000);
  const waitSeconds = Math.max(
    0,
    limitStatus.resumeTimestamp - currentTime + config.waitBuffer
  );

  if (waitSeconds > 0) {
    // Countdown with progress indication
    await TimeUtils.waitWithCountdown(waitSeconds);
  }

  // Re-check network connectivity before resuming (skip in execute mode)
  if (!options.execute) {
    logger.info('Re-checking network connectivity before resuming...');
    try {
      const { NetworkUtils } = await import('../core/network');
      const isConnected = await NetworkUtils.checkConnectivity();
      if (!isConnected) {
        logger.error('Network connectivity lost during wait period.');
        logger.error('Please check your internet connection and run the script again.');
        process.exit(3);
      }
    } catch (error) {
      logger.warn('Network connectivity check failed, but continuing...', { error });
    }
  }

  // Resume Claude session or execute custom command after wait
  if (options.execute) {
    logger.info('Executing custom command after usage limit wait period');
    await CommandExecutor.executeWithSafeguards(options.execute);
  } else {
    const output = await claudeCli.resume(
      finalPrompt,
      options.continue || false,
      config.skipPermissions
    );
    // Display Claude output like shell script
    if (output && output.trim()) {
      console.log('CLAUDE_OUTPUT:');
      console.log(output);
    }
  }
}

/**
 * Handles the case when no usage limit is detected
 */
function handleNoUsageLimit(options: CLIOptions): void {
  // No usage limit detected - match shell script behavior
  if (options.execute) {
    logger.info(
      'No usage limit detected. Custom command will only execute after a usage limit wait period.'
    );
    logger.info('Since there is no usage limit, the custom command will not be executed.');
    logger.info(
      'Use claude-auto-resume in execute mode only when you expect usage limits.'
    );
  } else {
    logger.info('No waiting required. Task completed.');
  }
}
