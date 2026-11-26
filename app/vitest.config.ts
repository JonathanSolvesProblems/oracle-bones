import { defineConfig } from 'vitest/config';
import { quickenedData } from './build/data.ts';

export default defineConfig({
  plugins: [quickenedData()],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
