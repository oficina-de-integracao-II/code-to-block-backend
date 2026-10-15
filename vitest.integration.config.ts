import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/integration/**/*.spec.ts'],
    setupFiles: ['./vitest.setup.ts'],
    fileParallelism: false,
    // Subir o container do Postgres leva alguns segundos.
    hookTimeout: 120_000,
  },
});
