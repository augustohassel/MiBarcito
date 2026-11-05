import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import pkg from './package.json';

const getAppVersion = (): string => {
  if (process.env.VITE_APP_VERSION) {
    return process.env.VITE_APP_VERSION.replace(/^v/, '');
  }
  try {
    const gitTag = execSync('git tag --sort=-v:refname | head -n 1', { encoding: 'utf-8' }).trim();
    if (gitTag) {
      return gitTag.replace(/^v/, '');
    }
  } catch {
    // fallback to pkg.version
  }
  return pkg.version;
};

const appVersion = getAppVersion();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});

