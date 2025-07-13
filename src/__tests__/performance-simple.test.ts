/**
 * Simple performance benchmarking tests
 */

import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  describe('startup performance', () => {
    it('should import core modules within 100ms', async () => {
      const startTime = performance.now();

      // Dynamic imports to measure actual loading time
      await Promise.all([
        import('../core/claude-cli'),
        import('../core/network'),
        import('../core/command-executor'),
        import('../core/time-utils'),
      ]);

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(loadTime).toBeLessThan(100);
    });

    it('should initialize CLI components within 50ms', async () => {
      const startTime = performance.now();

      // Import and initialize key components
      const { ClaudeCLI } = await import('../core/claude-cli');
      const { TimeUtils } = await import('../core/time-utils');

      // Basic initialization
      new ClaudeCLI();
      TimeUtils.formatDuration(60);

      const endTime = performance.now();
      const initTime = endTime - startTime;

      expect(initTime).toBeLessThan(50);
    });
  });

  describe('core operation performance', () => {
    it('should validate commands within 10ms', async () => {
      const { CommandExecutor } = await import('../core/command-executor');

      const testCommands = [
        'echo "hello world"',
        'npm test',
        'git status',
        'ls -la',
        'cat package.json',
      ];

      const startTime = performance.now();

      testCommands.forEach((cmd) => {
        CommandExecutor.validateCommand(cmd);
      });

      const endTime = performance.now();
      const validationTime = endTime - startTime;

      expect(validationTime).toBeLessThan(10);
    });

    it('should parse Claude output within 5ms', async () => {
      const { ClaudeCLI } = await import('../core/claude-cli');

      const claudeCli = new ClaudeCLI();
      const testOutputs = [
        'Normal Claude response without limit',
        'Claude AI usage limit reached|1704067200',
        '',
        'Some other output format',
      ];

      const startTime = performance.now();

      testOutputs.forEach((output) => {
        try {
          claudeCli.parseUsageLimitOutput(output);
        } catch {
          // Some outputs may throw errors, that's fine for performance testing
        }
      });

      const endTime = performance.now();
      const parseTime = endTime - startTime;

      expect(parseTime).toBeLessThan(5);
    });

    it('should format time durations within 2ms', async () => {
      const { TimeUtils } = await import('../core/time-utils');

      const testDurations = [0, 1, 30, 60, 90, 120, 180, 300, 600, 900, 1800, 3600];

      const startTime = performance.now();

      testDurations.forEach((duration) => {
        TimeUtils.formatDuration(duration);
      });

      const endTime = performance.now();
      const formatTime = endTime - startTime;

      expect(formatTime).toBeLessThan(2);
    });
  });
});
