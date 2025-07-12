/**
 * Core business logic tests
 */

import { ClaudeCLI, TimeUtils, NetworkUtils } from '../core';

describe('Core Module', () => {
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

    it('should execute commands and return output', async () => {
      const result = await claudeCli.execute(['--help']);
      expect(result).toBe('Mock CLI output');
    });

    it('should check usage limit', async () => {
      const result = await claudeCli.checkUsageLimit();
      expect(result).toHaveProperty('hasLimit');
      expect(result.hasLimit).toBe(false);
    });

    it('should resume with prompt in new session mode', async () => {
      const spy = jest.spyOn(claudeCli, 'execute').mockResolvedValue('success');

      await claudeCli.resume('test prompt', false);

      expect(spy).toHaveBeenCalledWith(['--dangerously-skip-permissions', '-p', 'test prompt']);
      spy.mockRestore();
    });

    it('should resume with prompt in continue mode', async () => {
      const spy = jest.spyOn(claudeCli, 'execute').mockResolvedValue('success');

      await claudeCli.resume('test prompt', true);

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
    it('should calculate wait time from timestamp', () => {
      const futureTime = new Date(Date.now() + 5000).toISOString();
      const waitTime = TimeUtils.calculateWaitTime(futureTime);

      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(5000);
    });

    it('should return 0 for past timestamps', () => {
      const pastTime = new Date(Date.now() - 5000).toISOString();
      const waitTime = TimeUtils.calculateWaitTime(pastTime);

      expect(waitTime).toBe(0);
    });

    it('should format duration in seconds', () => {
      const formatted = TimeUtils.formatDuration(5000);
      expect(formatted).toBe('5s');
    });

    it('should format duration in minutes and seconds', () => {
      const formatted = TimeUtils.formatDuration(65000);
      expect(formatted).toBe('1m 5s');
    });

    it('should format zero duration', () => {
      const formatted = TimeUtils.formatDuration(0);
      expect(formatted).toBe('0s');
    });

    it('should wait with countdown', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation();

      // Test with very short duration
      await TimeUtils.waitWithCountdown(100);

      expect(consoleSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      writeSpy.mockRestore();
    });
  });

  describe('NetworkUtils', () => {
    it('should check connectivity', async () => {
      const result = await NetworkUtils.checkConnectivity();
      expect(typeof result).toBe('boolean');
    });

    it('should wait for connectivity with timeout', async () => {
      // Mock checkConnectivity to return true immediately
      const spy = jest.spyOn(NetworkUtils, 'checkConnectivity').mockResolvedValue(true);

      const result = await NetworkUtils.waitForConnectivity(1000);
      expect(result).toBe(true);

      spy.mockRestore();
    });

    it('should timeout when waiting for connectivity', async () => {
      // Mock checkConnectivity to always return false
      const spy = jest.spyOn(NetworkUtils, 'checkConnectivity').mockResolvedValue(false);

      const result = await NetworkUtils.waitForConnectivity(100);
      expect(result).toBe(false);

      spy.mockRestore();
    });
  });
});
