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
});

afterAll(() => {
  global.console = originalConsole;
});

// Set NODE_ENV for consistent test behavior
process.env.NODE_ENV = 'test';

// Set timezone to UTC for consistent time-based tests
process.env.TZ = 'UTC';