/**
 * Input validation utilities
 */

/**
 * Validates a prompt string
 */
export function validatePrompt(prompt: string): boolean {
  if (typeof prompt !== 'string') {
    return false;
  }

  // Check if prompt is not empty and not just whitespace
  return prompt.trim().length > 0;
}

/**
 * Validates a timeout value
 */
export function validateTimeout(timeout: number): boolean {
  return typeof timeout === 'number' && timeout > 0 && Number.isFinite(timeout);
}

/**
 * Validates a timestamp string
 */
export function validateTimestamp(timestamp: string): boolean {
  if (typeof timestamp !== 'string') {
    return false;
  }

  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Validates command line arguments
 */
export function validateArgs(args: string[]): boolean {
  return Array.isArray(args) && args.every((arg) => typeof arg === 'string');
}
