/**
 * What catches a koi's attention, and how it goes about it.
 *
 * Koi are curious, sociable fish that learn quickly where food comes from.
 * Touch the water and they drift over to see: not bolting, just turning toward
 * the ripple and cruising in at their own pace, the bold ones first and the
 * shy ones later or not at all. Arrived, they rise and gulp at the surface,
 * milling about until the interest fades. Food is another matter: they come for
 * that, and take it from the surface.
 */
import type { KoiTraits } from '../vendor/koi-pond/model/types';

export type PondPoint = { x: number; y: number };

/** The longest a koi keeps heading for a touch on the water before giving up on it. */
export const CURIOUS_S = 22;

/** How long a koi lingers once it has arrived, milling about and gulping at the surface. */
export const LINGER_S = 8;

/** Within this many koi lengths of what interests it, a koi rises toward the surface. */
export const SURFACING_REACH = 2.2;

/** Within this many koi lengths, it has arrived: it mills about and gulps at the surface. */
export const ARRIVED_REACH = 1.2;

/** Within this many koi lengths of a pellet's centre, a koi takes it. */
export const BITE_REACH = 0.38;

/** How often a koi at the surface gulps, in seconds, give or take a little. */
export const GULP_EVERY_S = 1.9;

/**
 * How firmly a curious koi turns toward a ripple.
 *
 * Its pace stays its own cruise, so it never rushes; what reads as interest is
 * that it turns toward the ripple promptly rather than drifting round to it.
 */
export const CURIOUS_GAIN = 1.5;

/** How firmly a hungry koi turns for food: more decided than curiosity. */
export const HUNGRY_GAIN = 2;

/** Once arrived, the lazy circling of a koi with nowhere particular to be. */
export const MILLING_GAIN = 0.7;

/** A koi this shy never comes to see what the fuss is, though it will still come for food. */
const TOO_SHY_TO_LOOK = 0.88;

export const tooShyToLook = (traits: KoiTraits): boolean => traits.shyness > TOO_SHY_TO_LOOK;

/**
 * How long a koi takes to notice something: the bold almost at once, the shy
 * after a pause, and an eager eater before anyone.
 *
 * @param draw - A draw in `[0, 1)`, so two equally bold koi don't turn in step.
 * @param eager - A koi known for being first to food, as a chagoi is.
 */
export const noticeDelay = (traits: KoiTraits, draw: number, eager = false): number => {
  const delay = 0.3 + traits.shyness * 1.3 + draw * 0.6;
  return eager ? delay * 0.35 : delay;
};

export const distance = (a: PondPoint, b: PondPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

/** The heading from one point to another, on the pond's clockwise-on-screen convention. */
export const headingTo = (from: PondPoint, to: PondPoint): number =>
  Math.atan2(to.y - from.y, to.x - from.x);

/** Whichever of the points is nearest, or null when there are none. */
export const nearestTo = <T extends PondPoint>(from: PondPoint, points: readonly T[]): T | null =>
  points.reduce<T | null>(
    (best, point) => (best === null || distance(from, point) < distance(from, best) ? point : best),
    null
  );

/** Keeps a point far enough inside the pond that a koi going there stays in view. */
export const insidePond = (
  point: PondPoint,
  pond: { width: number; height: number },
  inset: number
): PondPoint => ({
  x: Math.min(Math.max(point.x, inset), Math.max(inset, pond.width - inset)),
  y: Math.min(Math.max(point.y, inset), Math.max(inset, pond.height - inset))
});

/**
 * Anything a visitor might be clicking on that isn't the water: the panel, a
 * dialog and its backdrop, or any control. A click on any of these is theirs.
 */
const NOT_WATER =
  '.panel, .settings-backdrop, [role="dialog"], a, button, input, select, textarea, label, summary';

/** Whether a click landed on open water, rather than on anything a visitor meant to use. */
export const isOpenWater = (target: EventTarget | null): boolean =>
  !(target instanceof Element) || target.closest(NOT_WATER) === null;
