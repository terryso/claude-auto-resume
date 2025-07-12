/**
 * Core business logic tests
 */

import { ClaudeCLI, TimeUtils, NetworkUtils } from '../core';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('Core Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to prevent test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ClaudeCLI', () => {
    let claudeCli: ClaudeCLI;

    beforeEach(() => {
      claudeCli = new ClaudeCLI();
    });

    it('should initialize with default CLI path', () => {
      expect(claudeCli).toBeDefined();
    });

    it('should initialize with custom CLI path', () => {
      const customCli = new ClaudeCLI('/custom/path/claude');
      expect(customCli).toBeDefined();
    });

    it('should parse usage limit output correctly', () => {
      const testOutput = 'Claude AI usage limit reached|1704067200';
      const result = claudeCli.parseUsageLimitOutput(testOutput);

      expect(result.hasLimit).toBe(true);
      expect(result.resumeTimestamp).toBe(1704067200);
      expect(result.rawOutput).toBe(testOutput);
    });

    it('should parse empty output correctly', () => {
      const result = claudeCli.parseUsageLimitOutput('');

      expect(result.hasLimit).toBe(false);
      expect(result.resumeTimestamp).toBeUndefined();
      expect(result.rawOutput).toBe('');
    });

    it('should parse non-limit output correctly', () => {
      const testOutput = 'Normal Claude response';
      const result = claudeCli.parseUsageLimitOutput(testOutput);

      expect(result.hasLimit).toBe(false);
      expect(result.resumeTimestamp).toBeUndefined();
      expect(result.rawOutput).toBe(testOutput);
    });

    it('should build Claude command correctly for new session', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', false, true);
      expect(args).toEqual(['--dangerously-skip-permissions', '-p', 'test prompt']);
    });

    it('should build Claude command correctly for continue mode', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', true, true);
      expect(args).toEqual(['-c', '--dangerously-skip-permissions', '-p', 'test prompt']);
    });

    it('should build Claude command without skip permissions', () => {
      const args = claudeCli.buildClaudeCommand('test prompt', false, false);
      expect(args).toEqual(['-p', 'test prompt']);
    });

    it('should execute commands and return output', async () => {
      // Mock executeClaudeCommand to avoid actual CLI execution
      const spy = jest
        .spyOn(claudeCli, 'executeClaudeCommand')
        .mockResolvedValue('Mock CLI output');

      const result = await claudeCli.execute(['--help']);
      expect(result).toBe('Mock CLI output');

      spy.mockRestore();
    });

    it('should check usage limit', async () => {
      // Mock executeClaudeCommand to return no limit
      const spy = jest
        .spyOn(claudeCli, 'executeClaudeCommand')
        .mockResolvedValue('Normal response');

      const result = await claudeCli.checkUsageLimit();
      expect(result).toHaveProperty('hasLimit');
      expect(result.hasLimit).toBe(false);

      spy.mockRestore();
    });

    it('should resume with prompt in new session mode', async () => {
      const spy = jest.spyOn(claudeCli, 'executeClaudeCommand').mockResolvedValue('success');

      await claudeCli.resume('test prompt', false, true);

      expect(spy).toHaveBeenCalledWith(['--dangerously-skip-permissions', '-p', 'test prompt']);
      spy.mockRestore();
    });

    it('should resume with prompt in continue mode', async () => {
      const spy = jest.spyOn(claudeCli, 'executeClaudeCommand').mockResolvedValue('success');

      await claudeCli.resume('test prompt', true, true);

      expect(spy).toHaveBeenCalledWith([
        '-c',
        '--dangerously-skip-permissions',
        '-p',
        'test prompt',
      ]);
      spy.mockRestore();
    });
  });

  describe('TimeUtils', () => {
    it('should parse Unix timestamp correctly', () => {
      const timestamp = TimeUtils.parseTimestamp('1704067200');
      expect(timestamp).toBe(1704067200);
    });

    it('should parse ISO date string correctly', () => {
      const timestamp = TimeUtils.parseTimestamp('2024-01-01T00:00:00.000Z');
      expect(timestamp).toBe(1704067200);
    });

    it('should calculate wait time correctly', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
      const waitTime = TimeUtils.calculateWaitTime(futureTimestamp, 0);

      expect(waitTime).toBeGreaterThan(290);
      expect(waitTime).toBeLessThanOrEqual(300);
    });

    it('should return 0 for past timestamps', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 300; // 5 minutes ago
      const waitTime = TimeUtils.calculateWaitTime(pastTimestamp, 0);

      expect(waitTime).toBe(0);
    });

    it('should format duration in seconds', () => {
      const formatted = TimeUtils.formatDuration(45);
      expect(formatted).toBe('45s');
    });

    it('should format duration in minutes and seconds', () => {
      const formatted = TimeUtils.formatDuration(125);
      expect(formatted).toBe('2m 5s');
    });

    it('should format duration in hours, minutes and seconds', () => {
      const formatted = TimeUtils.formatDuration(3665);
      expect(formatted).toBe('1h 1m 5s');
    });

    it('should format zero duration', () => {
      const formatted = TimeUtils.formatDuration(0);
      expect(formatted).toBe('0s');
    });

    it('should format countdown correctly', () => {
      const formatted = TimeUtils.formatCountdown(3665);
      expect(formatted).toBe('01:01:05');
    });

    it('should get current timestamp', () => {
      const timestamp = TimeUtils.getCurrentTimestamp();
      const now = Math.floor(Date.now() / 1000);
      expect(timestamp).toBeCloseTo(now, 0);
    });

    it('should apply wait buffer correctly', () => {
      const total = TimeUtils.applyWaitBuffer(100, 30);
      expect(total).toBe(130);
    });

    it('should validate future timestamp', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 300;
      const pastTimestamp = Math.floor(Date.now() / 1000) - 300;

      expect(TimeUtils.validateFutureTimestamp(futureTimestamp)).toBe(true);
      expect(TimeUtils.validateFutureTimestamp(pastTimestamp)).toBe(false);
    });

    it('should handle invalid timestamp parsing', () => {
      expect(() => TimeUtils.parseTimestamp('invalid')).toThrow();
      expect(() => TimeUtils.parseTimestamp('2024-13-45')).toThrow();
    });

    it('should handle millisecond timestamps', () => {
      const msTimestamp = Date.now().toString(); // Milliseconds
      const result = TimeUtils.parseTimestamp(msTimestamp);
      expect(result).toBeLessThan(Math.floor(Date.now() / 1000) + 1);
    });

    it('should convert timestamp to string', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const result = TimeUtils.timestampToString(timestamp);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should get platform date info', () => {
      const info = TimeUtils.getPlatformDateInfo();
      expect(info).toHaveProperty('isLinux');
      expect(info).toHaveProperty('isMacOS');
      expect(info).toHaveProperty('dateCommand');
    });

    it('should handle edge cases in countdown formatting', () => {
      expect(TimeUtils.formatCountdown(0)).toBe('00:00:00');
      expect(TimeUtils.formatCountdown(-5)).toBe('00:00:00');
      expect(TimeUtils.formatCountdown(3661)).toBe('01:01:01');
    });

    it('should handle waitWithCountdown interruption', async () => {
      const originalAddListener = process.addListener;
      const originalRemoveListener = process.removeListener;

      const listeners: { [key: string]: Function[] } = {};

      process.addListener = jest.fn((event: string, listener: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(listener);
        return process;
      });

      process.removeListener = jest.fn();

      // Mock console methods
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(process.stdout, 'write').mockImplementation();

      // Start countdown in background
      const countdownPromise = TimeUtils.waitWithCountdown(1);

      // Wait a bit then simulate interrupt
      setTimeout(() => {
        const sigintHandlers = listeners['SIGINT'] || [];
        if (sigintHandlers.length > 0) {
          try {
            const handler = sigintHandlers[0];
            if (handler) {
              handler();
            }
          } catch (e) {
            // Expected - process.exit throws
          }
        }
      }, 50);

      await expect(countdownPromise).resolves.toBeUndefined();

      process.addListener = originalAddListener;
      process.removeListener = originalRemoveListener;
    });
  });

  describe('NetworkUtils', () => {
    it('should check connectivity', async () => {
      // Mock the ping connectivity check to avoid actual system calls
      const spy = jest.spyOn(NetworkUtils, 'checkConnectivityPing').mockResolvedValue({
        connected: true,
        method: 'ping',
        responseTime: 50,
      });

      const result = await NetworkUtils.checkConnectivity();
      expect(result).toHaveProperty('connected');
      expect(typeof result.connected).toBe('boolean');

      spy.mockRestore();
    });

    it('should wait for connectivity with timeout', async () => {
      // Mock checkConnectivity to return successful connectivity
      const spy = jest.spyOn(NetworkUtils, 'checkConnectivity').mockResolvedValue({
        connected: true,
        method: 'ping',
        responseTime: 50,
      });

      const result = await NetworkUtils.waitForConnectivity(1000);
      expect(result).toBe(true);

      spy.mockRestore();
    });

    it('should timeout when waiting for connectivity', async () => {
      // Mock checkConnectivity to always return no connectivity
      const spy = jest.spyOn(NetworkUtils, 'checkConnectivity').mockResolvedValue({
        connected: false,
        error: 'No connectivity',
      });

      const result = await NetworkUtils.waitForConnectivity(100);
      expect(result).toBe(false);

      spy.mockRestore();
    });
  });
});
