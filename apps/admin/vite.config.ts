import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const appRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(appRoot, '../..');

export default defineConfig({
  root: appRoot,
  envDir: repositoryRoot,
  base: '/',
  server: {
    fs: { allow: [repositoryRoot] },
  },
  build: {
    outDir: resolve(appRoot, 'dist'),
    emptyOutDir: true,
  },
});
