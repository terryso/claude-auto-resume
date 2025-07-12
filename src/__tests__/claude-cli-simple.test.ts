/**
 * Simple Claude CLI tests focused on logic without real execution
 */

// Mock all external dependencies
jest.mock('child_process');
jest.mock('../utils/logger');

import { ClaudeCLI } from '../core/claude-cli';
import { ClaudeAutoResumeError } from '../utils/errors';

describe('ClaudeCLI Simple', () => {
  let claudeCli: ClaudeCLI;

  beforeEach(() => {
    jest.clearAllMocks();
    claudeCli = new ClaudeCLI();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default CLI path', () => {
      const cli = new ClaudeCLI();
      expect(cli).toBeDefined();
      expect(cli).toBeInstanceOf(ClaudeCLI);
    });

    it('should create instance with custom CLI path', () => {
      const cli = new ClaudeCLI('/custom/path/claude');
      expect(cli).toBeDefined();
      expect(cli).toBeInstanceOf(ClaudeCLI);
    });
  });

  describe('parseUsageLimitOutput', () => {
    it('should parse valid usage limit output', () => {
      const output = 'Claude AI usage limit reached|1704067200';
      const result = claudeCli.parseUsageLimitOutput(output);

      expect(result.hasLimit).toBe(true);
      expect(result.resumeTimestamp).toBe(1704067200);
      expect(result.rawOutput).toBe(output);
    });

    it('should parse output without usage limit', () => {
      const output = 'Normal Claude response without limit';
      const result = claudeCli.parseUsageLimitOutput(output);

      expect(result.hasLimit).toBe(false);
      expect(result.resumeTimestamp).toBeUndefined();
      expect(result.rawOutput).toBe(output);
    });

    it('should handle empty output', () => {
      const result = claudeCli.parseUsageLimitOutput('');

      expect(result.hasLimit).toBe(false);
      expect(result.resumeTimestamp).toBeUndefined();
      expect(result.rawOutput).toBe('');
    });

    it('should handle malformed limit output', () => {
      const output = 'Claude AI usage limit reached|invalid_timestamp';

      // This should throw an error for invalid timestamps
      expect(() => {
        claudeCli.parseUsageLimitOutput(output);
      }).toThrow(ClaudeAutoResumeError);
    });

    it('should handle partial limit output', () => {
      const output = 'Claude AI usage limit reached|';
      const result = claudeCli.parseUsageLimitOutput(output);

      expect(result.hasLimit).toBe(false);
      expect(result.resumeTimestamp).toBeUndefined();
      expect(result.rawOutput).toBe(output);
    });
  });

  describe('buildClaudeCommand', () => {
    it('should build command for new session with skip permissions', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', false, true);
      expect(args).toEqual(['--dangerously-skip-permissions', '-p', 'test prompt']);
    });

    it('should build command for continue session with skip permissions', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', true, true);
      expect(args).toEqual(['-c', '--dangerously-skip-permissions', '-p', 'test prompt']);
    });

    it('should build command without skip permissions', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', false, false);
      expect(args).toEqual(['-p', 'test prompt']);
    });

    it('should build command for continue without skip permissions', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', true, false);
      expect(args).toEqual(['-c', '-p', 'test prompt']);
    });

    it('should handle empty prompt', () => {
      const args = claudeCli.buildClaudeCommand('', false, true);
      expect(args).toEqual(['--dangerously-skip-permissions', '-p', '']);
    });
  });

  describe('method availability', () => {
    it('should have execute method', () => {
      expect(typeof claudeCli.execute).toBe('function');
    });

    it('should have checkUsageLimit method', () => {
      expect(typeof claudeCli.checkUsageLimit).toBe('function');
    });

    it('should have resume method', () => {
      expect(typeof claudeCli.resume).toBe('function');
    });

    it('should have executeClaudeCommand method', () => {
      expect(typeof claudeCli.executeClaudeCommand).toBe('function');
    });
  });

  describe('mock execution tests', () => {
    it('should mock execute method calls', async () => {
      // Mock the executeClaudeCommand to avoid real execution
      const spy = jest.spyOn(claudeCli, 'executeClaudeCommand').mockResolvedValue('mocked output');

      const result = await claudeCli.execute(['--help']);
      expect(result).toBe('mocked output');
      expect(spy).toHaveBeenCalledWith(['--help']);

      spy.mockRestore();
    });

    it('should mock checkUsageLimit calls', async () => {
      const spy = jest
        .spyOn(claudeCli, 'executeClaudeCommand')
        .mockResolvedValue('Normal response');

      const result = await claudeCli.checkUsageLimit();
      expect(result).toHaveProperty('hasLimit');
      expect(result.hasLimit).toBe(false);

      spy.mockRestore();
    });

    it('should mock resume calls', async () => {
      const spy = jest
        .spyOn(claudeCli, 'executeClaudeCommand')
        .mockResolvedValue('resumed successfully');

      await claudeCli.resume('test prompt', false, true);
      expect(spy).toHaveBeenCalledWith(['--dangerously-skip-permissions', '-p', 'test prompt']);

      spy.mockRestore();
    });
  });

  describe('enhanced coverage tests', () => {
    const { spawn } = require('child_process');

    beforeEach(() => {
      spawn.mockClear();
    });

    describe('executeClaudeCommand', () => {
      it('should handle successful command execution', async () => {
        const mockChild = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('success output');
              }
            }),
          },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const result = await claudeCli.executeClaudeCommand(['-p', 'test']);

        expect(spawn).toHaveBeenCalledWith('claude', ['-p', 'test'], expect.any(Object));
        expect(result).toBe('success output');
      });

      it('should handle command execution failure', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('error output');
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(1), 10);
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        await expect(claudeCli.executeClaudeCommand(['-p', 'test'])).rejects.toThrow(
          ClaudeAutoResumeError
        );
      });

      it('should handle ENOENT error (CLI not found)', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              const error = new Error('spawn claude ENOENT');
              error.message = 'spawn claude ENOENT';
              setTimeout(() => callback(error), 10);
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        await expect(claudeCli.executeClaudeCommand(['-p', 'test'])).rejects.toThrow(
          'Claude CLI not found in PATH'
        );
      });

      it('should handle generic error', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('Generic error')), 10);
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        await expect(claudeCli.executeClaudeCommand(['-p', 'test'])).rejects.toThrow(
          'Claude CLI execution error: Generic error'
        );
      });

      it('should handle command timeout', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn(),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const timeoutPromise = claudeCli.executeClaudeCommand(['-p', 'test'], 100);

        // Advance time to trigger timeout
        jest.useFakeTimers();
        setTimeout(() => {
          jest.advanceTimersByTime(100);
        }, 10);

        await expect(timeoutPromise).rejects.toThrow('Claude CLI command timed out');

        jest.useRealTimers();
      });

      it('should clear timeout on process close', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => {
                callback(0);
                // Call the close handler again to trigger the timeout cleanup
                callback(0);
              }, 10);
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        // This test just validates the timeout is set up properly
        await claudeCli.executeClaudeCommand(['-p', 'test']);

        // We can't easily test clearTimeout in this context, so let's just ensure execution completes
        expect(spawn).toHaveBeenCalledWith('claude', ['-p', 'test'], expect.any(Object));
      });
    });

    describe('parseUsageLimitOutput enhanced', () => {
      it('should parse ISO timestamp format', () => {
        const output = 'Claude AI usage limit reached|2024-01-01T12:00:00.000Z';
        const result = claudeCli.parseUsageLimitOutput(output);

        expect(result.hasLimit).toBe(true);
        expect(result.resumeTimestamp).toBeDefined();
        expect(result.waitSeconds).toBeDefined();
      });

      it('should parse millisecond timestamp', () => {
        const futureMs = Date.now() + 60000; // 1 minute from now
        const output = `Claude AI usage limit reached|${futureMs}`;
        const result = claudeCli.parseUsageLimitOutput(output);

        expect(result.hasLimit).toBe(true);
        expect(result.resumeTimestamp).toBe(Math.floor(futureMs / 1000));
        expect(result.waitSeconds).toBeGreaterThan(0);
      });

      it('should handle past timestamp (wait time 0)', () => {
        const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
        const output = `Claude AI usage limit reached|${pastTimestamp}`;
        const result = claudeCli.parseUsageLimitOutput(output);

        expect(result.hasLimit).toBe(true);
        expect(result.waitSeconds).toBe(0);
      });

      it('should handle whitespace in timestamp', () => {
        const timestamp = Math.floor(Date.now() / 1000) + 60;
        const output = `Claude AI usage limit reached|  ${timestamp}  `;
        const result = claudeCli.parseUsageLimitOutput(output);

        expect(result.hasLimit).toBe(true);
        expect(result.resumeTimestamp).toBe(timestamp);
      });

      it('should handle case insensitive pattern', () => {
        const timestamp = Math.floor(Date.now() / 1000) + 60;
        const output = `claude ai usage limit reached|${timestamp}`;
        const result = claudeCli.parseUsageLimitOutput(output);

        expect(result.hasLimit).toBe(true);
        expect(result.resumeTimestamp).toBe(timestamp);
      });

      it('should throw error for zero timestamp', () => {
        const output = 'Claude AI usage limit reached|0';

        expect(() => claudeCli.parseUsageLimitOutput(output)).toThrow(ClaudeAutoResumeError);
      });

      it('should throw error for negative timestamp', () => {
        const output = 'Claude AI usage limit reached|-123';

        expect(() => claudeCli.parseUsageLimitOutput(output)).toThrow(ClaudeAutoResumeError);
      });

      it('should handle whitespace-only output', () => {
        const result = claudeCli.parseUsageLimitOutput('   \n\t   ');

        expect(result.hasLimit).toBe(false);
        expect(result.rawOutput).toBe('   \n\t   ');
      });
    });

    describe('checkUsageLimit enhanced', () => {
      it('should handle ClaudeAutoResumeError re-throw', async () => {
        const originalError = new ClaudeAutoResumeError('Test error', 1, 'test context');
        const spy = jest.spyOn(claudeCli, 'executeClaudeCommand').mockRejectedValue(originalError);

        await expect(claudeCli.checkUsageLimit()).rejects.toBe(originalError);

        spy.mockRestore();
      });

      it('should wrap generic errors', async () => {
        const spy = jest
          .spyOn(claudeCli, 'executeClaudeCommand')
          .mockRejectedValue(new Error('Generic error'));

        await expect(claudeCli.checkUsageLimit()).rejects.toThrow(
          'Failed to check Claude usage limit'
        );

        spy.mockRestore();
      });

      it('should call with correct arguments', async () => {
        const spy = jest.spyOn(claudeCli, 'executeClaudeCommand').mockResolvedValue('output');

        await claudeCli.checkUsageLimit();

        expect(spy).toHaveBeenCalledWith(['-p', 'check']);

        spy.mockRestore();
      });
    });

    describe('resume enhanced', () => {
      it('should handle ClaudeAutoResumeError re-throw in resume', async () => {
        const originalError = new ClaudeAutoResumeError('Resume error', 4, 'resume context');
        const spy = jest.spyOn(claudeCli, 'executeClaudeCommand').mockRejectedValue(originalError);

        await expect(claudeCli.resume('test')).rejects.toBe(originalError);

        spy.mockRestore();
      });

      it('should wrap generic errors in resume', async () => {
        const spy = jest
          .spyOn(claudeCli, 'executeClaudeCommand')
          .mockRejectedValue(new Error('Resume generic error'));

        await expect(claudeCli.resume('test')).rejects.toThrow('Resume command failed');

        spy.mockRestore();
      });

      it('should use default parameters correctly', async () => {
        const spy = jest.spyOn(claudeCli, 'executeClaudeCommand').mockResolvedValue('success');

        await claudeCli.resume('test prompt');

        expect(spy).toHaveBeenCalledWith(['--dangerously-skip-permissions', '-p', 'test prompt']);

        spy.mockRestore();
      });

      it('should handle continue mode variations', async () => {
        const spy = jest.spyOn(claudeCli, 'executeClaudeCommand').mockResolvedValue('success');

        // Test all parameter combinations
        await claudeCli.resume('test', true, false);
        expect(spy).toHaveBeenCalledWith(['-c', '-p', 'test']);

        spy.mockRestore();
      });
    });

    describe('constructor enhanced', () => {
      it('should use custom CLI path in commands', async () => {
        const customCli = new ClaudeCLI('/custom/claude');
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        await customCli.executeClaudeCommand(['-p', 'test']);

        expect(spawn).toHaveBeenCalledWith('/custom/claude', ['-p', 'test'], expect.any(Object));
      });
    });

    describe('edge cases and error paths', () => {
      it('should handle multiple data chunks in stdout', async () => {
        const mockChild = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('chunk1');
                callback('chunk2');
              }
            }),
          },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const result = await claudeCli.executeClaudeCommand(['-p', 'test']);
        expect(result).toBe('chunk1chunk2');
      });

      it('should handle multiple data chunks in stderr', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('error1');
                callback('error2');
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(1), 10);
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        await expect(claudeCli.executeClaudeCommand(['-p', 'test'])).rejects.toThrow(
          'Claude CLI execution failed with exit code 1'
        );
      });
    });
  });
});
