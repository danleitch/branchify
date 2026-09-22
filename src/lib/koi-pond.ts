/**
 * The pond: turning a roster of koi into fish that swim around a viewport.
 *
 * Each koi steers by a slow wander and turns away from the banks; nothing here
 * watches the other fish. Shoaling and collision avoidance are what the
 * hyperfrontend demo spends most of its motion budget on, and behind a panel at
 * five fish it simply does not read, so it stays out.
 */
import {
  advanceSpine,
  createSpine,
  spineGirth,
  turnToward,
  wanderOffset,
  wrapAngle,
  type KoiPhase,
  type SpineState,
  type Vec2
} from './koi';
import { buildPattern, type KoiPatch } from './koi-pattern';
import { createRandom, sinkPalette, type KoiDescriptor, type KoiPalette } from './koi-roster';

/** A rectangle the koi will not swim under, in CSS pixels. */
export type PondIsland = { x: number; y: number; width: number; height: number };

export type PondBounds = {
  width: number;
  height: number;
  /**
   * The panel, treated as an island in the pond.
   *
   * Without it the shoal is invisible: the panel sits in the middle of the
   * viewport, which is exactly where koi steering away from the banks want
   * to be, so every fish spends its life behind the glass.
   */
  island?: PondIsland;
};

/** Nominal koi length as a fraction of the pond's smaller side, and its limits. */
const LENGTH_FRACTION = 0.15;
export const MIN_LENGTH = 70;
export const MAX_LENGTH = 150;

/** How far from the bank a koi starts turning back, as a fraction of its length. */
const BANK_MARGIN = 0.5;

/**
 * How far off the island a koi starts turning away, as a fraction of its length.
 *
 * This has to exceed the koi's turning radius, or it crosses the glass before
 * it can come about and spends its time appearing from under the panel
 * instead of swimming beside it.
 */
const ISLAND_MARGIN = 0.85;

/** How much the island outweighs a bank when a koi is caught between the two. */
const ISLAND_WEIGHT = 2.5;

/** How strongly a koi slides along the panel rather than bouncing off it. */
const ISLAND_SLIDE = 1.4;

/** Beyond this turn rate the body reads as working, not cruising. */
const TURNING_THRESHOLD = 0.35;

/** Seconds per step are capped so a backgrounded tab doesn't teleport the shoal. */
const MAX_STEP_S = 0.05;

/** One koi, swimming. */
export type Swimmer = {
  descriptor: KoiDescriptor;
  nose: Vec2;
  heading: number;
  /** Pixels per second along the heading. */
  speed: number;
  length: number;
  girths: number[];
  spine: SpineState;
  /** Generated once from the seed, then re-projected through the spine each frame. */
  patches: KoiPatch[];
  phase: KoiPhase;
  /** How far down this koi swims, 0 at the surface and 1 on the bed. */
  depth: number;
  /** The descriptor's colours, already washed toward the water by depth. */
  palette: KoiPalette;
  /** Radians per second this koi can turn. */
  turnRate: number;
  /** Detunes this koi's wander from every other. */
  wanderSeed: number;
};

/** The nominal koi length for a pond of this size. */
export const nominalLength = ({ width, height }: PondBounds): number =>
  Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.min(width, height) * LENGTH_FRACTION));

/**
 * Somewhere in open water.
 *
 * Steering alone would clear a koi out from under the panel eventually, but
 * "eventually" is half a minute of a visitor looking at an empty pond, so
 * none of them start there. Rejection sampling runs on its own generator so
 * the number of tries cannot disturb the koi's other traits.
 */
const spawnPoint = (seed: number, bounds: PondBounds, length: number): Vec2 => {
  const random = createRandom(seed ^ 0x9e3779b9);
  const margin = length * ISLAND_MARGIN;
  const { island } = bounds;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const point = {
      x: bounds.width * (0.06 + random() * 0.88),
      y: bounds.height * (0.06 + random() * 0.88)
    };

    if (
      !island ||
      point.x < island.x - margin ||
      point.x > island.x + island.width + margin ||
      point.y < island.y - margin ||
      point.y > island.y + island.height + margin
    ) {
      return point;
    }
  }

  // A panel all but filling the pond leaves nowhere clear; hug the bank.
  return { x: length * BANK_MARGIN, y: bounds.height * (0.1 + random() * 0.8) };
};

/** Places a koi in the pond, with every trait derived from its seed. */
export const createSwimmer = (descriptor: KoiDescriptor, bounds: PondBounds): Swimmer => {
  const random = createRandom(descriptor.seed);
  const depth = random();
  const length = nominalLength(bounds) * (0.82 + random() * 0.45);
  // A koi is a heavy-bodied fish; the first pass drew them too slender to read as one.
  const girthRatio = 0.118 + random() * 0.032;
  const heading = random() * Math.PI * 2;
  const nose = spawnPoint(descriptor.seed, bounds, length);

  return {
    descriptor,
    nose,
    heading,
    speed: length * (0.22 + random() * 0.2),
    length,
    girths: spineGirth(length, girthRatio),
    spine: createSpine(nose, heading, length),
    patches: buildPattern(descriptor.palette.pattern, descriptor.seed),
    phase: 'relaxed',
    depth,
    palette: sinkPalette(descriptor.palette, depth),
    // Quick enough to come about inside the island margin without looking frantic.
    turnRate: 0.8 + random() * 0.7,
    wanderSeed: random() * Math.PI * 2
  };
};

/**
 * A push away from the island, or null when the koi is clear of it.
 *
 * A koi near the panel is pushed off by its nearest edge, which is the
 * shortest way back into view.
 */
