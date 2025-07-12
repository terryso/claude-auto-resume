/**
 * Progress indicators and spinners tests
 */

import {
  Spinner,
  ProgressBar,
  LoadingDots,
  createSpinner,
  createProgressBar,
  withSpinner,
  withProgress
} from '../utils/progress';

// Mock process.stdout to prevent actual console output during tests
const mockStdout = {
  write: jest.fn(),
  clearLine: jest.fn(),
  cursorTo: jest.fn()
};

// Mock process methods
const mockProcess = {
  on: jest.fn(),
  removeListener: jest.fn()
};

describe('Progress Indicators', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    jest.spyOn(process.stdout, 'write').mockImplementation(mockStdout.write);
    jest.spyOn(process, 'on').mockImplementation(mockProcess.on);
    jest.spyOn(process, 'removeListener').mockImplementation(mockProcess.removeListener);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Spinner', () => {
    it('should create and start spinner with default style', () => {
      const spinner = new Spinner();
      spinner.start('Loading...');

      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[?25l'); // Hide cursor
      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Loading...'));
    });

    it('should update spinner message', () => {
      const spinner = new Spinner();
      spinner.start('Loading...');
      spinner.update('Still loading...');

      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Still loading...'));
    });

    it('should succeed with message', () => {
      const spinner = new Spinner();
      spinner.start('Loading...');
      spinner.succeed('Done!');

      expect(mockStdout.write).toHaveBeenCalledWith('✅ Done!\n');
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[?25h'); // Show cursor
    });

    it('should fail with message', () => {
      const spinner = new Spinner();
      spinner.start('Loading...');
      spinner.fail('Failed!');

      expect(mockStdout.write).toHaveBeenCalledWith('❌ Failed!\n');
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[?25h'); // Show cursor
    });

    it('should stop spinner and clean up', () => {
      const spinner = new Spinner();
      spinner.start('Loading...');
      spinner.stop();

      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[?25h'); // Show cursor
    });

    it('should handle different spinner styles', () => {
      const spinner = new Spinner('line');
      spinner.start('Loading...');

      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Loading...'));
    });

    it('should animate frames when setInterval is called', () => {
      const spinner = new Spinner();
      spinner.start('Loading...');

      // Get initial call count
      const initialCalls = mockStdout.write.mock.calls.length;
      
      // Fast-forward timer to trigger frame updates
      jest.advanceTimersByTime(240); // 3 frames at 80ms each

      // Should have written more times after animation
      expect(mockStdout.write.mock.calls.length).toBeGreaterThan(initialCalls);
      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Loading...'));
    });
  });

  describe('ProgressBar', () => {
    it('should create and start progress bar', () => {
      const progressBar = new ProgressBar(100);
      progressBar.start('Processing...');

      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[?25l'); // Hide cursor
      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Processing...'));
      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('['));
      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('0%'));
    });

    it('should update progress', () => {
      const progressBar = new ProgressBar(100);
      progressBar.start('Processing...');
      progressBar.updateProgress(50);

      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('50%'));
      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('50/100'));
    });

    it('should update message', () => {
      const progressBar = new ProgressBar(100);
      progressBar.start('Processing...');
      progressBar.update('Still processing...');

      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Still processing...'));
    });

    it('should succeed and complete progress', () => {
      const progressBar = new ProgressBar(100);
      progressBar.start('Processing...');
      progressBar.succeed('Completed!');

      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('100%'));
      expect(mockStdout.write).toHaveBeenCalledWith('\n✅ Completed!\n');
    });

    it('should fail with message', () => {
      const progressBar = new ProgressBar(100);
      progressBar.start('Processing...');
      progressBar.fail('Failed!');

      expect(mockStdout.write).toHaveBeenCalledWith('\n❌ Failed!\n');
    });

    it('should format time correctly', () => {
      const progressBar = new ProgressBar(100);
      progressBar.start('Processing...');
      
      // Fast-forward time to test time formatting
      jest.advanceTimersByTime(65000); // 1 minute 5 seconds
      progressBar.updateProgress(50);

      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('01:05'));
    });

    it('should not exceed total steps', () => {
      const progressBar = new ProgressBar(100);
      progressBar.start('Processing...');
      progressBar.updateProgress(150); // More than total

      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('100%'));
      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('100/100'));
    });
  });

  describe('LoadingDots', () => {
    it('should create and start loading dots', () => {
      const loadingDots = new LoadingDots('Loading');
      loadingDots.start();

      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[?25l'); // Hide cursor
    });

    it('should stop and clean up', () => {
      const loadingDots = new LoadingDots('Loading');
      loadingDots.start();
      loadingDots.stop();

      expect(mockStdout.write).toHaveBeenCalledWith('\r\x1B[K'); // Clear line
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[?25h'); // Show cursor
    });

    it('should animate dots when setInterval is called', () => {
      const loadingDots = new LoadingDots('Loading');
      loadingDots.start();

      // Get initial call count
      const initialCalls = mockStdout.write.mock.calls.length;

      // Fast-forward timer to trigger dot animation
      jest.advanceTimersByTime(2000); // 4 cycles at 500ms each

      // Should have written more times after animation
      expect(mockStdout.write.mock.calls.length).toBeGreaterThan(initialCalls);
      expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Loading'));
    });
  });

  describe('Factory Functions', () => {
    it('should create spinner with createSpinner', () => {
      const spinner = createSpinner('dots');
      expect(spinner).toBeInstanceOf(Spinner);
    });

    it('should create progress bar with createProgressBar', () => {
      const progressBar = createProgressBar(50);
      expect(progressBar).toBeInstanceOf(ProgressBar);
    });
  });

  describe('Utility Functions', () => {
    describe('withSpinner', () => {
      it('should wrap successful operation with spinner', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        
        const result = await withSpinner(operation, 'Testing...');
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalled();
        expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Testing...'));
        expect(mockStdout.write).toHaveBeenCalledWith('✅ Testing...\n');
      });

      it('should handle failed operation with spinner', async () => {
        const error = new Error('Test error');
        const operation = jest.fn().mockRejectedValue(error);
        
        await expect(withSpinner(operation, 'Testing...')).rejects.toThrow('Test error');
        
        expect(operation).toHaveBeenCalled();
        expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Testing...'));
        expect(mockStdout.write).toHaveBeenCalledWith('❌ Testing... - Failed\n');
      });

      it('should accept custom spinner style', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        
        await withSpinner(operation, 'Testing...', 'line');
        
        expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Testing...'));
      });
    });

    describe('withProgress', () => {
      it('should wrap operation with progress tracking', async () => {
        const operation = jest.fn().mockImplementation(async (updateProgress) => {
          updateProgress(25);
          updateProgress(50);
          updateProgress(100);
          return 'success';
        });
        
        const result = await withProgress(operation, 'Processing...', 100);
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalled();
        expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Processing...'));
        expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('25%'));
        expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('50%'));
        expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('100%'));
      });

      it('should handle failed operation with progress', async () => {
        const error = new Error('Test error');
        const operation = jest.fn().mockImplementation(async (updateProgress) => {
          updateProgress(50);
          throw error;
        });
        
        await expect(withProgress(operation, 'Processing...', 100)).rejects.toThrow('Test error');
        
        expect(operation).toHaveBeenCalled();
        expect(mockStdout.write).toHaveBeenCalledWith(expect.stringContaining('Processing...'));
        expect(mockStdout.write).toHaveBeenCalledWith('\n❌ Processing... - Failed\n');
      });
    });
  });
});