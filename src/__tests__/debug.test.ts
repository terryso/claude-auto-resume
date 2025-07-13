/**
 * Debug utilities tests
 */

import { DebugUtils } from '../utils/debug';
import { logger } from '../utils';

// Mock external dependencies
jest.mock('../core/network');
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('DebugUtils', () => {
  beforeEach(() => {
    // Reset debug mode state before each test
    DebugUtils.disableDebugMode();
    jest.clearAllMocks();
  });

  describe('debug mode management', () => {
    test('should enable and disable debug mode', () => {
      expect(DebugUtils.isEnabled()).toBe(false);

      DebugUtils.enableDebugMode();
      expect(DebugUtils.isEnabled()).toBe(true);

      DebugUtils.disableDebugMode();
      expect(DebugUtils.isEnabled()).toBe(false);
    });

    test('should only log debug messages when enabled', () => {
      const logSpy = jest.spyOn(logger, 'debug').mockImplementation();

      DebugUtils.log('test message');
      expect(logSpy).not.toHaveBeenCalled();

      DebugUtils.enableDebugMode();
      DebugUtils.log('test message', { context: 'test' });
      expect(logSpy).toHaveBeenCalledWith('test message', { context: 'test' });

      logSpy.mockRestore();
    });
  });

  describe('system information collection', () => {
    test('should collect basic system information', async () => {
      const systemInfo = await DebugUtils.collectSystemInfo();

      expect(systemInfo).toHaveProperty('os');
      expect(systemInfo).toHaveProperty('node');
      expect(systemInfo).toHaveProperty('claude');
      expect(systemInfo).toHaveProperty('network');
      expect(systemInfo).toHaveProperty('environment');

      // Check OS info structure
      expect(systemInfo.os).toHaveProperty('platform');
      expect(systemInfo.os).toHaveProperty('arch');
      expect(systemInfo.os).toHaveProperty('version');
      expect(systemInfo.os).toHaveProperty('hostname');
      expect(systemInfo.os).toHaveProperty('uptime');
      expect(systemInfo.os).toHaveProperty('memory');

      // Check Node info structure
      expect(systemInfo.node).toHaveProperty('version');
      expect(systemInfo.node).toHaveProperty('platform');
      expect(systemInfo.node).toHaveProperty('arch');
      expect(systemInfo.node).toHaveProperty('execPath');
      expect(systemInfo.node).toHaveProperty('pid');
      expect(systemInfo.node).toHaveProperty('cwd');

      // Check environment info structure
      expect(systemInfo.environment).toHaveProperty('home');
      expect(systemInfo.environment).toHaveProperty('user');
      expect(systemInfo.environment).toHaveProperty('path');
      expect(systemInfo.environment).toHaveProperty('claudeVars');
      expect(Array.isArray(systemInfo.environment.path)).toBe(true);
    });

    test('should handle Claude CLI detection errors gracefully', async () => {
      const systemInfo = await DebugUtils.collectSystemInfo();

      expect(systemInfo.claude).toHaveProperty('available');
      expect(typeof systemInfo.claude.available).toBe('boolean');

      if (!systemInfo.claude.available) {
        expect(systemInfo.claude).toHaveProperty('error');
      } else {
        expect(systemInfo.claude).toHaveProperty('version');
        expect(systemInfo.claude).toHaveProperty('cliPath');
      }
    });

    test('should collect network interfaces', async () => {
      const systemInfo = await DebugUtils.collectSystemInfo();

      expect(systemInfo.network).toHaveProperty('interfaces');
      expect(Array.isArray(systemInfo.network.interfaces)).toBe(true);

      // Each interface should have required properties
      systemInfo.network.interfaces.forEach((interface_) => {
        expect(interface_).toHaveProperty('name');
        expect(interface_).toHaveProperty('address');
        expect(interface_).toHaveProperty('family');
        expect(interface_).toHaveProperty('internal');
        expect(typeof interface_.internal).toBe('boolean');
      });
    });
  });

  describe('configuration debug information', () => {
    test('should collect configuration debug info', () => {
      const mockCLIArgs = { prompt: 'test', debug: true };
      const mockEnvVars = { CLAUDE_AUTO_RESUME_LOG_FILE: '/tmp/test.log' };
      const mockDefaults = {
        defaultPrompt: 'continue',
        defaultTimeout: 30000,
        maxRetries: 3,
        claudeCliPath: 'claude',
        waitBuffer: 0,
        skipPermissions: true,
      };

      const configInfo = DebugUtils.collectConfigDebugInfo(
        mockCLIArgs,
        mockEnvVars,
        '/path/to/config.json',
        mockDefaults,
        mockDefaults
      );

      expect(configInfo).toHaveProperty('sources');
      expect(configInfo).toHaveProperty('resolved');
      expect(configInfo).toHaveProperty('precedence');
      expect(configInfo).toHaveProperty('validation');

      expect(configInfo.sources.cliArgs).toEqual(mockCLIArgs);
      expect(configInfo.sources.envVars).toEqual(mockEnvVars);
      expect(configInfo.sources.configFile).toBe('/path/to/config.json');
      expect(configInfo.sources.defaults).toEqual(mockDefaults);

      expect(Array.isArray(configInfo.precedence)).toBe(true);
      expect(configInfo.precedence.length).toBeGreaterThan(0);
    });
  });

  describe('performance metrics', () => {
    test('should record performance metrics', () => {
      DebugUtils.recordPerformanceMetric('test-operation', 100, true);

      const metrics = DebugUtils.getPerformanceMetrics();
      expect(metrics.operations.length).toBeGreaterThan(0);

      const lastOperation = metrics.operations[metrics.operations.length - 1];
      expect(lastOperation).toBeDefined();
      expect(lastOperation!.name).toBe('test-operation');
      expect(lastOperation!.duration).toBe(100);
      expect(lastOperation!.success).toBe(true);
      expect(typeof lastOperation!.timestamp).toBe('number');
    });

    test('should record failed operations with error details', () => {
      DebugUtils.recordPerformanceMetric('failed-operation', 50, false, 'Test error');

      const metrics = DebugUtils.getPerformanceMetrics();
      const lastOperation = metrics.operations[metrics.operations.length - 1];

      expect(lastOperation).toBeDefined();
      expect(lastOperation!.success).toBe(false);
      expect(lastOperation!.error).toBe('Test error');
    });

    test('should limit operations history to prevent memory issues', () => {
      // Record more than 100 operations
      for (let i = 0; i < 105; i++) {
        DebugUtils.recordPerformanceMetric(`operation-${i}`, 10, true);
      }

      const metrics = DebugUtils.getPerformanceMetrics();
      expect(metrics.operations.length).toBeLessThanOrEqual(100);

      // Should keep the most recent operations
      const lastOperation = metrics.operations[metrics.operations.length - 1];
      expect(lastOperation).toBeDefined();
      expect(lastOperation!.name).toBe('operation-104');
    });

    test('should update memory metrics', () => {
      DebugUtils.updateMemoryMetrics();

      const metrics = DebugUtils.getPerformanceMetrics();
      expect(metrics.memory).toHaveProperty('heapUsed');
      expect(metrics.memory).toHaveProperty('heapTotal');
      expect(metrics.memory).toHaveProperty('external');
      expect(metrics.memory).toHaveProperty('rss');

      expect(typeof metrics.memory.heapUsed).toBe('number');
      expect(typeof metrics.memory.heapTotal).toBe('number');
      expect(typeof metrics.memory.external).toBe('number');
      expect(typeof metrics.memory.rss).toBe('number');
    });
  });

  describe('debug output formatting', () => {
    test('should format debug output with system and config info', async () => {
      const systemInfo = await DebugUtils.collectSystemInfo();
      const configInfo = DebugUtils.collectConfigDebugInfo(
        { debug: true },
        {},
        undefined,
        {
          defaultPrompt: 'continue',
          defaultTimeout: 30000,
          maxRetries: 3,
          claudeCliPath: 'claude',
          waitBuffer: 0,
          skipPermissions: true,
        },
        {
          defaultPrompt: 'continue',
          defaultTimeout: 30000,
          maxRetries: 3,
          claudeCliPath: 'claude',
          waitBuffer: 0,
          skipPermissions: true,
        }
      );

      const debugOutput = DebugUtils.formatDebugOutput(systemInfo, configInfo);

      expect(typeof debugOutput).toBe('string');
      expect(debugOutput).toContain('CLAUDE AUTO-RESUME DEBUG INFORMATION');
      expect(debugOutput).toContain('SYSTEM INFORMATION');
      expect(debugOutput).toContain('NODE.JS INFORMATION');
      expect(debugOutput).toContain('CLAUDE CLI INFORMATION');
      expect(debugOutput).toContain('NETWORK INFORMATION');
      expect(debugOutput).toContain('CONFIGURATION INFORMATION');
      expect(debugOutput).toContain('PERFORMANCE METRICS');
    });
  });

  describe('debug tracking wrapper', () => {
    test('should track successful operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await DebugUtils.withDebugTracking('test-op', mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);

      const metrics = DebugUtils.getPerformanceMetrics();
      const lastOperation = metrics.operations[metrics.operations.length - 1];
      expect(lastOperation).toBeDefined();
      expect(lastOperation!.name).toBe('test-op');
      expect(lastOperation!.success).toBe(true);
    });

    test('should track failed operations', async () => {
      const error = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(DebugUtils.withDebugTracking('failed-op', mockOperation)).rejects.toThrow(
        'Test error'
      );

      const metrics = DebugUtils.getPerformanceMetrics();
      const lastOperation = metrics.operations[metrics.operations.length - 1];
      expect(lastOperation).toBeDefined();
      expect(lastOperation!.name).toBe('failed-op');
      expect(lastOperation!.success).toBe(false);
      expect(lastOperation!.error).toBe('Error: Test error');
    });
  });

  describe('debug export', () => {
    test('should export debug information to JSON file', async () => {
      const fs = require('fs').promises;
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

      const filename = await DebugUtils.exportDebugInfo();

      expect(typeof filename).toBe('string');
      expect(filename).toMatch(/claude-auto-resume-debug-.*\.json/);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);

      // Check the exported data structure
      const writeCall = fs.writeFile.mock.calls[0];
      const exportedData = JSON.parse(writeCall[1]);

      expect(exportedData).toHaveProperty('timestamp');
      expect(exportedData).toHaveProperty('systemInfo');
      expect(exportedData).toHaveProperty('performanceMetrics');
      expect(exportedData).toHaveProperty('debugMode');
    });

    test('should use custom output path when provided', async () => {
      const fs = require('fs').promises;
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

      const customPath = '/tmp/debug-custom.json';
      const filename = await DebugUtils.exportDebugInfo(customPath);

      expect(filename).toBe(customPath);
      expect(fs.writeFile).toHaveBeenCalledWith(customPath, expect.any(String), 'utf-8');
    });
  });
});
