/**
 * CLI-related type definitions
 */

/**
 * Command line options interface
 */
export interface CLIOptions {
  /** Custom prompt to send to Claude */
  prompt?: string;
  /** Continue previous conversation instead of starting new session */
  continue?: boolean;
  /** Execute custom command after usage limit wait period */
  execute?: string;
  /** Alias for execute command */
  cmd?: string;
  /** Test mode - simulate usage limit with specified wait time in seconds */
  testMode?: number;
  /** Show version information */
  version?: boolean;
  /** Show help information */
  help?: boolean;
  /** Show system check information */
  check?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Enable quiet mode (errors only) */
  quiet?: boolean;
  /** Enable debug mode with comprehensive diagnostic output */
  debug?: boolean;
}
