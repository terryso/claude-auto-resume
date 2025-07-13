/**
 * Debug utilities for comprehensive diagnostic output and troubleshooting
 */

import * as os from 'os';
import * as process from 'process';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { logger } from './index';
import type { CLIConfig } from '../config/types';
import type { CLIOptions } from '../cli/types';
import { NetworkUtils } from '../core/network';

/**
 * System information for debugging
 */
export interface SystemInfo {
  os: {
    platform: string;
    arch: string;
    version: string;
    hostname: string;
    uptime: number;
    memory: {
      total: number;
      free: number;
      available: number;
    };
  };
  node: {
    version: string;
    platform: string;
    arch: string;
    execPath: string;
    pid: number;
    ppid: number;
    cwd: string;
  };
  claude: {
    cliPath?: string;
    version?: string;
    available: boolean;
    error?: string;
  };
  network: {
    interfaces: Array<{
      name: string;
      address: string;
      family: string;
      internal: boolean;
    }>;
    connectivity?: {
      ping: boolean;
      curl: boolean;
      wget: boolean;
    };
  };
  environment: {
    home: string;
    user: string;
    shell?: string;
    path: string[];
    claudeVars: Record<string, string>;
  };
}

/**
 * Configuration debug information
 */
export interface ConfigDebugInfo {
  sources: {
    cliArgs: Partial<CLIOptions>;
    envVars: Record<string, string>;
    configFile?: string;
    defaults: CLIConfig;
  };
  resolved: CLIConfig;
  precedence: string[];
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Performance metrics for debugging
 */
export interface PerformanceMetrics {
  startup: {
    configLoad: number;
    validation: number;
    total: number;
  };
  operations: Array<{
    name: string;
    duration: number;
    timestamp: number;
    success: boolean;
    error?: string;
  }>;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

/**
 * Debug utilities class with comprehensive system information collection
 */
export class DebugUtils {
  private static isDebugMode = false;
  private static performanceMetrics: PerformanceMetrics = {
    startup: { configLoad: 0, validation: 0, total: 0 },
    operations: [],
    memory: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
  };

  /**
   * Enables debug mode for comprehensive logging
   */
  static enableDebugMode(): void {
    DebugUtils.isDebugMode = true;
    logger.info('Debug mode enabled', { timestamp: new Date().toISOString() });
  }

  /**
   * Disables debug mode
   */
  static disableDebugMode(): void {
    DebugUtils.isDebugMode = false;
    logger.info('Debug mode disabled');
  }

  /**
   * Checks if debug mode is enabled
   */
  static isEnabled(): boolean {
    return DebugUtils.isDebugMode;
  }

  /**
   * Logs debug information if debug mode is enabled
   */
  static log(message: string, context?: object): void {
    if (DebugUtils.isDebugMode) {
      logger.debug(message, context);
    }
  }

  /**
   * Collects comprehensive system information for troubleshooting
   */
  static async collectSystemInfo(): Promise<SystemInfo> {
    const startTime = Date.now();

    try {
      // OS Information
      const osInfo = {
        platform: os.platform(),
        arch: os.arch(),
        version: os.release(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          available: os.freemem(), // Simplified - could use more detailed calculation
        },
      };

      // Node.js Information
      const nodeInfo = {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        execPath: process.execPath,
        pid: process.pid,
        ppid: process.ppid || 0,
        cwd: process.cwd(),
      };

      // Claude CLI Information
      const claudeInfo = await DebugUtils.getClaudeCliInfo();

      // Network Information
      const networkInterfaces = os.networkInterfaces();
      const interfaces = Object.entries(networkInterfaces).flatMap(([name, addresses]) =>
        (addresses || []).map((addr) => ({
          name,
          address: addr.address,
          family: addr.family,
          internal: addr.internal,
        }))
      );

      // Network connectivity (if debug mode is enabled)
      let connectivity;
      if (DebugUtils.isDebugMode) {
        connectivity = await DebugUtils.checkNetworkConnectivity();
      }

      // Environment Information
      const environmentInfo = {
        home: os.homedir(),
        user: os.userInfo().username,
        shell: process.env.SHELL,
        path: (process.env.PATH || '').split(path.delimiter),
        claudeVars: DebugUtils.getClaudeEnvironmentVariables(),
      };

      const duration = Date.now() - startTime;
      DebugUtils.log('System information collected', { duration });

      return {
        os: osInfo,
        node: nodeInfo,
        claude: claudeInfo,
        network: { interfaces, connectivity },
        environment: environmentInfo,
      };
    } catch (error) {
      logger.error('Failed to collect system information', { error });
      throw error;
    }
  }

