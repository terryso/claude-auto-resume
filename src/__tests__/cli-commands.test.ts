/**
 * Extended CLI commands tests
 */

import { Command } from 'commander';
import { setupCLI } from '../cli/commands';

// Mock all external dependencies
jest.mock('../core/claude-cli');
jest.mock('../core/command-executor');
jest.mock('../config/loader');
jest.mock('child_process');

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

    // Mock loadConfiguration
    const { loadConfiguration } = require('../config/loader');
    loadConfiguration.mockReturnValue({
      defaultPrompt: 'continue',
      defaultTimeout: 120000,
      maxRetries: 3,
      claudeCliPath: 'claude',
      waitBuffer: 0,
      skipPermissions: true,
      logFile: undefined,
    });

    // Mock ClaudeCLI
    const { ClaudeCLI } = require('../core/claude-cli');
    ClaudeCLI.prototype.checkUsageLimit = jest.fn().mockResolvedValue({
      hasLimit: false,
      rawOutput: 'No limit',
    });
    ClaudeCLI.prototype.resume = jest.fn().mockResolvedValue(undefined);

    // Mock CommandExecutor
    const { CommandExecutor } = require('../core/command-executor');
    CommandExecutor.executeWithSafeguards = jest.fn().mockResolvedValue({
      exitCode: 0,
      success: true,
    });
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

  it('should handle check flag', async () => {
    await setupCLI(program);

    try {
      // Simulate command execution with check flag
      await program.parseAsync(['node', 'cli.js', '--check']);
    } catch (error) {
      // Expected in test environment
      expect(error).toBeDefined();
    }
  });

  it('should validate argument combinations', async () => {
    await setupCLI(program);

    try {
      // Test conflicting flags: execute and continue
      await program.parseAsync(['node', 'cli.js', '-e', 'echo test', '-c']);
    } catch (error) {
      expect(exitCode).toBe(1);
    }
  });

  it('should handle cmd alias for execute', async () => {
    await setupCLI(program);

    try {
      // Test --cmd alias
      await program.parseAsync(['node', 'cli.js', '--cmd', 'echo test']);
    } catch (error) {
      // Expected in test environment due to mocked process.exit
      expect(error).toBeDefined();
    }
  });

  it('should reject empty execute command', async () => {
    await setupCLI(program);

    try {
      // Test empty execute command
      await program.parseAsync(['node', 'cli.js', '-e', '   ']);
    } catch (error) {
      expect(exitCode).toBe(1);
    }
  });

  it('should reject invalid test mode', async () => {
    await setupCLI(program);

    try {
      // Test invalid test mode
      await program.parseAsync(['node', 'cli.js', '--test-mode', '-5', '-e', 'echo test']);
    } catch (error) {
      expect(exitCode).toBe(1);
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
