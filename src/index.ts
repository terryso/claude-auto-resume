#!/usr/bin/env node

/**
 * Claude Auto Resume - TypeScript CLI
 * Main entry point for the TypeScript version of claude-auto-resume
 */

import { program } from 'commander';
import { setupCLI } from './cli/commands';
import { logger } from './utils';

// Export core modules
export { ClaudeCLI } from './core/claude-cli';
export { TimeUtils } from './core/time-utils';
export { NetworkUtils } from './core/network';
export { CommandExecutor } from './core/command-executor';

// Export configuration
export { loadConfiguration } from './config/loader';

// Export utilities
export { 
  logger,
  validatePrompt,
  ClaudeAutoResumeError
} from './utils';

export async function main(): Promise<void> {
  try {
    await setupCLI(program);
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.error('Error:', { error: error instanceof Error ? error.message : 'Unknown error' });
    process.exit(1);
  }
}

// Execute main function only when run directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error:', { error });
    process.exit(1);
  });
}