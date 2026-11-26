// Quickened's build (quickened-app design: Components, Offline). `base: './'` gives relative
// asset URLs, so the built site works from any host and any sub-path.
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
