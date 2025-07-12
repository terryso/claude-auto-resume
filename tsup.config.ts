import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node18',
  outDir: 'dist',
  esbuildOptions(options) {
    options.platform = 'node';
  },
  onSuccess: async () => {
    // Make the CLI executable
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve('dist/cli.js');
    try {
      fs.chmodSync(filePath, '755');
    } catch (error) {
      console.warn('Could not make file executable:', error);
    }
  },
});