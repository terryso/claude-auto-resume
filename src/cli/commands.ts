/**
 * CLI Commands and Options Configuration
 */

import { Command } from 'commander';
import { CLIOptions } from './types';
import { loadConfiguration } from '../config';
import { ClaudeCLI } from '../core';
import { logger, validatePrompt } from '../utils';

/**
 * Sets up the CLI commands and options
 */
export async function setupCLI(program: Command): Promise<void> {
  const config = loadConfiguration();

  program
    .name('claude-auto-resume')
    .description('Automatically resumes Claude CLI tasks after usage limits are lifted')
    .version('1.0.0')
    .option('-p, --prompt <prompt>', 'Custom prompt to send to Claude', config.defaultPrompt)
    .option('-c, --continue', 'Continue previous conversation instead of starting new session')
    .argument('[prompt]', 'Custom prompt as positional argument')
    .addHelpText(
      'after',
      `
Examples:
  $ claude-auto-resume                    # Use default prompt "continue"
  $ claude-auto-resume "fix the bug"      # Use custom prompt
  $ claude-auto-resume -c "continue"      # Continue previous conversation
  $ npx claude-auto-resume "help me"      # Run via npx without installing
  
Install globally:
  $ npm install -g claude-auto-resume
  
Use without installing:
  $ npx claude-auto-resume [options] [prompt]`
    )
    .action(async (promptArg: string | undefined, options: CLIOptions) => {
      try {
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

        // Initialize Claude CLI
        const claudeCli = new ClaudeCLI(config.claudeCliPath);

        // Check for usage limits and handle accordingly
        const limitStatus = await claudeCli.checkUsageLimit();
        if (limitStatus.hasLimit && limitStatus.timestamp) {
          logger.info('Usage limit detected, waiting...');
          // TODO: Implement waiting logic
        }

        // Resume Claude session
        await claudeCli.resume(finalPrompt, options.continue || false);
      } catch (error) {
        logger.error('Failed to execute command:', error);
        process.exit(1);
      }
    });

  // Add help command
  program
    .command('help')
    .description('Show help information')
    .action(() => {
      program.help();
    });
}
