/**
 * Koi markings, generated rather than painted.
 *
 * Ported from the hyperfrontend koi-pond demo's `koi3d/pattern.ts`, which
 * builds a nishikigoi's pattern as a property of the skin rather than
 * decoration stuck on a fish. Patches live in the koi's own body coordinates —
 * how far along the body, how far across it — so a marking flexes with the
 * spine and sits where the variety says it should.
 *
 * Two details there do most of the work, and both were missing from the first
 * attempt at this: a patch reaches further across the body than along it, so it
 * reads as a saddle over the back rather than a spot, and its outline is warped
 * rather than elliptical, because nothing on a real koi has a clean edge.
 */
import { createRandom } from './koi-roster';

/** The pattern families a koi can be written in. */
/**
 * The pattern families a koi can be written in.
 *
 * The original's ogon is left out on purpose. It is a near-unmarked metallic
 * ground, and here the marking is the only thing that says which branch a koi
 * stands for — an unmarked fish would be anonymous.
 */
export type KoiPatternName = 'kohaku' | 'sanke' | 'showa' | 'asagi';

/** How many points describe one marking's outline. */
const OUTLINE_POINTS = 16;

/**
 * Converts the original's girth spans, measured in turns around the body,
 * into this renderer’s across-the-body fraction.
 *
 * Seen from above, only the top quarter-turn of the koi is visible, so a
 * span of 0.25 turns covers a whole flank. Missing this left every marking
 * four times too narrow and the shoal reading as plain white fish.
 */
const TURNS_TO_ACROSS = 4;

/**
 * A koi's half-width as a fraction of its length.
 *
 * Station and across are measured in wildly different pixel units — a body
 * is roughly nine times longer than it is half-wide — so a patch has to be
 * rotated in aspect-corrected space. Rotating in raw body coordinates shears
 * every marking into a diagonal stripe and the shoal ends up looking like it
 * is wearing racing livery.
 */
const BODY_ASPECT = 0.115;

/** A point in body coordinates: along the body, and across its half-width. */
export type BodyPoint = {
  /** 0 at the snout, 1 at the tail. */
  station: number;
  /** -1 at one flank, 0 on the spine, 1 at the other. */
  across: number;
};

/** One marking on the koi's skin. */
export type KoiPatch = {
  /** Which colour it wears: 0 for the identifying marking, 1 for the natural second tone. */
  layer: 0 | 1;
  /** Its warped outline, closed, in body coordinates. */
  outline: BodyPoint[];
};

/** How one pattern family lays its patches out. */
type PatchBand = {
  layer: 0 | 1;
  count: number;
  /** The band of stations the patches fall between. */
  station: readonly [number, number];
  /** How far off the spine their centres wander, as a fraction of the half-width. */
  across: number;
  /** The band of lengths they take, as a fraction of the body. */
  length: readonly [number, number];
  /** How far across the body they reach, as a multiple of their length. */
  wrap: number;
  /** How much noise breaks up their outlines. */
  warp: number;
};

/** The band a kohaku's marking is drawn from; every white-ground pattern starts here. */
const GROUND_MARKING: PatchBand = {
  layer: 0,
  count: 3,
  station: [0.07, 0.68],
  across: 0.44,
  length: [0.15, 0.26],
  wrap: 2.1,
  warp: 0.4
};

const RECIPES: Readonly<Record<KoiPatternName, readonly PatchBand[]>> = {
  kohaku: [GROUND_MARKING],
  // A sanke's sumi sits above the lateral line and never on the head, which is
  // the rule that tells it apart from a showa at a glance.
  sanke: [
    GROUND_MARKING,
    {
      layer: 1,
      count: 3,
      station: [0.3, 0.74],
      across: 0.32,
      length: [0.08, 0.14],
      wrap: 1.6,
      warp: 0.34
    }
  ],
  showa: [
    { ...GROUND_MARKING, across: 0.56, length: [0.15, 0.27], wrap: 2.2, warp: 0.42 },
    {
      layer: 1,
      count: 3,
      station: [0.1, 0.78],
      across: 0.68,
      length: [0.14, 0.24],
      wrap: 2.6,
      warp: 0.48
    }
  ],
  // An asagi's warmth comes up from the belly and the cheeks, not over the back.
  asagi: [
    {
      layer: 0,
      count: 3,
      station: [0.1, 0.52],
      across: 1,
      length: [0.12, 0.2],
      wrap: 1.5,
      warp: 0.32
    },
    {
      layer: 1,
      count: 3,
      station: [0.14, 0.6],
      across: 1,
      length: [0.1, 0.17],
      wrap: 1.3,
      warp: 0.3
    }
  ]
};

const within = (draw: number, band: readonly [number, number]): number =>
  band[0] + draw * (band[1] - band[0]);

/**
 * Warps a marking's outline with three detuned sines.
 *
 * White noise per point gives a star, not a koi: the radius has to wander
 * smoothly around the outline for the edge to read as organic.
 */
const warpedOutline = (
  centre: BodyPoint,
  lengthSpan: number,
  acrossSpan: number,
  rotation: number,
  warp: number,
  random: () => number
): BodyPoint[] => {
  const phases = [random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return Array.from({ length: OUTLINE_POINTS }, (_unused, index) => {
    const angle = (index / OUTLINE_POINTS) * Math.PI * 2;
    const wobble =
      Math.sin(angle * 2 + phases[0]!) * 0.5 +
      Math.sin(angle * 3 + phases[1]!) * 0.3 +
      Math.sin(angle * 5 + phases[2]!) * 0.2;
    const radius = 1 + warp * wobble;
    const along = Math.cos(angle) * (lengthSpan / 2) * radius;
    // Taken into length units so the rotation below is a true rotation.
    const across = Math.sin(angle) * (acrossSpan / 2) * radius * BODY_ASPECT;

    return {
      station: centre.station + along * cos - across * sin,
      across: centre.across + (along * sin + across * cos) / BODY_ASPECT
    };
  });
};

/**
 * Generates one koi's markings from its seed, so the same seed is always the
 * same fish.
 */
export const buildPattern = (pattern: KoiPatternName, seed: number): KoiPatch[] => {
  const random = createRandom(seed);
  const patches: KoiPatch[] = [];

  for (const band of RECIPES[pattern]) {
    for (let index = 0; index < band.count; index += 1) {
      // Spacing the patches evenly along the band and only jittering within
      // their own slot is what keeps a pattern reading as a pattern rather
      // than as a clump.
      const slot = band.count === 1 ? 0.5 : (index + 0.5 * random()) / band.count;
      const length = within(random(), band.length);
      const centre = {
        station: within(slot, band.station),
        across: (random() - 0.5) * 2 * band.across
      };

      patches.push({
        layer: band.layer,
        outline: warpedOutline(
          centre,
          length,
          // Markings reach further around the body than along it, which is what
          // makes them read as saddles over the back instead of spots.
          length * band.wrap * (0.8 + random() * 0.4) * TURNS_TO_ACROSS,
          (random() - 0.5) * 0.5,
          band.warp * (0.75 + random() * 0.5),
          random
        )
      });
    }
  }

  return patches;
};
