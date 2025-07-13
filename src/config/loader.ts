/**
 * Configuration loader implementation
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CLIConfig } from './types';
import { logger } from '../utils';
import { autoLoadConfigFile, mergeConfigFile } from './file-loader';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CLIConfig = {
  defaultPrompt: 'continue',
  defaultTimeout: 120000, // 2 minutes
  maxRetries: 3,
  claudeCliPath: 'claude',
  waitBuffer: 10,
  skipPermissions: true,
  logFile: undefined,
};

/**
 * Validates and parses CLAUDE_AUTO_RESUME_WAIT_BUFFER environment variable
 */
function parseWaitBuffer(value: string | undefined): number {
  if (!value) return DEFAULT_CONFIG.waitBuffer;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error(
      `Invalid CLAUDE_AUTO_RESUME_WAIT_BUFFER value: '${value}'. ` +
        'Must be a non-negative integer (seconds). ' +
        'Example: export CLAUDE_AUTO_RESUME_WAIT_BUFFER=30'
    );
  }
  return parsed;
}

/**
 * Validates and parses CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS environment variable
 */
function parseSkipPermissions(value: string | undefined): boolean {
  if (!value) return DEFAULT_CONFIG.skipPermissions;

  const lower = value.toLowerCase();
  switch (lower) {
    case 'true':
    case 'yes':
    case '1':
    case 'on':
      return true;
    case 'false':
    case 'no':
    case '0':
    case 'off':
      return false;
    default:
      throw new Error(
        `Invalid CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS value: '${value}'. ` +
          'Must be true/false, yes/no, 1/0, or on/off (case insensitive). ' +
          'Example: export CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS=false'
      );
  }
}

/**
 * Validates and parses CLAUDE_AUTO_RESUME_LOG_FILE environment variable
 */
function parseLogFile(value: string | undefined): string | undefined {
  if (!value || value.trim() === '') return undefined;

  const logPath = value.trim();

  try {
    // Check if the directory exists and is writable
    const dir = path.dirname(logPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Test if we can write to the location
    fs.accessSync(dir, fs.constants.W_OK);

    return logPath;
  } catch (error) {
    throw new Error(
      `Invalid CLAUDE_AUTO_RESUME_LOG_FILE path: '${value}'. ` +
        `Directory is not writable or cannot be created: ${error}`
    );
  }
}

/**
 * Loads configuration from multiple sources with precedence:
 * 1. Environment variables (highest priority)
 * 2. Configuration file
 * 3. Default values (lowest priority)
 *
 * @param exitOnError - Whether to exit process on error (default: true)
 */
export function loadConfiguration(exitOnError = true): CLIConfig {
  try {
    logger.debug('Loading configuration from multiple sources');

    // Start with defaults
    let config: CLIConfig = { ...DEFAULT_CONFIG };

    // Load configuration file if available (overrides defaults)
    const fileConfig = autoLoadConfigFile();
    if (fileConfig) {
      logger.info('Configuration file found and loaded');
      config = mergeConfigFile(config, fileConfig);
    } else {
      logger.debug('No configuration file found, using defaults and environment variables only');
    }

    // Apply environment variables (highest priority - overrides file config)
    const envConfig: CLIConfig = {
      ...config,
      waitBuffer: parseWaitBuffer(process.env.CLAUDE_AUTO_RESUME_WAIT_BUFFER),
      skipPermissions: parseSkipPermissions(process.env.CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS),
      logFile: parseLogFile(process.env.CLAUDE_AUTO_RESUME_LOG_FILE),
    };

    // Perform runtime validation
    const { validateCLIConfig } = require('../utils/validators');
    const validation = validateCLIConfig(envConfig);

    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    logger.debug('Configuration loading completed', {
      hasFileConfig: !!fileConfig,
      finalConfig: {
        defaultPrompt: envConfig.defaultPrompt,
        waitBuffer: envConfig.waitBuffer,
        skipPermissions: envConfig.skipPermissions,
        logFile: envConfig.logFile ? 'set' : 'not set',
      },
    });

    return envConfig;
  } catch (error) {
    if (exitOnError) {
      // Re-throw configuration errors with exit code 1
      logger.error('Configuration validation failed', { error });
      process.exit(1);
    } else {
      // Re-throw for testing
      throw error;
    }
  }
}
