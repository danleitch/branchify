/**
 * Everything in the pond that isn't a koi: the stones and lily shadows on the
 * bed, and the ripples, pellets and lilies on the surface.
 *
 * The pond draws in three layers — water and bed, then the koi, then the
 * surface — and the scenery supplies the first and last, so a koi swims over
 * the stones and under the lilies.
 */
import { drawLilies, layoutDecor, renderBed, renderLilies, type LilySprites } from './pond-decor';
import { createPondSurface, type PondSurface } from './pond-surface';

export type PondScenery = {
  surface: PondSurface;
  /** Lays the furniture out for a viewport, and paints it at the display's pixel ratio. */
  layout: (width: number, height: number, ratio: number, fishLength: number) => void;
  /** The bed's furniture, for the water to lay under its light; null until laid out. */
  readonly bed: HTMLCanvasElement | null;
  /** The surface: ripples and pellets, with the lilies floating over them. */
  drawSurface: (ctx: CanvasRenderingContext2D, elapsedS: number) => void;
};

export const createPondScenery = (): PondScenery => {
  const surface = createPondSurface();
  let bed: HTMLCanvasElement | null = null;
  let lilies: LilySprites = [];

  return {
    surface,

    layout(width, height, ratio, fishLength) {
      const decor = layoutDecor(width, height, fishLength);
      bed = renderBed(decor, width, height, ratio);
      lilies = renderLilies(decor, ratio);
      surface.resize(width, height);
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
