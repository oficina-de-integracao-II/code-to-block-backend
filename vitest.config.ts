import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      thresholds: {
        'src/auth/**': { statements: 70, branches: 70, functions: 70, lines: 70 },
        'src/functions/**': { statements: 70, branches: 70, functions: 70, lines: 70 },
      },
    },
  },
});
