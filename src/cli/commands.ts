/**
 * CLI Commands and Options Configuration
 */

import { Command } from 'commander';
import { CLIOptions } from './types';
import { loadConfiguration } from '../config';
import { ClaudeCLI, CommandExecutor } from '../core';
import { logger, validatePrompt } from '../utils';

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
    .argument('[prompt]', 'Custom prompt as positional argument')
    .addHelpText(
      'after',
      `
Examples:
  $ claude-auto-resume                    # Use default prompt "continue"
  $ claude-auto-resume "fix the bug"      # Use custom prompt
  $ claude-auto-resume -p "continue"      # Use custom prompt via flag
  $ claude-auto-resume -c "review code"   # Continue previous conversation
  $ claude-auto-resume -e "npm test"      # Execute command after wait period
  $ claude-auto-resume --cmd "python app.py"  # Execute after usage limit wait
  $ claude-auto-resume --test-mode 10 -e "echo test"  # [DEV] Test with 10s wait
  $ npx claude-auto-resume "help me"      # Run via npx without installing
  
Install globally:
  $ npm install -g claude-auto-resume
  
Use without installing:
  $ npx claude-auto-resume [options] [prompt]

⚠️  Security Warning: Default uses --dangerously-skip-permissions. Use only in trusted environments.`
    )
    .action(async (promptArg: string | undefined, options: CLIOptions) => {
      try {
        // Handle --cmd alias for --execute
        if (options.cmd && !options.execute) {
          options.execute = options.cmd;
        }

        // Validate argument combinations
        if (options.execute && options.continue) {
          logger.error(
            'Cannot use both custom command execution (-e/--execute/--cmd) and continue flag (-c/--continue).'
          );
          logger.error('These options are mutually exclusive.');
          logger.error("Use 'claude-auto-resume --help' to see usage examples.");
          process.exit(1);
        }

        if (options.execute && !options.execute.trim()) {
          logger.error('Empty command provided for execution.');
          logger.error('Provide a command to execute after -e/--execute/--cmd flag.');
          process.exit(1);
        }

        if (typeof options.testMode === 'number' && options.testMode <= 0) {
          logger.error('Invalid test mode value. Must be a positive integer (seconds).');
          logger.error("Example: claude-auto-resume --test-mode 10 -e 'echo test'");
          process.exit(1);
        }

        // Handle system check
        if (options.check) {
          await showSystemCheck();
          return;
        }

        // Use positional argument if provided, otherwise use flag or default
        const finalPrompt = promptArg || options.prompt || config.defaultPrompt;

        // Validate prompt
        if (!validatePrompt(finalPrompt)) {
          logger.error('Invalid prompt provided');
          process.exit(1);
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
        logger.error('Failed to execute command:', error);
        process.exit(1);
      }
    });
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
    logger.info(`Claude CLI Version: ${claudeVersion}`);

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
}
