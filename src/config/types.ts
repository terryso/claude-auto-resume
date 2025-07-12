/**
 * Configuration type definitions
 */

/**
 * Main configuration interface for the CLI
 */
export interface CLIConfig {
  /** Default prompt to send to Claude */
  defaultPrompt: string;
  /** Default timeout for waiting (in milliseconds) */
  defaultTimeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Claude CLI command path */
  claudeCliPath: string;
}

/**
 * Configuration file structure
 */
export interface ConfigFile {
  /** CLI configuration options */
  cli?: Partial<CLIConfig>;
}
