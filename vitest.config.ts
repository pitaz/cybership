import { defineConfig } from 'vitest/config';
import type { UserConfig } from 'vitest/config';
import tsconfig from './tsconfig.json' with { type: 'json' };

const config: UserConfig = {
  test: {
    globals: false,
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
    reporters: ['verbose'],
  },
  resolve: {
    extensions: ['.ts'],
  },
  esbuild: {
    target: (tsconfig as { compilerOptions?: { target?: string } }).compilerOptions?.target ?? 'es2022',
  },
};

export default defineConfig(config);
