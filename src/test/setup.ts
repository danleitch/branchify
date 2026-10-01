import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't implement scrolling and logs an error when it's called.
window.scrollTo = vi.fn();

// jsdom has no canvas either; the koi background already handles a null context.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

// The dashboard's widgets fetch weather, prices and news. Tests stay offline
// unless they stub fetch with answers of their own.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('Offline in tests.')))
  );
});

// Ensure a clean DOM and storage between tests.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});
