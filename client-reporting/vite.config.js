import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const r = p => path.resolve(import.meta.dirname, p);

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@generated': r('src/generated'),
      '@components': r('src/components'),
      '@lib': r('src/lib'),
      '@api': r('src/api'),
    },
  },
});
