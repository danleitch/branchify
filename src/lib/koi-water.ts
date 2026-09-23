/**
 * The water the koi swim in.
 *
 * The caustic web is ported from the demo's `water-gl.ts` fragment shader: two
 * warped sine fields summed, with the light living where the sum crosses zero,
 * which is what draws the filaments a real surface refracts onto everything
 * under it.
 *
 * That shader evaluates per pixel per frame on the GPU. Doing the same on a
 * CPU every frame would cost more than the fish do, so the field is rasterised
 * once into an offscreen canvas and then drifted across the pond as two layers
 * at different speeds. Nothing is recomputed until the window resizes, and the
 * per-frame cost is two `drawImage` calls.
 */

/** How much larger than the viewport the caustic sheet is, leaving room to drift. */
const OVERSCAN = 1.3;

/** The sheet is rasterised at a fraction of viewport resolution; the web is soft enough not to show it. */
const RESOLUTION_SCALE = 1 / 3;

/** How far the layers drift, as a fraction of the viewport. */
const DRIFT = 0.1;

/**
 * How strongly the caustics read over the water.
 *
 * The shader lays them at 0.085 and calls it a whisper — bright enough to say
 * the fish swim under a surface, never enough to obscure them. Anything much
 * above that and the pond reads as a swimming pool.
 */
const CAUSTIC_ALPHA = 0.11;

/** The water's own colours, from shallow at the centre to deep at the edges. */
const SHALLOW = '#31555b';
const DEEP = '#16302f';

/** One warped sine field; the light is where the folds cross zero. */
const caustic = (x: number, y: number): number => {
  const warpedX = x + Math.sin(y * 0.011) * 34;
  const warpedY = y + Math.cos(x * 0.009) * 30;
  const folds =
    Math.sin(warpedX * 0.021) + Math.sin(warpedY * 0.024) + Math.sin((warpedX + warpedY) * 0.013);

  return Math.pow(Math.max(0, 1 - Math.abs(folds) * 0.5), 3);
};

/** Rasterises the caustic sheet once, as white-on-transparent to be drawn over the water. */
const renderCausticSheet = (width: number, height: number): HTMLCanvasElement | null => {
  const sheet = document.createElement('canvas');
  sheet.width = Math.max(1, Math.round(width * OVERSCAN * RESOLUTION_SCALE));
  sheet.height = Math.max(1, Math.round(height * OVERSCAN * RESOLUTION_SCALE));

  const context = sheet.getContext('2d');

  if (!context) {
    return null;
  }

  const image = context.createImageData(sheet.width, sheet.height);
  const { data } = image;

  for (let y = 0; y < sheet.height; y += 1) {
    for (let x = 0; x < sheet.width; x += 1) {
      const pondX = x / RESOLUTION_SCALE;
      const pondY = y / RESOLUTION_SCALE;
      // Two octaves, as the shader sums them: a broad web with a finer one over it.
      const light =
        caustic(pondX, pondY) * 0.62 + caustic(pondX * 2.1 + 57, pondY * 2.1 + 57) * 0.38;
      const offset = (y * sheet.width + x) * 4;
      data[offset] = 210;
      data[offset + 1] = 245;
      data[offset + 2] = 235;
      data[offset + 3] = Math.round(Math.min(1, light) * 255);
    }
  }

  context.putImageData(image, 0, 0);

  return sheet;
};

export type Water = {
  /** Rasterises the sheet for a new viewport size. */
  resize: (width: number, height: number) => void;
  /**
   * Lays something on the bed of the pond — stones, the shadows of lilies —
   * under the caustics, so the light plays over it as it does over the koi.
   */
  setBed: (bed: CanvasImageSource | null) => void;
  /** Lays the water and its drifting caustics down under the shoal. */
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, elapsedS: number) => void;
};

/** Builds the pond's water. The caustic sheet is rasterised on the first resize. */
export const createWater = (): Water => {
  let sheet: HTMLCanvasElement | null = null;
  let bed: CanvasImageSource | null = null;

  return {
    resize: (width, height) => {
      sheet = width > 0 && height > 0 ? renderCausticSheet(width, height) : null;
    },

    setBed: (next) => {
      bed = next;
    },

    draw: (ctx, width, height, elapsedS) => {
      const depth = ctx.createRadialGradient(
        width * 0.5,
        height * 0.42,
        0,
        width * 0.5,
        height * 0.42,
        Math.max(width, height) * 0.75
      );
      depth.addColorStop(0, SHALLOW);
      depth.addColorStop(1, DEEP);
      ctx.fillStyle = depth;
      ctx.fillRect(0, 0, width, height);

      if (bed) {
        ctx.drawImage(bed, 0, 0, width, height);
      }

      if (!sheet) {
        return;
      }

      const spare = { x: width * (OVERSCAN - 1), y: height * (OVERSCAN - 1) };
      const target = { width: width * OVERSCAN, height: height * OVERSCAN };

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Two layers drifting on detuned sines: the sheet never repeats on a
      // period a visitor can spot, and nothing is recomputed to achieve it.
      for (const layer of [
        { speed: 0.013, phase: 0, alpha: CAUSTIC_ALPHA },
        { speed: -0.008, phase: 2.1, alpha: CAUSTIC_ALPHA * 0.7 }
      ]) {
        const driftX = Math.sin(elapsedS * layer.speed + layer.phase) * DRIFT;
        const driftY = Math.cos(elapsedS * layer.speed * 0.8 + layer.phase) * DRIFT;
        ctx.globalAlpha = layer.alpha;
        ctx.drawImage(
          sheet,
          -spare.x / 2 + driftX * width,
          -spare.y / 2 + driftY * height,
          target.width,
          target.height
        );
      }

      ctx.restore();
    }
  };
};
