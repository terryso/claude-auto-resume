#!/usr/bin/env node

/**
 * Claude Auto Resume - TypeScript CLI
 * Main entry point for the TypeScript version of claude-auto-resume
 */

import { program } from 'commander';
import { setupCLI } from './cli/commands';

async function main(): Promise<void> {
  try {
    await setupCLI(program);
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});