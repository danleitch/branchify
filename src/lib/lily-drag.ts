/**
 * Lets a visitor pick a lily up off the water and float it somewhere else.
 *
 * The pond's canvases take no pointer events, so the page listens for them
 * instead: a press on open water that lands on a pad picks it up, and anywhere
 * else the press is left alone for the panel, or for the koi to come and look.
 */
import { isOpenWater } from './koi-attention';
import type { LilyPlacements } from './pond-decor';
import type { PondScenery } from './pond-scenery';

/** Past this many pixels of travel a press is a drag, and no longer a click on the water. */
const DRAG_THRESHOLD = 4;

export type LilyDragging = {
  /** Whether the click that just landed ended a drag, and so is not a touch on the water. */
  claimsClick: () => boolean;
  detach: () => void;
};

export const attachLilyDragging = (
  scenery: PondScenery,
  handlers: {
    /** A lily has moved; anything painted once, rather than every frame, should repaint. */
    onMove?: () => void;
    /** A lily has been put down, with every placement as it now stands. */
    onDrop: (placements: LilyPlacements) => void;
  }
): LilyDragging => {
  let held: {
    index: number;
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null = null;
  let travelled = 0;
  let placements: LilyPlacements | null = null;
  let dragged = false;
  let cursor = '';

  const setCursor = (next: string): void => {
    if (next !== cursor) {
      cursor = next;
      document.body.style.cursor = next;
    }
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !isOpenWater(event.target)) {
      return;
    }

    const lily = scenery.lilyAt(event.clientX, event.clientY);

    if (lily === null) {
      return;
    }

    // Held where it was taken hold of, rather than jumping its heart to the pointer.
    held = {
      index: lily.index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: lily.x - event.clientX,
      offsetY: lily.y - event.clientY
    };
    travelled = 0;
    placements = null;
    dragged = false;
    setCursor('grabbing');
    // No text selection, and no emulated mouse events, while a pad is held.
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!held) {
      setCursor(
        isOpenWater(event.target) && scenery.lilyAt(event.clientX, event.clientY) !== null
          ? 'grab'
          : ''
      );
      return;
    }

    if (event.pointerId !== held.pointerId) {
      return;
    }

    travelled = Math.max(
      travelled,
      Math.hypot(event.clientX - held.startX, event.clientY - held.startY)
    );
    placements = scenery.moveLily(
      held.index,
      event.clientX + held.offsetX,
      event.clientY + held.offsetY
    );
    handlers.onMove?.();
  };

  const release = (event: PointerEvent): void => {
    if (!held || event.pointerId !== held.pointerId) {
      return;
    }

    held = null;
    setCursor('');
    dragged = travelled > DRAG_THRESHOLD;

    if (placements) {
      handlers.onDrop(placements);
    }
  };

  // A finger on a pad moves the pad, not the page under it.
  const handleTouchStart = (event: TouchEvent): void => {
    if (held) {
      event.preventDefault();
    }
  };

  window.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('touchstart', handleTouchStart, { passive: false });

  return {
    claimsClick() {
      const claimed = dragged;
      dragged = false;
      return claimed;
    },

    detach() {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('touchstart', handleTouchStart);
      setCursor('');
    }
  };
};
