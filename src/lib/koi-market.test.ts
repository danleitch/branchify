import { describe, expect, it } from 'vitest';
import { koiRarity, varietyOf, type KoiGenome } from './koi-genome';
import {
  DAILY_STOCK,
  KOI_NAMES,
  describeListing,
  formatCountdown,
  isSelfColoured,
  isTosai,
  koiTank,
  marketDay,
  msUntilRestock,
  nameMeaning,
  priceFor,
  type KoiListing
} from './koi-market';
import { RARITIES, findVariety } from './koi-varieties';

/** A month of market days, for properties that should hold every single day. */
const MONTH = Array.from({ length: 30 }, (_unused, index) =>
  marketDay(new Date(2026, 8, 1 + index))
);

const DAY = '2026-09-23';

/** Checks what every tank must be, however it came about. */
const expectHealthyTank = (tank: readonly KoiListing[], context: string): void => {
  const varieties = tank.map((listing) => varietyOf(listing.genome));

  expect(tank, context).toHaveLength(DAILY_STOCK);
  expect(
    tank.map((listing) => listing.slot),
    context
  ).toEqual([0, 1, 2, 3, 4, 5]);
  expect(new Set(varieties).size, context).toBe(DAILY_STOCK);
  expect(new Set(tank.map((listing) => listing.name)).size, context).toBe(DAILY_STOCK);
  expect(varieties.some(isSelfColoured), context).toBe(true);
  expect(
    varieties.some((variety) => !isSelfColoured(variety)),
    context
  ).toBe(true);
  expect(tank.some(isTosai), context).toBe(true);
};

/** Buys whatever swims in each slot in turn, returning every tank along the way. */
const buyThrough = (day: string, slots: readonly number[]): KoiListing[][] => {
  const sold: string[] = [];
  const tanks = [koiTank(day)];

  for (const slot of slots) {
    sold.push(tanks[tanks.length - 1]![slot]!.id);
    tanks.push(koiTank(day, 0, sold));
  }

  return tanks;
};

