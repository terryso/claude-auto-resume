/**
 * Jest setup configuration
 * Suppresses console output and configures test environment
 */

// Suppress console output during tests unless explicitly needed
const originalConsole = global.console;

beforeAll(() => {
  // Only suppress if not in debug mode
  if (!process.env.DEBUG_TESTS) {
    global.console = {
      ...originalConsole,
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
  }

  // Mock process.stdout.write to prevent progress bar output
  const originalStdout = process.stdout.write;
  process.stdout.write = jest.fn().mockImplementation((chunk) => {
    // Only allow specific test outputs, suppress progress bars
    if (typeof chunk === 'string' && (chunk.includes('░') || chunk.includes('█') || chunk.includes('\x1B'))) {
      return true; // Suppress progress bar and ANSI escape codes
    }
    return originalStdout.call(process.stdout, chunk);
  });
});

afterAll(() => {
  global.console = originalConsole;
});

// Set NODE_ENV for consistent test behavior
process.env.NODE_ENV = 'test';

// Set timezone to UTC for consistent time-based tests
process.env.TZ = 'UTC';