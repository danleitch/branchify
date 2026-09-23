/**
 * The pond's furniture: a few stones on the bed and water lilies on top.
 *
 * Stones sit on the bottom, under the koi, where the caustic light can play
 * over them; lilies float on the surface, over the koi, so a fish swimming
 * beneath a pad disappears under it the way it would in a real pond. Both keep
 * to the sides of the pond, because the middle belongs to the panel.
 *
 * Everything here is drawn once per viewport size and then only moved, so the
 * furniture costs a couple of `drawImage` calls a frame.
 */
import { createRandom } from './seeded-random';

export type Stone = {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  seed: number;
};

export type Lily = {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  /** How wide the pad's notch opens, in radians. */
  notch: number;
  bloom: 'flower' | 'bud' | null;
  /** Where in its slow sway the pad starts. */
  phase: number;
  seed: number;
};

export type PondDecor = { stones: Stone[]; lilies: Lily[] };

/**
 * Where the furniture sits, as fractions of the viewport, and how big it is
 * against a nominal koi's length. The panel sits in the middle, so everything
 * keeps to the margins either side of it.
 */
const STONE_SPOTS = [
  { x: 0.07, y: 0.8, size: 0.44 },
  { x: 0.135, y: 0.88, size: 0.26 },
  { x: 0.045, y: 0.9, size: 0.18 },
  { x: 0.915, y: 0.14, size: 0.38 },
  { x: 0.955, y: 0.23, size: 0.2 }
];

const LILY_SPOTS = [
  { x: 0.095, y: 0.24, size: 0.32, bloom: 'flower' },
  { x: 0.16, y: 0.33, size: 0.21, bloom: null },
  { x: 0.05, y: 0.36, size: 0.16, bloom: null },
  { x: 0.895, y: 0.7, size: 0.29, bloom: 'bud' },
  { x: 0.94, y: 0.62, size: 0.19, bloom: null }
] as const;

/** Lays the furniture out for a viewport; the same size always gives the same pond. */
export const layoutDecor = (width: number, height: number, fishLength: number): PondDecor => {
  const random = createRandom(0x9e3779b9);

  return {
    stones: STONE_SPOTS.map((spot, index) => ({
      x: spot.x * width,
      y: spot.y * height,
      radius: spot.size * fishLength,
      rotation: random() * Math.PI * 2,
      seed: 101 + index * 7
    })),
    lilies: LILY_SPOTS.map((spot, index) => ({
      x: spot.x * width,
      y: spot.y * height,
      radius: spot.size * fishLength,
      rotation: random() * Math.PI * 2,
      notch: 0.32 + random() * 0.18,
      bloom: spot.bloom,
      phase: random() * Math.PI * 2,
      seed: 211 + index * 13
    }))
  };
};

/** The light falls from the upper left, as it does on the koi. */
const SHADOW_OFFSET = { x: 0.22, y: 0.32 };

const smoothOutline = (ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void => {
  const last = points[points.length - 1]!;
  const first = points[0]!;
  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);

  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length]!;
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  });

  ctx.closePath();
};