  /**
   * Gets Claude CLI information and version
   */
  private static async getClaudeCliInfo(): Promise<SystemInfo['claude']> {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const child = spawn('claude', ['--version'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 5000,
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve(stdout.trim());
          } else {
            reject(new Error(`Claude CLI version check failed: ${stderr}`));
          }
        });

        child.on('error', (error) => {
          reject(error);
        });
      });

      return {
        cliPath: 'claude',
        version: result,
        available: true,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Checks network connectivity for debugging
   */
  private static async checkNetworkConnectivity(): Promise<SystemInfo['network']['connectivity']> {
    try {
      const status = await NetworkUtils.getConnectivityStatus();
      return {
        ping: status.ping.connected,
        curl: status.curl.connected,
        wget: status.wget.connected,
      };
    } catch (error) {
      DebugUtils.log('Network connectivity check failed', { error });
      return {
        ping: false,
        curl: false,
        wget: false,
      };
    }
  }

  /**
   * Gets Claude-related environment variables
   */
  private static getClaudeEnvironmentVariables(): Record<string, string> {
    const claudeVars: Record<string, string> = {};
    const envVars = [
      'CLAUDE_AUTO_RESUME_WAIT_BUFFER',
      'CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS',
      'CLAUDE_AUTO_RESUME_LOG_FILE',
      'CLAUDE_AUTO_RESUME_LOG_LEVEL',
      'CLAUDE_CLI_PATH',
    ];

    for (const varName of envVars) {
      const value = process.env[varName];
      if (value !== undefined) {
        claudeVars[varName] = value;
      }
    }

    return claudeVars;
  }

  /**
   * Collects configuration debug information
   */
  static collectConfigDebugInfo(
    cliArgs: Partial<CLIOptions>,
    envVars: Record<string, string>,
    configFile: string | undefined,
    defaults: CLIConfig,
    resolved: CLIConfig
  ): ConfigDebugInfo {
    const debugInfo: ConfigDebugInfo = {
      sources: {
        cliArgs,
        envVars,
        configFile,
        defaults,
      },
      resolved,
      precedence: ['CLI arguments', 'Environment variables', 'Configuration file', 'Defaults'],
      validation: {
        valid: true,
        errors: [],
        warnings: [],
      },
    };

    DebugUtils.log('Configuration debug info collected', {
      sources: Object.keys(debugInfo.sources),
      resolved: Object.keys(debugInfo.resolved),
    });

    return debugInfo;
  }

  /**
   * Records performance metric for debugging
   */
  static recordPerformanceMetric(
    name: string,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    const metric = {
      name,
      duration,
      timestamp: Date.now(),
      success,
      error,
    };

    DebugUtils.performanceMetrics.operations.push(metric);
    DebugUtils.log('Performance metric recorded', metric);

    // Keep only last 100 operations to prevent memory issues
    if (DebugUtils.performanceMetrics.operations.length > 100) {
      DebugUtils.performanceMetrics.operations =
        DebugUtils.performanceMetrics.operations.slice(-100);
    }
  }

  /**
   * Updates memory usage metrics
   */
  static updateMemoryMetrics(): void {
    const memUsage = process.memoryUsage();
    DebugUtils.performanceMetrics.memory = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    };

    DebugUtils.log('Memory metrics updated', DebugUtils.performanceMetrics.memory);
  }

  /**
   * Gets current performance metrics
   */
  static getPerformanceMetrics(): PerformanceMetrics {
    DebugUtils.updateMemoryMetrics();
    return { ...DebugUtils.performanceMetrics };
  }

