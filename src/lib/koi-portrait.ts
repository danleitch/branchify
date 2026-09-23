/**
 * Photographs koi for the market.
 *
 * Every portrait is the real fish — built through the same `createGenomeKoi`
 * the pond uses, posed mid-stroke, lit by the pond's own lights and tone curve —
 * rendered once from above onto a transparent card and kept as an image. A
 * grid of still images costs nothing to scroll, where a grid of live WebGL
 * canvases would cost a context each.
 *
 * One studio serves every portrait in turn, and is packed away once the queue
 * has been quiet for a moment so the market never holds a WebGL context it
 * isn't using. Without WebGL, the 2D pond's own renderer draws the fish.
 */
import { advanceSpine, createSpine, spineGirth } from './koi';
import { drawKoi } from './koi-draw';
import { isGoldfish } from './goldfish';
import { resolveLook, type FishGenome } from './koi-genome';
import { buildPattern } from './koi-pattern';
import {
  FILL,
  closeStudio,
  frameStudio,
  hasWebgl,
  openStudio,
  seatKoi,
  type Studio
} from './koi-studio';

/** Portrait size in device pixels; shown at half that, so it stays sharp on retina. */
export const PORTRAIT_WIDTH = 520;
export const PORTRAIT_HEIGHT = 320;

/** The point in the tail beat the portrait is taken at; the tail is swept, not edge-on. */
export const PORTRAIT_BEAT = 1.1;

/** How long an idle studio waits before handing its WebGL context back. */
const STUDIO_IDLE_MS = 4000;

const portraits = new Map<string, Promise<string | null>>();
let studio: Studio | null = null;
let webglFailed = false;
let queue: Promise<unknown> = Promise.resolve();
let idleTimer: ReturnType<typeof setTimeout> | undefined;

export const portraitKey = (genome: FishGenome): string =>
  isGoldfish(genome)
    ? `goldfish:${genome.variety}:${genome.seed}`
    : `${genome.variety}:${[...genome.modifiers].sort().join('+')}:${genome.seed}`;

const studioForStills = (): Studio | null => {
  if (studio || webglFailed) {
    return studio;
  }

  try {
    if (!hasWebgl()) {
      throw new Error('No WebGL');
    }

    studio = openStudio({ preserveDrawingBuffer: true });
    studio.renderer.setPixelRatio(1);
  } catch {
    webglFailed = true;
  }

  return studio;
};

const packUp = (): void => {
  if (studio) {
    closeStudio(studio);
    studio = null;
  }
};

const canvasToUrl = (canvas: HTMLCanvasElement): Promise<string | null> =>
  new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }

    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/png');
  });

const photograph = async (genome: FishGenome, room: Studio): Promise<string | null> => {
  const koi = seatKoi(room, genome);

  koi.setBeat(PORTRAIT_BEAT);
  frameStudio(room, PORTRAIT_WIDTH, PORTRAIT_HEIGHT, koi.config.physical.length);
  room.renderer.render(room.scene, room.camera);

  const url = await canvasToUrl(room.renderer.domElement);
  koi.dispose();

  return url;
};

/** The 2D pond's drawing of the fish, for a browser that can't give us WebGL. */
const sketch = (genome: FishGenome): Promise<string | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = PORTRAIT_WIDTH;
  canvas.height = PORTRAIT_HEIGHT;
  const context = canvas.getContext('2d');

  if (!context) {
    return Promise.resolve(null);
  }

  const { flat } = resolveLook(genome);
  const length = PORTRAIT_WIDTH * FILL;
  const nose = { x: (PORTRAIT_WIDTH + length) / 2, y: PORTRAIT_HEIGHT / 2 };
  let spine = createSpine(nose, 0, length);

  // A few strokes of swimming bend the straight spine into a living curve.
  for (let frame = 0; frame < 12; frame += 1) {
    spine = advanceSpine(spine, {
      nose,
      length,
      speed: length * 0.4,
      phase: 'relaxed',
      dt: 1 / 30,
      reducedMotion: false
    });
  }

  drawKoi(context, {
    joints: spine.joints,
    girths: spineGirth(length, 0.13),
    length,
    wavePhase: spine.wavePhase,
    palette: flat,
    patches: buildPattern(flat.pattern, genome.seed),
    depth: 0
  });

  return canvasToUrl(canvas);
};

const takePortrait = (genome: FishGenome): Promise<string | null> => {
  const next = queue.then(async () => {
    clearTimeout(idleTimer);
    const room = studioForStills();

    try {
      return room ? await photograph(genome, room) : await sketch(genome);
    } catch {
      return null;
    } finally {
      idleTimer = setTimeout(packUp, STUDIO_IDLE_MS);
    }
  });

  queue = next;
  return next;
};

/**
 * A portrait of one koi, as an image URL, or null when the browser can draw
 * neither 3D nor 2D.
 *
 * Portraits are cached for the session: a fish's photograph never changes, so
 * reopening the market shows every fish instantly.
 */
export const koiPortrait = (genome: FishGenome): Promise<string | null> => {
  const key = portraitKey(genome);
  const cached = portraits.get(key);

  if (cached) {
    return cached;
  }

  const taken = takePortrait(genome);
  portraits.set(key, taken);
  return taken;
};
