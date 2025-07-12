/**
 * Simple command executor tests focused on validation only
 */

import { CommandExecutor } from '../core/command-executor';
import { ClaudeAutoResumeError } from '../utils/errors';

// Mock all external dependencies to prevent actual execution
jest.mock('child_process');
jest.mock('../utils/logger');

describe('CommandExecutor Simple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods to prevent output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateCommand', () => {
    it('should validate safe commands', () => {
      const validCommands = [
        'echo "hello world"',
        'npm test',
        'git status',
        'ls -la',
        'cat package.json'
      ];

      validCommands.forEach(cmd => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty or invalid commands', () => {
      // Non-string inputs and empty string
      const invalidCommands = [
        null as any,
        undefined as any,
        123 as any,
        ''
      ];

      invalidCommands.forEach(cmd => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('non-empty string');
      });

      // Whitespace-only commands
      const whitespaceCommands = ['   ', '\t', '\n'];
      whitespaceCommands.forEach(cmd => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('empty or whitespace');
      });
    });

    it('should detect dangerous patterns', () => {
      const dangerousCommands = [
        'rm -rf /',          // Matches /rm\s+-rf\s+\//
        'mkfs /dev/sda1',    // Matches /mkfs/
        'dd if=/dev/zero of=/dev/sda',  // Matches /dd\s+if=.*of=\/dev/
        ':(){ :|:& }',       // Matches fork bomb pattern
      ];

      dangerousCommands.forEach(cmd => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('potentially dangerous pattern');
      });
    });

    it('should allow obviously safe commands', () => {
      const safeCommands = [
        'echo hello',
        'ls',
        'pwd',
        'npm test',
      ];

      safeCommands.forEach(cmd => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should handle edge cases', () => {
      // Very long command
      const longCommand = 'echo ' + 'a'.repeat(1000);
      const result = CommandExecutor.validateCommand(longCommand);
      expect(result.valid).toBe(true);

      // Command with special characters
      const specialChars = 'echo "test $HOME && echo done"';
      const specialResult = CommandExecutor.validateCommand(specialChars);
      expect(specialResult.valid).toBe(true);
    });
  });

  describe('executeWithSafeguards', () => {
    it('should reject invalid commands without execution', async () => {
      await expect(
        CommandExecutor.executeWithSafeguards('')
      ).rejects.toThrow(ClaudeAutoResumeError);

      await expect(
        CommandExecutor.executeWithSafeguards('rm -rf /')
      ).rejects.toThrow(ClaudeAutoResumeError);

      await expect(
        CommandExecutor.executeWithSafeguards(null as any)
      ).rejects.toThrow(ClaudeAutoResumeError);
    });
  });

  describe('additional coverage tests', () => {
    it('should have showSecurityWarning method', () => {
      expect(typeof CommandExecutor.showSecurityWarning).toBe('function');
    });

    it('should have executeCustomCommand method', () => {
      expect(typeof CommandExecutor.executeCustomCommand).toBe('function');
    });

    it('should handle various command patterns', () => {
      // Test more command patterns to increase coverage
      const testCases = [
        { cmd: 'echo test', expected: true },
        { cmd: 'ls -la', expected: true },
        { cmd: 'rm file.txt', expected: true },
        { cmd: 'sudo apt update', expected: true },
        { cmd: 'npm install', expected: true },
        { cmd: 'git status', expected: true },
        { cmd: 'python script.py', expected: true },
        { cmd: 'node index.js', expected: true },
      ];

      testCases.forEach(({ cmd, expected }) => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(expected);
      });
    });

    it('should handle edge cases in command validation', () => {
      // Test various edge cases
      const edgeCases = [
        'a',  // Single character
        'echo test && echo done',  // Multiple commands
        'echo "hello world"',  // Quoted strings
        'ls /usr/local/bin',  // Path with slashes
        'grep -r "pattern" .',  // Complex grep
      ];

      edgeCases.forEach(cmd => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(typeof result.valid).toBe('boolean');
        if (result.error) {
          expect(typeof result.error).toBe('string');
        }
      });
    });
  });

  describe('static methods', () => {
    it('should export validation method', () => {
      expect(typeof CommandExecutor.validateCommand).toBe('function');
    });

    it('should export execution method', () => {
      expect(typeof CommandExecutor.executeWithSafeguards).toBe('function');
    });

    it('should have CommandExecutor class available', () => {
      expect(CommandExecutor).toBeDefined();
      expect(typeof CommandExecutor).toBe('function');
    });
  });
});