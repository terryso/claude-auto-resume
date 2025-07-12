/**
 * Configuration module tests
 */

import { loadConfiguration } from '../config/loader';
import type { CLIConfig } from '../config/types';

describe('Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalExit: typeof process.exit;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Save original environment and functions
    originalEnv = { ...process.env };
    originalExit = process.exit;
    originalConsoleError = console.error;

    // Mock process.exit and console.error
    process.exit = jest.fn() as any;
    console.error = jest.fn();

    // Clear environment variables
    delete process.env.CLAUDE_AUTO_RESUME_WAIT_BUFFER;
    delete process.env.CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS;
    delete process.env.CLAUDE_AUTO_RESUME_LOG_FILE;
  });

  afterEach(() => {
    // Restore original environment and functions
    process.env = originalEnv;
    process.exit = originalExit;
    console.error = originalConsoleError;
  });

  describe('loadConfiguration', () => {
    it('should return default configuration', () => {
      const config = loadConfiguration();

      expect(config).toBeDefined();
      expect(config.defaultPrompt).toBe('continue');
      expect(config.defaultTimeout).toBe(120000);
      expect(config.maxRetries).toBe(3);
      expect(config.claudeCliPath).toBe('claude');
      expect(config.waitBuffer).toBe(0);
      expect(config.skipPermissions).toBe(true);
      expect(config.logFile).toBeUndefined();
    });

    it('should return a valid CLIConfig object', () => {
      const config = loadConfiguration();

      expect(typeof config.defaultPrompt).toBe('string');
      expect(typeof config.defaultTimeout).toBe('number');
      expect(typeof config.maxRetries).toBe('number');
      expect(typeof config.claudeCliPath).toBe('string');
      expect(typeof config.waitBuffer).toBe('number');
      expect(typeof config.skipPermissions).toBe('boolean');

      expect(config.defaultTimeout).toBeGreaterThan(0);
      expect(config.maxRetries).toBeGreaterThan(0);
      expect(config.waitBuffer).toBeGreaterThanOrEqual(0);
    });

    it('should parse valid CLAUDE_AUTO_RESUME_WAIT_BUFFER', () => {
      process.env.CLAUDE_AUTO_RESUME_WAIT_BUFFER = '30';
      const config = loadConfiguration();
      expect(config.waitBuffer).toBe(30);
    });

    it('should handle invalid CLAUDE_AUTO_RESUME_WAIT_BUFFER', () => {
      process.env.CLAUDE_AUTO_RESUME_WAIT_BUFFER = 'invalid';
      expect(() => loadConfiguration(false)).toThrow();
    });

    it('should handle negative CLAUDE_AUTO_RESUME_WAIT_BUFFER', () => {
      process.env.CLAUDE_AUTO_RESUME_WAIT_BUFFER = '-5';
      expect(() => loadConfiguration(false)).toThrow();
    });

    it('should parse valid CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS values', () => {
      const trueValues = ['true', 'yes', '1', 'on', 'TRUE', 'YES', 'ON'];
      const falseValues = ['false', 'no', '0', 'off', 'FALSE', 'NO', 'OFF'];

      for (const value of trueValues) {
        process.env.CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS = value;
        const config = loadConfiguration();
        expect(config.skipPermissions).toBe(true);
      }

      for (const value of falseValues) {
        process.env.CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS = value;
        const config = loadConfiguration();
        expect(config.skipPermissions).toBe(false);
      }
    });

    it('should handle invalid CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS', () => {
      process.env.CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS = 'invalid';
      expect(() => loadConfiguration(false)).toThrow();
    });

    it('should handle empty CLAUDE_AUTO_RESUME_LOG_FILE', () => {
      process.env.CLAUDE_AUTO_RESUME_LOG_FILE = '';
      const config = loadConfiguration();
      expect(config.logFile).toBeUndefined();
    });

    it('should validate CLAUDE_AUTO_RESUME_LOG_FILE directory access', () => {
      // Use /tmp directory which should be writable
      process.env.CLAUDE_AUTO_RESUME_LOG_FILE = '/tmp/test-log.txt';
      const config = loadConfiguration();
      expect(config.logFile).toBe('/tmp/test-log.txt');
    });

    it('should handle invalid CLAUDE_AUTO_RESUME_LOG_FILE path', () => {
      // Set to a non-writable path
      process.env.CLAUDE_AUTO_RESUME_LOG_FILE = '/root/forbidden/test.log';
      
      expect(() => {
        loadConfiguration(false);
      }).toThrow(/Invalid CLAUDE_AUTO_RESUME_LOG_FILE path/);
    });

    it('should create directory for log file if it does not exist', () => {
      const fs = require('fs');
      const path = require('path');
      
      // Use a temporary directory that we can safely create/delete
      const testDir = '/tmp/claude-test-dir-' + Date.now();
      const testLogFile = path.join(testDir, 'test.log');
      
      // Ensure directory doesn't exist initially
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      
      process.env.CLAUDE_AUTO_RESUME_LOG_FILE = testLogFile;
      
      const config = loadConfiguration();
      expect(config.logFile).toBe(testLogFile);
      
      // Check that directory was created
      expect(fs.existsSync(testDir)).toBe(true);
      
      // Cleanup
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should handle various environment variable edge cases', () => {
      // Test empty values
      process.env.CLAUDE_AUTO_RESUME_WAIT_BUFFER = '';
      process.env.CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS = '';
      
      const config = loadConfiguration();
      expect(config.waitBuffer).toBe(0); // Default value
      expect(config.skipPermissions).toBe(true); // Default value
    });
  });
});
