/**
 * Koi swimming maths.
 *
 * Ported from the hyperfrontend koi-pond demo's shared library — its
 * `geometry/spine.ts` (the following chain and its travelling undulation) and
 * `geometry/steering.ts` (angle helpers and the wander) — reduced to what a 2D
 * canvas background needs. None of the three.js renderer, microfrontend shells,
 * or inter-fish encounter logic came across: at five fish in a backdrop the
 * body and the wander are the whole effect, and everything else was cost.
 */

export type Vec2 = { x: number; y: number };

/** How many joints describe one koi's centreline, nose to tail. */
export const SPINE_JOINTS = 12;

/** The most koi the pond ever holds, at once, regardless of the base fish setting. */
export const MAX_KOI = 10;

/** The narrowest base fish count Settings allows; the pond always shows at least one koi. */
export const MIN_BASE_FISH = 1;

/** The widest base fish count Settings allows; it can't exceed the pond's own cap. */
export const MAX_BASE_FISH = MAX_KOI;

/**
 * How many koi swim with nothing in the recent list, unless the visitor has
 * raised or lowered that floor in Settings.
 */
export const DEFAULT_BASE_FISH = 2;

/** Undulation amplitude as a fraction of body length, per behavioural phase. */
const PHASE_AMPLITUDE = { relaxed: 0.05, turning: 0.075 } as const;

/** Tail-beat frequency in hertz at rest, per behavioural phase. */
const PHASE_FREQUENCY = { relaxed: 0.85, turning: 1.15 } as const;

export type KoiPhase = keyof typeof PHASE_AMPLITUDE;

/** How many wavelengths of the undulation fit along the body. */
const WAVES_PER_BODY = 0.85;

/** How sharply the undulation amplitude grows from nose to tail. */
const AMPLITUDE_FALLOFF = 1.7;

/** Extra tail-beat frequency per body length per second of speed. */
const SPEED_TO_FREQUENCY = 0.55;

/** How much reduced motion damps amplitude and frequency alike. */
const REDUCED_MOTION_DAMPING = 0.4;

/** Folds an angle into `[-PI, PI]`. */
export const wrapAngle = (radians: number): number => {
  const wrapped = (radians + Math.PI) % (Math.PI * 2);
  return (wrapped < 0 ? wrapped + Math.PI * 2 : wrapped) - Math.PI;
};

/** Turns a heading toward another, never faster than the koi can turn. */
export const turnToward = (heading: number, desired: number, maxTurn: number): number => {
  const delta = wrapAngle(desired - heading);
  const limit = Math.abs(maxTurn);
  return wrapAngle(heading + (delta > limit ? limit : delta < -limit ? -limit : delta));
};

/**
 * A slow, wandering drift for a koi with nothing more pressing on its attention.
 * Two detuned sines beat against each other, so the course never repeats on a
 * period a visitor can spot.
 */
export const wanderOffset = (seed: number, elapsedS: number): number =>
  Math.sin(elapsedS * 0.11 + seed) * 0.62 + Math.sin(elapsedS * 0.067 + seed * 1.7) * 0.38;

/**
 * The koi's width profile, nose to tail: a quick swell behind the head, a hold
 * through the shoulders, then a taper to the peduncle the tail hangs off.
 */
export const widthProfile = (along: number): number => {
  const t = along < 0 ? 0 : along > 1 ? 1 : along;

  if (t < 0.1) {
    return 0.2 + (t / 0.1) * 0.52;
  }

  if (t < 0.28) {
    return 0.72 + ((t - 0.1) / 0.18) * 0.28;
  }

  if (t < 0.44) {
    return 1;
  }

  return 1 - Math.pow((t - 0.44) / 0.56, 1.15) * 0.92;
};

/** The half-width at each spine joint, nose first. */
export const spineGirth = (length: number, girthRatio: number): number[] => {
  const beam = length * girthRatio;
  return Array.from(
    { length: SPINE_JOINTS },
    (_unused, index) => widthProfile(index / (SPINE_JOINTS - 1)) * beam
  );
};

/** Reads the direction from one joint to the next, holding shape on a degenerate pair. */
const directionBetween = (ahead: Vec2, behind: Vec2): Vec2 => {
  const dx = ahead.x - behind.x;
  const dy = ahead.y - behind.y;
  const magnitude = Math.hypot(dx, dy);

  return magnitude === 0 ? { x: 1, y: 0 } : { x: dx / magnitude, y: dy / magnitude };
};

/** One koi's centreline. */
export type SpineState = {
  /** Joint positions with the undulation laid over them — what the renderer draws. */
  joints: Vec2[];
  /**
   * The chain the follow constraint runs on, before the undulation. Kept apart
   * from `joints` deliberately: feeding displaced joints back into the
   * constraint makes each frame's swing the next frame's starting point, and
   * the body wags itself apart within seconds.
   */
  centreline: Vec2[];
  /** Phase of the travelling undulation, in radians. */
  wavePhase: number;
};

/** Lays a straight spine out behind a nose. */
export const createSpine = (nose: Vec2, heading: number, length: number): SpineState => {
  const link = length / (SPINE_JOINTS - 1);
  const laid = Array.from({ length: SPINE_JOINTS }, (_unused, index) => ({
    x: nose.x - Math.cos(heading) * link * index,
    y: nose.y - Math.sin(heading) * link * index
  }));

  return { joints: laid, centreline: laid.map((joint) => ({ ...joint })), wavePhase: 0 };
};

export type SpineStep = {
  nose: Vec2;
  length: number;
  /** Speed along the heading in pixels per second. */
  speed: number;
  phase: KoiPhase;
  /** Seconds since the previous step. */
  dt: number;
  reducedMotion: boolean;
};

/** Advances the spine one frame: the chain follows the nose, then undulates. */
export const advanceSpine = (state: SpineState, step: SpineStep): SpineState => {
  const link = step.length / (SPINE_JOINTS - 1);
  const damping = step.reducedMotion ? REDUCED_MOTION_DAMPING : 1;

  // Follow-the-leader: each joint is pulled onto the circle of radius `link`
  // around the joint ahead, so the body trails the head through every turn.
  const chain: Vec2[] = [{ x: step.nose.x, y: step.nose.y }];
  for (let index = 1; index < SPINE_JOINTS; index += 1) {
    const ahead = chain[index - 1] ?? step.nose;
    const previous = state.centreline[index] ?? ahead;
    const direction = directionBetween(previous, ahead);
    chain.push({ x: ahead.x + direction.x * link, y: ahead.y + direction.y * link });
  }

  const bodyLengthsPerSecond = step.length === 0 ? 0 : step.speed / step.length;
  const frequency =
    (PHASE_FREQUENCY[step.phase] + bodyLengthsPerSecond * SPEED_TO_FREQUENCY) * damping;
  const wavePhase = state.wavePhase + frequency * step.dt * Math.PI * 2;
  const amplitude = PHASE_AMPLITUDE[step.phase] * step.length * damping;

  // The undulation is applied perpendicular to each segment after the chain has
  // settled, so it bends the body without stretching it.
  const joints = chain.map((joint, index) => {
    if (index === 0) {
      return joint;
    }

    const tangent = directionBetween(joint, chain[index - 1] ?? joint);
    const along = index / (SPINE_JOINTS - 1);
    const swing =
      Math.sin(wavePhase - along * WAVES_PER_BODY * Math.PI * 2) *
      amplitude *
      Math.pow(along, AMPLITUDE_FALLOFF);

    return { x: joint.x - tangent.y * swing, y: joint.y + tangent.x * swing };
  });

  return { joints, centreline: chain, wavePhase };
};
