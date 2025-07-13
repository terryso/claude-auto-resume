/**
 * TimeUtils coverage tests - focused on improving branch coverage
 */

import { TimeUtils } from '../core/time-utils';

describe('TimeUtils Branch Coverage', () => {
  describe('parseTimestamp edge cases', () => {
    it('should handle various timestamp formats', () => {
      // ISO string formats
      expect(TimeUtils.parseTimestamp('2023-12-25T10:30:00Z')).toBeGreaterThan(0);
      expect(TimeUtils.parseTimestamp('2023-12-25T10:30:00.000Z')).toBeGreaterThan(0);
      expect(TimeUtils.parseTimestamp('2023-12-25')).toBeGreaterThan(0);

      // Unix timestamps (seconds)
      expect(TimeUtils.parseTimestamp('1703508600')).toBe(1703508600);
      expect(TimeUtils.parseTimestamp('0')).toBe(0);

      // Unix timestamps (milliseconds)
      expect(TimeUtils.parseTimestamp('1703508600000')).toBe(1703508600);
    });

    it('should handle edge cases and errors', () => {
      // Invalid formats
      expect(() => TimeUtils.parseTimestamp('invalid-date')).toThrow();
      expect(() => TimeUtils.parseTimestamp('not-a-number')).toThrow();
      expect(() => TimeUtils.parseTimestamp('')).toThrow();

      // Out of range timestamps - these should actually pass basic parsing but fail range checks
      expect(() => TimeUtils.parseTimestamp('5000000000')).toThrow(); // Year 2128+
    });

    it('should handle different date constructor scenarios', () => {
      // Valid ISO dates
      const validIsoDate = '2023-01-01T12:00:00Z';
      expect(() => TimeUtils.parseTimestamp(validIsoDate)).not.toThrow();

      // Invalid ISO-like strings that cause NaN
      expect(() => TimeUtils.parseTimestamp('2023-13-45T25:70:70Z')).toThrow();
    });
  });

  describe('formatRelativeTime edge cases', () => {
    const now = Date.now() / 1000;

    it('should handle different time ranges', () => {
      // Less than 60 seconds
      expect(TimeUtils.formatRelativeTime(now + 30)).toContain('second');
      expect(TimeUtils.formatRelativeTime(now - 45)).toContain('second');
      expect(TimeUtils.formatRelativeTime(now + 1)).toContain('second');
      expect(TimeUtils.formatRelativeTime(now - 1)).toContain('second');

      // Minutes
      expect(TimeUtils.formatRelativeTime(now + 120)).toContain('minute');
      expect(TimeUtils.formatRelativeTime(now - 300)).toContain('minute');
      expect(TimeUtils.formatRelativeTime(now + 70)).toContain('minute');

      // Hours
      expect(TimeUtils.formatRelativeTime(now + 7200)).toContain('hour');
      expect(TimeUtils.formatRelativeTime(now - 3600)).toContain('hour');

      // Days
      expect(TimeUtils.formatRelativeTime(now + 172800)).toContain('day');
      expect(TimeUtils.formatRelativeTime(now - 86400)).toContain('day');
    });

    it('should handle plural vs singular correctly', () => {
      const now = Date.now() / 1000;

      // Singular cases
      expect(TimeUtils.formatRelativeTime(now + 1)).not.toContain('seconds');
      expect(TimeUtils.formatRelativeTime(now + 60)).not.toContain('minutes');
      expect(TimeUtils.formatRelativeTime(now + 3600)).not.toContain('hours');
      expect(TimeUtils.formatRelativeTime(now + 86400)).not.toContain('days');

      // Plural cases
      expect(TimeUtils.formatRelativeTime(now + 2)).toContain('seconds');
      expect(TimeUtils.formatRelativeTime(now + 120)).toContain('minutes');
      expect(TimeUtils.formatRelativeTime(now + 7200)).toContain('hours');
      expect(TimeUtils.formatRelativeTime(now + 172800)).toContain('days');
    });
  });

  describe('formatDuration edge cases', () => {
    it('should handle zero and negative values', () => {
      expect(TimeUtils.formatDuration(0)).toBe('0 seconds');
      expect(TimeUtils.formatDuration(-5)).toBe('0 seconds');
    });

    it('should handle different time combinations', () => {
      // Only seconds
      expect(TimeUtils.formatDuration(45)).toBe('45 seconds');
      expect(TimeUtils.formatDuration(1)).toBe('1 second');

      // Minutes and seconds
      expect(TimeUtils.formatDuration(90)).toBe('1 minute, 30 seconds');
      expect(TimeUtils.formatDuration(61)).toBe('1 minute, 1 second');
      expect(TimeUtils.formatDuration(120)).toBe('2 minutes');

      // Hours, minutes, and seconds
      expect(TimeUtils.formatDuration(3661)).toBe('1 hour, 1 minute, 1 second');
      expect(TimeUtils.formatDuration(3600)).toBe('1 hour');
      expect(TimeUtils.formatDuration(7200)).toBe('2 hours');

      // Complex combinations
      expect(TimeUtils.formatDuration(3720)).toBe('1 hour, 2 minutes');
      expect(TimeUtils.formatDuration(7260)).toBe('2 hours, 1 minute');
    });
  });

  describe('formatDurationShort edge cases', () => {
    it('should handle zero and negative values', () => {
      expect(TimeUtils.formatDurationShort(0)).toBe('0s');
      expect(TimeUtils.formatDurationShort(-10)).toBe('0s');
    });

    it('should format different combinations', () => {
      expect(TimeUtils.formatDurationShort(1)).toBe('1s');
      expect(TimeUtils.formatDurationShort(60)).toBe('1m');
      expect(TimeUtils.formatDurationShort(3600)).toBe('1h');
      expect(TimeUtils.formatDurationShort(3661)).toBe('1h 1m 1s');
      expect(TimeUtils.formatDurationShort(3720)).toBe('1h 2m');
      expect(TimeUtils.formatDurationShort(90)).toBe('1m 30s');
    });
  });

  describe('waitWithCountdown interruption handling', () => {
    let originalExit: typeof process.exit;
    let originalOn: typeof process.on;
    let originalRemoveListener: typeof process.removeListener;

    beforeEach(() => {
      originalExit = process.exit;
      originalOn = process.on;
      originalRemoveListener = process.removeListener;

      process.exit = jest.fn() as any;
      process.on = jest.fn();
      process.removeListener = jest.fn();
    });

    afterEach(() => {
      process.exit = originalExit;
      process.on = originalOn;
      process.removeListener = originalRemoveListener;
    });

    it('should handle zero seconds', async () => {
      await expect(TimeUtils.waitWithCountdown(0)).resolves.toBeUndefined();
    });

    it('should handle negative seconds', async () => {
      await expect(TimeUtils.waitWithCountdown(-5)).resolves.toBeUndefined();
    });

    it('should setup interrupt handlers', async () => {
      const promise = TimeUtils.waitWithCountdown(1);

      // Fast forward time to complete quickly
      setTimeout(() => {
        // The method should have set up process event listeners
        expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
        expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      }, 10);

      await promise;

      // Should clean up listeners
      expect(process.removeListener).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(process.removeListener).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    });

    it('should handle interrupt callback', async () => {
      const onInterrupt = jest.fn();

      const promise = TimeUtils.waitWithCountdown(5, onInterrupt);

      // Simulate interrupt
      setTimeout(() => {
        const sigintHandler = (process.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'SIGINT'
        )?.[1];
        if (sigintHandler) {
          try {
            sigintHandler();
          } catch (error) {
            // Expected due to mocked process.exit
          }
        }
      }, 10);

      try {
        await promise;
      } catch (error) {
        // Expected due to process.exit mock
      }

      expect(onInterrupt).toHaveBeenCalled();
    });
  });

  describe('validateFutureTimestamp', () => {
    it('should validate future vs past timestamps', () => {
      const now = TimeUtils.getCurrentTimestamp();

      expect(TimeUtils.validateFutureTimestamp(now + 100)).toBe(true);
      expect(TimeUtils.validateFutureTimestamp(now - 100)).toBe(false);
      expect(TimeUtils.validateFutureTimestamp(now)).toBe(false); // exactly now is not future
    });
  });

  describe('getTimeDisplay', () => {
    it('should return all display formats', () => {
      const now = TimeUtils.getCurrentTimestamp();
      const future = now + 3600; // 1 hour from now

      const display = TimeUtils.getTimeDisplay(future);

      expect(display).toHaveProperty('absolute');
      expect(display).toHaveProperty('relative');
      expect(display).toHaveProperty('duration');

      expect(typeof display.absolute).toBe('string');
      expect(typeof display.relative).toBe('string');
      expect(typeof display.duration).toBe('string');
    });

    it('should handle past timestamps correctly', () => {
      const now = TimeUtils.getCurrentTimestamp();
      const past = now - 3600; // 1 hour ago

      const display = TimeUtils.getTimeDisplay(past);

      expect(display.duration).toBe('0 seconds'); // No duration for past timestamps
      expect(display.relative).toContain('ago');
    });
  });

  describe('applyWaitBuffer', () => {
    it('should apply buffer correctly', () => {
      expect(TimeUtils.applyWaitBuffer(100, 30)).toBe(130);
      expect(TimeUtils.applyWaitBuffer(0, 10)).toBe(10);
      expect(TimeUtils.applyWaitBuffer(50, 0)).toBe(50);
    });

    it('should log when buffer is applied', () => {
      const logSpy = jest.spyOn(require('../utils').logger, 'info').mockImplementation();

      TimeUtils.applyWaitBuffer(100, 30);
      expect(logSpy).toHaveBeenCalledWith('Applied wait buffer', expect.any(Object));

      TimeUtils.applyWaitBuffer(100, 0);
      expect(logSpy).toHaveBeenCalledTimes(1); // Should not log for zero buffer

      logSpy.mockRestore();
    });
  });
});
