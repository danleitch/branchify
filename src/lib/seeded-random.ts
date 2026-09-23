/**
 * Seeded randomness: the same seed is always the same fish.
 *
 * Kept apart from the roster so that everything which draws from a seed — the
 * roster, the markings, the market's daily stock — can share it without the
 * modules importing one another in a circle.
 */

/** A stable 32-bit hash, so the same text always seeds the same numbers. */
export const hashString = (value: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

/** A small deterministic generator returning draws in `[0, 1)`. */
export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296;
  };
};

/** Picks one item of a non-empty list with a draw in `[0, 1)`. */
export const pickWith = <T>(items: readonly T[], draw: number): T =>
  items[Math.min(items.length - 1, Math.floor(draw * items.length))]!;