  /**
   * Formats debug output with structured information display
   */
  static formatDebugOutput(systemInfo: SystemInfo, configInfo: ConfigDebugInfo): string {
    const sections = [
      '='.repeat(80),
      '🐛 CLAUDE AUTO-RESUME DEBUG INFORMATION',
      '='.repeat(80),
      '',
      '📊 SYSTEM INFORMATION',
      '-'.repeat(40),
      `OS: ${systemInfo.os.platform} ${systemInfo.os.arch} (${systemInfo.os.version})`,
      `Hostname: ${systemInfo.os.hostname}`,
      `Uptime: ${Math.floor(systemInfo.os.uptime / 3600)}h ${Math.floor((systemInfo.os.uptime % 3600) / 60)}m`,
      `Memory: ${Math.round(systemInfo.os.memory.free / 1024 / 1024)}MB free / ${Math.round(systemInfo.os.memory.total / 1024 / 1024)}MB total`,
      '',
      '🚀 NODE.JS INFORMATION',
      '-'.repeat(40),
      `Version: ${systemInfo.node.version}`,
      `Platform: ${systemInfo.node.platform} ${systemInfo.node.arch}`,
      `Executable: ${systemInfo.node.execPath}`,
      `PID: ${systemInfo.node.pid}`,
      `Working Directory: ${systemInfo.node.cwd}`,
      '',
      '🤖 CLAUDE CLI INFORMATION',
      '-'.repeat(40),
      `Available: ${systemInfo.claude.available ? '✅ Yes' : '❌ No'}`,
      systemInfo.claude.version ? `Version: ${systemInfo.claude.version}` : '',
      systemInfo.claude.error ? `Error: ${systemInfo.claude.error}` : '',
      '',
      '🌐 NETWORK INFORMATION',
      '-'.repeat(40),
      `Interfaces: ${systemInfo.network.interfaces.length} detected`,
      systemInfo.network.connectivity
        ? `Connectivity: Ping ${systemInfo.network.connectivity.ping ? '✅' : '❌'} | Curl ${systemInfo.network.connectivity.curl ? '✅' : '❌'} | Wget ${systemInfo.network.connectivity.wget ? '✅' : '❌'}`
        : '',
      '',
      '⚙️ CONFIGURATION INFORMATION',
      '-'.repeat(40),
      `Sources: ${configInfo.precedence.join(' → ')}`,
      `CLI Args: ${Object.keys(configInfo.sources.cliArgs).length} options`,
      `Env Vars: ${Object.keys(configInfo.sources.envVars).length} variables`,
      `Config File: ${configInfo.sources.configFile || 'Not found'}`,
      '',
      '🔧 ENVIRONMENT VARIABLES',
      '-'.repeat(40),
      ...Object.entries(systemInfo.environment.claudeVars).map(
        ([key, value]) => `${key}: ${value}`
      ),
      '',
      '📈 PERFORMANCE METRICS',
      '-'.repeat(40),
      `Heap Used: ${Math.round(DebugUtils.performanceMetrics.memory.heapUsed / 1024 / 1024)}MB`,
      `RSS: ${Math.round(DebugUtils.performanceMetrics.memory.rss / 1024 / 1024)}MB`,
      `Operations: ${DebugUtils.performanceMetrics.operations.length} recorded`,
      '',
      '='.repeat(80),
    ].filter((line) => line !== ''); // Remove empty lines from conditionals

    return sections.join('\n');
  }

  /**
   * Exports debug information to file
   */
  static async exportDebugInfo(outputPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = outputPath || `claude-auto-resume-debug-${timestamp}.json`;

    try {
      const systemInfo = await DebugUtils.collectSystemInfo();
      const performanceMetrics = DebugUtils.getPerformanceMetrics();

      const debugExport = {
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || 'unknown',
        systemInfo,
        performanceMetrics,
        debugMode: DebugUtils.isDebugMode,
      };

      await fs.promises.writeFile(filename, JSON.stringify(debugExport, null, 2), 'utf-8');
      DebugUtils.log('Debug information exported', {
        filename,
        size: JSON.stringify(debugExport).length,
      });

      return filename;
    } catch (error) {
      logger.error('Failed to export debug information', { error, filename });
      throw error;
    }
  }

  /**
   * Wrapper for operations with debug tracking
   */
  static async withDebugTracking<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      DebugUtils.log(`Starting operation: ${operationName}`);
      const result = await operation();
      const duration = Date.now() - startTime;

      DebugUtils.recordPerformanceMetric(operationName, duration, true);
      DebugUtils.log(`Completed operation: ${operationName}`, { duration });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      DebugUtils.recordPerformanceMetric(operationName, duration, false, String(error));
      DebugUtils.log(`Failed operation: ${operationName}`, { duration, error });
      throw error;
    }
  }
}
