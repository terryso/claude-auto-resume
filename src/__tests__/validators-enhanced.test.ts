/**
 * Enhanced validators tests
 */

import {
  validatePromptWithFeedback,
  validateTimeoutWithFeedback,
  validateTimestampWithFeedback,
  validateCommandWithFeedback,
  validateFilePathWithFeedback,
  validateEnvironmentVariableWithFeedback,
  validateArgumentCombinationsWithFeedback,
} from '../utils/validators';

describe('Enhanced Validators', () => {
  describe('validatePromptWithFeedback', () => {
    it('should validate valid prompts', () => {
      const result = validatePromptWithFeedback('continue');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null/undefined prompts', () => {
      const result1 = validatePromptWithFeedback(null as any);
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('null or undefined');
      expect(result1.suggestion).toContain('continue');

      const result2 = validatePromptWithFeedback(undefined as any);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('null or undefined');
    });

    it('should reject non-string prompts', () => {
      const result = validatePromptWithFeedback(123 as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
      expect(result.suggestion).toContain('quotes');
    });

    it('should reject empty prompts', () => {
      const result = validatePromptWithFeedback('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty or only whitespace');
      expect(result.suggestion).toContain('meaningful prompt');
    });

    it('should reject overly long prompts', () => {
      const longPrompt = 'a'.repeat(1001);
      const result = validatePromptWithFeedback(longPrompt);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
      expect(result.suggestion).toContain('concise');
    });

    it('should warn about special characters', () => {
      const result = validatePromptWithFeedback('test & echo');
      expect(result.valid).toBe(true);
      expect(result.suggestion).toContain('special characters');
    });
  });

  describe('validateTimeoutWithFeedback', () => {
    it('should validate valid timeouts', () => {
      const result = validateTimeoutWithFeedback(60);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null/undefined timeouts', () => {
      const result = validateTimeoutWithFeedback(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('null or undefined');
      expect(result.suggestion).toContain('seconds');
    });

    it('should reject non-number timeouts', () => {
      const result = validateTimeoutWithFeedback('60');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a number');
      expect(result.suggestion).toContain('numeric');
    });

    it('should reject infinite values', () => {
      const result = validateTimeoutWithFeedback(Infinity);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('finite');
    });

    it('should reject negative timeouts', () => {
      const result = validateTimeoutWithFeedback(-5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should reject zero timeout', () => {
      const result = validateTimeoutWithFeedback(0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should reject very small timeouts', () => {
      const result = validateTimeoutWithFeedback(0.5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minimum 1 second');
    });

    it('should reject very large timeouts', () => {
      const result = validateTimeoutWithFeedback(100000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum 24 hours');
    });

    it('should suggest whole seconds for decimals', () => {
      const result = validateTimeoutWithFeedback(30.5);
      expect(result.valid).toBe(true);
      expect(result.suggestion).toContain('whole seconds');
    });
  });

  describe('validateTimestampWithFeedback', () => {
    it('should validate valid string timestamps', () => {
      const result = validateTimestampWithFeedback('2023-12-25T10:30:00Z');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate valid number timestamps', () => {
      const result = validateTimestampWithFeedback(Date.now() / 1000);
      expect(result.valid).toBe(true);
    });

    it('should reject null/undefined timestamps', () => {
      const result = validateTimestampWithFeedback(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('null or undefined');
    });

    it('should reject invalid types', () => {
      const result = validateTimestampWithFeedback(true as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('string or number');
    });

    it('should reject empty string timestamps', () => {
      const result = validateTimestampWithFeedback('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject invalid date strings', () => {
      const result = validateTimestampWithFeedback('invalid-date');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid timestamp format');
    });

    it('should reject timestamps before 1970', () => {
      const result = validateTimestampWithFeedback('1969-01-01T00:00:00Z');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too far in the past');
    });

    it('should reject timestamps after 2100', () => {
      const result = validateTimestampWithFeedback('2150-01-01T00:00:00Z');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too far in the future');
    });

    it('should handle both seconds and milliseconds timestamps', () => {
      const now = Date.now();
      const secondsResult = validateTimestampWithFeedback(now / 1000);
      const millisecondsResult = validateTimestampWithFeedback(now);
      
      expect(secondsResult.valid).toBe(true);
      expect(millisecondsResult.valid).toBe(true);
    });
  });

  describe('validateCommandWithFeedback', () => {
    it('should validate safe commands', () => {
      const result = validateCommandWithFeedback('echo hello');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });

    it('should reject null/undefined commands', () => {
      const result = validateCommandWithFeedback(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('null or undefined');
    });

    it('should reject non-string commands', () => {
      const result = validateCommandWithFeedback(123 as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('should reject empty commands', () => {
      const result = validateCommandWithFeedback('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject overly long commands', () => {
      const longCommand = 'echo ' + 'a'.repeat(1000);
      const result = validateCommandWithFeedback(longCommand);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should warn about dangerous commands', () => {
      const result = validateCommandWithFeedback('rm -rf /');
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Command contains potentially destructive operations');
    });

    it('should warn about command substitution', () => {
      const result = validateCommandWithFeedback('echo $(whoami)');
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Command contains command substitution - ensure it\'s from trusted source');
    });

    it('should warn about sudo commands', () => {
      const result = validateCommandWithFeedback('sudo apt update');
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Command uses sudo - will require elevated privileges');
    });

    it('should warn about incomplete commands', () => {
      const result = validateCommandWithFeedback('echo hello &&');
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Command ends with shell operators - this might be incomplete');
    });
  });

  describe('validateFilePathWithFeedback', () => {
    it('should reject null/undefined file paths', () => {
      const result1 = validateFilePathWithFeedback(null, 'read');
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('null or undefined');

      const result2 = validateFilePathWithFeedback(undefined, 'write');
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('null or undefined');
    });

    it('should reject non-string file paths', () => {
      const result = validateFilePathWithFeedback(123, 'read');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
      expect(result.suggestion).toContain('string path');
    });

    it('should reject empty file paths', () => {
      const result = validateFilePathWithFeedback('   ', 'write');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should detect path traversal attempts', () => {
      const result1 = validateFilePathWithFeedback('../../../etc/passwd', 'read');
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('Path traversal detected');

      const result2 = validateFilePathWithFeedback('..\\windows\\system32', 'read');
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('Path traversal detected');
    });

    it('should reject overly long paths', () => {
      const longPath = '/very/long/path/' + 'a'.repeat(300);
      const result = validateFilePathWithFeedback(longPath, 'read');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should handle file system access errors gracefully', () => {
      const result = validateFilePathWithFeedback('/nonexistent/path/file.txt', 'read');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('validation failed');
      expect(result.suggestion).toContain('readable');
    });

    it('should validate current directory (which should exist)', () => {
      const result = validateFilePathWithFeedback('.', 'read');
      // This should pass since current directory exists and is readable
      expect(result.valid).toBe(true);
    });
  });

  describe('validateEnvironmentVariableWithFeedback', () => {
    it('should accept undefined environment variables', () => {
      const result = validateEnvironmentVariableWithFeedback('TEST_VAR', undefined, 'string');
      expect(result.valid).toBe(true);
    });

    it('should reject non-string environment variable values', () => {
      const result = validateEnvironmentVariableWithFeedback('TEST_VAR', 123, 'string');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('should validate string environment variables', () => {
      const result1 = validateEnvironmentVariableWithFeedback('TEST_VAR', 'valid_value', 'string');
      expect(result1.valid).toBe(true);

      const result2 = validateEnvironmentVariableWithFeedback('TEST_VAR', '   ', 'string');
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('cannot be empty');
    });

    it('should validate number environment variables', () => {
      const result1 = validateEnvironmentVariableWithFeedback('PORT', '3000', 'number');
      expect(result1.valid).toBe(true);

      const result2 = validateEnvironmentVariableWithFeedback('PORT', 'not_a_number', 'number');
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('valid number');

      const result3 = validateEnvironmentVariableWithFeedback('PORT', 'Infinity', 'number');
      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('finite');
    });

    it('should validate boolean environment variables', () => {
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no', 'TRUE', 'FALSE'];
      for (const value of validBooleans) {
        const result = validateEnvironmentVariableWithFeedback('ENABLE_FEATURE', value, 'boolean');
        expect(result.valid).toBe(true);
      }

      const result = validateEnvironmentVariableWithFeedback('ENABLE_FEATURE', 'maybe', 'boolean');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('boolean value');
      expect(result.suggestion).toContain('true');
    });
  });

  describe('validateArgumentCombinationsWithFeedback', () => {
    it('should validate compatible option combinations', () => {
      const result = validateArgumentCombinationsWithFeedback({
        prompt: 'test',
        verbose: true
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect mutually exclusive options', () => {
      const result1 = validateArgumentCombinationsWithFeedback({
        execute: 'command',
        continue: true
      });
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('Cannot use execute mode with continue mode');

      const result2 = validateArgumentCombinationsWithFeedback({
        cmd: 'command',
        continue: true
      });
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('Cannot use custom command with continue mode');

      const result3 = validateArgumentCombinationsWithFeedback({
        execute: 'command1',
        cmd: 'command2'
      });
      expect(result3.valid).toBe(false);
      expect(result3.errors).toContain('Cannot use both execute and cmd options together');

      const result4 = validateArgumentCombinationsWithFeedback({
        version: true,
        help: true
      });
      expect(result4.valid).toBe(false);
      expect(result4.errors).toContain('Use either --version or --help, not both');
    });

    it('should provide suggestions for incomplete combinations', () => {
      const result1 = validateArgumentCombinationsWithFeedback({
        execute: 'command'
      });
      expect(result1.valid).toBe(true);
      expect(result1.suggestions).toContain('Consider providing a prompt with --prompt when using --execute');

      const result2 = validateArgumentCombinationsWithFeedback({
        cmd: 'command'
      });
      expect(result2.valid).toBe(true);
      expect(result2.suggestions).toContain('Consider providing a prompt with --prompt when using --cmd');
    });

    it('should warn about test mode with production options', () => {
      const result = validateArgumentCombinationsWithFeedback({
        testMode: 60,
        execute: 'production-command'
      });
      expect(result.valid).toBe(true);
      expect(result.suggestions).toContain('Test mode with execute/cmd may not behave as expected - use for testing only');
    });

    it('should handle empty options object', () => {
      const result = validateArgumentCombinationsWithFeedback({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });
  });
});