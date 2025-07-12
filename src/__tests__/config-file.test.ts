/**
 * Configuration file loading tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  discoverConfigFile,
  loadConfigFile,
  validateConfigFile,
  mergeConfigFile,
  autoLoadConfigFile,
  type ConfigFile
} from '../config/file-loader';
import type { CLIConfig } from '../config/types';

describe('Configuration File Loading', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalHome: string;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
    originalCwd = process.cwd();
    originalHome = process.env.HOME || '';
    
    // Mock HOME environment variable
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    // Restore original values
    process.chdir(originalCwd);
    process.env.HOME = originalHome;
    
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validateConfigFile', () => {
    it('should validate empty configuration', () => {
      const config = validateConfigFile({});
      expect(config).toEqual({});
    });

    it('should validate valid string fields', () => {
      const input = {
        defaultPrompt: 'test prompt',
        claudeCliPath: '/usr/bin/claude',
        logFile: '/tmp/log.txt'
      };
      
      const config = validateConfigFile(input);
      expect(config.defaultPrompt).toBe('test prompt');
      expect(config.claudeCliPath).toBe('/usr/bin/claude');
      expect(config.logFile).toBe('/tmp/log.txt');
    });

    it('should validate valid numeric fields', () => {
      const input = {
        defaultTimeout: 30000,
        maxRetries: 5,
        waitBuffer: 10
      };
      
      const config = validateConfigFile(input);
      expect(config.defaultTimeout).toBe(30000);
      expect(config.maxRetries).toBe(5);
      expect(config.waitBuffer).toBe(10);
    });

    it('should validate boolean fields', () => {
      const input = {
        skipPermissions: false
      };
      
      const config = validateConfigFile(input);
      expect(config.skipPermissions).toBe(false);
    });

    it('should validate enum fields', () => {
      const input = {
        logLevel: 'debug',
        verbosity: 'verbose',
        timeFormat: 'relative'
      };
      
      const config = validateConfigFile(input);
      expect(config.logLevel).toBe('debug');
      expect(config.verbosity).toBe('verbose');
      expect(config.timeFormat).toBe('relative');
    });

    it('should validate custom commands', () => {
      const input = {
        customCommands: {
          'test': 'npm test',
          'build': 'npm run build'
        }
      };
      
      const config = validateConfigFile(input);
      expect(config.customCommands).toEqual({
        'test': 'npm test',
        'build': 'npm run build'
      });
    });

    it('should validate network settings', () => {
      const input = {
        network: {
          timeout: 5000,
          retries: 3,
          checkUrls: ['https://httpbin.org/get', 'https://google.com']
        }
      };
      
      const config = validateConfigFile(input);
      expect(config.network?.timeout).toBe(5000);
      expect(config.network?.retries).toBe(3);
      expect(config.network?.checkUrls).toEqual([
        'https://httpbin.org/get',
        'https://google.com'
      ]);
    });

    it('should reject invalid configuration types', () => {
      expect(() => validateConfigFile(null)).toThrow('Configuration must be a valid JSON object');
      expect(() => validateConfigFile('string')).toThrow('Configuration must be a valid JSON object');
      expect(() => validateConfigFile(123)).toThrow('Configuration must be a valid JSON object');
    });

    it('should reject invalid string fields', () => {
      expect(() => validateConfigFile({ defaultPrompt: '' })).toThrow('defaultPrompt must be a non-empty string');
      expect(() => validateConfigFile({ defaultPrompt: 123 })).toThrow('defaultPrompt must be a non-empty string');
      expect(() => validateConfigFile({ claudeCliPath: null })).toThrow('claudeCliPath must be a non-empty string');
    });

    it('should reject invalid numeric fields', () => {
      expect(() => validateConfigFile({ defaultTimeout: 0 })).toThrow('defaultTimeout must be a positive number');
      expect(() => validateConfigFile({ defaultTimeout: -1 })).toThrow('defaultTimeout must be a positive number');
      expect(() => validateConfigFile({ maxRetries: -1 })).toThrow('maxRetries must be a non-negative integer');
      expect(() => validateConfigFile({ maxRetries: 1.5 })).toThrow('maxRetries must be a non-negative integer');
    });

    it('should reject invalid enum values', () => {
      expect(() => validateConfigFile({ logLevel: 'invalid' })).toThrow('logLevel must be one of');
      expect(() => validateConfigFile({ verbosity: 'invalid' })).toThrow('verbosity must be one of');
      expect(() => validateConfigFile({ timeFormat: 'invalid' })).toThrow('timeFormat must be one of');
    });

    it('should reject invalid custom commands', () => {
      expect(() => validateConfigFile({ customCommands: 'invalid' })).toThrow('customCommands must be an object');
      expect(() => validateConfigFile({ customCommands: { test: 123 } })).toThrow('customCommands must be key-value pairs of strings');
    });

    it('should reject invalid network settings', () => {
      expect(() => validateConfigFile({ network: 'invalid' })).toThrow('network must be an object');
      expect(() => validateConfigFile({ network: { timeout: 0 } })).toThrow('network.timeout must be a positive number');
      expect(() => validateConfigFile({ network: { retries: -1 } })).toThrow('network.retries must be a non-negative integer');
      expect(() => validateConfigFile({ network: { checkUrls: 'invalid' } })).toThrow('network.checkUrls must be an array');
      expect(() => validateConfigFile({ network: { checkUrls: [123] } })).toThrow('network.checkUrls must contain valid URL strings');
    });
  });

  describe('loadConfigFile', () => {
    it('should load valid JSON configuration file', () => {
      const configPath = path.join(tempDir, 'test-config.json');
      const configData = {
        defaultPrompt: 'test prompt',
        defaultTimeout: 30000,
        skipPermissions: false
      };
      
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
      
      const config = loadConfigFile(configPath);
      expect(config.defaultPrompt).toBe('test prompt');
      expect(config.defaultTimeout).toBe(30000);
      expect(config.skipPermissions).toBe(false);
    });

    it('should throw error for non-existent file', () => {
      const configPath = path.join(tempDir, 'non-existent.json');
      expect(() => loadConfigFile(configPath)).toThrow('Configuration file not found');
    });

    it('should throw error for empty file', () => {
      const configPath = path.join(tempDir, 'empty.json');
      fs.writeFileSync(configPath, '');
      
      expect(() => loadConfigFile(configPath)).toThrow('Configuration file is empty');
    });

    it('should throw error for invalid JSON', () => {
      const configPath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(configPath, '{ invalid json }');
      
      expect(() => loadConfigFile(configPath)).toThrow('Invalid JSON in configuration file');
    });

    it('should throw error for invalid configuration data', () => {
      const configPath = path.join(tempDir, 'invalid-config.json');
      fs.writeFileSync(configPath, JSON.stringify({ defaultPrompt: 123 }));
      
      expect(() => loadConfigFile(configPath)).toThrow('defaultPrompt must be a non-empty string');
    });
  });

  describe('discoverConfigFile', () => {
    it('should discover config file in current directory', () => {
      process.chdir(tempDir);
      const configPath = path.join(tempDir, '.claude-auto-resume.json');
      fs.writeFileSync(configPath, '{}');
      
      const discovered = discoverConfigFile();
      expect(discovered).not.toBeNull();
      expect(path.basename(discovered || '')).toBe('.claude-auto-resume.json');
      expect(fs.existsSync(discovered || '')).toBe(true);
    });

    it('should discover config file in home directory', () => {
      const configPath = path.join(tempDir, '.claude-auto-resume.json');
      fs.writeFileSync(configPath, '{}');
      
      const discovered = discoverConfigFile();
      expect(discovered).toBe(configPath);
    });

    it('should return null when no config file found', () => {
      const discovered = discoverConfigFile();
      expect(discovered).toBeNull();
    });

    it('should prefer current directory over home directory', () => {
      // Create config in home directory
      const homeConfig = path.join(tempDir, '.claude-auto-resume.json');
      fs.writeFileSync(homeConfig, '{}');
      
      // Create config in current directory (should be preferred)
      const currentDir = path.join(tempDir, 'current');
      fs.mkdirSync(currentDir);
      process.chdir(currentDir);
      
      const currentConfig = path.join(currentDir, '.claude-auto-resume.json');
      fs.writeFileSync(currentConfig, '{}');
      
      const discovered = discoverConfigFile();
      expect(discovered).not.toBeNull();
      expect(path.basename(discovered || '')).toBe('.claude-auto-resume.json');
      expect(path.dirname(discovered || '')).toContain('current');
    });
  });

  describe('mergeConfigFile', () => {
    it('should merge configuration file with base config', () => {
      const baseConfig: CLIConfig = {
        defaultPrompt: 'continue',
        defaultTimeout: 120000,
        maxRetries: 3,
        claudeCliPath: 'claude',
        waitBuffer: 0,
        skipPermissions: true,
        logFile: undefined
      };

      const fileConfig: ConfigFile = {
        defaultPrompt: 'custom prompt',
        waitBuffer: 10,
        logFile: '/tmp/log.txt'
      };

      const merged = mergeConfigFile(baseConfig, fileConfig);
      
      expect(merged.defaultPrompt).toBe('custom prompt'); // Overridden
      expect(merged.waitBuffer).toBe(10); // Overridden
      expect(merged.logFile).toBe('/tmp/log.txt'); // Overridden
      expect(merged.defaultTimeout).toBe(120000); // Preserved from base
      expect(merged.skipPermissions).toBe(true); // Preserved from base
    });

    it('should preserve base config when file config is empty', () => {
      const baseConfig: CLIConfig = {
        defaultPrompt: 'continue',
        defaultTimeout: 120000,
        maxRetries: 3,
        claudeCliPath: 'claude',
        waitBuffer: 0,
        skipPermissions: true,
        logFile: undefined
      };

      const fileConfig: ConfigFile = {};

      const merged = mergeConfigFile(baseConfig, fileConfig);
      expect(merged).toEqual(baseConfig);
    });
  });

  describe('autoLoadConfigFile', () => {
    it('should return null when no config file found', () => {
      const config = autoLoadConfigFile();
      expect(config).toBeNull();
    });

    it('should load discovered configuration file', () => {
      const configPath = path.join(tempDir, '.claude-auto-resume.json');
      const configData = {
        defaultPrompt: 'auto-loaded prompt',
        waitBuffer: 15
      };
      
      fs.writeFileSync(configPath, JSON.stringify(configData));
      
      const config = autoLoadConfigFile();
      expect(config).not.toBeNull();
      expect(config?.defaultPrompt).toBe('auto-loaded prompt');
      expect(config?.waitBuffer).toBe(15);
    });

    it('should return null and warn on invalid configuration file', () => {
      const configPath = path.join(tempDir, '.claude-auto-resume.json');
      fs.writeFileSync(configPath, '{ invalid json }');
      
      const config = autoLoadConfigFile();
      expect(config).toBeNull();
    });
  });
});