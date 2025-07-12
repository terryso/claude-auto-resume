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
    expect(program.version()).toBe('1.0.0');
  });

  it('should have help command', async () => {
    await setupCLI(program);
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain('help');
  });
});
