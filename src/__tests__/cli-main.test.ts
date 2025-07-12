/**
 * CLI main entry point tests
 */

// Mock all dependencies
jest.mock('commander', () => ({
  program: {
    parseAsync: jest.fn().mockResolvedValue(undefined),
  }
}));
jest.mock('../cli/commands');
jest.mock('../core/command-executor');
jest.mock('child_process');

import { Command } from 'commander';
import { main } from '../index';

describe('CLI Main', () => {
  let mockProgram: jest.Mocked<Command>;
  let mockSetupCLI: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock program instance methods
    mockProgram = {
      parseAsync: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock setupCLI
    const { setupCLI } = require('../cli/commands');
    mockSetupCLI = setupCLI;
    mockSetupCLI.mockResolvedValue(undefined);
  });

  afterEach(() => {
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
    program.parseAsync.mockRejectedValue(error);

    // Mock process.exit
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process exit called');
    });

    await expect(main()).rejects.toThrow();
    
    processExitSpy.mockRestore();
  });
});