/** One stone on the bed: a worn, irregular pebble, dimmed by the water above it. */
const drawStone = (ctx: CanvasRenderingContext2D, stone: Stone): void => {
  const random = createRandom(stone.seed);
  const { radius } = stone;
  const outline = Array.from({ length: 11 }, (_unused, index) => {
    const angle = (index / 11) * Math.PI * 2;
    const reach = radius * (0.8 + random() * 0.32);
    return { x: Math.cos(angle) * reach * 1.18, y: Math.sin(angle) * reach * 0.86 };
  });

  ctx.save();
  ctx.translate(stone.x, stone.y);

  // A soft contact shadow, thrown down and to the right.
  const shadow = ctx.createRadialGradient(
    radius * SHADOW_OFFSET.x,
    radius * SHADOW_OFFSET.y,
    radius * 0.4,
    radius * SHADOW_OFFSET.x,
    radius * SHADOW_OFFSET.y,
    radius * 1.45
  );
  shadow.addColorStop(0, 'rgba(4, 16, 16, 0.42)');
  shadow.addColorStop(1, 'rgba(4, 16, 16, 0)');
  ctx.fillStyle = shadow;
  ctx.fillRect(-radius * 2, -radius * 2, radius * 4.5, radius * 4.5);

  ctx.rotate(stone.rotation);
  smoothOutline(ctx, outline);

  const body = ctx.createRadialGradient(
    -radius * 0.38,
    -radius * 0.42,
    radius * 0.1,
    0,
    0,
    radius * 1.25
  );
  body.addColorStop(0, '#7d8a80');
  body.addColorStop(0.55, '#55625a');
  body.addColorStop(1, '#2b3632');
  ctx.fillStyle = body;
  ctx.fill();

  // Moss and grit, kept inside the stone.
  ctx.save();
  ctx.clip();

  for (let speck = 0; speck < 26; speck += 1) {
    const angle = random() * Math.PI * 2;
    const reach = Math.sqrt(random()) * radius;
    ctx.fillStyle =
      random() < 0.45 ? 'rgba(78, 110, 62, 0.35)' : `rgba(20, 26, 24, ${0.12 + random() * 0.16})`;
    ctx.beginPath();
    ctx.arc(
      Math.cos(angle) * reach,
      Math.sin(angle) * reach,
      radius * (0.03 + random() * 0.07),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();

  // The water between the stone and the eye washes it toward the pond's colour.
  ctx.fillStyle = 'rgba(22, 48, 47, 0.3)';
  ctx.fill();
  ctx.restore();
};

/** The shadow a lily pad casts on the bed, far below it. */
const drawLilyShadow = (ctx: CanvasRenderingContext2D, lily: Lily): void => {
  const x = lily.x + lily.radius * SHADOW_OFFSET.x * 1.6;
  const y = lily.y + lily.radius * SHADOW_OFFSET.y * 1.6;
  const shadow = ctx.createRadialGradient(x, y, lily.radius * 0.3, x, y, lily.radius * 1.3);
  shadow.addColorStop(0, 'rgba(3, 14, 14, 0.34)');
  shadow.addColorStop(1, 'rgba(3, 14, 14, 0)');
  ctx.fillStyle = shadow;
  ctx.fillRect(x - lily.radius * 1.4, y - lily.radius * 1.4, lily.radius * 2.8, lily.radius * 2.8);
};

/**
 * Paints the bed's furniture, stones and lily shadows, onto a canvas of its
 * own, for the water to lay under its caustics.
 */
export const renderBed = (
  decor: PondDecor,
  width: number,
  height: number,
  ratio: number
): HTMLCanvasElement | null => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  ctx.scale(ratio, ratio);
  decor.lilies.forEach((lily) => drawLilyShadow(ctx, lily));
  decor.stones.forEach((stone) => drawStone(ctx, stone));

  return canvas;
};

const drawPetals = (
  ctx: CanvasRenderingContext2D,
  count: number,
  length: number,
  width: number,
  turn: number,
  inner: string,
  outer: string
): void => {
  for (let index = 0; index < count; index += 1) {
    ctx.save();
    ctx.rotate(turn + (index / count) * Math.PI * 2);
    const petal = ctx.createLinearGradient(0, 0, length, 0);
    petal.addColorStop(0, inner);
    petal.addColorStop(1, outer);
    ctx.fillStyle = petal;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.5, -width, length, 0);
    ctx.quadraticCurveTo(length * 0.5, width, 0, 0);
    ctx.fill();
    ctx.restore();
  }
};