const islandEscape = (swimmer: Swimmer, bounds: PondBounds): Vec2 | null => {
  const { island } = bounds;

  if (!island) {
    return null;
  }

  const margin = swimmer.length * ISLAND_MARGIN;
  const bank = swimmer.length * BANK_MARGIN;
  const { nose } = swimmer;
  const exits = [
    { depth: nose.x - (island.x - margin), away: { x: -1, y: 0 }, clear: island.x - margin > bank },
    {
      depth: island.x + island.width + margin - nose.x,
      away: { x: 1, y: 0 },
      clear: island.x + island.width + margin < bounds.width - bank
    },
    { depth: nose.y - (island.y - margin), away: { x: 0, y: -1 }, clear: island.y - margin > bank },
    {
      depth: island.y + island.height + margin - nose.y,
      away: { x: 0, y: 1 },
      clear: island.y + island.height + margin < bounds.height - bank
    }
  ];

  // Every depth positive means the nose is within the island's margin.
  if (exits.some((exit) => exit.depth <= 0)) {
    return null;
  }

  // Leaving by the nearest edge is no good if there is no water behind it: a
  // tall panel leaves only a sliver above and below, and a koi sent that way
  // just grinds between the panel and the bank, still out of sight.
  const usable = exits.filter((exit) => exit.clear);
  const reachable = usable.length > 0 ? usable : exits;

  const { away } = reachable.reduce((nearest, exit) =>
    exit.depth < nearest.depth ? exit : nearest
  );

  // Pushing straight off the edge asks the koi for a 180, which it cannot make
  // inside the margin. Sliding it along the panel instead — down whichever
  // tangent it is already heading — is both quicker and what a fish would do.
  const tangents = [
    { x: -away.y, y: away.x },
    { x: away.y, y: -away.x }
  ];
  const heading = { x: Math.cos(swimmer.heading), y: Math.sin(swimmer.heading) };
  const slide = (
    tangents[0]!.x * heading.x + tangents[0]!.y * heading.y >=
    tangents[1]!.x * heading.x + tangents[1]!.y * heading.y
      ? tangents[0]
      : tangents[1]
  )!;

  return {
    x: away.x + slide.x * ISLAND_SLIDE,
    y: away.y + slide.y * ISLAND_SLIDE
  };
};

/**
 * The heading a koi wants: clear of the banks and the panel, otherwise its wander.
 *
 * The two pushes are summed rather than checked in turn. A koi in the corridor
 * beside the panel is close to both at once, and letting the bank win outright
 * just shoves it straight back under the glass.
 */
const desiredHeading = (swimmer: Swimmer, bounds: PondBounds, elapsedS: number): number => {
  const margin = swimmer.length * BANK_MARGIN;
  let pushX = 0;
  let pushY = 0;

  if (swimmer.nose.x < margin) {
    pushX += 1;
  }
  if (swimmer.nose.x > bounds.width - margin) {
    pushX -= 1;
  }
  if (swimmer.nose.y < margin) {
    pushY += 1;
  }
  if (swimmer.nose.y > bounds.height - margin) {
    pushY -= 1;
  }

  const escape = islandEscape(swimmer, bounds);

  if (escape) {
    // Staying in sight matters more than staying off the bank, so the island
    // outweighs it where the two disagree.
    pushX += escape.x * ISLAND_WEIGHT;
    pushY += escape.y * ISLAND_WEIGHT;
  }

  // Only the offending axis is corrected, so a koi near one bank keeps its
  // course along the other instead of all five converging on the centre.
  return pushX !== 0 || pushY !== 0
    ? Math.atan2(pushY, pushX)
    : swimmer.heading + wanderOffset(swimmer.wanderSeed, elapsedS);
};

/** Advances one koi: steer, swim, then let the body catch up. */
export const stepSwimmer = (
  swimmer: Swimmer,
  dt: number,
  elapsedS: number,
  bounds: PondBounds,
  reducedMotion: boolean
): Swimmer => {
  const step = Math.min(dt, MAX_STEP_S);
  const desired = desiredHeading(swimmer, bounds, elapsedS);
  const turn = wrapAngle(desired - swimmer.heading);
  const heading = turnToward(swimmer.heading, desired, swimmer.turnRate * step);
  const speed = reducedMotion ? swimmer.speed * 0.4 : swimmer.speed;
  const nose = {
    // Koi are kept inside the pond outright: a resize can leave one beached,
    // and steering alone would take seconds to walk it back into view.
    x: Math.max(0, Math.min(bounds.width, swimmer.nose.x + Math.cos(heading) * speed * step)),
    y: Math.max(0, Math.min(bounds.height, swimmer.nose.y + Math.sin(heading) * speed * step))
  };
  const phase: KoiPhase = Math.abs(turn) > TURNING_THRESHOLD ? 'turning' : 'relaxed';

  return {
    ...swimmer,
    nose,
    heading,
    phase,
    spine: advanceSpine(swimmer.spine, {
      nose,
      length: swimmer.length,
      speed,
      phase,
      dt: step,
      reducedMotion
    })
  };
};

/**
 * Matches the swimming koi to the roster, keeping any fish that is still on it.
 * A branch arriving or leaving must not make the rest of the shoal jump.
 */
export const reconcilePond = (
  existing: readonly Swimmer[],
  roster: readonly KoiDescriptor[],
  bounds: PondBounds
): Swimmer[] => {
  const byKey = new Map(existing.map((swimmer) => [swimmer.descriptor.key, swimmer]));

  return (
    roster
      .map((descriptor) => {
        const swimmer = byKey.get(descriptor.key);

        return swimmer
          ? { ...swimmer, descriptor, palette: sinkPalette(descriptor.palette, swimmer.depth) }
          : createSwimmer(descriptor, bounds);
      })
      // Drawing the deepest koi first puts them behind the rest.
      .sort((a, b) => b.depth - a.depth)
  );
};
