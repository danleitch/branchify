/**
 * Drawing one koi onto a 2D canvas.
 *
 * Everything is laid out in the koi's own body coordinates — how far along the
 * body, how far across it — and mapped through the spine at draw time, so the
 * markings, the dorsal shading and the eyes all flex with the fish instead of
 * floating over it.
 *
 * Deliberately flat otherwise: solid fills and alpha, no per-frame gradients,
 * shadows or filters. At five fish the silhouette and the pattern carry the
 * whole effect.
 */
import { SPINE_JOINTS, type Vec2 } from './koi';
import type { BodyPoint, KoiPatch } from './koi-pattern';
import type { KoiPalette } from './koi-roster';

/** Caudal fin span and lateral spread, as fractions of body length. */
const TAIL_SPAN = 0.34;
const TAIL_SPREAD = 0.2;

/** How far up the body the caudal is anchored, so it joins the peduncle rather than floating off it. */
const TAIL_ANCHOR_JOINTS = 2;

/** Where the pectoral fins sit along the body, and how big they are. */
const PECTORAL_JOINT = 3;
// A koi sculls with broad, translucent pectorals; small ones read as a minnow.
const PECTORAL_LENGTH = 0.24;
const PECTORAL_WIDTH = 0.075;

/** Where the eyes sit, and how big they are against the body's half-width. */
const EYE_STATION = 0.075;
const EYE_ACROSS = 0.72;
const EYE_RADIUS = 0.3;

/** The dorsal shade's reach across the back, and how dark it goes. */
const DORSAL_ACROSS = 0.55;
const DORSAL_SHADE = 'rgba(20, 24, 33, 0.16)';

/** How the body's edge is picked out against the water behind it. */
const EDGE_STROKE = 'rgba(26, 22, 18, 0.35)';

/** Where the caudal's rays fall across the fin, and how they read. */
const TAIL_RAYS = [-0.72, -0.36, 0.36, 0.72];
const RAY_STROKE = 'rgba(28, 24, 20, 0.28)';

/** The dorsal fin climbs out of the back in the first third and trails to a low rear edge. */
const DORSAL_STATION = [0.27, 0.62] as const;
const DORSAL_HEIGHT = 0.5;

/** How far a koi is thrown onto the bed below it, and how dark it lands. */
const SHADOW_OFFSET = 0.13;
const SHADOW_FILL = 'rgba(6, 22, 24, 0.3)';

/** The unit vector along the body at a joint, pointing tailward. */
const tangentAt = (joints: readonly Vec2[], index: number): Vec2 => {
  const ahead = joints[Math.max(0, index - 1)] ?? joints[0]!;
  const here = joints[index] ?? ahead;
  const dx = here.x - ahead.x;
  const dy = here.y - ahead.y;
  const magnitude = Math.hypot(dx, dy);

  return magnitude === 0 ? { x: 1, y: 0 } : { x: dx / magnitude, y: dy / magnitude };
};

/**
 * Maps a point in body coordinates onto the canvas.
 *
 * This is the whole trick behind markings that behave like skin: a patch is
 * stored once as `(station, across)` and re-projected through the live spine
 * every frame, so it bends with the body rather than sliding over it.
 */
const bodyPoint = (
  joints: readonly Vec2[],
  girths: readonly number[],
  { station, across }: BodyPoint
): Vec2 => {
  const scaled = Math.max(0, Math.min(1, station)) * (SPINE_JOINTS - 1);
  const index = Math.min(SPINE_JOINTS - 2, Math.floor(scaled));
  const fraction = scaled - index;
  const here = joints[index]!;
  const next = joints[index + 1]!;
  const girth = (girths[index] ?? 0) + ((girths[index + 1] ?? 0) - (girths[index] ?? 0)) * fraction;
  const tangent = tangentAt(joints, index + 1);
  const centreX = here.x + (next.x - here.x) * fraction;
  const centreY = here.y + (next.y - here.y) * fraction;

  return {
    x: centreX - tangent.y * across * girth,
    y: centreY + tangent.x * across * girth
  };
};

/** Traces a closed path through points, rounding the corners via midpoints. */
const traceSmooth = (ctx: CanvasRenderingContext2D, points: readonly Vec2[]): void => {
  if (points.length < 3) {
    return;
  }

  const last = points[points.length - 1]!;
  const first = points[0]!;
  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }

  ctx.closePath();
};

