/**
 * Utils module tests
 */

import {
  createError,
  isCustomError,
  CLIError,
  ErrorCodes,
  Errors,
  Logger,
  LogLevel,
  logger,
  validatePrompt,
  validateTimeout,
  validateTimestamp,
  validateArgs,
} from '../utils';

describe('Utils Module', () => {
  describe('Error handling', () => {
    it('should create custom error', () => {
      const error = createError('Test message', 'TEST_CODE', 2);

      expect(error).toBeInstanceOf(CLIError);
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.exitCode).toBe(2);
      expect(error.name).toBe('CLIError');
    });

    it('should create error with default exit code', () => {
      const error = createError('Test message', 'TEST_CODE');
      expect(error.exitCode).toBe(1);
    });

    it('should identify custom errors', () => {
      const customError = new CLIError('test', 'TEST', 1);
      const regularError = new Error('test');

      expect(isCustomError(customError)).toBe(true);
      expect(isCustomError(regularError)).toBe(false);
      expect(isCustomError(null)).toBe(false);
      expect(isCustomError(undefined)).toBe(false);
      expect(isCustomError('string')).toBe(false);
    });

    it('should have correct error codes', () => {
      expect(ErrorCodes.INVALID_TIMESTAMP).toBe('INVALID_TIMESTAMP');
      expect(ErrorCodes.CLAUDE_CLI_FAILED).toBe('CLAUDE_CLI_FAILED');
      expect(ErrorCodes.RESUME_FAILED).toBe('RESUME_FAILED');
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
    });

    it('should create predefined errors', () => {
      const invalidTimestamp = Errors.invalidTimestamp('bad-timestamp');
      expect(invalidTimestamp.code).toBe(ErrorCodes.INVALID_TIMESTAMP);
      expect(invalidTimestamp.exitCode).toBe(2);

      const claudeCliFailed = Errors.claudeCliFailed('CLI error');
      expect(claudeCliFailed.code).toBe(ErrorCodes.CLAUDE_CLI_FAILED);
      expect(claudeCliFailed.exitCode).toBe(1);

      const resumeFailed = Errors.resumeFailed('Resume error');
      expect(resumeFailed.code).toBe(ErrorCodes.RESUME_FAILED);
      expect(resumeFailed.exitCode).toBe(4);

      const networkError = Errors.networkError('Network error');
      expect(networkError.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(networkError.exitCode).toBe(3);
    });
  });

  describe('Logger', () => {
    let testLogger: Logger;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      testLogger = new Logger(LogLevel.DEBUG);
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should initialize with default log level', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger).toBeDefined();
    });

    it('should set log level', () => {
      testLogger.setLevel(LogLevel.ERROR);
      expect(testLogger).toBeDefined();
    });

    it('should log error messages', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      testLogger.error('Test error');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] Test error');

      errorSpy.mockRestore();
    });

    it('should log warning messages', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      testLogger.warn('Test warning');
      expect(warnSpy).toHaveBeenCalledWith('[WARN] Test warning');

      warnSpy.mockRestore();
    });

    it('should log info messages', () => {
      testLogger.info('Test info');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test info');
    });

    it('should log debug messages', () => {
      testLogger.debug('Test debug');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test debug');
    });

    it('should respect log levels', () => {
      testLogger.setLevel(LogLevel.ERROR);

      testLogger.info('Should not log');
      testLogger.debug('Should not log');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log with additional arguments', () => {
      testLogger.info('Test message', { extra: 'data' });
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test message', { extra: 'data' });
    });

    it('should have default logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('Validators', () => {
    describe('validatePrompt', () => {
      it('should accept valid prompts', () => {
        expect(validatePrompt('continue')).toBe(true);
        expect(validatePrompt('test prompt')).toBe(true);
        expect(validatePrompt('   valid   ')).toBe(true);
      });

      it('should reject invalid prompts', () => {
        expect(validatePrompt('')).toBe(false);
        expect(validatePrompt('   ')).toBe(false);
        expect(validatePrompt(null as any)).toBe(false);
        expect(validatePrompt(undefined as any)).toBe(false);
        expect(validatePrompt(123 as any)).toBe(false);
      });
    });

    describe('validateTimeout', () => {
      it('should accept valid timeouts', () => {
        expect(validateTimeout(1000)).toBe(true);
        expect(validateTimeout(0.5)).toBe(true);
        expect(validateTimeout(120000)).toBe(true);
      });

      it('should reject invalid timeouts', () => {
        expect(validateTimeout(0)).toBe(false);
        expect(validateTimeout(-1000)).toBe(false);
        expect(validateTimeout(Infinity)).toBe(false);
        expect(validateTimeout(NaN)).toBe(false);
        expect(validateTimeout('1000' as any)).toBe(false);
      });
    });

    describe('validateTimestamp', () => {
      it('should accept valid timestamps', () => {
        expect(validateTimestamp('2025-07-12T10:00:00Z')).toBe(true);
        expect(validateTimestamp(new Date().toISOString())).toBe(true);
        expect(validateTimestamp('2025-07-12')).toBe(true);
      });

      it('should reject invalid timestamps', () => {
        expect(validateTimestamp('invalid-date')).toBe(false);
        expect(validateTimestamp('')).toBe(false);
        expect(validateTimestamp(null as any)).toBe(false);
        expect(validateTimestamp(123 as any)).toBe(false);
      });
    });

    describe('validateArgs', () => {
      it('should accept valid argument arrays', () => {
        expect(validateArgs(['arg1', 'arg2'])).toBe(true);
        expect(validateArgs([])).toBe(true);
        expect(validateArgs(['--help'])).toBe(true);
      });

      it('should reject invalid argument arrays', () => {
        expect(validateArgs(null as any)).toBe(false);
        expect(validateArgs('string' as any)).toBe(false);
        expect(validateArgs([123, 'string'] as any)).toBe(false);
        expect(validateArgs([null] as any)).toBe(false);
      });
    });
  });
});
