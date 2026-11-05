import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
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
const basePath = process.env.VITE_BASE_PATH || '/';

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      base: basePath,
      scope: basePath,
      includeAssets: ['pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'MiBarcito - Gestión de Despensa y Recetario',
        short_name: 'MiBarcito',
        description: 'Gestión inteligente de inventario de bebidas y recetario dinámico de coctelería',
        lang: 'es',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: `${basePath.endsWith('/') ? basePath : `${basePath}/`}index.html`
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 5173
  }
});

