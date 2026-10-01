import { useCallback, useRef } from 'react';

/** The board's row height in pixels; dashboard.css sets grid-auto-rows to match. */
export const MASONRY_ROW_PX = 2;

/**
 * Packs the board like masonry on an ordinary CSS grid. The rows are tiny, and
 * each item spans as many of them as its own height plus the gap needs, so
 * the grid's auto-placement drops every item into the first space it fits,
 * in order, instead of starting a new row below the tallest item.
 *
 * Returns a callback ref; the span is kept up to date as the item grows and
 * shrinks.
 */
export const useMasonryRef = (): ((element: HTMLElement | null) => void) => {
  const observer = useRef<ResizeObserver | null>(null);

  return useCallback((element: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;

    if (!element || typeof ResizeObserver !== 'function') {
      return;
    }

    const update = (): void => {
      const grid = element.parentElement;
      const gap = grid ? parseFloat(getComputedStyle(grid).columnGap) || 0 : 0;
      // offsetHeight is the laid-out height, unmoved by a drag's transform.
      const rows = Math.max(1, Math.ceil((element.offsetHeight + gap) / MASONRY_ROW_PX));

      if (element.style.getPropertyValue('--rows') !== String(rows)) {
        element.style.setProperty('--rows', String(rows));
      }
    };

    observer.current = new ResizeObserver(update);
    observer.current.observe(element);
    update();
  }, []);
};

/** Joins callback refs, so one element can be both sortable and measured. */
export const useJoinedRef = <T>(
  ...refs: ((element: T | null) => void)[]
): ((element: T | null) => void) => {
  const latest = useRef(refs);
  latest.current = refs;

  return useCallback((element: T | null) => {
    for (const ref of latest.current) {
      ref(element);
    }
  }, []);
};
