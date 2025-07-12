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
  /** Additional wait time in seconds (from CLAUDE_AUTO_RESUME_WAIT_BUFFER) */
  waitBuffer: number;
  /** Control permission skipping (from CLAUDE_AUTO_RESUME_SKIP_PERMISSIONS) */
  skipPermissions: boolean;
  /** Optional log file path (from CLAUDE_AUTO_RESUME_LOG_FILE) */
  logFile?: string;
}

/**
 * Configuration file structure
 */
export interface ConfigFile {
  /** CLI configuration options */
  cli?: Partial<CLIConfig>;
}
