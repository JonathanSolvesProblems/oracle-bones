import { defineConfig } from 'vitest/config';
import { quickenedData } from './build/data.ts';

export default defineConfig({
  plugins: [quickenedData()],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // The property tests solve hundreds of 40-point sections, and two tests make real builds;
    // with the suite in parallel a property test ran past the 5 s default. Raised from 30 s on
    // 2026-11-26 (outside Kiro): in a fresh clone, with another suite running on the same
    // machine, the preservation test of search.test.ts took 33 s and failed on the limit alone.
    testTimeout: 120_000,
  },
});
