/**
 * Configuration file loader for JSON and YAML formats
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils';
import type { CLIConfig } from './types';

/**
 * Configuration file interface
 */
export interface ConfigFile {
  /** Default prompt for Claude interactions */
  defaultPrompt?: string;
  /** Default timeout in milliseconds */
  defaultTimeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Claude CLI path */
  claudeCliPath?: string;
  /** Wait buffer in seconds */
  waitBuffer?: number;
  /** Skip permissions flag */
  skipPermissions?: boolean;
  /** Log file path */
  logFile?: string;
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Verbosity level */
  verbosity?: 'quiet' | 'normal' | 'verbose' | 'debug';
  /** Time format preference */
  timeFormat?: 'relative' | 'absolute' | 'both';
  /** Custom commands */
  customCommands?: Record<string, string>;
  /** Network settings */
  network?: {
    timeout?: number;
    retries?: number;
    checkUrls?: string[];
  };
}

/**
 * Configuration file discovery paths
 */
const CONFIG_FILE_NAMES = [
  '.claude-auto-resume.json',
  'claude-auto-resume.config.json',
  '.clauderc.json',
  'claude-config.json'
];

/**
 * Discovers configuration files in standard locations
 */
export function discoverConfigFile(): string | null {
  const searchPaths = [
    process.cwd(),
    path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.')
  ];

  for (const searchPath of searchPaths) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = path.join(searchPath, fileName);
      if (fs.existsSync(filePath)) {
        logger.debug('Configuration file discovered', { filePath });
        return filePath;
      }
    }
  }

  logger.debug('No configuration file found in standard locations');
  return null;
}

/**
 * Validates configuration file structure
 */
export function validateConfigFile(config: any): ConfigFile {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be a valid JSON object');
  }

  const validatedConfig: ConfigFile = {};

  // Validate string fields
  if (config.defaultPrompt !== undefined) {
    if (typeof config.defaultPrompt !== 'string' || !config.defaultPrompt.trim()) {
      throw new Error('defaultPrompt must be a non-empty string');
    }
    validatedConfig.defaultPrompt = config.defaultPrompt.trim();
  }

  if (config.claudeCliPath !== undefined) {
    if (typeof config.claudeCliPath !== 'string' || !config.claudeCliPath.trim()) {
      throw new Error('claudeCliPath must be a non-empty string');
    }
    validatedConfig.claudeCliPath = config.claudeCliPath.trim();
  }

  if (config.logFile !== undefined) {
    if (typeof config.logFile !== 'string') {
      throw new Error('logFile must be a string');
    }
    validatedConfig.logFile = config.logFile.trim() || undefined;
  }

  // Validate numeric fields
  if (config.defaultTimeout !== undefined) {
    const timeout = Number(config.defaultTimeout);
    if (isNaN(timeout) || timeout <= 0) {
      throw new Error('defaultTimeout must be a positive number');
    }
    validatedConfig.defaultTimeout = timeout;
  }

  if (config.maxRetries !== undefined) {
    const retries = Number(config.maxRetries);
    if (isNaN(retries) || retries < 0 || !Number.isInteger(retries)) {
      throw new Error('maxRetries must be a non-negative integer');
    }
    validatedConfig.maxRetries = retries;
  }

  if (config.waitBuffer !== undefined) {
    const buffer = Number(config.waitBuffer);
    if (isNaN(buffer) || buffer < 0) {
      throw new Error('waitBuffer must be a non-negative number');
    }
    validatedConfig.waitBuffer = buffer;
  }

  // Validate boolean fields
  if (config.skipPermissions !== undefined) {
    if (typeof config.skipPermissions !== 'boolean') {
      throw new Error('skipPermissions must be a boolean');
    }
    validatedConfig.skipPermissions = config.skipPermissions;
  }

  // Validate enum fields
  if (config.logLevel !== undefined) {
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(config.logLevel)) {
      throw new Error(`logLevel must be one of: ${validLogLevels.join(', ')}`);
    }
    validatedConfig.logLevel = config.logLevel;
  }

  if (config.verbosity !== undefined) {
    const validVerbosity = ['quiet', 'normal', 'verbose', 'debug'];
    if (!validVerbosity.includes(config.verbosity)) {
      throw new Error(`verbosity must be one of: ${validVerbosity.join(', ')}`);
    }
    validatedConfig.verbosity = config.verbosity;
  }

  if (config.timeFormat !== undefined) {
    const validTimeFormats = ['relative', 'absolute', 'both'];
    if (!validTimeFormats.includes(config.timeFormat)) {
      throw new Error(`timeFormat must be one of: ${validTimeFormats.join(', ')}`);
    }
    validatedConfig.timeFormat = config.timeFormat;
  }

  // Validate custom commands
  if (config.customCommands !== undefined) {
    if (!config.customCommands || typeof config.customCommands !== 'object') {
      throw new Error('customCommands must be an object');
    }
    
    const commands: Record<string, string> = {};
    for (const [key, value] of Object.entries(config.customCommands)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        throw new Error('customCommands must be key-value pairs of strings');
      }
      commands[key] = value;
    }
    validatedConfig.customCommands = commands;
  }

  // Validate network settings
  if (config.network !== undefined) {
    if (!config.network || typeof config.network !== 'object') {
      throw new Error('network must be an object');
    }

    const network: ConfigFile['network'] = {};

    if (config.network.timeout !== undefined) {
      const timeout = Number(config.network.timeout);
      if (isNaN(timeout) || timeout <= 0) {
        throw new Error('network.timeout must be a positive number');
      }
      network.timeout = timeout;
    }

    if (config.network.retries !== undefined) {
      const retries = Number(config.network.retries);
      if (isNaN(retries) || retries < 0 || !Number.isInteger(retries)) {
        throw new Error('network.retries must be a non-negative integer');
      }
      network.retries = retries;
    }

    if (config.network.checkUrls !== undefined) {
      if (!Array.isArray(config.network.checkUrls)) {
        throw new Error('network.checkUrls must be an array');
      }
      
      const urls: string[] = [];
      for (const url of config.network.checkUrls) {
        if (typeof url !== 'string' || !url.trim()) {
          throw new Error('network.checkUrls must contain valid URL strings');
        }
        urls.push(url.trim());
      }
      network.checkUrls = urls;
    }

    validatedConfig.network = network;
  }

  return validatedConfig;
}

