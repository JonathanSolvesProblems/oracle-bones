// Quickened's build (quickened-app design: Components, Offline). `base: './'` gives relative
// asset URLs, so the built site works from any host and any sub-path. The data plugin serves
// `virtual:quickened/data` from the files in results/ and the goldens.
import { defineConfig } from 'vite';
import { quickenedData } from './build/data.ts';

export default defineConfig({
  base: './',
  plugins: [quickenedData()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
