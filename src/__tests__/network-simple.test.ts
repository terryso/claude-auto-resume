/**
 * Simple network utilities tests
 */

// Mock all external dependencies
jest.mock('child_process');

import { NetworkUtils } from '../core/network';

describe('NetworkUtils Simple', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('class availability', () => {
    it('should be properly exported', () => {
      expect(NetworkUtils).toBeDefined();
      expect(typeof NetworkUtils).toBe('function');
    });

    it('should be instantiable', () => {
      expect(() => new NetworkUtils()).not.toThrow();
    });
  });

  describe('static methods', () => {
    it('should export checkConnectivity method', () => {
      expect(typeof NetworkUtils.checkConnectivity).toBe('function');
    });

    it('should export waitForConnectivity method', () => {
      expect(typeof NetworkUtils.waitForConnectivity).toBe('function');
    });

    it('should export checkConnectivityPing method', () => {
      expect(typeof NetworkUtils.checkConnectivityPing).toBe('function');
    });

    it('should export checkConnectivityCurl method', () => {
      expect(typeof NetworkUtils.checkConnectivityCurl).toBe('function');
    });

    it('should export checkConnectivityWget method', () => {
      expect(typeof NetworkUtils.checkConnectivityWget).toBe('function');
    });
  });

  describe('mock integration tests', () => {
    it('should handle connectivity checks with mocks', () => {
      // Test that methods exist and are functions (no actual execution)
      expect(typeof NetworkUtils.checkConnectivityPing).toBe('function');
      expect(typeof NetworkUtils.checkConnectivityCurl).toBe('function');
      expect(typeof NetworkUtils.checkConnectivityWget).toBe('function');
    });

    it('should handle wait for connectivity with mocks', async () => {
      // Mock the checkConnectivity method to return success immediately
      const originalCheckConnectivity = NetworkUtils.checkConnectivity;
      NetworkUtils.checkConnectivity = jest.fn().mockResolvedValue({
        connected: true,
        method: 'ping',
        responseTime: 50,
      });

      const result = await NetworkUtils.waitForConnectivity(1000);
      expect(typeof result).toBe('boolean');

      // Restore original method
      NetworkUtils.checkConnectivity = originalCheckConnectivity;
    });

    it('should handle network error cases', async () => {
      // Mock to return failure
      const originalCheckConnectivity = NetworkUtils.checkConnectivity;
      NetworkUtils.checkConnectivity = jest.fn().mockResolvedValue({
        connected: false,
        error: 'Network unavailable',
      });

      const result = await NetworkUtils.waitForConnectivity(100);
      expect(typeof result).toBe('boolean');

      // Restore original method
      NetworkUtils.checkConnectivity = originalCheckConnectivity;
    });
  });

  describe('class structure', () => {
    it('should be a proper class', () => {
      expect(NetworkUtils).toBeDefined();
      expect(typeof NetworkUtils).toBe('function');
    });

    it('should have correct constructor', () => {
      expect(() => new NetworkUtils()).not.toThrow();
    });
  });

  describe('enhanced coverage tests', () => {
    const { spawn } = require('child_process');

    beforeEach(() => {
      // Reset spawn mock
      spawn.mockClear();
    });

    describe('checkConnectivityPing', () => {
      it('should handle successful ping on Unix', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              process.nextTick(() => callback(0));
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        // Mock platform to Unix
        Object.defineProperty(process, 'platform', { value: 'linux' });

        const result = await NetworkUtils.checkConnectivityPing('8.8.8.8');

        expect(spawn).toHaveBeenCalledWith(
          'ping',
          ['-c', '1', '-W', '3', '8.8.8.8'],
          expect.any(Object)
        );
        expect(typeof result).toBe('object');
      });

      it('should handle successful ping on Windows', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              process.nextTick(() => callback(0));
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        // Mock platform to Windows
        Object.defineProperty(process, 'platform', { value: 'win32' });

        const result = await NetworkUtils.checkConnectivityPing('8.8.8.8');

        expect(spawn).toHaveBeenCalledWith(
          'ping',
          ['-n', '1', '-w', '3000', '8.8.8.8'],
          expect.any(Object)
        );
        expect(typeof result).toBe('object');
      });

      it('should handle ping failure', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('Network unreachable');
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              process.nextTick(() => callback(1));
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const result = await NetworkUtils.checkConnectivityPing('192.0.2.1');

        expect(typeof result).toBe('object');
        expect(result.connected).toBe(false);
      });

      it('should handle ping command error', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              process.nextTick(() => callback(new Error('Command not found')));
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const result = await NetworkUtils.checkConnectivityPing('8.8.8.8');

        expect(typeof result).toBe('object');
        expect(result.connected).toBe(false);
      });
    });

    describe('checkConnectivityCurl', () => {
      it('should handle successful curl request', async () => {
        const mockChild = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('200');
              }
            }),
          },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              process.nextTick(() => callback(0));
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const result = await NetworkUtils.checkConnectivityCurl('https://www.google.com');

        expect(spawn).toHaveBeenCalledWith(
          'curl',
          expect.arrayContaining(['-s', 'https://www.google.com']),
          expect.any(Object)
        );
        expect(typeof result).toBe('object');
      });

      it('should handle curl failure with HTTP error', async () => {
        const mockChild = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('404');
              }
            }),
          },
          stderr: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('Not found');
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              process.nextTick(() => callback(1));
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const result = await NetworkUtils.checkConnectivityCurl('https://invalid.test');

        expect(typeof result).toBe('object');
        expect(result.connected).toBe(false);
      });

      it('should handle curl command error', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('Curl not found')), 10);
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const result = await NetworkUtils.checkConnectivityCurl();

        expect(typeof result).toBe('object');
        expect(result.connected).toBe(false);
      });
    });

    describe('checkConnectivityWget', () => {
      it('should handle successful wget request', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              process.nextTick(() => callback(0));
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const result = await NetworkUtils.checkConnectivityWget('https://www.google.com');

        expect(spawn).toHaveBeenCalledWith(
          'wget',
          expect.arrayContaining(['-q', 'https://www.google.com']),
          expect.any(Object)
        );
        expect(typeof result).toBe('object');
      });

      it('should handle wget failure', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('Connection failed');
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              process.nextTick(() => callback(1));
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const result = await NetworkUtils.checkConnectivityWget('https://invalid.test');

        expect(typeof result).toBe('object');
        expect(result.connected).toBe(false);
      });

      it('should handle wget command error', async () => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('Wget not found')), 10);
            }
          }),
          kill: jest.fn(),
        };

        spawn.mockReturnValue(mockChild);

        const result = await NetworkUtils.checkConnectivityWget();

        expect(typeof result).toBe('object');
        expect(result.connected).toBe(false);
      });
    });

    describe('checkConnectivity comprehensive method', () => {
      it('should try all methods when all fail', async () => {
        // Mock all methods to fail
        const pingMock = jest.spyOn(NetworkUtils, 'checkConnectivityPing').mockResolvedValue({
          connected: false,
          method: 'ping',
          error: 'Ping failed',
        });

        const curlMock = jest.spyOn(NetworkUtils, 'checkConnectivityCurl').mockResolvedValue({
          connected: false,
          method: 'curl',
          error: 'Curl failed',
        });

        const wgetMock = jest.spyOn(NetworkUtils, 'checkConnectivityWget').mockResolvedValue({
          connected: false,
          method: 'wget',
          error: 'Wget failed',
        });

        const result = await NetworkUtils.checkConnectivity();

        expect(pingMock).toHaveBeenCalledTimes(2); // Two DNS servers
        expect(curlMock).toHaveBeenCalledTimes(2); // Two HTTPS URLs
        expect(wgetMock).toHaveBeenCalledTimes(2); // Two HTTPS URLs
        expect(result.connected).toBe(false);
        expect(result.error).toContain('All connectivity check methods failed');

        pingMock.mockRestore();
        curlMock.mockRestore();
        wgetMock.mockRestore();
      });

      it('should return early when ping succeeds', async () => {
        const pingMock = jest.spyOn(NetworkUtils, 'checkConnectivityPing').mockResolvedValue({
          connected: true,
          method: 'ping',
          responseTime: 50,
        });

        const curlMock = jest.spyOn(NetworkUtils, 'checkConnectivityCurl');
        const wgetMock = jest.spyOn(NetworkUtils, 'checkConnectivityWget');

        const result = await NetworkUtils.checkConnectivity();

        expect(pingMock).toHaveBeenCalledTimes(1); // Should succeed on first DNS server
        expect(curlMock).not.toHaveBeenCalled();
        expect(wgetMock).not.toHaveBeenCalled();
        expect(result.connected).toBe(true);
        expect(result.method).toBe('ping');

        pingMock.mockRestore();
        curlMock.mockRestore();
        wgetMock.mockRestore();
      });
    });

    describe('ensureConnectivity', () => {
      it('should throw error when connectivity fails', async () => {
        const checkMock = jest.spyOn(NetworkUtils, 'checkConnectivity').mockResolvedValue({
          connected: false,
          error: 'No connection available',
        });

        await expect(NetworkUtils.ensureConnectivity()).rejects.toThrow();

        checkMock.mockRestore();
      });

      it('should succeed when connectivity is available', async () => {
        const checkMock = jest.spyOn(NetworkUtils, 'checkConnectivity').mockResolvedValue({
          connected: true,
          method: 'ping',
          responseTime: 50,
        });

        await expect(NetworkUtils.ensureConnectivity()).resolves.toBeUndefined();

        checkMock.mockRestore();
      });
    });

    describe('getConnectivityStatus', () => {
      it('should check all methods in parallel', async () => {
        const pingMock = jest.spyOn(NetworkUtils, 'checkConnectivityPing').mockResolvedValue({
          connected: true,
          method: 'ping',
          responseTime: 50,
        });

        const curlMock = jest.spyOn(NetworkUtils, 'checkConnectivityCurl').mockResolvedValue({
          connected: false,
          method: 'curl',
          error: 'Curl failed',
        });

        const wgetMock = jest.spyOn(NetworkUtils, 'checkConnectivityWget').mockResolvedValue({
          connected: false,
          method: 'wget',
          error: 'Wget failed',
        });

        const result = await NetworkUtils.getConnectivityStatus();

        expect(pingMock).toHaveBeenCalledTimes(1);
        expect(curlMock).toHaveBeenCalledTimes(1);
        expect(wgetMock).toHaveBeenCalledTimes(1);
        expect(result.overall).toBe(true); // At least ping succeeded
        expect(result.ping.connected).toBe(true);
        expect(result.curl.connected).toBe(false);
        expect(result.wget.connected).toBe(false);

        pingMock.mockRestore();
        curlMock.mockRestore();
        wgetMock.mockRestore();
      });
    });

    describe('constants and configuration', () => {
      it('should have correct timeout constants', () => {
        expect(NetworkUtils['TIMEOUT_MS']).toBe(5000);
        expect(NetworkUtils['CONNECT_TIMEOUT_MS']).toBe(3000);
      });

      it('should have DNS servers configured', () => {
        expect(NetworkUtils['PRIMARY_DNS_SERVERS']).toEqual(['8.8.8.8', '1.1.1.1']);
      });

      it('should have HTTPS test URLs configured', () => {
        expect(NetworkUtils['HTTPS_TEST_URLS']).toEqual([
          'https://www.google.com',
          'https://www.cloudflare.com',
        ]);
      });
    });
  });
});
