/**
 * Configuration management module
 */

export { loadConfiguration } from './loader';
export {
  discoverConfigFile,
  loadConfigFile,
  validateConfigFile,
  mergeConfigFile,
  autoLoadConfigFile,
  type ConfigFile,
} from './file-loader';
export type { CLIConfig } from './types';
