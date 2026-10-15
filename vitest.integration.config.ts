import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/integration/**/*.spec.ts'],
    // Subir o container do Postgres leva alguns segundos.
    hookTimeout: 120_000,
  },
});