/**
 * Loads and parses a JSON configuration file
 */
export function loadConfigFile(filePath: string): ConfigFile {
  logger.debug('Loading configuration file', { filePath });

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    if (!fileContent.trim()) {
      throw new Error('Configuration file is empty');
    }

    let parsedConfig: any;
    
    try {
      parsedConfig = JSON.parse(fileContent);
    } catch (parseError) {
      throw new Error(`Invalid JSON in configuration file: ${parseError}`);
    }

    const validatedConfig = validateConfigFile(parsedConfig);
    
    logger.info('Configuration file loaded successfully', { 
      filePath, 
      configKeys: Object.keys(validatedConfig) 
    });
    
    return validatedConfig;

  } catch (error) {
    logger.error('Failed to load configuration file', { filePath, error });
    throw error;
  }
}

/**
 * Merges configuration file settings with existing configuration
 */
export function mergeConfigFile(baseConfig: CLIConfig, fileConfig: ConfigFile): CLIConfig {
  logger.debug('Merging configuration file with base configuration');

  const merged: CLIConfig = {
    ...baseConfig,
    // Override with file config values if present
    ...(fileConfig.defaultPrompt && { defaultPrompt: fileConfig.defaultPrompt }),
    ...(fileConfig.defaultTimeout && { defaultTimeout: fileConfig.defaultTimeout }),
    ...(fileConfig.maxRetries && { maxRetries: fileConfig.maxRetries }),
    ...(fileConfig.claudeCliPath && { claudeCliPath: fileConfig.claudeCliPath }),
    ...(fileConfig.waitBuffer !== undefined && { waitBuffer: fileConfig.waitBuffer }),
    ...(fileConfig.skipPermissions !== undefined && { skipPermissions: fileConfig.skipPermissions }),
    ...(fileConfig.logFile && { logFile: fileConfig.logFile }),
  };

  logger.debug('Configuration merge completed', { 
    originalKeys: Object.keys(baseConfig),
    fileKeys: Object.keys(fileConfig),
    mergedKeys: Object.keys(merged)
  });

  return merged;
}

/**
 * Auto-discovers and loads configuration file if available
 */
export function autoLoadConfigFile(): ConfigFile | null {
  const configPath = discoverConfigFile();
  
  if (!configPath) {
    logger.debug('No configuration file auto-discovered');
    return null;
  }

  try {
    return loadConfigFile(configPath);
  } catch (error) {
    logger.warn('Failed to load auto-discovered configuration file', { 
      configPath, 
      error: error instanceof Error ? error.message : error 
    });
    return null;
  }
}