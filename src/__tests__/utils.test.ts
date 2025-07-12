/**
 * Utils module tests
 */

import {
  createError,
  isCustomError,
  CLIError,
  ClaudeAutoResumeError,
  ErrorCategory,
  ErrorCodes,
  Errors,
  EnhancedErrors,
  Logger,
  LogLevel,
  logger,
  validatePrompt,
  validateTimeout,
  validateTimestamp,
  validateArgs,
  isCLIConfig,
  isCLIOptions,
  validateCLIConfig,
  validateCLIOptions,
  validateFilePath,
  validateWritableDirectory,
  validateConfigurationPrecedence,
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
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] Test error', '');

      errorSpy.mockRestore();
    });

    it('should log warning messages', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      testLogger.warn('Test warning');
      expect(warnSpy).toHaveBeenCalledWith('[WARN] Test warning', '');

      warnSpy.mockRestore();
    });

    it('should log info messages', () => {
      testLogger.info('Test info');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test info', '');
    });

    it('should log debug messages', () => {
      testLogger.debug('Test debug');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test debug', '');
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

    it('should support file output configuration', () => {
      const fs = require('fs');
      const mockWriteStream = {
        write: jest.fn(),
        end: jest.fn()
      };

      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation();
      const statSyncSpy = jest.spyOn(fs, 'statSync').mockReturnValue({ size: 1000 });
      const createWriteStreamSpy = jest.spyOn(fs, 'createWriteStream').mockReturnValue(mockWriteStream);

      const testLoggerWithFile = new Logger();
      testLoggerWithFile.setFileOutput('/test/path/log.txt');

      expect(testLoggerWithFile.getLogFile()).toBe('/test/path/log.txt');

      testLoggerWithFile.info('Test message');
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Test message')
      );

      testLoggerWithFile.close();
      expect(mockWriteStream.end).toHaveBeenCalled();

      // Restore mocks
      existsSyncSpy.mockRestore();
      mkdirSyncSpy.mockRestore();
      statSyncSpy.mockRestore();
      createWriteStreamSpy.mockRestore();
    });

    it('should support context logging', () => {
      const testLoggerContext = new Logger();
      const context = { userId: 123, action: 'test' };

      testLoggerContext.info('Test with context', context);
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test with context', context);
    });

    it('should get current log level', () => {
      const testLoggerLevel = new Logger();
      expect(testLoggerLevel.getLevel()).toBe(LogLevel.INFO);

      testLoggerLevel.setLevel(LogLevel.DEBUG);
      expect(testLoggerLevel.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('should clear file output', () => {
      const fs = require('fs');
      const mockWriteStream = {
        write: jest.fn(),
        end: jest.fn()
      };

      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation();
      const statSyncSpy = jest.spyOn(fs, 'statSync').mockReturnValue({ size: 1000 });
      const createWriteStreamSpy = jest.spyOn(fs, 'createWriteStream').mockReturnValue(mockWriteStream);

      const testLoggerClear = new Logger();
      testLoggerClear.setFileOutput('/test/path.log');
      expect(testLoggerClear.getLogFile()).toBe('/test/path.log');

      testLoggerClear.setFileOutput();
      expect(testLoggerClear.getLogFile()).toBeUndefined();

      // Restore mocks
      existsSyncSpy.mockRestore();
      mkdirSyncSpy.mockRestore();
      statSyncSpy.mockRestore();
      createWriteStreamSpy.mockRestore();
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

    describe('Type Guards', () => {
      describe('isCLIConfig', () => {
        it('should accept valid CLI config', () => {
          const config = {
            defaultPrompt: 'continue',
            defaultTimeout: 120000,
            maxRetries: 3,
            claudeCliPath: 'claude',
            waitBuffer: 0,
            skipPermissions: true,
            logFile: undefined,
          };
          expect(isCLIConfig(config)).toBe(true);
        });

        it('should reject invalid CLI config', () => {
          expect(isCLIConfig(null)).toBe(false);
          expect(isCLIConfig({})).toBe(false);
          expect(isCLIConfig({ defaultPrompt: 123 })).toBe(false);
          expect(isCLIConfig({ defaultTimeout: -1 })).toBe(false);
        });
      });

      describe('isCLIOptions', () => {
        it('should accept valid CLI options', () => {
          const options = {
            prompt: 'test',
            continue: true,
            execute: undefined,
            testMode: 10,
          };
          expect(isCLIOptions(options)).toBe(true);
        });

        it('should reject invalid CLI options', () => {
          expect(isCLIOptions(null)).toBe(false);
          expect(isCLIOptions({ prompt: 123 })).toBe(false);
          expect(isCLIOptions({ testMode: 'invalid' })).toBe(false);
        });
      });
    });

    describe('Configuration Validation', () => {
      describe('validateCLIConfig', () => {
        it('should validate correct configuration', () => {
          const config = {
            defaultPrompt: 'continue',
            defaultTimeout: 120000,
            maxRetries: 3,
            claudeCliPath: 'claude',
            waitBuffer: 0,
            skipPermissions: true,
          };
          const result = validateCLIConfig(config);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid configuration', () => {
          const config = {
            defaultPrompt: '',
            defaultTimeout: -1,
            maxRetries: -1,
            claudeCliPath: '',
            waitBuffer: -1,
            skipPermissions: 'invalid' as any,
          };
          const result = validateCLIConfig(config);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should validate logFile configuration', () => {
          const validConfig = {
            defaultPrompt: 'continue',
            defaultTimeout: 120000,
            maxRetries: 3,
            claudeCliPath: 'claude',
            waitBuffer: 0,
            skipPermissions: true,
            logFile: '/tmp/test.log',
          };
          const result = validateCLIConfig(validConfig);
          expect(result.valid).toBe(true);
        });

        it('should reject invalid logFile configuration', () => {
          const invalidConfig = {
            defaultPrompt: 'continue',
            defaultTimeout: 120000,
            maxRetries: 3,
            claudeCliPath: 'claude',
            waitBuffer: 0,
            skipPermissions: true,
            logFile: '', // Empty string
          };
          const result = validateCLIConfig(invalidConfig);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('logFile must be a non-empty string or undefined');
        });

        it('should reject non-writable logFile directory', () => {
          const invalidConfig = {
            defaultPrompt: 'continue',
            defaultTimeout: 120000,
            maxRetries: 3,
            claudeCliPath: 'claude',
            waitBuffer: 0,
            skipPermissions: true,
            logFile: '/root/forbidden/test.log', // Non-writable
          };
          const result = validateCLIConfig(invalidConfig);
          expect(result.valid).toBe(false);
          expect(result.errors.some((error) => error.includes('not writable'))).toBe(true);
        });
      });

      describe('validateCLIOptions', () => {
        it('should validate correct options', () => {
          const options = {
            prompt: 'test',
            continue: false,
            testMode: 10,
          };
          const result = validateCLIOptions(options);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });

        it('should reject conflicting options', () => {
          const options = {
            execute: 'echo test',
            continue: true,
          };
          const result = validateCLIOptions(options);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('execute and continue options cannot be used together');
        });
      });
    });

    describe('File Validation', () => {
      describe('validateFilePath', () => {
        it('should validate readable files', () => {
          // Use a file that should exist
          const result = validateFilePath('/tmp', 'read');
          expect(typeof result).toBe('boolean');
        });
      });

      describe('validateWritableDirectory', () => {
        it('should validate writable directories', () => {
          // Use /tmp which should be writable
          const result = validateWritableDirectory('/tmp');
          expect(result).toBe(true);
        });

        it('should reject non-writable paths', () => {
          // Use a path that likely doesn't exist
          const result = validateWritableDirectory('/nonexistent/path');
          expect(result).toBe(false);
        });
      });
    });

    describe('Configuration Precedence', () => {
      it('should validate configuration precedence', () => {
        const result = validateConfigurationPrecedence(
          { prompt: 'test' },
          { CLAUDE_AUTO_RESUME_WAIT_BUFFER: '30' },
          {
            defaultPrompt: 'continue',
            defaultTimeout: 120000,
            maxRetries: 3,
            claudeCliPath: 'claude',
            waitBuffer: 0,
            skipPermissions: true,
          }
        );

        expect(result.valid).toBe(true);
        expect(result.precedenceOrder).toContain('CLI arguments');
        expect(result.precedenceOrder).toContain('Environment variables');
        expect(result.precedenceOrder).toContain('Default values');
      });
    });
  });

  describe('ClaudeAutoResumeError', () => {
    it('should create ClaudeAutoResumeError with all properties', () => {
      const error = new ClaudeAutoResumeError('Test error', 2, 'Test context', 'Test hint');

      expect(error.message).toBe('Test error');
      expect(error.exitCode).toBe(2);
      expect(error.context).toBe('Test context');
      expect(error.hint).toBe('Test hint');
      expect(error.name).toBe('ClaudeAutoResumeError');
    });

    it('should format ClaudeAutoResumeError message', () => {
      const error = new ClaudeAutoResumeError('Test error', 1, 'Test context', 'Test hint');

      const formatted = error.getFormattedMessage();
      expect(formatted).toContain('[ERROR] Test error');
      expect(formatted).toContain('[CONTEXT] Test context');
      expect(formatted).toContain('[HINT] Test hint');
    });

    it('should handle ClaudeAutoResumeError without context and hint', () => {
      const error = new ClaudeAutoResumeError('Simple error', 1);
      const formatted = error.getFormattedMessage();

      expect(formatted).toBe('[ERROR] Simple error');
      expect(formatted).not.toContain('[CONTEXT]');
      expect(formatted).not.toContain('[HINT]');
    });

    it('should create enhanced error with all properties', () => {
      const error = new ClaudeAutoResumeError(
        'Test error',
        2,
        'Test context',
        'Test hint',
        'Test suggestion',
        'Test troubleshooting',
        ErrorCategory.VALIDATION
      );

      expect(error.message).toBe('Test error');
      expect(error.exitCode).toBe(2);
      expect(error.context).toBe('Test context');
      expect(error.hint).toBe('Test hint');
      expect(error.suggestion).toBe('Test suggestion');
      expect(error.troubleshootingGuide).toBe('Test troubleshooting');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
    });

    it('should format enhanced error message with all fields', () => {
      const error = new ClaudeAutoResumeError(
        'Test error',
        1,
        'Test context',
        'Test hint',
        'Test suggestion',
        'Test troubleshooting',
        ErrorCategory.NETWORK
      );

      const formatted = error.getFormattedMessage();
      expect(formatted).toContain('[ERROR] Test error');
      expect(formatted).toContain('[CATEGORY] NETWORK');
      expect(formatted).toContain('[CONTEXT] Test context');
      expect(formatted).toContain('[HINT] Test hint');
      expect(formatted).toContain('[SUGGESTION] Test suggestion');
      expect(formatted).toContain('[TROUBLESHOOTING] Test troubleshooting');
    });

    it('should provide recovery recommendations by category', () => {
      const networkError = new ClaudeAutoResumeError(
        'Network error',
        3,
        undefined,
        undefined,
        undefined,
        undefined,
        ErrorCategory.NETWORK
      );

      const recommendations = networkError.getRecoveryRecommendations();
      expect(recommendations).toContain('Check your internet connection');
      expect(recommendations).toContain('Use --debug flag for network diagnostics');
    });

    it('should provide Claude CLI recovery recommendations', () => {
      const claudeError = new ClaudeAutoResumeError(
        'Claude CLI error',
        1,
        undefined,
        undefined,
        undefined,
        undefined,
        ErrorCategory.CLAUDE_CLI
      );

      const recommendations = claudeError.getRecoveryRecommendations();
      expect(recommendations).toContain('Ensure Claude CLI is installed: npm install -g @anthropic/claude-cli');
      expect(recommendations).toContain('Try running: claude --version');
    });
  });

  describe('EnhancedErrors', () => {
    it('should create enhanced network error', () => {
      const error = EnhancedErrors.networkError('Connection failed', 'Timeout after 5s');
      
      expect(error.message).toContain('Network connectivity issue');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.exitCode).toBe(3);
      expect(error.suggestion).toContain('Check internet connection');
    });

    it('should create enhanced Claude CLI error', () => {
      const error = EnhancedErrors.claudeCliFailed('Command not found');
      
      expect(error.message).toContain('Claude CLI execution failed');
      expect(error.category).toBe(ErrorCategory.CLAUDE_CLI);
      expect(error.exitCode).toBe(1);
      expect(error.troubleshootingGuide).toContain('npm install -g @anthropic/claude-cli');
    });

    it('should create enhanced configuration error', () => {
      const error = EnhancedErrors.configurationError('Invalid setting');
      
      expect(error.message).toContain('Configuration error');
      expect(error.category).toBe(ErrorCategory.CONFIGURATION);
      expect(error.suggestion).toContain('Review configuration settings');
    });

    it('should create enhanced file system error', () => {
      const error = EnhancedErrors.fileSystemError('File not found', '/test/path');
      
      expect(error.message).toContain('File system error');
      expect(error.category).toBe(ErrorCategory.FILE_SYSTEM);
      expect(error.context).toContain('/test/path');
    });

    it('should create enhanced timeout error', () => {
      const error = EnhancedErrors.timeoutError('Network request', 5000);
      
      expect(error.message).toContain('Operation timed out');
      expect(error.category).toBe(ErrorCategory.TIMEOUT);
      expect(error.context).toContain('5000ms');
    });
  });
});
