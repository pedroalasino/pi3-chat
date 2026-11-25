import { defineConfig } from 'vite';

// El frontend vive en /src y el build sale a /dist (lo que publica Vercel)
export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
