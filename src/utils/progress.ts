/**
 * Progress indicators and spinners for long-running operations
 */

import * as process from 'process';

/**
 * Progress indicator interface
 */
export interface ProgressIndicator {
  start(message: string): void;
  update(message: string): void;
  succeed(message?: string): void;
  fail(message?: string): void;
  stop(): void;
}

/**
 * Spinner characters for different styles
 */
const SPINNER_STYLES = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['|', '/', '-', '\\'],
  dots2: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  clock: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
  arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  toggle: ['◐', '◓', '◑', '◒']
};

/**
 * Spinner implementation for console progress indication
 */
export class Spinner implements ProgressIndicator {
  private frames: string[];
  private currentFrame = 0;
  private intervalId?: NodeJS.Timeout;
  private isActive = false;
  private currentMessage = '';

  constructor(style: keyof typeof SPINNER_STYLES = 'dots') {
    this.frames = SPINNER_STYLES[style];
  }

  start(message: string): void {
    if (this.isActive) {
      this.stop();
    }

    this.currentMessage = message;
    this.isActive = true;
    this.currentFrame = 0;

    // Hide cursor
    process.stdout.write('\x1B[?25l');

    this.intervalId = setInterval(() => {
      this.render();
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);

    this.render();
  }

  update(message: string): void {
    this.currentMessage = message;
    if (this.isActive) {
      this.render();
    }
  }

  succeed(message?: string): void {
    this.stop();
    this.clearLine();
    const finalMessage = message || this.currentMessage;
    process.stdout.write(`✅ ${finalMessage}\n`);
  }

  fail(message?: string): void {
    this.stop();
    this.clearLine();
    const finalMessage = message || this.currentMessage;
    process.stdout.write(`❌ ${finalMessage}\n`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isActive = false;
    this.clearLine();
    // Show cursor
    process.stdout.write('\x1B[?25h');
  }

  private render(): void {
    if (!this.isActive) return;
    
    this.clearLine();
    const frame = this.frames[this.currentFrame];
    process.stdout.write(`${frame} ${this.currentMessage}`);
  }

  private clearLine(): void {
    process.stdout.write('\r\x1B[K');
  }
}

/**
 * Progress bar for countdown timers and operations with known duration
 */
export class ProgressBar implements ProgressIndicator {
  private totalSteps: number;
  private currentStep = 0;
  private isActive = false;
  private currentMessage = '';
  private startTime: number = 0;
  private barWidth = 40;

  constructor(totalSteps: number = 100) {
    this.totalSteps = totalSteps;
  }

  start(message: string): void {
    this.currentMessage = message;
    this.isActive = true;
    this.currentStep = 0;
    this.startTime = Date.now();
    
    // Hide cursor
    process.stdout.write('\x1B[?25l');
    this.render();
  }

  update(message: string): void {
    this.currentMessage = message;
    if (this.isActive) {
      this.render();
    }
  }

  updateProgress(step: number): void {
    this.currentStep = Math.min(step, this.totalSteps);
    if (this.isActive) {
      this.render();
    }
  }

  succeed(message?: string): void {
    this.currentStep = this.totalSteps;
    this.render();
    this.stop();
    const finalMessage = message || this.currentMessage;
    process.stdout.write(`\n✅ ${finalMessage}\n`);
  }

  fail(message?: string): void {
    this.stop();
    const finalMessage = message || this.currentMessage;
    process.stdout.write(`\n❌ ${finalMessage}\n`);
  }

  stop(): void {
    this.isActive = false;
    // Show cursor
    process.stdout.write('\x1B[?25h');
  }

  private render(): void {
    if (!this.isActive) return;

    const percentage = Math.round((this.currentStep / this.totalSteps) * 100);
    const filledWidth = Math.round((this.currentStep / this.totalSteps) * this.barWidth);
    const emptyWidth = this.barWidth - filledWidth;

    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(emptyWidth);
    const progressBar = `[${filled}${empty}]`;

    // Calculate elapsed time and ETA
    const elapsed = Date.now() - this.startTime;
    const rate = this.currentStep / elapsed;
    const remaining = this.totalSteps - this.currentStep;
    const eta = remaining / rate;

    const elapsedStr = this.formatTime(elapsed);
    const etaStr = isFinite(eta) ? this.formatTime(eta) : '--:--';

    this.clearLine();
    process.stdout.write(
      `${progressBar} ${percentage}% | ${this.currentStep}/${this.totalSteps} | ` +
      `Elapsed: ${elapsedStr} | ETA: ${etaStr} | ${this.currentMessage}`
    );
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private clearLine(): void {
    process.stdout.write('\r\x1B[K');
  }
}

/**
 * Creates a spinner with automatic cleanup
 */
export function createSpinner(style?: keyof typeof SPINNER_STYLES): Spinner {
  const spinner = new Spinner(style);
  
  // Ensure cleanup on process exit
  const cleanup = () => {
    spinner.stop();
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return spinner;
}

/**
 * Creates a progress bar with automatic cleanup
 */
export function createProgressBar(totalSteps?: number): ProgressBar {
  const progressBar = new ProgressBar(totalSteps);
  
  // Ensure cleanup on process exit
  const cleanup = () => {
    progressBar.stop();
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return progressBar;
}

/**
 * Utility for wrapping async operations with spinner
 */
export async function withSpinner<T>(
  operation: () => Promise<T>,
  message: string,
  style?: keyof typeof SPINNER_STYLES
): Promise<T> {
  const spinner = createSpinner(style);
  
  try {
    spinner.start(message);
    const result = await operation();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail(`${message} - Failed`);
    throw error;
  }
}

/**
 * Utility for wrapping operations with progress tracking
 */
export async function withProgress<T>(
  operation: (updateProgress: (step: number) => void) => Promise<T>,
  message: string,
  totalSteps: number
): Promise<T> {
  const progressBar = createProgressBar(totalSteps);
  
  try {
    progressBar.start(message);
    const result = await operation((step) => progressBar.updateProgress(step));
    progressBar.succeed();
    return result;
  } catch (error) {
    progressBar.fail(`${message} - Failed`);
    throw error;
  }
}

/**
 * Simple loading dots animation
 */
export class LoadingDots {
  private intervalId?: NodeJS.Timeout;
  private dots = 0;
  private maxDots = 3;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    this.intervalId = setInterval(() => {
      this.render();
      this.dots = (this.dots + 1) % (this.maxDots + 1);
    }, 500);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    process.stdout.write('\r\x1B[K'); // Clear line
    process.stdout.write('\x1B[?25h'); // Show cursor
  }

  private render(): void {
    const dotString = '.'.repeat(this.dots);
    const spaces = ' '.repeat(this.maxDots - this.dots);
    process.stdout.write(`\r${this.message}${dotString}${spaces}`);
  }
}