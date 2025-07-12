/**
 * Configuration loader implementation
 */

import type { CLIConfig } from './types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CLIConfig = {
  defaultPrompt: 'continue',
  defaultTimeout: 120000, // 2 minutes
  maxRetries: 3,
  claudeCliPath: 'claude',
};

/**
 * Loads configuration from environment and config files
 */
export function loadConfiguration(): CLIConfig {
  // For now, return default configuration
  // TODO: Implement config file loading and environment variable overrides
  return { ...DEFAULT_CONFIG };
}
