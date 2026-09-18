import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative base path so assets load properly on GitHub Pages under any subpath
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});
