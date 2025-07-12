/**
 * Time calculation and waiting utilities
 */

/**
 * Time-related utility functions
 */
export class TimeUtils {
  /**
   * Parses a timestamp and calculates wait time
   */
  static calculateWaitTime(timestamp: string): number {
    // TODO: Implement timestamp parsing and wait time calculation
    const now = Date.now();
    const targetTime = new Date(timestamp).getTime();
    return Math.max(0, targetTime - now);
  }

  /**
   * Waits for the specified duration with a countdown display
   */
  static async waitWithCountdown(milliseconds: number): Promise<void> {
    const seconds = Math.ceil(milliseconds / 1000);
    console.log(`Waiting ${seconds} seconds...`);

    for (let i = seconds; i > 0; i--) {
      process.stdout.write(`\rTime remaining: ${i}s`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    process.stdout.write('\rResuming...\n');
  }

  /**
   * Formats a duration in milliseconds to human-readable format
   */
  static formatDuration(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}
