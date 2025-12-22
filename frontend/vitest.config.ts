import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    esbuild: {
      jsx: 'automatic',
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./tests/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: './coverage',
        all: true,
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: [
          'node_modules/',
          'tests/',
          '**/*.test.ts',
          '**/*.test.tsx',
          'vite.config.ts',
          'vitest.config.ts',
          '**/*.d.ts',
          'src/types.ts',
        ],
      },
    },
  }),
);
