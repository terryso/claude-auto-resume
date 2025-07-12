/**
 * Configuration module tests
 */

import { loadConfiguration } from '../config/loader';
import type { CLIConfig } from '../config/types';

describe('Configuration', () => {
  describe('loadConfiguration', () => {
    it('should return default configuration', () => {
      const config = loadConfiguration();

      expect(config).toBeDefined();
      expect(config.defaultPrompt).toBe('continue');
      expect(config.defaultTimeout).toBe(120000);
      expect(config.maxRetries).toBe(3);
      expect(config.claudeCliPath).toBe('claude');
    });

    it('should return a valid CLIConfig object', () => {
      const config = loadConfiguration();

      expect(typeof config.defaultPrompt).toBe('string');
      expect(typeof config.defaultTimeout).toBe('number');
      expect(typeof config.maxRetries).toBe('number');
      expect(typeof config.claudeCliPath).toBe('string');

      expect(config.defaultTimeout).toBeGreaterThan(0);
      expect(config.maxRetries).toBeGreaterThan(0);
    });
  });
});
