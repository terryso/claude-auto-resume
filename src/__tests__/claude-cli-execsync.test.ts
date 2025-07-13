/**
 * Claude CLI tests for execSync implementation
 */

// Mock all external dependencies
jest.mock('child_process');
jest.mock('../utils/logger');

import { ClaudeCLI } from '../core/claude-cli';
import { ClaudeAutoResumeError } from '../utils/errors';
import { execSync } from 'child_process';

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('ClaudeCLI with execSync', () => {
  let claudeCli: ClaudeCLI;

  beforeEach(() => {
    jest.clearAllMocks();
    claudeCli = new ClaudeCLI();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
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

  describe('executeClaudeCommand', () => {
    it('should handle successful command execution', async () => {
      mockExecSync.mockReturnValue('success output');

      const result = await claudeCli.executeClaudeCommand(['-p', 'test']);

      expect(mockExecSync).toHaveBeenCalledWith(
        'claude -p test',
        expect.objectContaining({
          encoding: 'utf8',
          env: process.env,
          shell: expect.any(String),
        })
      );
      expect(result).toBe('success output');
    });

    it('should handle command execution failure', async () => {
      const error = new Error('Command failed') as any;
      error.status = 1;
      error.stderr = 'error message';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await expect(claudeCli.executeClaudeCommand(['-p', 'test'])).rejects.toThrow(
        ClaudeAutoResumeError
      );
    });

    it('should handle ENOENT error (CLI not found)', async () => {
      const error = new Error('spawn claude ENOENT') as any;
      error.code = 'ENOENT';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await expect(claudeCli.executeClaudeCommand(['-p', 'test'])).rejects.toThrow(
        'Claude CLI not found in PATH'
      );
    });

    it('should handle timeout error', async () => {
      const error = new Error('Timeout') as any;
      error.status = null; // Timeout/signal
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await expect(claudeCli.executeClaudeCommand(['-p', 'test'], 100)).rejects.toThrow(
        'Claude CLI command timed out'
      );
    });

    it('should use custom CLI path', async () => {
      const customCli = new ClaudeCLI('/custom/claude');
      mockExecSync.mockReturnValue('success');

      await customCli.executeClaudeCommand(['-p', 'test']);

      expect(mockExecSync).toHaveBeenCalledWith('/custom/claude -p test', expect.any(Object));
    });

    it('should handle complex arguments with quotes', async () => {
      mockExecSync.mockReturnValue('success');

      await claudeCli.executeClaudeCommand(['-p', 'test with spaces']);

      expect(mockExecSync).toHaveBeenCalledWith(
        'claude -p "test with spaces"',
        expect.any(Object)
      );
    });

    it('should include proper environment and options', async () => {
      mockExecSync.mockReturnValue('success');

      await claudeCli.executeClaudeCommand(['-p', 'test']);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          encoding: 'utf8',
          env: process.env,
          cwd: process.cwd(),
          shell: expect.any(String),
          stdio: ['inherit', 'pipe', 'pipe'],
        })
      );
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

    it('should handle no usage limit', () => {
      const output = 'No usage limit';
      const result = claudeCli.parseUsageLimitOutput(output);

      expect(result.hasLimit).toBe(false);
      expect(result.resumeTimestamp).toBeUndefined();
      expect(result.rawOutput).toBe(output);
    });

    it('should handle invalid timestamp', () => {
      const output = 'Claude AI usage limit reached|invalid';

      expect(() => claudeCli.parseUsageLimitOutput(output)).toThrow(ClaudeAutoResumeError);
    });
  });

  describe('checkUsageLimit', () => {
    it('should check usage limit successfully', async () => {
      mockExecSync.mockReturnValue('Claude AI usage limit reached|1704067200');

      const result = await claudeCli.checkUsageLimit();

      expect(result.hasLimit).toBe(true);
      expect(result.resumeTimestamp).toBe(1704067200);
    });

    it('should handle check failure', async () => {
      const error = new Error('Command failed') as any;
      error.status = 1;
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await expect(claudeCli.checkUsageLimit()).rejects.toThrow(ClaudeAutoResumeError);
    });
  });

  describe('buildClaudeCommand', () => {
    it('should build command with all flags', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', true, true);

      expect(args).toEqual(['-c', '--dangerously-skip-permissions', '-p', 'test prompt']);
    });

    it('should build command without continue flag', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', false, true);

      expect(args).toEqual(['--dangerously-skip-permissions', '-p', 'test prompt']);
    });

    it('should build command without skip permissions', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', true, false);

      expect(args).toEqual(['-c', '-p', 'test prompt']);
    });

    it('should build minimal command', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', false, false);

      expect(args).toEqual(['-p', 'test prompt']);
    });
  });

  describe('resume', () => {
    it('should resume successfully', async () => {
      mockExecSync.mockReturnValue('Resume output');

      const result = await claudeCli.resume('test prompt');

      expect(result).toBe('Resume output');
      expect(mockExecSync).toHaveBeenCalledWith(
        'claude --dangerously-skip-permissions -p "test prompt"',
        expect.any(Object)
      );
    });

    it('should resume with continue flag', async () => {
      mockExecSync.mockReturnValue('Continue output');

      const result = await claudeCli.resume('test prompt', true);

      expect(result).toBe('Continue output');
      expect(mockExecSync).toHaveBeenCalledWith(
        'claude -c --dangerously-skip-permissions -p "test prompt"',
        expect.any(Object)
      );
    });

    it('should handle resume failure', async () => {
      const error = new Error('Resume failed') as any;
      error.status = 1;
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await expect(claudeCli.resume('test prompt')).rejects.toThrow(ClaudeAutoResumeError);
    });
  });

  describe('legacy execute method', () => {
    it('should work as alias for executeClaudeCommand', async () => {
      mockExecSync.mockReturnValue('legacy output');

      const result = await claudeCli.execute(['-p', 'test']);

      expect(result).toBe('legacy output');
      expect(mockExecSync).toHaveBeenCalled();
    });
  });
});
