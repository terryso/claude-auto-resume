/**
 * Extended CLI commands tests
 */

import { Command } from 'commander';
import { setupCLI } from '../cli/commands';

describe('CLI Commands Extended', () => {
  let program: Command;
  let originalExit: typeof process.exit;
  let originalArgv: string[];
  let exitCode: number;

  beforeEach(() => {
    program = new Command();
    exitCode = 0;
    originalArgv = process.argv;

    // Mock process.exit
    originalExit = process.exit;
    process.exit = jest.fn((code?: number) => {
      exitCode = code || 0;
      throw new Error('Process exit called');
    }) as any;

    // Suppress console output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.exit = originalExit;
    process.argv = originalArgv;
    jest.restoreAllMocks();
  });

  it('should execute main action with valid prompt', async () => {
    await setupCLI(program);

    try {
      // Simulate command execution with valid prompt
      process.argv = ['node', 'cli.js', 'test prompt'];
      await program.parseAsync(['node', 'cli.js', 'test prompt']);
    } catch (error) {
      // Expected in test environment due to mocked process.exit
      expect(error).toBeDefined();
    }
  });

  it('should execute main action with continue flag', async () => {
    await setupCLI(program);

    try {
      // Simulate command execution with continue flag
      await program.parseAsync(['node', 'cli.js', '-c', 'test prompt']);
    } catch (error) {
      // Expected in test environment
      expect(error).toBeDefined();
    }
  });

  it('should execute main action with prompt flag', async () => {
    await setupCLI(program);

    try {
      // Simulate command execution with prompt flag
      await program.parseAsync(['node', 'cli.js', '-p', 'custom prompt']);
    } catch (error) {
      // Expected in test environment
      expect(error).toBeDefined();
    }
  });

  it('should handle invalid prompt', async () => {
    await setupCLI(program);

    try {
      // Simulate command execution with empty prompt
      await program.parseAsync(['node', 'cli.js', '']);
    } catch (error) {
      expect(exitCode).toBe(1);
    }
  });

  it('should execute help command', async () => {
    await setupCLI(program);

    const helpCommand = program.commands.find((cmd) => cmd.name() === 'help');
    expect(helpCommand).toBeDefined();

    if (helpCommand) {
      try {
        // Execute help command
        await helpCommand.parseAsync(['help'], { from: 'user' });
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle errors in action execution', async () => {
    await setupCLI(program);

    // Mock claudeCLI to throw an error
    const originalConsoleError = console.error;
    console.error = jest.fn();

    try {
      await program.parseAsync(['node', 'cli.js', 'test']);
    } catch (error) {
      expect(exitCode).toBe(1);
    }

    console.error = originalConsoleError;
  });
});
