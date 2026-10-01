/// <reference types="vitest/config" />
import { Agent } from 'node:https';
import { defineConfig, type ProxyOptions } from 'vite';

/**
 * Yahoo turns away TLS handshakes that look like a script's (Node's default
 * cipher order gets a 429 every time) and lets a browser-like order through.
 * nginx.conf offers the same list.
 */
const BROWSER_LIKE_CIPHERS = [
  'TLS_AES_128_GCM_SHA256',
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-ECDSA-CHACHA20-POLY1305',
  'ECDHE-RSA-CHACHA20-POLY1305',
  'ECDHE-RSA-AES128-SHA',
  'ECDHE-RSA-AES256-SHA',
  'AES128-GCM-SHA256',
  'AES256-GCM-SHA384',
  'AES128-SHA',
  'AES256-SHA'
].join(':');

/**
 * The dashboard's markets widget reads Yahoo Finance, which doesn't answer
 * browsers on other sites. The dev and preview servers relay it at the same
 * address the Docker image's nginx does.
 */
const marketsProxy: Record<string, ProxyOptions> = {
  '/api/markets': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    agent: new Agent({ keepAlive: true, ciphers: BROWSER_LIKE_CIPHERS }),
    rewrite: (path) => path.replace(/^\/api\/markets/, '/v8/finance/chart'),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'
    }
  }
};

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: marketsProxy
  },
  preview: {
    proxy: marketsProxy
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Only this app's tests; reference checkouts beside it bring their own.
    include: ['src/**/*.test.{ts,tsx}'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/test/**',
        'src/declarations.d.ts',
        'src/vendor/**'
      ]
    }
  }
});
