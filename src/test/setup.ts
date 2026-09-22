import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't implement scrolling and logs an error when it's called.
window.scrollTo = vi.fn();

// jsdom has no canvas either; the koi background already handles a null context.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

// Ensure a clean DOM and storage between tests.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
