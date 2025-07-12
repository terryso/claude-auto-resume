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
  /** Show help information */
  help?: boolean;
}
