/**
 * CLI Commands and Options Configuration
 */

import { Command } from 'commander';
import { CLIOptions } from './types';
import { loadConfiguration } from '../config';
import { ClaudeCLI, CommandExecutor, TimeUtils } from '../core';
import { 
  logger, 
  LogLevel, 
  validatePrompt, 
  validatePromptWithFeedback, 
  validateTimeoutWithFeedback, 
  validateCommandWithFeedback 
} from '../utils';
import { DebugUtils } from '../utils/debug';
import { NetworkUtils } from '../core/network';
import type { CLIConfig } from '../config/types';

/**
 * Sets up the CLI commands and options
 */
export async function setupCLI(program: Command): Promise<void> {
  const config = loadConfiguration();

  program
    .name('claude-auto-resume')
    .description('Automatically resumes Claude CLI tasks after usage limits are lifted')
    .version('1.3.0')
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
BASIC USAGE:
  $ claude-auto-resume                          # Default prompt "continue"
  $ claude-auto-resume "fix the bug"            # Custom prompt
  $ claude-auto-resume -p "continue coding"     # Custom prompt via flag
  $ claude-auto-resume -c "review my changes"   # Continue previous conversation

CUSTOM COMMAND EXECUTION:
  $ claude-auto-resume -e "npm test"            # Run tests after usage limit
  $ claude-auto-resume --cmd "python app.py"   # Run Python app (alias for -e)
  $ claude-auto-resume -e "git push origin main" # Deploy after waiting

LOGGING & VERBOSITY:
  $ claude-auto-resume --verbose "help me"      # Detailed output (INFO level)
  $ claude-auto-resume --quiet "continue"       # Errors only (ERROR level)
  $ claude-auto-resume --debug "fix this"       # Full diagnostic output
  $ CLAUDE_AUTO_RESUME_LOG_FILE=app.log claude-auto-resume "debug" # Log to file

SYSTEM ADMINISTRATION:
  $ claude-auto-resume --check                  # System information and health
  $ claude-auto-resume --test-mode 30 "test"    # [DEV] Simulate 30s usage limit

INSTALLATION:
  Global installation:
    $ npm install -g claude-auto-resume
    $ claude-auto-resume "help me code"

  Without installation:
    $ npx claude-auto-resume [options] [prompt]

ENVIRONMENT VARIABLES:
  CLAUDE_AUTO_RESUME_WAIT_BUFFER=30           # Add 30s buffer to wait time
  CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false   # Require permission prompts
  CLAUDE_AUTO_RESUME_LOG_FILE=/path/to.log    # Enable file logging

COMMON USAGE SCENARIOS:

  Development Workflow:
    $ claude-auto-resume -c "review and test my code"
    $ claude-auto-resume -e "npm run build && npm test"

  Code Reviews:
    $ claude-auto-resume "please review this pull request"
    $ claude-auto-resume -c "explain the changes in detail"

  Debugging:
    $ claude-auto-resume --debug "help debug this error"
    $ claude-auto-resume -v "analyze the performance issue"

  Long-running Tasks:
    $ claude-auto-resume -e "npm run deploy:production"
    $ claude-auto-resume --cmd "docker build -t myapp ."

TROUBLESHOOTING:

  Common Issues:
    
    Problem: "Claude CLI not found"
    Solution: Install Claude CLI first: npm install -g @anthropic/claude-cli
              Ensure it's in your PATH: which claude

    Problem: "Usage limit reached but no timestamp"
    Solution: Check Claude CLI output format and ensure version compatibility
              Use --debug flag for detailed diagnostic information

    Problem: "Permission denied" errors
    Solution: Set CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false for manual control
              Check file permissions for log files and working directory

    Problem: "Network connectivity issues"
    Solution: Check internet connection and firewall settings
              Use --debug for network diagnostic information

    Problem: "Command execution fails"
    Solution: Test command manually first: <your-command>
              Use absolute paths for commands and files
              Check command syntax and permissions

  Getting Help:
    $ claude-auto-resume --check                # System diagnostics
    $ claude-auto-resume --debug "test"         # Verbose debugging output
    Report issues: https://github.com/anthropics/claude-auto-resume/issues

⚠️  SECURITY WARNING:
    This tool uses --dangerously-skip-permissions by default, which bypasses
    Claude's safety prompts. Only use in trusted environments with trusted commands.
    
    To disable: export CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false`
    )
    .action(async (promptArg: string | undefined, options: CLIOptions) => {
      try {
        // Handle --cmd alias for --execute
        if (options.cmd && !options.execute) {
          options.execute = options.cmd;
        }

        // Configure logging based on verbosity options
        configureLogging(options);

        // Validate argument combinations
        if (options.execute && options.continue) {
          logger.error(
            'Cannot use both custom command execution (-e/--execute/--cmd) and continue flag (-c/--continue).'
          );
          logger.error('These options are mutually exclusive.');
          logger.error("Use 'claude-auto-resume --help' to see usage examples.");
          process.exit(1);
        }

        // Enhanced command validation
        if (options.execute) {
          const commandValidation = validateCommandWithFeedback(options.execute);
          if (!commandValidation.valid) {
            logger.error(`Invalid command: ${commandValidation.error}`);
            if (commandValidation.suggestion) {
              logger.error(`Suggestion: ${commandValidation.suggestion}`);
            }
            process.exit(1);
          }
          if (commandValidation.warnings) {
            commandValidation.warnings.forEach(warning => {
              logger.warn(`Command warning: ${warning}`);
            });
          }
        }

        // Enhanced test mode validation
        if (typeof options.testMode === 'number') {
          const timeoutValidation = validateTimeoutWithFeedback(options.testMode);
          if (!timeoutValidation.valid) {
            logger.error(`Invalid test mode value: ${timeoutValidation.error}`);
            if (timeoutValidation.suggestion) {
              logger.error(`Suggestion: ${timeoutValidation.suggestion}`);
            }
            process.exit(1);
          }
          if (timeoutValidation.suggestion) {
            logger.warn(`Test mode suggestion: ${timeoutValidation.suggestion}`);
          }
        }

        // Handle system check
        if (options.check) {
          await showSystemCheck();
          return;
        }

        // Use positional argument if provided, otherwise use flag or default
        const finalPrompt = promptArg || options.prompt || config.defaultPrompt;

        // Enhanced prompt validation
        const promptValidation = validatePromptWithFeedback(finalPrompt);
        if (!promptValidation.valid) {
          logger.error(`Invalid prompt: ${promptValidation.error}`);
          if (promptValidation.suggestion) {
            logger.error(`Suggestion: ${promptValidation.suggestion}`);
          }
          process.exit(1);
        }
        if (promptValidation.suggestion) {
          logger.warn(`Prompt suggestion: ${promptValidation.suggestion}`);
        }

        logger.info('Claude Auto Resume - TypeScript Version');
        logger.info(`Prompt: ${finalPrompt}`);
        logger.info(`Continue mode: ${options.continue ? 'enabled' : 'disabled'}`);

        if (options.execute) {
          logger.info(`Custom command to execute: ${options.execute}`);
        }

        if (options.testMode) {
          logger.info(`[DEV] Test mode enabled - simulating ${options.testMode}s wait`);
        }

        // Debug mode diagnostics
        if (options.debug) {
          await showDebugDiagnostics(options, config, finalPrompt);
        }

        // Initialize Claude CLI
        const claudeCli = new ClaudeCLI(config.claudeCliPath);

        // Check for usage limits and handle accordingly
        const limitStatus = await claudeCli.checkUsageLimit();
        if (limitStatus.hasLimit && limitStatus.resumeTimestamp) {
          logger.info('Usage limit detected, waiting...');
          // TODO: Implement waiting logic
        }

        // Resume Claude session or execute custom command
        if (options.execute) {
          logger.info('Executing custom command after usage limit wait period');
          await CommandExecutor.executeWithSafeguards(options.execute);
        } else {
          await claudeCli.resume(finalPrompt, options.continue || false, config.skipPermissions);
        }
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
      fileOutput: logFile || 'disabled'
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
async function showDebugDiagnostics(options: CLIOptions, config: CLIConfig, prompt: string): Promise<void> {
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
      lines: prompt.split('\n').length
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
      error: systemInfo.claude.error
    });

    // Offer to export debug information
    logger.debug('=== DEBUG EXPORT ===');
    logger.info('Debug information collected successfully');
    logger.info('To export full debug info to file, use: claude-auto-resume --debug --export');

  } catch (error) {
    logger.error('Debug diagnostics failed:', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
