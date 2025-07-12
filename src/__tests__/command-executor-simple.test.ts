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
        'cat package.json',
      ];

      validCommands.forEach((cmd) => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty or invalid commands', () => {
      // Non-string inputs and empty string
      const invalidCommands = [null as any, undefined as any, 123 as any, ''];

      invalidCommands.forEach((cmd) => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('non-empty string');
      });

      // Whitespace-only commands
      const whitespaceCommands = ['   ', '\t', '\n'];
      whitespaceCommands.forEach((cmd) => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('empty or whitespace');
      });
    });

    it('should detect dangerous patterns', () => {
      const dangerousCommands = [
        'rm -rf /', // Matches /rm\s+-rf\s+\//
        'mkfs /dev/sda1', // Matches /mkfs/
        'dd if=/dev/zero of=/dev/sda', // Matches /dd\s+if=.*of=\/dev/
        ':(){ :|:& }', // Matches fork bomb pattern
      ];

      dangerousCommands.forEach((cmd) => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('potentially dangerous pattern');
      });
    });

    it('should allow obviously safe commands', () => {
      const safeCommands = ['echo hello', 'ls', 'pwd', 'npm test'];

      safeCommands.forEach((cmd) => {
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
      await expect(CommandExecutor.executeWithSafeguards('')).rejects.toThrow(
        ClaudeAutoResumeError
      );

      await expect(CommandExecutor.executeWithSafeguards('rm -rf /')).rejects.toThrow(
        ClaudeAutoResumeError
      );

      await expect(CommandExecutor.executeWithSafeguards(null as any)).rejects.toThrow(
        ClaudeAutoResumeError
      );
    });
  });

  describe('showSecurityWarning method', () => {
    it('should be a function', () => {
      expect(typeof CommandExecutor.showSecurityWarning).toBe('function');
    });
  });

  describe('executeCustomCommand timeout handling', () => {
    it('should handle different timeout values', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Simulate successful completion
            callback(0);
          }
        }),
        kill: jest.fn(),
      };

      spawn.mockReturnValue(mockChild);

      // Test different timeout scenarios
      const result = await CommandExecutor.executeCustomCommand('echo test', false, 1000);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle command timeout', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          // Don't call the close callback to simulate hanging
        }),
        kill: jest.fn(),
      };

      spawn.mockReturnValue(mockChild);

      // Use a very short timeout to trigger timeout handling
      const promise = CommandExecutor.executeCustomCommand('sleep 10', false, 100);
      
      // Fast-forward time to trigger timeout
      setTimeout(() => {
        // Simulate timeout by calling error handler
        const onHandlers = mockChild.on.mock.calls.find(call => call[0] === 'error');
        if (onHandlers) {
          onHandlers[1](new Error('Command timed out'));
        }
      }, 50);

      const result = await promise;
      expect(result.success).toBe(false);
    });
  });

  describe('command validation edge cases', () => {
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
        'a', // Single character
        'echo test && echo done', // Multiple commands
        'echo "hello world"', // Quoted strings
        'ls /usr/local/bin', // Path with slashes
        'grep -r "pattern" .', // Complex grep
      ];

      edgeCases.forEach((cmd) => {
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

  describe('enhanced coverage tests', () => {
    // Mock child_process to test execution paths without actual execution
    const mockSpawn = jest.fn();

    beforeEach(() => {
      // Reset spawn mock
      (require('child_process') as any).spawn = mockSpawn;
    });

    it('should handle showSecurityWarning countdown', async () => {
      const originalSetTimeout = global.setTimeout;
      const setTimeoutSpy = jest.fn((callback, delay) => {
        // Immediately call callback for testing
        callback();
        return 123 as any;
      });
      global.setTimeout = setTimeoutSpy as any;

      await CommandExecutor.showSecurityWarning('test command');

      // Should have been called 5 times for countdown
      expect(setTimeoutSpy).toHaveBeenCalledTimes(5);

      global.setTimeout = originalSetTimeout;
    });

    it('should create proper spawn arguments', async () => {
      // Create a mock child process that doesn't hang
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Immediately call close callback with exit code 0
            process.nextTick(() => callback(0));
          }
        }),
        kill: jest.fn(),
      };

      mockSpawn.mockReturnValue(mockChild);

      // Test that spawn is called with correct arguments
      const command = 'echo test';
      // Await the command to prevent log output after tests complete
      await CommandExecutor.executeCustomCommand(command, false, 1000);

      expect(mockSpawn).toHaveBeenCalledWith('sh', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 1000,
      });
    });

    it('should validate constants are defined', () => {
      // Test that the class has the expected constants
      expect(CommandExecutor['SECURITY_COUNTDOWN_SECONDS']).toBe(5);
      expect(CommandExecutor['MAX_EXECUTION_TIME_MS']).toBe(300000);
    });

    it('should handle error cases in executeWithSafeguards', async () => {
      // Test that validation errors are properly wrapped
      const error = await CommandExecutor.executeWithSafeguards('').catch((e) => e);
      expect(error).toBeInstanceOf(ClaudeAutoResumeError);
      expect(error.message).toContain('Command validation failed');
    });

    it('should validate dangerous pattern variations', () => {
      const dangerousCommands = [
        'rm -rf /',
        'rm  -rf  /', // Extra spaces
        'mkfs.ext4',
        'dd if=/dev/zero of=/dev/sda1',
        ':(){:|:&};', // Fork bomb variation
      ];

      dangerousCommands.forEach((cmd) => {
        const result = CommandExecutor.validateCommand(cmd);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should handle command validation edge cases', () => {
      // Test trimming behavior
      const result1 = CommandExecutor.validateCommand('  echo test  ');
      expect(result1.valid).toBe(true);

      // Test various input types
      const result2 = CommandExecutor.validateCommand(null as any);
      expect(result2.valid).toBe(false);

      const result3 = CommandExecutor.validateCommand(undefined as any);
      expect(result3.valid).toBe(false);

      const result4 = CommandExecutor.validateCommand(123 as any);
      expect(result4.valid).toBe(false);
    });
  });
});
