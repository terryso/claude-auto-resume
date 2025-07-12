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
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Mock process.exit
    originalExit = process.exit;
    process.exit = jest.fn(() => {
      throw new Error('Process exit called');
    }) as any;

    // Mock console.error
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    process.exit = originalExit;
    console.error = originalConsoleError;
  });

  it('should have a callable main function', () => {
    expect(typeof mainModule.main).toBe('function');
    expect(mainModule.main.length).toBe(0); // main() takes no arguments
  });
});
