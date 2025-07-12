/**
 * CLI wrapper tests
 */

// Mock the index module to prevent actual execution
jest.mock('../index', () => {
  // Mock implementation that doesn't actually run
});

describe('CLI Wrapper', () => {
  it('should be a CLI entry point', () => {
    // Test that the cli.ts file exists and has correct structure
    const fs = require('fs');
    const path = require('path');
    
    const cliPath = path.resolve(__dirname, '../cli.ts');
    expect(fs.existsSync(cliPath)).toBe(true);
    
    const content = fs.readFileSync(cliPath, 'utf8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
    expect(content).toContain("require('./index.js')");
  });

  it('should be a valid Node.js shebang script', () => {
    const fs = require('fs');
    const path = require('path');
    
    const cliPath = path.resolve(__dirname, '../cli.ts');
    const content = fs.readFileSync(cliPath, 'utf8');
    
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
    expect(content).toContain("require('./index.js')");
  });
});