module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Coverage thresholds - significantly improved after Story 4.3 testing enhancements
  coverageThreshold: {
    global: {
      branches: 75,    // Improved from 65% (current: ~78%)
      functions: 85,   // Improved from 65% (current: 90.44%)
      lines: 80,       // Improved from 65% (current: 86.22%)
      statements: 80   // Improved from 65% (current: 86.69%)
    }
  },
  // Faster test execution
  testTimeout: 5000,
  maxConcurrency: 4,
  // Prevent test hanging and reduce noise from expected timeouts
  forceExit: true,
  detectOpenHandles: true,  // Re-enable to help identify real issues
  silent: false
};