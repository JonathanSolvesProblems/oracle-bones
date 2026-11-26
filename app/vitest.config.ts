import { defineConfig } from 'vitest/config';
import { quickenedData } from './build/data.ts';

export default defineConfig({
  plugins: [quickenedData()],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // The property tests solve hundreds of 40-point sections, and two tests make real builds;
    // with the suite in parallel a property test ran past the 5 s default.
    testTimeout: 30_000,
  },
});
