/**
 * Unit tests specifically for timeout handling with proper mocking
 * This separates timeout logic testing from integration tests
 */

import { ClaudeCLI } from '../core/claude-cli';
import { NetworkUtils } from '../core/network';

// Mock child_process
jest.mock('child_process');

describe('Timeout Handling Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console to reduce noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ClaudeCLI timeout handling', () => {
    it('should properly set up and trigger timeout', async () => {
      jest.useFakeTimers();
      
      const claudeCli = new ClaudeCLI();
      const { spawn } = require('child_process');
      
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(), // No close event - let timeout trigger
        kill: jest.fn(),
      };
      
      spawn.mockReturnValue(mockChild);
      
      // Start command with timeout
      const promise = claudeCli.executeClaudeCommand(['-p', 'test'], 1000);
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(1000);
      
      await expect(promise).rejects.toThrow('Claude CLI command timed out');
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
      
      jest.useRealTimers();
    });

    it('should clear timeout when process closes normally', async () => {
      jest.useFakeTimers();
      
      const claudeCli = new ClaudeCLI();
      const { spawn } = require('child_process');
      
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Simulate immediate process close
            setTimeout(() => callback(0), 0);
          }
        }),
        kill: jest.fn(),
      };
      
      spawn.mockReturnValue(mockChild);
      
      // Start command
      const promise = claudeCli.executeClaudeCommand(['-p', 'test'], 5000);
      
      // Run all pending timers (including the immediate close callback)
      jest.runAllTimers();
      
      const result = await promise;
      expect(result).toBe(''); // Empty stdout
      expect(mockChild.kill).not.toHaveBeenCalled(); // Should not timeout
      
      jest.useRealTimers();
    });
  });

  describe('NetworkUtils timeout handling', () => {
    it('should handle ping timeout correctly', async () => {
      jest.useFakeTimers();
      
      const { spawn } = require('child_process');
      
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(), // No close event - let timeout trigger
        kill: jest.fn(),
      };
      
      spawn.mockReturnValue(mockChild);
      
      // Start ping operation
      const promise = NetworkUtils.checkConnectivityPing('8.8.8.8');
      
      // Fast-forward past the network timeout (5000ms)
      jest.advanceTimersByTime(5000);
      
      const result = await promise;
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Ping timeout');
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
      
      jest.useRealTimers();
    });

    it('should resolve ping before timeout when successful', async () => {
      jest.useFakeTimers();
      
      const { spawn } = require('child_process');
      
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Simulate quick successful ping
            setTimeout(() => callback(0), 100);
          }
        }),
        kill: jest.fn(),
      };
      
      spawn.mockReturnValue(mockChild);
      
      // Start ping operation  
      const promise = NetworkUtils.checkConnectivityPing('8.8.8.8');
      
      // Fast-forward only 100ms (before the 5000ms timeout)
      jest.advanceTimersByTime(100);
      
      const result = await promise;
      expect(result.connected).toBe(true);
      expect(result.method).toBe('ping');
      expect(mockChild.kill).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('setTimeout mocking validation', () => {
    it('should verify setTimeout is properly mocked in fake timer tests', () => {
      jest.useFakeTimers();
      
      let callbackCalled = false;
      setTimeout(() => {
        callbackCalled = true;
      }, 1000);
      
      expect(callbackCalled).toBe(false);
      
      jest.advanceTimersByTime(1000);
      expect(callbackCalled).toBe(true);
      
      jest.useRealTimers();
    });

    it('should verify real timers work in normal tests', (done) => {
      // This test uses real timers to verify they work normally
      setTimeout(() => {
        expect(true).toBe(true);
        done();
      }, 10);
    });
  });
});