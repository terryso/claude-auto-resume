/**
 * Network connectivity checking utilities with multiple fallback methods
 */

import { spawn } from 'child_process';
import { ClaudeAutoResumeError } from '../utils/errors';
import { createSpinner, withSpinner } from '../utils/progress';
import { logger } from '../utils';

/**
 * Network connectivity result interface
 */
export interface ConnectivityResult {
  /** Whether connectivity is available */
  connected: boolean;
  /** Method that succeeded in checking connectivity */
  method?: string;
  /** Error details if connectivity check failed */
  error?: string;
  /** Response time in milliseconds */
  responseTime?: number;
}

/**
 * Network-related utility functions with multiple fallback methods
 */
export class NetworkUtils {
  private static readonly PRIMARY_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];
  private static readonly HTTPS_TEST_URLS = [
    'https://www.google.com',
    'https://www.cloudflare.com',
  ];
  private static readonly TIMEOUT_MS = 5000;
  private static readonly CONNECT_TIMEOUT_MS = 3000;

  /**
   * Ping-based connectivity check using system ping command
   */
  static async checkConnectivityPing(host = '8.8.8.8'): Promise<ConnectivityResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const pingArgs = isWindows
        ? ['-n', '1', '-w', '3000', host] // Windows ping
        : ['-c', '1', '-W', '3', host]; // Unix ping

      const child = spawn('ping', pingArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: NetworkUtils.TIMEOUT_MS,
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
        const responseTime = Date.now() - startTime;
        if (code === 0) {
          resolve({
            connected: true,
            method: 'ping',
            responseTime,
          });
        } else {
          resolve({
            connected: false,
            method: 'ping',
            error: `Ping failed: ${stderr || 'No response'}`,
            responseTime,
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          connected: false,
          method: 'ping',
          error: `Ping command error: ${error.message}`,
          responseTime: Date.now() - startTime,
        });
      });

      // Timeout handler
      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          connected: false,
          method: 'ping',
          error: 'Ping timeout',
          responseTime: Date.now() - startTime,
        });
      }, NetworkUtils.TIMEOUT_MS);
    });
  }

  /**
   * HTTP-based connectivity check using curl
   */
  static async checkConnectivityCurl(url = 'https://www.google.com'): Promise<ConnectivityResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const curlArgs = [
        '-s', // Silent mode
        '--max-time',
        (NetworkUtils.TIMEOUT_MS / 1000).toString(),
        '--connect-timeout',
        (NetworkUtils.CONNECT_TIMEOUT_MS / 1000).toString(),
        '-o',
        '/dev/null', // Discard output
        '-w',
        '%{http_code}', // Write HTTP response code
        url,
      ];

      const child = spawn('curl', curlArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: NetworkUtils.TIMEOUT_MS,
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
        const responseTime = Date.now() - startTime;
        const httpCode = stdout.trim();

        if (code === 0 && httpCode && parseInt(httpCode) < 400) {
          resolve({
            connected: true,
            method: 'curl',
            responseTime,
          });
        } else {
          resolve({
            connected: false,
            method: 'curl',
            error: `Curl failed: HTTP ${httpCode} ${stderr}`,
            responseTime,
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          connected: false,
          method: 'curl',
          error: `Curl command error: ${error.message}`,
          responseTime: Date.now() - startTime,
        });
      });
    });
  }

  /**
   * HTTP-based connectivity check using wget
   */
  static async checkConnectivityWget(url = 'https://www.google.com'): Promise<ConnectivityResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const wgetArgs = [
        '-q', // Quiet mode
        '--timeout=' + NetworkUtils.TIMEOUT_MS / 1000,
        '--tries=1',
        '-O',
        '/dev/null', // Discard output
        url,
      ];

      const child = spawn('wget', wgetArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: NetworkUtils.TIMEOUT_MS,
      });

      let stderr = '';

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const responseTime = Date.now() - startTime;

        if (code === 0) {
          resolve({
            connected: true,
            method: 'wget',
            responseTime,
          });
        } else {
          resolve({
            connected: false,
            method: 'wget',
            error: `Wget failed: ${stderr}`,
            responseTime,
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          connected: false,
          method: 'wget',
          error: `Wget command error: ${error.message}`,
          responseTime: Date.now() - startTime,
        });
      });
    });
  }

  /**
   * Comprehensive connectivity check with multiple fallback methods
   * Tests in order: ping to DNS servers, curl to HTTPS, wget to HTTPS
   */
  static async checkConnectivity(): Promise<ConnectivityResult> {
    // Method 1: Try ping to primary DNS servers
    for (const dnsServer of NetworkUtils.PRIMARY_DNS_SERVERS) {
      const pingResult = await NetworkUtils.checkConnectivityPing(dnsServer);
      if (pingResult.connected) {
        return pingResult;
      }
    }

    // Method 2: Try curl to HTTPS endpoints
    for (const url of NetworkUtils.HTTPS_TEST_URLS) {
      const curlResult = await NetworkUtils.checkConnectivityCurl(url);
      if (curlResult.connected) {
        return curlResult;
      }
    }

    // Method 3: Try wget as final fallback
    for (const url of NetworkUtils.HTTPS_TEST_URLS) {
      const wgetResult = await NetworkUtils.checkConnectivityWget(url);
      if (wgetResult.connected) {
        return wgetResult;
      }
    }

    // All methods failed
    return {
      connected: false,
      error: 'All connectivity check methods failed',
    };
  }

  /**
   * Checks connectivity before running Claude commands
   */
  static async ensureConnectivity(): Promise<void> {
    const result = await NetworkUtils.checkConnectivity();

    if (!result.connected) {
      throw new ClaudeAutoResumeError(
        'Network connectivity check failed',
        3,
        `Unable to verify internet connection. Error: ${result.error}`,
        'Check your internet connection and try again. Ensure firewall allows ping, curl, or wget commands.'
      );
    }
  }

  /**
   * Waits for network connectivity to be restored with progress updates
   */
  static async waitForConnectivity(maxWaitTime = 30000): Promise<boolean> {
    const startTime = Date.now();
    let attempt = 1;
    const spinner = createSpinner('dots');

    try {
      spinner.start('Checking network connectivity...');

      while (Date.now() - startTime < maxWaitTime) {
        const result = await NetworkUtils.checkConnectivity();

        if (result.connected) {
          spinner.succeed(
            `Network connectivity restored via ${result.method} (${result.responseTime}ms)`
          );
          logger.info('Network connectivity restored', {
            method: result.method,
            responseTime: result.responseTime,
            attempt,
          });
          return true;
        }

        spinner.update(`Attempt ${attempt}: Testing connectivity... (${result.error})`);
        logger.debug('Network connectivity attempt failed', {
          attempt,
          error: result.error,
          elapsed: Date.now() - startTime,
        });

        attempt++;

        // Wait before next attempt with spinner update
        const waitTime = 2000;
        for (let i = waitTime / 100; i > 0; i--) {
          spinner.update(`Retrying in ${Math.ceil(i / 10)}s... (Attempt ${attempt - 1} failed)`);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      spinner.fail('Network connectivity could not be established within timeout period');
      logger.error('Network connectivity timeout', {
        maxWaitTime,
        attempts: attempt - 1,
        elapsed: Date.now() - startTime,
      });
      return false;
    } catch (error) {
      spinner.fail('Network connectivity check failed');
      logger.error('Network connectivity check error', { error });
      return false;
    }
  }

  /**
   * Gets detailed connectivity status for system check
   */
  static async getConnectivityStatus(): Promise<{
    ping: ConnectivityResult;
    curl: ConnectivityResult;
    wget: ConnectivityResult;
    overall: boolean;
  }> {
    const [pingResult, curlResult, wgetResult] = await Promise.all([
      NetworkUtils.checkConnectivityPing(),
      NetworkUtils.checkConnectivityCurl(),
      NetworkUtils.checkConnectivityWget(),
    ]);

    return {
      ping: pingResult,
      curl: curlResult,
      wget: wgetResult,
      overall: pingResult.connected || curlResult.connected || wgetResult.connected,
    };
  }
}
