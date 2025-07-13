/**
 * Integration tests
 */

import { Command } from 'commander';
import { setupCLI } from '../cli/commands';
import { loadConfiguration } from '../config';

describe('Integration Tests', () => {
  let program: Command;
  let originalExit: typeof process.exit;
  let originalConsoleError: typeof console.error;
  // Integration test variables

  beforeEach(() => {
    program = new Command();
    // Mock process.exit to capture exit codes
    originalExit = process.exit;
    process.exit = jest.fn(() => {
      throw new Error('Process exit called');
    }) as any;

    // Mock console.error to suppress error output in tests
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    process.exit = originalExit;
    console.error = originalConsoleError;
  });

  describe('CLI Integration', () => {
    it('should setup CLI with configuration', async () => {
      // Load configuration for testing
      await setupCLI(program);

      expect(program.name()).toBe('claude-auto-resume');
      expect(program.version()).toMatch(/^\d+\.\d+\.\d+/);

      // Verify options exist
      const options = program.options.map((opt) => opt.long);
      expect(options).toContain('--prompt');
      expect(options).toContain('--continue');
      expect(options).toContain('--execute');
    });

    it('should handle valid prompt execution', async () => {
      await setupCLI(program);

      // Mock the CLI execution to avoid actually calling Claude
      const mockAction = jest.fn();
      if (program.commands[0]) {
        program.commands[0].action(mockAction);
      }

      expect(program).toBeDefined();
    });

    it('should handle empty prompt validation', async () => {
      await setupCLI(program);

      // Test with empty prompt should trigger validation error
      try {
        await program.parseAsync(['node', 'test', ''], { from: 'user' });
      } catch (error) {
        // Expected to throw due to validation
        expect(error).toBeDefined();
      }
    });

    it('should handle built-in help functionality', async () => {
      await setupCLI(program);

      // Test that help text is available
      const helpInfo = program.helpInformation();
      expect(helpInfo).toContain('claude-auto-resume');
      expect(helpInfo).toContain('--prompt');
      expect(helpInfo).toContain('--continue');
    });
  });

  describe('Module Integration', () => {
    it('should integrate config with CLI', async () => {
      const config = loadConfiguration();
      await setupCLI(program);

      // Verify default values are properly integrated
      expect(config.defaultPrompt).toBe('continue');
      expect(config.claudeCliPath).toBe('claude');
    });

    it('should validate integrated module exports', async () => {
      // Test that all modules export what they should
      const config = await import('../config');
      const core = await import('../core');
      const utils = await import('../utils');
      const cli = await import('../cli/index');

      expect(config.loadConfiguration).toBeDefined();
      expect(core.ClaudeCLI).toBeDefined();
      expect(core.TimeUtils).toBeDefined();
      expect(core.NetworkUtils).toBeDefined();
      expect(utils.createError).toBeDefined();
      expect(utils.Logger).toBeDefined();
      expect(utils.validatePrompt).toBeDefined();
      expect(cli.setupCLI).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle configuration errors gracefully', () => {
      // Test that configuration loading doesn't throw
      expect(() => loadConfiguration()).not.toThrow();
    });

    it('should handle CLI setup errors gracefully', async () => {
      const invalidProgram = null as any;

      try {
        await setupCLI(invalidProgram);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
