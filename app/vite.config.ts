// Quickened's build (quickened-app design: Components, Offline). `base: './'` gives relative
// asset URLs, so the built site works from any host and any sub-path. The data plugin serves
// `virtual:quickened/data` from the files in results/ and the goldens; the service-worker plugin
// writes sw.js with the precache list of the build.
import { defineConfig } from 'vite';
import { quickenedData } from './build/data.ts';
import { serviceWorker } from './build/serviceWorker.ts';

export default defineConfig({
  base: './',
  plugins: [quickenedData(), serviceWorker()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