/** The koi's silhouette: down one flank, around the tail, back up the other. */
const bodyOutline = (joints: readonly Vec2[], girths: readonly number[]): Vec2[] => {
  const left: Vec2[] = [];
  const right: Vec2[] = [];

  for (let index = 0; index < joints.length; index += 1) {
    const joint = joints[index]!;
    const tangent = tangentAt(joints, index);
    const girth = girths[index] ?? 0;
    left.push({ x: joint.x - tangent.y * girth, y: joint.y + tangent.x * girth });
    right.push({ x: joint.x + tangent.y * girth, y: joint.y - tangent.x * girth });
  }

  return [...left, ...right.reverse()];
};

/**
 * The forked caudal fin.
 *
 * Both lobes bulge outward before forking, and the fan is anchored a couple of
 * joints up the peduncle so the body overlaps its base — a fin meeting the body
 * at a point reads as a separate object stuck on behind the fish.
 */
const drawTail = (
  ctx: CanvasRenderingContext2D,
  joints: readonly Vec2[],
  length: number,
  fin: string
): void => {
  const base = joints[Math.max(0, joints.length - 1 - TAIL_ANCHOR_JOINTS)]!;
  const tangent = tangentAt(joints, joints.length - 1);
  const normal = { x: -tangent.y, y: tangent.x };
  const span = length * TAIL_SPAN;
  const spread = length * TAIL_SPREAD;

  const at = (along: number, across: number): Vec2 => ({
    x: base.x + tangent.x * span * along + normal.x * spread * across,
    y: base.y + tangent.y * span * along + normal.y * spread * across
  });

  const notch = at(0.45, 0);

  ctx.fillStyle = fin;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);

  for (const side of [1, -1]) {
    const shoulder = at(0.35, side * 1.15);
    const tip = at(1, side);
    const inner = at(0.75, side * 0.35);
    ctx.quadraticCurveTo(shoulder.x, shoulder.y, tip.x, tip.y);
    ctx.quadraticCurveTo(inner.x, inner.y, notch.x, notch.y);
  }

  ctx.closePath();
  ctx.fill();

  // Rays fanning off the peduncle; without them the caudal is a colour block.
  ctx.strokeStyle = RAY_STROKE;
  ctx.lineWidth = Math.max(0.5, length * 0.005);
  ctx.beginPath();

  for (const ray of TAIL_RAYS) {
    const tip = at(0.92, ray);
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(tip.x, tip.y);
  }

  ctx.stroke();
};

