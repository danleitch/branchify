/**
 * Everything in the pond that isn't a koi: the stones and lily shadows on the
 * bed, and the ripples, pellets and lilies on the surface.
 *
 * The pond draws in three layers — water and bed, then the koi, then the
 * surface — and the scenery supplies the first and last, so a koi swims over
 * the stones and under the lilies.
 */
import {
  drawLilies,
  layoutDecor,
  renderBed,
  renderLilies,
  type LilyPlacements,
  type LilySprites,
  type PondDecor
} from './pond-decor';
import { createPondSurface, type PondSurface } from './pond-surface';

export type PondScenery = {
  surface: PondSurface;
  /** Lays the furniture out for a viewport, and paints it at the display's pixel ratio. */
  layout: (width: number, height: number, ratio: number, fishLength: number) => void;
  /** Puts the lilies where the visitor left them; anything not placed goes back to its own spot. */
  placeLilies: (placements: LilyPlacements) => void;
  /** The lily under a point, topmost first, or null when there is only water there. */
  lilyAt: (x: number, y: number) => { index: number; x: number; y: number } | null;
  /**
   * Floats a lily to a point, kept inside the pond, and returns the
   * placements with it there.
   */
  moveLily: (index: number, x: number, y: number) => LilyPlacements;
  /** The bed's furniture, for the water to lay under its light; null until laid out. */
  readonly bed: HTMLCanvasElement | null;
  /** The surface: ripples and pellets, with the lilies floating over them. */
  drawSurface: (ctx: CanvasRenderingContext2D, elapsedS: number) => void;
};

export const createPondScenery = (): PondScenery => {
  const surface = createPondSurface();
  let bed: HTMLCanvasElement | null = null;
  let lilies: LilySprites = [];
  let decor: PondDecor | null = null;
  let placements: LilyPlacements = [];
  let viewport = { width: 0, height: 0, ratio: 1, fishLength: 0 };

  const relayout = (): void => {
    const { width, height, ratio, fishLength } = viewport;
    decor = layoutDecor(width, height, fishLength, placements);
    // Painted over in place, so the water keeps the same bed it was handed.
    bed = renderBed(decor, width, height, ratio, bed ?? undefined);
    lilies = renderLilies(decor, ratio);
  };

  return {
    surface,

    layout(width, height, ratio, fishLength) {
      viewport = { width, height, ratio, fishLength };
      relayout();
      surface.resize(width, height);
    },

    placeLilies(next) {
      placements = next;

      if (decor) {
        relayout();
      }
    },

    lilyAt(x, y) {
      // The lilies are drawn in order, so the last one under the point is on top.
      for (let sprite = lilies.length - 1; sprite >= 0; sprite -= 1) {
        const { lily } = lilies[sprite]!;
        const index = decor?.lilies.indexOf(lily) ?? -1;

        if (index >= 0 && Math.hypot(x - lily.x, y - lily.y) <= lily.radius) {
          return { index, x: lily.x, y: lily.y };
        }
      }

      return null;
    },

    moveLily(index, x, y) {
      const { width, height, ratio } = viewport;
      const lily = decor?.lilies[index];

      if (!decor || !lily || width <= 0 || height <= 0) {
        return placements;
      }

      lily.x = Math.min(Math.max(x, 0), width);
      lily.y = Math.min(Math.max(y, 0), height);
      const next = [...placements];
      next[index] = { x: lily.x / width, y: lily.y / height };
      placements = next;
      // Its shadow on the bed follows it down there.
      bed = renderBed(decor, width, height, ratio, bed ?? undefined);

      return placements;
    },

    get bed() {
      return bed;
    },

    drawSurface(ctx, elapsedS) {
      surface.draw(ctx);
      drawLilies(ctx, lilies, elapsedS);
    }
  };
};
