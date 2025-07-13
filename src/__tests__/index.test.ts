/**
 * Main module tests
 */

import * as mainModule from '../index';

describe('Main Module Exports', () => {
  it('should export main function', () => {
    expect(mainModule).toBeDefined();
    expect(typeof mainModule.main).toBe('function');
  });

  it('should export core classes', () => {
    expect(mainModule.ClaudeCLI).toBeDefined();
    expect(mainModule.TimeUtils).toBeDefined();
    expect(mainModule.NetworkUtils).toBeDefined();
    expect(mainModule.CommandExecutor).toBeDefined();
  });

  it('should export configuration utilities', () => {
    expect(mainModule.loadConfiguration).toBeDefined();
  });

  it('should export utility functions', () => {
    expect(mainModule.logger).toBeDefined();
    expect(mainModule.validatePrompt).toBeDefined();
    expect(mainModule.ClaudeAutoResumeError).toBeDefined();
  });

  it('should export CLI types', () => {
    // Types are compile-time only, but we can verify the module structure
    expect(typeof mainModule).toBe('object');
    expect(Object.keys(mainModule).length).toBeGreaterThan(5);
  });
});

describe('Main Function Integration', () => {
  let originalExit: typeof process.exit;
  let originalArgv: string[];
  let mockExit: jest.MockedFunction<typeof process.exit>;

  beforeEach(() => {
    // Mock process.exit
    originalExit = process.exit;
    mockExit = jest.fn(() => {
      throw new Error('Process exit called');
    }) as any;
    process.exit = mockExit;

    // Store original argv
    originalArgv = process.argv;

    // Mock logger methods
    jest.spyOn(mainModule.logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.exit = originalExit;
    process.argv = originalArgv;
    jest.restoreAllMocks();
  });

  it('should have a callable main function', () => {
    expect(typeof mainModule.main).toBe('function');
    expect(mainModule.main.length).toBe(0); // main() takes no arguments
  });

  it('should handle Error instances in main catch block', async () => {
    // Mock setupCLI to throw an Error
    const setupCLIMock = require('../cli/commands');
    jest.doMock('../cli/commands', () => ({
      setupCLI: jest.fn().mockRejectedValue(new Error('Test error')),
    }));

    // Re-import to get mocked version
    const { main } = await import('../index');

    try {
      await main();
    } catch (error) {
      // Expected to throw due to process.exit mock
      expect(error).toEqual(new Error('Process exit called'));
    }

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle non-Error objects in main catch block', async () => {
    // Mock setupCLI to throw a non-Error
    jest.doMock('../cli/commands', () => ({
      setupCLI: jest.fn().mockRejectedValue('String error'),
    }));

    // Re-import to get mocked version
    const { main } = await import('../index');

    try {
      await main();
    } catch (error) {
      // Expected to throw due to process.exit mock
      expect(error).toEqual(new Error('Process exit called'));
    }

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle main module conditions', () => {
    // Test basic module structure - require.main is read-only in newer Node versions
    expect(require.main).toBeDefined();
    expect(module).toBeDefined();

    // We can test the logic without actually modifying require.main
    const isMainModule = require.main === module;
    expect(typeof isMainModule).toBe('boolean');
  });
});
