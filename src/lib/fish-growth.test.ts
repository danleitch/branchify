import { describe, expect, it } from 'vitest';
import {
  POND_YEAR_DAYS,
  ageAtLength,
  daysSince,
  growthOf,
  grownLength,
  koiAdultCm,
  koiAgeClass,
  lengthAtAge,
  valueAt
} from './fish-growth';
import { GOLDFISH } from './goldfish';

/** Centimetres a fish of this length grows in one of the visitor's days. */
const perDay = (species: 'koi' | 'goldfish', fromCm: number, adultCm: number): number =>
  grownLength(species, fromCm, adultCm, 1) - fromCm;

describe('how fast a koi grows', () => {
  it('passes a pond year in about seven and a half weeks: a day is a week', () => {
    expect(POND_YEAR_DAYS).toBeCloseTo(52.1, 1);
  });

  it('grows a young koi about a centimetre every two or three days', () => {
    const daysPerCm = 1 / perDay('koi', 22, 78);

    expect(daysPerCm).toBeGreaterThan(2);
    expect(daysPerCm).toBeLessThan(3);
    // A nisai, the size most people buy, is close to a centimetre every three days.
    expect(1 / perDay('koi', 40, 78)).toBeCloseTo(3.4, 0);
  });

  it('slows as it nears its adult size, and never passes it', () => {
    expect(perDay('koi', 60, 78)).toBeLessThan(perDay('koi', 40, 78));
    expect(grownLength('koi', 22, 78, 10_000)).toBeLessThanOrEqual(78);
    expect(grownLength('koi', 22, 78, 10_000)).toBeGreaterThan(77.9);
  });

  it('never shrinks, even when an old save says it has outgrown its genes', () => {
    expect(grownLength('koi', 70, 60, 100)).toBe(70);
    expect(grownLength('koi', 30, 75, -5)).toBe(30);
  });

  it('grows like a real koi: tosai, nisai, sansai, and a jumbo by old age', () => {
    expect(lengthAtAge('koi', 1, 80)).toBeGreaterThan(20);
    expect(lengthAtAge('koi', 1, 80)).toBeLessThan(30);
    expect(lengthAtAge('koi', 2, 80)).toBeGreaterThan(38);
    expect(lengthAtAge('koi', 3, 80)).toBeGreaterThan(50);
    expect(lengthAtAge('koi', 10, 80)).toBeGreaterThan(75);
  });

  it('reads a koi’s age back from its length', () => {
    for (const age of [0.4, 1.5, 3.2]) {
      expect(ageAtLength('koi', lengthAtAge('koi', age, 72), 72)).toBeCloseTo(age, 6);
    }
  });
});

describe('koi age classes', () => {
  it('names each year of a koi’s life, and stops at hassai', () => {
    expect(koiAgeClass(0.6).name).toBe('Tosai');
    expect(koiAgeClass(1.2).name).toBe('Nisai');
    expect(koiAgeClass(2.9).name).toBe('Sansai');
    expect(koiAgeClass(40).name).toBe('Hassai');
  });
});

describe('koiAdultCm', () => {
  it('lets most koi reach the seventies, a few a jumbo’s eighty-plus', () => {
    const sizes = Array.from({ length: 400 }, (_unused, seed) => koiAdultCm('kohaku', seed));
    const jumbo = sizes.filter((size) => size > 80).length;

    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(64);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(86);
    expect(jumbo).toBeGreaterThan(0);
    expect(jumbo / sizes.length).toBeLessThan(0.25);
  });

  it('gives the big-growing varieties more room', () => {
    const mean = (variety: string): number =>
      Array.from({ length: 200 }, (_unused, seed) => koiAdultCm(variety, seed)).reduce(
        (total, size) => total + size,
        0
      ) / 200;

    expect(mean('chagoi')).toBeGreaterThan(mean('kohaku') + 4);
  });

  it('is the same for the same fish', () => {
    expect(koiAdultCm('showa', 99)).toBe(koiAdultCm('showa', 99));
  });
});

describe('goldfish', () => {
  it('grow up quicker than koi, but stay small beside them', () => {
    const year = POND_YEAR_DAYS;
    const goldfishShare = (grownLength('goldfish', 9, 26, year) - 9) / (26 - 9);
    const koiShare = (grownLength('koi', 22, 78, year) - 22) / (78 - 22);

    expect(goldfishShare).toBeGreaterThan(koiShare);

    // Even the biggest goldfish tops out well short of the smallest grown koi.
    const largestGoldfish = Math.max(...GOLDFISH.map((breed) => breed.adult[1]));
    const smallestKoi = Math.min(
      ...Array.from({ length: 200 }, (_unused, seed) => koiAdultCm('kohaku', seed))
    );
    expect(largestGoldfish).toBeLessThan(smallestKoi * 0.6);
  });
});

describe('value', () => {
  it('grows with the square of the length', () => {
    expect(valueAt(80, 30, 30)).toBe(80);
    expect(valueAt(80, 30, 60)).toBe(320);
  });

  it('follows a fish from the day it arrives', () => {
    const bought = new Date(2026, 8, 23, 12);
    const fish = { price: 40, lengthCm: 25, adultCm: 78, acquiredAt: bought.toISOString() };
    const today = growthOf('koi', fish, bought);
    const month = growthOf('koi', fish, new Date(bought.getTime() + 30 * 86_400_000));

    expect(today).toEqual(expect.objectContaining({ lengthCm: 25, grownCm: 0, value: 40 }));
    expect(today.valuePerDay).toBeGreaterThan(0);
    expect(month.grownCm).toBeGreaterThan(10);
    expect(month.value).toBe(valueAt(40, 25, month.lengthCm));
    expect(koiAgeClass(month.ageYears).name).toBe('Nisai');
  });

  it('treats an unreadable or future date as just arrived', () => {
    const now = new Date(2026, 8, 23);

    expect(daysSince('not a date', now)).toBe(0);
    expect(daysSince(new Date(2026, 8, 30).toISOString(), now)).toBe(0);
  });
});
