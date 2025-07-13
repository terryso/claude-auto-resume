/**
 * CLI main entry point tests
 */

// Mock all dependencies
jest.mock('commander', () => ({
  program: {
    parseAsync: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../cli/commands');
jest.mock('../core/command-executor');
jest.mock('child_process');

// CLI main tests
import { main } from '../index';

describe('CLI Main', () => {
  // Test setup variables
  let mockSetupCLI: jest.Mock;
  let originalArgv: string[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Save original argv and set to minimal test values to avoid commander parsing issues
    originalArgv = process.argv;
    process.argv = ['node', 'test'];

    // Mock program setup for testing

    // Mock setupCLI
    const { setupCLI } = require('../cli/commands');
    mockSetupCLI = setupCLI;
    mockSetupCLI.mockResolvedValue(undefined);

    // Mock console methods to reduce noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore original argv
    process.argv = originalArgv;
    jest.restoreAllMocks();
  });

  it('should create and setup CLI program', async () => {
    const { program } = require('commander');

    await main();

    expect(mockSetupCLI).toHaveBeenCalledWith(program);
    expect(program.parseAsync).toHaveBeenCalled();
  });

  it('should handle CLI setup errors', async () => {
    const error = new Error('Setup failed');
    mockSetupCLI.mockRejectedValue(error);

    // Mock console.error and process.exit
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process exit called');
    });

    await expect(main()).rejects.toThrow();

    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should handle parse errors', async () => {
    const { program } = require('commander');
    const error = new Error('Parse failed');

    // Mock parseAsync to reject with error
    program.parseAsync.mockRejectedValue(error);

    // Mock process.exit
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process exit called');
    });

    await expect(main()).rejects.toThrow('Process exit called');

    processExitSpy.mockRestore();
  });
});
