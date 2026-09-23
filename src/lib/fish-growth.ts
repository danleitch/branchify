/**
 * How the fish in the pond grow, and what growing makes them worth.
 *
 * Fish grow the way fisheries biologists model them, along a von Bertalanffy
 * curve: fast while they are young, then ever more slowly as they close on the
 * size their genes allow, so a fish levels off instead of growing forever. The
 * rates are a real koi's and a real goldfish's. Only the clock is quicker: a
 * day for the visitor is a week in the pond, so a year of growth takes about
 * seven and a half weeks to watch.
 *
 * Nothing here knows about varieties or the renderer, so the account can work
 * out what a fish is worth without loading the catalogue.
 */
import { createRandom, hashString } from './seeded-random';

export type FishSpecies = 'koi' | 'goldfish';

/** Pond days that pass in one of the visitor's days. */
export const POND_DAYS_PER_DAY = 7;

/** The visitor's days in one pond year. */
export const POND_YEAR_DAYS = 365 / POND_DAYS_PER_DAY;

const MS_PER_DAY = 86_400_000;

/**
 * How quickly each species closes on its adult size, per pond year: the
 * curve's k. A koi takes five or six years to get most of the way there; a
 * goldfish, a smaller fish that grows up sooner, about two.
 */
const GROWTH_RATE: Readonly<Record<FishSpecies, number>> = { koi: 0.4, goldfish: 0.9 };

/** How long a fry is when it hatches, in centimetres. */
const HATCH_CM: Readonly<Record<FishSpecies, number>> = { koi: 0.6, goldfish: 0.5 };

/** The oldest the curve will call a fish that has, by its numbers, finished growing. */
const MAX_AGE_YEARS = 30;

/** How long a fish is at an age, in pond years. */
export const lengthAtAge = (species: FishSpecies, ageYears: number, adultCm: number): number =>
  adultCm - (adultCm - HATCH_CM[species]) * Math.exp(-GROWTH_RATE[species] * Math.max(0, ageYears));

/** How old a fish of this length is, in pond years: `lengthAtAge` run backwards. */
export const ageAtLength = (species: FishSpecies, lengthCm: number, adultCm: number): number => {
  const hatch = HATCH_CM[species];
  const left = (adultCm - lengthCm) / (adultCm - hatch);

  if (lengthCm <= hatch) {
    return 0;
  }

  return left <= 0
    ? MAX_AGE_YEARS
    : Math.min(MAX_AGE_YEARS, -Math.log(left) / GROWTH_RATE[species]);
};

/** How long a fish that measured `fromCm` has grown after `days` of the visitor's days. */
export const grownLength = (
  species: FishSpecies,
  fromCm: number,
  adultCm: number,
  days: number
): number => {
  // A fish never shrinks, whatever an old save says its adult size is.
  const adult = Math.max(adultCm, fromCm);
  const years = Math.max(0, days) / POND_YEAR_DAYS;

  return adult - (adult - fromCm) * Math.exp(-GROWTH_RATE[species] * years);
};

/**
 * What a fish is worth at a length.
 *
 * Its price, scaled by the square of how much longer it has grown: a fish
 * twice the length is worth four times as much, which is roughly how dealers
 * price the same quality of fish at different sizes.
 */
export const valueAt = (price: number, fromCm: number, lengthCm: number): number =>
  Math.round(price * (lengthCm / fromCm) ** 2);

/** How many of the visitor's days, fractions included, have passed since a timestamp. */
export const daysSince = (iso: string, now: Date): number => {
  const then = Date.parse(iso);
  return Number.isNaN(then) ? 0 : Math.max(0, (now.getTime() - then) / MS_PER_DAY);
};

/** A fish as the pond remembers it: what it cost and how big it was when it arrived. */
export type Stocked = {
  price: number;
  /** Its length when it arrived, in centimetres. */
  lengthCm: number;
  /** The length its genes will let it reach. */
  adultCm: number;
  acquiredAt: string;
};

export type Growth = {
  /** Its length now. */
  lengthCm: number;
  /** How much it has grown since it arrived. */
  grownCm: number;
  /** What it is worth now. */
  value: number;
  /** How much more it will be worth this time tomorrow. */
  valuePerDay: number;
  /** Its age now, in pond years. */
  ageYears: number;
};

/** Where a fish has got to: how long it is now, how old, and what it is worth. */
export const growthOf = (species: FishSpecies, fish: Stocked, now: Date): Growth => {
  const days = daysSince(fish.acquiredAt, now);
  const lengthCm = grownLength(species, fish.lengthCm, fish.adultCm, days);
  const tomorrow = grownLength(species, fish.lengthCm, fish.adultCm, days + 1);
  const value = valueAt(fish.price, fish.lengthCm, lengthCm);

  return {
    lengthCm,
    grownCm: lengthCm - fish.lengthCm,
    value,
    valuePerDay: valueAt(fish.price, fish.lengthCm, tomorrow) - value,
    ageYears: ageAtLength(species, lengthCm, Math.max(fish.adultCm, fish.lengthCm))
  };
};

/**
 * Varieties known for growing big: the chagoi and the koi of its magoi blood,
 * and the ogon.
 */
const LARGE_KOI: ReadonlySet<string> = new Set([
  'chagoi',
  'soragoi',
  'kigoi',
  'orenji-ogon',
  'yamabuki-ogon',
  'platinum-ogon'
]);

/**
 * The size a koi's genes allow, in centimetres.
 *
 * Most koi top out in the low seventies; the draw is skewed so that a jumbo,
 * past eighty, is the exception it is in real ponds.
 */
export const koiAdultCm = (variety: string, seed: number): number => {
  const random = createRandom(hashString(`adult:${seed}`));
  const cm = 64 + random() ** 1.6 * 22 + (LARGE_KOI.has(variety) ? 5 : 0);

  return Math.round(cm * 10) / 10;
};

/** A koi's age class, the way dealers sell them: by which year of its life it is in. */
export type KoiAgeClass = { name: string; kanji: string; year: string };

export const KOI_AGE_CLASSES: readonly KoiAgeClass[] = [
  { name: 'Tosai', kanji: '当歳', year: 'first' },
  { name: 'Nisai', kanji: '二歳', year: 'second' },
  { name: 'Sansai', kanji: '三歳', year: 'third' },
  { name: 'Yonsai', kanji: '四歳', year: 'fourth' },
  { name: 'Gosai', kanji: '五歳', year: 'fifth' },
  { name: 'Rokusai', kanji: '六歳', year: 'sixth' },
  { name: 'Nanasai', kanji: '七歳', year: 'seventh' },
  { name: 'Hassai', kanji: '八歳', year: 'eighth' }
];

/** The class a koi of this age sells in; the eldest stay hassai. */
export const koiAgeClass = (ageYears: number): KoiAgeClass =>
  KOI_AGE_CLASSES[Math.min(KOI_AGE_CLASSES.length - 1, Math.max(0, Math.floor(ageYears)))]!;

/** Lengths as a listing quotes them: whole centimetres. */
export const formatCm = (cm: number): string => `${Math.round(cm)} cm`;
