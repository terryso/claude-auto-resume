/**
 * Basic CLI tests
 */

import { Command } from 'commander';
import { setupCLI } from '../cli/commands';

describe('CLI Commands', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
  });

  it('should setup CLI without errors', async () => {
    await expect(setupCLI(program)).resolves.not.toThrow();
  });

  it('should have correct program name', async () => {
    await setupCLI(program);
    expect(program.name()).toBe('claude-auto-resume');
  });

  it('should have version command', async () => {
    await setupCLI(program);
    expect(program.version()).toBe('1.3.0');
  });

  it('should have expected options', async () => {
    await setupCLI(program);
    const options = program.options.map((opt) => opt.long);
    expect(options).toContain('--prompt');
    expect(options).toContain('--continue');
    expect(options).toContain('--execute');
    expect(options).toContain('--cmd');
    expect(options).toContain('--test-mode');
    expect(options).toContain('--check');
  });
});
