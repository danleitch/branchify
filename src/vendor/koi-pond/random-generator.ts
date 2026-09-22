/**
 * The slice of `@hyperfrontend/random-generator-utils` the koi need.
 *
 * The upstream package reaches for another internal library for its built-in
 * wrappers, which would have pulled a second dependency tree in behind it. Only
 * `next`, `uniform` and `gaussian` are ever called from the koi code, so those
 * three are reproduced here against the built-ins directly.
 *
 * Every number is bit-for-bit what upstream produces. That matters more than it
 * looks: a koi's entire body and pattern are drawn from this stream, so a
 * generator that merely behaved *like* the original would give a pond full of
 * different fish.
 */

export type RandomSource = () => number;

export type RandomGenerator = {
  seed: number;
  next: RandomSource;
  uniform: (min: number, max: number) => number;
  gaussian: (min: number, max: number) => number;
};

/**
 * Folds any number into one 32-bit word of state.
 *
 * The integer's low word, its bits above 32, and its fraction each fold in, so
 * 1.5 opens a stream of its own instead of collapsing onto 1, and -1 stays
 * apart from 0. 0x9e3779b1 is the 32-bit golden ratio constant.
 */
const foldSeed = (seed: number): number => {
  const whole = Math.floor(seed);

  return (
    (whole | 0) ^
    Math.imul(Math.trunc(whole / 4294967296), 0x9e3779b1) ^
    (((seed - whole) * 4294967296) | 0)
  );
};

/** Mulberry32, seeded through {@link foldSeed}. */
export const createSeededSource = (seed: number): RandomSource => {
  if (!Number.isFinite(seed)) {
    throw new Error('Seed must be a finite number.');
  }

  let state = foldSeed(seed);

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

const randomUniform = (min: number, max: number, source: RandomSource): number => {
  if (min > max) {
    throw new Error('Min value should be less than or equal to max value.');
  }

  return source() * (max - min) + min;
};

/** Marsaglia polar, resampling until the value lands inside the range. */
const randomGaussian = (min: number, max: number, source: RandomSource): number => {
  if (min > max) {
    throw new Error('Min value should be less than or equal to max value.');
  }

  let u = 0;
  let v = 0;
  let s = 0;

  do {
    u = source() * 2 - 1;
    v = source() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);

  const value = (min + max) / 2 + u * Math.sqrt((-2 * Math.log(s)) / s) * ((max - min) / 6);

  return value >= min && value <= max ? value : randomGaussian(min, max, source);
};

/** A seeded generator; the same seed always gives the same koi. */
export const createRandomGenerator = (seed: number): RandomGenerator => {
  const next = createSeededSource(seed);

  return Object.freeze({
    seed,
    next,
    uniform: (min: number, max: number): number => randomUniform(min, max, next),
    gaussian: (min: number, max: number): number => randomGaussian(min, max, next)
  });
};

/** A cheap positional hash: the fractional part of a scaled sine. */
export const randomPseudo = (seed: number): number => {
  const x = Math.sin(seed) * 10000;

  return x - Math.floor(x);
};