/** The pair of pectoral fins, swept back off the shoulders and beating gently. */
const drawPectorals = (
  ctx: CanvasRenderingContext2D,
  joints: readonly Vec2[],
  girths: readonly number[],
  length: number,
  wavePhase: number,
  fin: string
): void => {
  const anchor = joints[PECTORAL_JOINT]!;
  const tangent = tangentAt(joints, PECTORAL_JOINT);
  const normal = { x: -tangent.y, y: tangent.x };
  const girth = girths[PECTORAL_JOINT] ?? 0;
  const heading = Math.atan2(tangent.y, tangent.x);
  const sweep = Math.sin(wavePhase) * 0.2;

  ctx.fillStyle = fin;

  for (const side of [1, -1]) {
    const rake = heading + side * (0.85 + sweep);
    const rootX = anchor.x + normal.x * girth * side * 0.6;
    const rootY = anchor.y + normal.y * girth * side * 0.6;
    const reach = length * PECTORAL_LENGTH;

    ctx.beginPath();
    ctx.ellipse(
      rootX + Math.cos(rake) * reach * 0.5,
      rootY + Math.sin(rake) * reach * 0.5,
      reach * 0.5,
      length * PECTORAL_WIDTH,
      rake,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
};

/**
 * The dorsal fin, running along the back.
 *
 * Missing it entirely was one of the things that kept these reading as
 * generic fish: seen from above it is the ridge that breaks the silhouette
 * between the shoulders and the peduncle.
 */
const drawDorsal = (
  ctx: CanvasRenderingContext2D,
  joints: readonly Vec2[],
  girths: readonly number[],
  fin: string
): void => {
  const [from, to] = DORSAL_STATION;
  const ridge: Vec2[] = [];
  const steps = 6;

  for (let index = 0; index <= steps; index += 1) {
    const along = index / steps;
    // Climbs quickly off the shoulders, then trails away to nothing.
    const rise = Math.sin(Math.PI * Math.min(1, along * 2.4)) * (1 - along * 0.7);
    ridge.push(
      bodyPoint(joints, girths, {
        station: from + (to - from) * along,
        across: rise * DORSAL_HEIGHT
      })
    );
  }

  for (let index = steps; index >= 0; index -= 1) {
    ridge.push(
      bodyPoint(joints, girths, { station: from + (to - from) * (index / steps), across: 0 })
    );
  }

  ctx.fillStyle = fin;
  traceSmooth(ctx, ridge);
  ctx.fill();
};

/** The markings the variety carries, projected through the live spine. */
const drawPattern = (
  ctx: CanvasRenderingContext2D,
  joints: readonly Vec2[],
  girths: readonly number[],
  patches: readonly KoiPatch[],
  palette: KoiPalette
): void => {
  for (const patch of patches) {
    ctx.fillStyle = patch.layer === 0 ? palette.marking : palette.shade;
    traceSmooth(
      ctx,
      patch.outline.map((point) => bodyPoint(joints, girths, point))
    );
    ctx.fill();
  }
};

/** A soft darkening along the spine, which is what gives a flat fill its volume. */
const drawDorsalShade = (
  ctx: CanvasRenderingContext2D,
  joints: readonly Vec2[],
  girths: readonly number[]
): void => {
  const ridge: Vec2[] = [];

  for (let index = 0; index <= 10; index += 1) {
    ridge.push(bodyPoint(joints, girths, { station: index / 10, across: DORSAL_ACROSS }));
  }

  for (let index = 10; index >= 0; index -= 1) {
    ridge.push(bodyPoint(joints, girths, { station: index / 10, across: -DORSAL_ACROSS }));
  }

  ctx.fillStyle = DORSAL_SHADE;
  traceSmooth(ctx, ridge);
  ctx.fill();
};

/** The pair of eyes, which is most of what makes the head read as a head. */
const drawEyes = (
  ctx: CanvasRenderingContext2D,
  joints: readonly Vec2[],
  girths: readonly number[]
): void => {
  const radius = Math.max(1, (girths[1] ?? 0) * EYE_RADIUS);

  ctx.fillStyle = '#1b1714';

  for (const side of [1, -1]) {
    const eye = bodyPoint(joints, girths, { station: EYE_STATION, across: side * EYE_ACROSS });
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
};

export type KoiDrawing = {
  joints: readonly Vec2[];
  girths: readonly number[];
  length: number;
  wavePhase: number;
  palette: KoiPalette;
  patches: readonly KoiPatch[];
  /** How far down this koi swims, 0 at the surface and 1 on the bed. */
  depth: number;
};

/** Paints one koi, fins first so the body sits over them. */
export const drawKoi = (ctx: CanvasRenderingContext2D, koi: KoiDrawing): void => {
  const { joints, girths, length, palette } = koi;

  ctx.save();

  // The koi's own colours already carry its depth, so the fish stays solid and
  // only softens a little as it sinks.
  ctx.globalAlpha = 1 - koi.depth * 0.18;

  // Its shadow on the bed below, which is most of what sells the third dimension.
  const throwBy = length * SHADOW_OFFSET * koi.depth;
  ctx.save();
  ctx.translate(throwBy, throwBy);
  ctx.globalAlpha = (1 - koi.depth) * 0.5;
  ctx.fillStyle = SHADOW_FILL;
  traceSmooth(ctx, bodyOutline(joints, girths));
  ctx.fill();
  ctx.restore();

  drawTail(ctx, joints, length, palette.fin);
  drawDorsal(ctx, joints, girths, palette.fin);
  drawPectorals(ctx, joints, girths, length, koi.wavePhase, palette.fin);

  const outline = bodyOutline(joints, girths);
  traceSmooth(ctx, outline);
  ctx.fillStyle = palette.body;
  ctx.fill();

  // Clipping to the silhouette is what keeps a marking from bleeding off the flank.
  ctx.save();
  ctx.clip();
  drawDorsalShade(ctx, joints, girths);
  drawPattern(ctx, joints, girths, koi.patches, palette);
  ctx.restore();

  // A thin darker edge separates a pale koi from the water behind it.
  traceSmooth(ctx, outline);
  ctx.strokeStyle = EDGE_STROKE;
  ctx.lineWidth = Math.max(0.6, length * 0.006);
  ctx.stroke();

  drawEyes(ctx, joints, girths);

  ctx.restore();
};