/** Paints one lily, pad and bloom, centred on its own small canvas. */
const renderLily = (lily: Lily, ratio: number): HTMLCanvasElement | null => {
  const { radius, notch } = lily;
  const half = radius * 1.25;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(half * 2 * ratio));
  canvas.height = canvas.width;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const random = createRandom(lily.seed);
  ctx.scale(ratio, ratio);
  ctx.translate(half, half);

  // The pad: a disc with a notch cut to its heart.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, notch / 2, Math.PI * 2 - notch / 2);
  ctx.closePath();
  const pad = ctx.createRadialGradient(-radius * 0.25, -radius * 0.3, 0, 0, 0, radius);
  pad.addColorStop(0, '#6aa556');
  pad.addColorStop(0.7, '#3f7d3c');
  pad.addColorStop(1, '#2b5e30');
  ctx.fillStyle = pad;
  ctx.fill();
  ctx.lineWidth = Math.max(1, radius * 0.035);
  ctx.strokeStyle = 'rgba(26, 64, 32, 0.9)';
  ctx.stroke();

  // Veins, radiating from the heart.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(200, 235, 170, 0.2)';
  ctx.lineWidth = Math.max(0.6, radius * 0.018);

  for (let vein = 0; vein < 15; vein += 1) {
    const angle = notch / 2 + ((vein + 0.5) / 15) * (Math.PI * 2 - notch);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * 0.1, Math.sin(angle) * radius * 0.1);
    ctx.lineTo(Math.cos(angle) * radius * 0.94, Math.sin(angle) * radius * 0.94);
    ctx.stroke();
  }

  // The wet sheen of a pad lying on water.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.3, -radius * 0.35, radius * 0.42, radius * 0.22, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (lily.bloom === 'flower') {
    const petal = radius * 0.62;
    const turn = random() * Math.PI;
    drawPetals(ctx, 8, petal, petal * 0.3, turn, '#f3b7cc', '#fdf1f5');
    drawPetals(ctx, 8, petal * 0.78, petal * 0.26, turn + Math.PI / 8, '#e98bb0', '#fbe3ec');
    drawPetals(ctx, 6, petal * 0.5, petal * 0.2, turn, '#e27aa3', '#f7d0de');
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.arc(0, 0, petal * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d99a2b';

    for (let stamen = 0; stamen < 10; stamen += 1) {
      const angle = (stamen / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * petal * 0.12,
        Math.sin(angle) * petal * 0.12,
        petal * 0.035,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  } else if (lily.bloom === 'bud') {
    const bud = radius * 0.34;
    ctx.save();
    ctx.rotate(random() * Math.PI * 2);
    const gradient = ctx.createLinearGradient(-bud, 0, bud, 0);
    gradient.addColorStop(0, '#d9709a');
    gradient.addColorStop(1, '#f7c6d8');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-bud, 0);
    ctx.quadraticCurveTo(-bud * 0.1, -bud * 0.62, bud, 0);
    ctx.quadraticCurveTo(-bud * 0.1, bud * 0.62, -bud, 0);
    ctx.fill();
    ctx.restore();
  }

  return canvas;
};

export type LilySprites = { lily: Lily; sprite: HTMLCanvasElement }[];

export const renderLilies = (decor: PondDecor, ratio: number): LilySprites =>
  decor.lilies.flatMap((lily) => {
    const sprite = renderLily(lily, ratio);
    return sprite ? [{ lily, sprite }] : [];
  });

/**
 * Lays the lilies on the surface, each turning and bobbing very slightly on
 * the water, so they read as floating rather than painted on.
 */
export const drawLilies = (
  ctx: CanvasRenderingContext2D,
  lilies: LilySprites,
  elapsedS: number
): void => {
  for (const { lily, sprite } of lilies) {
    const size = lily.radius * 2.5;
    const sway = Math.sin(elapsedS * 0.21 + lily.phase) * 0.05;
    const bob = 1 + Math.sin(elapsedS * 0.37 + lily.phase * 1.7) * 0.012;

    ctx.save();
    ctx.translate(lily.x, lily.y);
    ctx.rotate(lily.rotation + sway);
    ctx.scale(bob, bob);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
};
