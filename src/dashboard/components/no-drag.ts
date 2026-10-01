import type { SyntheticEvent } from 'react';

const stop = (event: SyntheticEvent): void => event.stopPropagation();

/**
 * Spread on a button inside something draggable, so pressing it never starts
 * carrying its card or group off.
 */
export const noDrag = {
  onMouseDown: stop,
  onTouchStart: stop
} as const;
