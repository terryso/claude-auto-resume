/**
 * Time calculation and waiting utilities
 */

import { ClaudeAutoResumeError } from '../utils/errors';
// Time utils only use basic timing, no progress bars needed
import { logger } from '../utils';

/**
 * Platform information for cross-platform compatibility
 */
interface PlatformInfo {
  isLinux: boolean;
  isMacOS: boolean;
  dateCommand: string;
}

/**
 * Time-related utility functions with cross-platform support
 */
export class TimeUtils {
  private static platformInfo: PlatformInfo = {
    isLinux: process.platform === 'linux',
    isMacOS: process.platform === 'darwin',
    dateCommand: 'date',
  };

  /**
   * Cross-platform timestamp parsing and formatting
   * Handles both Linux and macOS date command differences
   */
  static parseTimestamp(timestampStr: string): number {
    try {
      let timestamp: number;

      // Check if it's an ISO date string (contains T or dashes)
      if (timestampStr.includes('T') || timestampStr.includes('-')) {
        const date = new Date(timestampStr);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid ISO date format');
        }
        timestamp = Math.floor(date.getTime() / 1000);
      } else {
        // Try parsing as Unix timestamp
        timestamp = parseInt(timestampStr, 10);

        if (isNaN(timestamp)) {
          throw new Error('Invalid timestamp format');
        }

        // If it looks like milliseconds, convert to seconds
        if (timestamp > 1e12) {
          timestamp = Math.floor(timestamp / 1000);
        }
      }

      // Validate timestamp is reasonable (between 1970 and far future)
      const minTimestamp = 0; // Unix epoch
      const maxTimestamp = 4102444800; // Year 2100

      if (timestamp < minTimestamp || timestamp > maxTimestamp) {
        throw new Error('Timestamp out of reasonable range');
      }

      return timestamp;
    } catch (error) {
      throw new ClaudeAutoResumeError(
        `Invalid timestamp format: ${timestampStr}`,
        2,
        `Failed to parse timestamp. Expected Unix timestamp (seconds) or ISO date string. Error: ${error}`
      );
    }
  }

  /**
   * Calculates wait time from resume timestamp with buffer
   * @param resumeTimestamp - Unix timestamp in seconds when to resume
   * @param waitBuffer - Additional wait time in seconds
   */
  static calculateWaitTime(resumeTimestamp: number, waitBuffer = 0): number {
    const currentTime = Math.floor(Date.now() / 1000);
    const waitSeconds = Math.max(0, resumeTimestamp - currentTime + waitBuffer);
    return waitSeconds;
  }

  /**
   * Formats countdown display in HH:MM:SS format
   */
  static formatCountdown(seconds: number): string {
    if (seconds <= 0) return '00:00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Formats a duration in seconds to human-readable format
   */
  static formatDuration(seconds: number): string {
    if (seconds <= 0) return '0 seconds';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);

    return parts.join(', ');
  }

  /**
   * Formats a duration with short format (for progress bars)
   */
  static formatDurationShort(seconds: number): string {
    if (seconds <= 0) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Formats relative time (e.g., "in 5 minutes", "2 hours ago")
   */
  static formatRelativeTime(targetTimestamp: number): string {
    const now = Date.now() / 1000;
    const diff = targetTimestamp - now;
    const absDiff = Math.abs(diff);

    if (absDiff < 60) {
      const seconds = Math.round(absDiff);
      if (diff > 0) {
        return `in ${seconds} second${seconds !== 1 ? 's' : ''}`;
      } else {
        return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
      }
    } else if (absDiff < 3600) {
      const minutes = Math.round(absDiff / 60);
      if (diff > 0) {
        return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      }
    } else if (absDiff < 86400) {
      const hours = Math.round(absDiff / 3600);
      if (diff > 0) {
        return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      }
    } else {
      const days = Math.round(absDiff / 86400);
      if (diff > 0) {
        return `in ${days} day${days !== 1 ? 's' : ''}`;
      } else {
        return `${days} day${days !== 1 ? 's' : ''} ago`;
      }
    }
  }

  /**
   * Gets a human-readable time display with multiple formats
   */
  static getTimeDisplay(timestamp: number): {
    absolute: string;
    relative: string;
    duration: string;
    timezone: string;
    formatted: string;
  } {
    const now = Date.now() / 1000;
    const diff = timestamp - now;

    return {
      absolute: TimeUtils.timestampToString(timestamp),
      relative: TimeUtils.formatRelativeTime(timestamp),
      duration: TimeUtils.formatDuration(Math.max(0, diff)),
      timezone: TimeUtils.getTimezoneDisplay(timestamp),
      formatted: TimeUtils.formatTimeWithContext(timestamp),
    };
  }

  /**
   * Formats time with additional context (timezone, relative, duration)
   */
  static formatTimeWithContext(timestamp: number): string {
    const now = Date.now() / 1000;
    const diff = timestamp - now;
    const date = new Date(timestamp * 1000);

    // Get locale-specific time string with timezone
    const timeString = date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });

    const relative = TimeUtils.formatRelativeTime(timestamp);

    if (Math.abs(diff) < 86400) {
      // Less than 24 hours
      return `${timeString} (${relative})`;
    } else {
      const duration = TimeUtils.formatDuration(Math.abs(diff));
      return `${timeString} (${relative}, ${duration} ${diff > 0 ? 'from now' : 'ago'})`;
    }
  }

  /**
   * Gets timezone display information
   */
  static getTimezoneDisplay(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const offset = date.getTimezoneOffset();
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;
    const sign = offset <= 0 ? '+' : '-';

    const offsetString = `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Try to get timezone name
    try {
      const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return `${timezoneName} (${offsetString})`;
    } catch {
      return offsetString;
    }
  }

  /**
   * Dynamic time formatting based on duration
   */
  static formatDynamicDuration(seconds: number): string {
    const absSecs = Math.abs(seconds);

    if (absSecs < 60) {
      // Show seconds for short durations
      return TimeUtils.formatDuration(seconds);
    } else if (absSecs < 3600) {
      // Show minutes and seconds for medium durations
      const minutes = Math.floor(absSecs / 60);
      const remainingSecs = absSecs % 60;
      if (remainingSecs === 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSecs} second${remainingSecs !== 1 ? 's' : ''}`;
    } else if (absSecs < 86400) {
      // Show hours and minutes for longer durations
      const hours = Math.floor(absSecs / 3600);
      const minutes = Math.floor((absSecs % 3600) / 60);
      if (minutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      // Show days and hours for very long durations
      const days = Math.floor(absSecs / 86400);
      const hours = Math.floor((absSecs % 86400) / 3600);
      if (hours === 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
      }
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Gets current Unix timestamp in seconds
   */
  static getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Converts timestamp to human-readable date string
   */
  static timestampToString(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }

  /**
   * Handles timezone and date format differences between platforms
   */
  static getPlatformDateInfo(): PlatformInfo {
    return { ...TimeUtils.platformInfo };
  }

  /**
   * Waits for the specified duration with a simple countdown display like the shell script
   * Includes interrupt handling for graceful termination
   */
  static async waitWithCountdown(seconds: number, onInterrupt?: () => void): Promise<void> {
    if (seconds <= 0) return;

    let remaining = seconds;
    let interrupted = false;

    // Set up interrupt handler
    const handleInterrupt = () => {
      interrupted = true;
      process.stdout.write('\n');
      logger.info('Interrupt received. Exiting gracefully...');
      if (onInterrupt) {
        onInterrupt();
      }
      process.exit(130); // Standard exit code for SIGINT
    };

    process.on('SIGINT', handleInterrupt);
    process.on('SIGTERM', handleInterrupt);

    try {
      const resumeTime = Math.floor(Date.now() / 1000) + seconds;

      // Show initial resume time
      logger.info(`Resume time: ${TimeUtils.timestampToString(resumeTime)}`);
      logger.info(`Waiting ${seconds} seconds...`);

      // Simple countdown like shell script
      while (remaining > 0 && !interrupted) {
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const secs = remaining % 60;

        process.stdout.write(
          `\rResuming in ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}...`
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));
        remaining--;
      }

      if (!interrupted) {
        process.stdout.write('\r✅ Wait period completed. Resuming Claude session...           \n');
        logger.info('Wait period completed, resuming...');
      }
    } finally {
      // Clean up interrupt handlers
      process.removeListener('SIGINT', handleInterrupt);
      process.removeListener('SIGTERM', handleInterrupt);
    }
  }

  /**
   * Applies wait buffer to calculated time
   */
  static applyWaitBuffer(waitSeconds: number, bufferSeconds: number): number {
    const total = waitSeconds + bufferSeconds;
    if (bufferSeconds > 0) {
      logger.info('Applied wait buffer', {
        bufferSeconds,
        originalDuration: TimeUtils.formatDuration(waitSeconds),
        totalDuration: TimeUtils.formatDuration(total),
      });
    }
    return total;
  }

  /**
   * Validates that a timestamp is in the future
   */
  static validateFutureTimestamp(timestamp: number): boolean {
    const currentTime = TimeUtils.getCurrentTimestamp();
    return timestamp > currentTime;
  }
}
