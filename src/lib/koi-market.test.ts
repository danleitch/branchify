import { describe, expect, it } from 'vitest';
import { koiRarity, varietyOf } from './koi-genome';
import {
  DAILY_STOCK,
  KOI_NAMES,
  dailyStock,
  describeListing,
  formatCountdown,
  isSelfColoured,
  marketDay,
  msUntilRestock,
  nameMeaning
} from './koi-market';
import { RARITIES } from './koi-varieties';

/** A month of market days, for properties that should hold every single day. */
const MONTH = Array.from({ length: 30 }, (_unused, index) =>
  marketDay(new Date(2026, 8, 1 + index))
);

describe('dailyStock', () => {
  it('stocks six koi, each a different variety with its own name', () => {
    const stock = dailyStock('2026-09-23');

    expect(stock).toHaveLength(DAILY_STOCK);
    expect(new Set(stock.map((listing) => listing.id)).size).toBe(DAILY_STOCK);
    expect(new Set(stock.map((listing) => listing.genome.variety)).size).toBe(DAILY_STOCK);
    expect(new Set(stock.map((listing) => listing.name)).size).toBe(DAILY_STOCK);
  });

  it('shows everyone the same tank on the same day, and a new one tomorrow', () => {
    expect(dailyStock('2026-09-23')).toEqual(dailyStock('2026-09-23'));
    expect(dailyStock('2026-09-24')).not.toEqual(dailyStock('2026-09-23'));
  });

  it('always has a plain, one-colour koi and a patterned one', () => {
    for (const day of MONTH) {
      const varieties = dailyStock(day).map((listing) => varietyOf(listing.genome));

      expect(varieties.some(isSelfColoured), day).toBe(true);
      expect(
        varieties.some((variety) => !isSelfColoured(variety)),
        day
      ).toBe(true);
    }
  });

  it('leads with its rarest fish', () => {
    for (const day of MONTH) {
      const ranks = dailyStock(day).map((listing) => RARITIES.indexOf(koiRarity(listing.genome)));

      expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    }
  });

  it('turns up a legendary koi now and then, but not every day', () => {
    const days = MONTH.filter((day) =>
      dailyStock(day).some((listing) => koiRarity(listing.genome) === 'legendary')
    );

    expect(days.length).toBeGreaterThan(0);
    expect(days.length).toBeLessThan(MONTH.length);
  });

  it('prices in round fives, rarer fish dearer', () => {
    const listings = MONTH.flatMap(dailyStock);

    for (const listing of listings) {
      expect(listing.price % 5).toBe(0);
      expect(listing.price).toBeGreaterThanOrEqual(60);
    }

    const cheapest = (rarity: string): number =>
      Math.min(
        ...listings
          .filter((listing) => varietyOf(listing.genome).rarity === rarity)
          .map((listing) => listing.price)
      );

    expect(cheapest('legendary')).toBeGreaterThan(cheapest('rare'));
    expect(cheapest('rare')).toBeGreaterThan(cheapest('uncommon'));
    expect(cheapest('uncommon')).toBeGreaterThan(cheapest('common'));
  });

  it('keys each listing by its day, so no two days ever sell the same fish', () => {
    const ids = MONTH.flatMap((day) => dailyStock(day).map((listing) => listing.id));

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toMatch(/^2026-09-01#\d$/);
  });
});

describe('the market clock', () => {
  it('names days in the visitor’s own calendar', () => {
    expect(marketDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(marketDay(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });

  it('restocks at the next local midnight', () => {
    expect(msUntilRestock(new Date(2026, 8, 23, 22, 30))).toBe(90 * 60 * 1000);
    expect(msUntilRestock(new Date(2026, 8, 23, 0, 0))).toBe(24 * 60 * 60 * 1000);
  });

  it('counts down in hours and minutes', () => {
    expect(formatCountdown((7 * 60 + 12) * 60_000)).toBe('7h 12m');
    expect(formatCountdown(12 * 60_000)).toBe('12m');
    expect(formatCountdown(20_000)).toBe('under a minute');
  });
});

describe('names', () => {
  it('knows what every name it gives means', () => {
    expect(new Set(KOI_NAMES.map(([name]) => name)).size).toBe(KOI_NAMES.length);
    expect(nameMeaning('Yuki')).toBe('snow');
    expect(nameMeaning('Rex')).toBeNull();
  });

  it('describes a listing in one breath', () => {
    expect(
      describeListing({
        name: 'Hana',
        genome: { variety: 'kohaku', modifiers: ['ginrin'], seed: 1 }
      })
    ).toBe('Hana, a Gin Rin Kohaku');
    expect(
      describeListing({ name: 'Suzu', genome: { variety: 'orenji-ogon', modifiers: [], seed: 1 } })
    ).toBe('Suzu, an Orenji Ogon');
  });
});