describe('a fresh tank', () => {
  it('stocks six koi, each a different variety with its own name and place', () => {
    for (const day of MONTH) {
      expectHealthyTank(koiTank(day), day);
    }
  });

  it('shows everyone the same tank on the same day, and a new one tomorrow', () => {
    expect(koiTank(DAY)).toEqual(koiTank(DAY));
    expect(koiTank('2026-09-24')).not.toEqual(koiTank(DAY));
  });

  it('leads with its rarest fish', () => {
    for (const day of MONTH) {
      const ranks = koiTank(day).map((listing) => RARITIES.indexOf(koiRarity(listing.genome)));

      expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    }
  });

  it('turns up a legendary koi now and then, but not every day', () => {
    const days = MONTH.filter((day) =>
      koiTank(day).some((listing) => koiRarity(listing.genome) === 'legendary')
    );

    expect(days.length).toBeGreaterThan(0);
    expect(days.length).toBeLessThan(MONTH.length);
  });

  it('prices in round fives', () => {
    for (const listing of MONTH.flatMap((day) => koiTank(day))) {
      expect(listing.price % 5).toBe(0);
      expect(listing.price).toBeGreaterThanOrEqual(5);
    }
  });

  it('prices by rarity, traits and size: half the length, a quarter the price', () => {
    const kohaku: KoiGenome = { variety: 'kohaku', modifiers: [], seed: 1 };
    const variety = findVariety('kohaku')!;

    expect(priceFor(kohaku, variety, 0.5, 50)).toBe(80);
    expect(priceFor(kohaku, variety, 0.5, 25)).toBe(20);
    expect(priceFor({ ...kohaku, modifiers: ['ginrin'] }, variety, 0.5, 50)).toBe(120);
    expect(
      priceFor({ ...kohaku, variety: 'kumonryu' }, findVariety('kumonryu')!, 0.5, 50)
    ).toBeGreaterThan(80 * 5);
  });

  it('keys every listing by its day, restock, place and generation', () => {
    const tank = koiTank(DAY);

    expect(tank.map((listing) => listing.id)).toEqual(
      [0, 1, 2, 3, 4, 5].map((slot) => `${DAY}#0.${slot}.0`)
    );
    expect(tank.every((listing) => listing.day === DAY)).toBe(true);

    const ids = MONTH.flatMap((day) => koiTank(day).map((listing) => listing.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('sizes', () => {
  const listings = MONTH.flatMap((day) => koiTank(day));

  it('sells koi the way dealers do: mostly young, now and then a big one', () => {
    const tosai = listings.filter(isTosai);

    expect(tosai.length / listings.length).toBeGreaterThan(0.3);
    expect(tosai.length / listings.length).toBeLessThan(0.7);
    expect(listings.some((listing) => listing.lengthCm > 50)).toBe(true);
  });

  it('lists every koi smaller than it will grow, and no bigger than a jumbo', () => {
    for (const listing of listings) {
      expect(listing.lengthCm).toBeGreaterThan(10);
      expect(listing.lengthCm).toBeLessThan(listing.adultCm);
      expect(listing.adultCm).toBeLessThanOrEqual(92);
    }
  });

  it('prices a tosai low enough to start with', () => {
    const tosai = listings.filter(
      (listing) => isTosai(listing) && koiRarity(listing.genome) === 'common'
    );

    expect(Math.max(...tosai.map((listing) => listing.price))).toBeLessThanOrEqual(30);
  });
});

describe('buying from the tank', () => {
  it('brings a new koi into the place of the one bought, and leaves the rest alone', () => {
    const before = koiTank(DAY);
    const after = koiTank(DAY, 0, [before[2]!.id]);

    expect(after[2]!.id).toBe(`${DAY}#0.2.1`);
    expect(after[2]!.genome).not.toEqual(before[2]!.genome);
    expect(after.filter((listing) => listing.slot !== 2)).toEqual(
      before.filter((listing) => listing.slot !== 2)
    );
  });

  it('never changes a fish that is still on show', () => {
    const tanks = buyThrough(DAY, [3, 0, 3, 5, 1, 3, 3, 4]);

    for (let step = 1; step < tanks.length; step += 1) {
      const before = tanks[step - 1]!;
      const after = tanks[step]!;
      const changed = after.filter((listing, slot) => listing.id !== before[slot]!.id);

      // Exactly one place changes per purchase: the one that was bought from.
      expect(changed).toHaveLength(1);
    }
  });

  it('keeps every tank healthy however much is bought from it', () => {
    for (const day of MONTH.slice(0, 10)) {
      const slots = Array.from({ length: 24 }, (_unused, index) => (index * 7) % DAILY_STOCK);

      buyThrough(day, slots).forEach((tank, step) =>
        expectHealthyTank(tank, `${day} step ${step}`)
      );
    }
  });

  it('replaces the only self-coloured koi with another', () => {
    const plainCount = (tank: readonly KoiListing[]): number =>
      tank.filter((listing) => isSelfColoured(varietyOf(listing.genome))).length;
    const day = MONTH.find((candidate) => plainCount(koiTank(candidate)) === 1)!;
    const plain = koiTank(day).find((listing) => isSelfColoured(varietyOf(listing.genome)))!;
    const after = koiTank(day, 0, [plain.id]);

    expect(isSelfColoured(varietyOf(after[plain.slot]!.genome))).toBe(true);
  });

  it('rebuilds the same tank from the same purchases', () => {
    const tanks = buyThrough(DAY, [1, 4, 1]);
    const sold = [tanks[0]![1]!.id, tanks[1]![4]!.id, tanks[2]![1]!.id];

    expect(koiTank(DAY, 0, sold)).toEqual(tanks[3]);
  });

  it('ignores sales from another day or another restock', () => {
    const tank = koiTank(DAY);

    expect(koiTank(DAY, 0, ['2026-09-22#0.1.0', `${DAY}#1.1.0`])).toEqual(tank);
  });
});

describe('restocking', () => {
  it('swaps in a fresh six, the same for everyone who restocks as often', () => {
    const first = koiTank(DAY);
    const second = koiTank(DAY, 1);

    expectHealthyTank(second, 'restocked');
    expect(second).toEqual(koiTank(DAY, 1));
    expect(second.map((listing) => listing.id)).toEqual(
      [0, 1, 2, 3, 4, 5].map((slot) => `${DAY}#1.${slot}.0`)
    );
    expect(second.map((listing) => listing.genome)).not.toEqual(
      first.map((listing) => listing.genome)
    );
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
      describeListing({
        name: 'Suzu',
        genome: { variety: 'orenji-ogon', modifiers: [], seed: 1 }
      })
    ).toBe('Suzu, an Orenji Ogon');
  });
});
