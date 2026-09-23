import { describe, expect, it } from 'vitest';
import { POND_YEAR_DAYS, growthOf } from './fish-growth';
import type { GoldfishListing } from './goldfish-market';
import { MAX_GOLDFISH, MAX_KOI } from './koi';
import {
  COINS_PER_BRANCH,
  DAILY_BRANCH_REWARDS,
  RESTOCK_PRICE,
  WELCOME_COINS,
  buyGoldfish,
  buyListing,
  createAccount,
  dismissWelcome,
  goldfishBlocker,
  markSeen,
  parseAccount,
  pondWorth,
  purchaseBlocker,
  refundFor,
  releaseGoldfish,
  releaseKoi,
  restockTank,
  rewardBranch,
  rewardsLeftToday,
  tankToday,
  type KoiAccount
} from './koi-account';
import { koiTank, type KoiListing } from './koi-market';

const DAY = '2026-09-23';
const NOW = new Date(2026, 8, 23, 12);
const DAY_MS = 86_400_000;

/** The same moment, some of the visitor's days later. */
const later = (days: number): Date => new Date(NOW.getTime() + days * DAY_MS);

const listing = (slot: number, price = 80): KoiListing => ({
  id: `${DAY}#0.${slot}.0`,
  day: DAY,
  slot,
  name: `Koi ${slot}`,
  genome: { variety: 'kohaku', modifiers: [], seed: 1000 + slot },
  lengthCm: 30,
  adultCm: 75,
  price
});

const goldfish = (breed: string, generation = 0, price = 6): GoldfishListing => ({
  id: `${DAY}~${breed}.${generation}`,
  day: DAY,
  name: `Goldie ${generation}`,
  genome: { species: 'goldfish', variety: 'comet', seed: 500 + generation },
  lengthCm: 9,
  adultCm: 28,
  price
});

const withCoins = (coins: number): KoiAccount => ({ ...createAccount([], DAY), coins });

describe('createAccount', () => {
  it('opens with a welcome, plus back pay for branches made before the market existed', () => {
    const account = createAccount(['feat/a', 'fix/b', 'fix/b', ''], DAY);

    expect(account.coins).toBe(WELCOME_COINS + 2 * COINS_PER_BRANCH);
    expect(account.welcome).toEqual({ coins: account.coins, branches: 2 });
    expect(account.owned).toEqual([]);
    expect(account.goldfish).toEqual([]);
  });

  it('never pays twice for a branch it has already back-paid', () => {
    const account = createAccount(['feat/a'], DAY);

    expect(rewardBranch(account, 'feat/a', DAY).outcome).toBe('already-rewarded');
  });
});

describe('rewardBranch', () => {
  it('pays once per branch name, however often it is copied', () => {
    const first = rewardBranch(withCoins(0), 'feat/new', DAY);
    const again = rewardBranch(first.account, 'feat/new', DAY);

    expect(first.earned).toBe(COINS_PER_BRANCH);
    expect(first.account.coins).toBe(COINS_PER_BRANCH);
    expect(again.earned).toBe(0);
    expect(again.outcome).toBe('already-rewarded');
    expect(again.account).toBe(first.account);
  });

  it('stops paying for the day at the cap, and starts again tomorrow', () => {
    let account = withCoins(0);

    for (let index = 0; index < DAILY_BRANCH_REWARDS; index += 1) {
      account = rewardBranch(account, `feat/${index}`, DAY).account;
    }

    expect(account.coins).toBe(DAILY_BRANCH_REWARDS * COINS_PER_BRANCH);
    expect(rewardsLeftToday(account, DAY)).toBe(0);
    expect(rewardBranch(account, 'feat/one-more', DAY).outcome).toBe('daily-limit');

    const tomorrow = rewardBranch(account, 'feat/one-more', '2026-09-24');
    expect(tomorrow.outcome).toBe('rewarded');
    expect(rewardsLeftToday(tomorrow.account, '2026-09-24')).toBe(DAILY_BRANCH_REWARDS - 1);
  });

  it('pays nothing for an empty branch', () => {
    expect(rewardBranch(withCoins(0), '', DAY).outcome).toBe('empty');
  });
});

describe('buying', () => {
  it('spends the price and puts the koi in the pond, at the size it was listed at', () => {
    const { account, outcome } = buyListing(withCoins(100), listing(1, 80), NOW);

    expect(outcome).toBe('bought');
    expect(account.coins).toBe(20);
    expect(account.owned).toEqual([
      expect.objectContaining({
        id: `${DAY}#0.1.0`,
        name: 'Koi 1',
        price: 80,
        lengthCm: 30,
        adultCm: 75
      })
    ]);
    expect(account.owned[0]!.acquiredAt).toBe(NOW.toISOString());
  });

  it('retires the welcome once the first koi is bought', () => {
    const fresh = createAccount([], DAY);

    expect(buyListing(fresh, listing(1), NOW).account.welcome).toBeNull();
  });

  it('refuses when the visitor is short, already owns the fish, or the pond is full', () => {
    expect(purchaseBlocker(withCoins(10), listing(1, 80))).toBe('short');

    const owned = buyListing(withCoins(200), listing(1), NOW).account;
    expect(buyListing(owned, listing(1), NOW).outcome).toBe('owned');

    let full = withCoins(10_000);
    for (let slot = 0; slot < MAX_KOI; slot += 1) {
      full = buyListing(full, listing(slot, 5), NOW).account;
    }
    expect(full.owned).toHaveLength(MAX_KOI);
    expect(buyListing(full, listing(99, 5), NOW).outcome).toBe('pond-full');
  });

  it('leaves the account untouched when a purchase is refused', () => {
    const account = withCoins(10);

    expect(buyListing(account, listing(1, 80), NOW).account).toBe(account);
  });
});

describe('goldfish', () => {
  it('swim in alongside the koi, remembered as today’s sales', () => {
    const { account, outcome } = buyGoldfish(withCoins(20), goldfish('comet'), NOW);

    expect(outcome).toBe('bought');
    expect(account.coins).toBe(14);
    expect(account.goldfish).toEqual([
      expect.objectContaining({ name: 'Goldie 0', price: 6, lengthCm: 9, adultCm: 28 })
    ]);
    expect(account.owned).toEqual([]);
    expect(tankToday(account, DAY).goldfish).toEqual([`${DAY}~comet.0`]);
  });

  it('have their own room, which a full koi pond doesn’t take', () => {
    let account = withCoins(10_000);

    for (let slot = 0; slot < MAX_KOI; slot += 1) {
      account = buyListing(account, listing(slot, 5), NOW).account;
    }

    expect(goldfishBlocker(account, goldfish('comet'))).toBeNull();

    for (let generation = 0; generation < MAX_GOLDFISH; generation += 1) {
      account = buyGoldfish(account, goldfish('comet', generation), NOW).account;
    }

    expect(account.goldfish).toHaveLength(MAX_GOLDFISH);
    expect(goldfishBlocker(account, goldfish('comet', 99))).toBe('pond-full');
    expect(goldfishBlocker(withCoins(2), goldfish('comet'))).toBe('short');
  });

  it('are left alone by a koi restock', () => {
    const bought = buyGoldfish(withCoins(500), goldfish('comet'), NOW).account;

    expect(restockTank(bought, DAY).account.tank.goldfish).toEqual([`${DAY}~comet.0`]);
  });

  it('pay back half what they are worth when released', () => {
    const bought = buyGoldfish(withCoins(20), goldfish('comet', 0, 8), NOW).account;
    const { account, refund } = releaseGoldfish(bought, `${DAY}~comet.0`, NOW);

    expect(refund).toBe(4);
    expect(account.coins).toBe(16);
    expect(account.goldfish).toEqual([]);
    expect(releaseGoldfish(account, 'nope', NOW)).toEqual({ account, refund: 0 });
  });
});

describe('releasing', () => {
  const koi = { price: 80, lengthCm: 30, adultCm: 75, acquiredAt: NOW.toISOString() };

  it('pays half of what the koi is worth today', () => {
    expect(refundFor('koi', koi, NOW)).toBe(40);
  });

  it('pays more for a koi that has grown', () => {
    const grown = later(POND_YEAR_DAYS);

    expect(refundFor('koi', koi, grown)).toBe(Math.floor(growthOf('koi', koi, grown).value / 2));
    expect(refundFor('koi', koi, grown)).toBeGreaterThan(80);
  });

  it('takes the koi out of the pond and refunds it', () => {
    const bought = buyListing(withCoins(100), listing(1, 80), NOW).account;
    const { account, refund } = releaseKoi(bought, `${DAY}#0.1.0`, NOW);

    expect(refund).toBe(40);
    expect(account.coins).toBe(60);
    expect(account.owned).toEqual([]);
  });

  it('ignores a koi that isn’t there', () => {
    const account = withCoins(10);

    expect(releaseKoi(account, 'nope', NOW)).toEqual({ account, refund: 0 });
  });

  it('sends a released koi off for good, rather than back into the tank', () => {
    const [first] = koiTank(DAY);
    const bought = buyListing(withCoins(5000), first!, NOW).account;
    const released = releaseKoi(bought, first!.id, NOW).account;
    const { restocks, sold } = tankToday(released, DAY);

    expect(sold).toEqual([first!.id]);
    expect(koiTank(DAY, restocks, sold).map((listing) => listing.id)).not.toContain(first!.id);
  });
});

describe('pondWorth', () => {
  it('starts at what was paid, and climbs as the fish grow', () => {
    let account = buyListing(withCoins(500), listing(1, 80), NOW).account;
    account = buyGoldfish(account, goldfish('comet', 0, 6), NOW).account;

    const today = pondWorth(account, NOW);
    const month = pondWorth(account, later(30));

    expect(today).toEqual(expect.objectContaining({ value: 86, paid: 86 }));
    expect(today.perDay).toBeGreaterThan(0);
    expect(month.value).toBeGreaterThan(today.value);
    expect(month.paid).toBe(86);
  });

  it('is nothing for an empty pond', () => {
    expect(pondWorth(withCoins(0), NOW)).toEqual({ value: 0, paid: 0, perDay: 0 });
  });
});

describe('the tank', () => {
  it('remembers what was bought from it, in order', () => {
    const tank = koiTank(DAY);
    let account = withCoins(5000);
    account = buyListing(account, tank[4]!, NOW).account;
    account = buyListing(account, koiTank(DAY, 0, tankToday(account, DAY).sold)[1]!, NOW).account;

    expect(tankToday(account, DAY).sold).toEqual([tank[4]!.id, tank[1]!.id]);
  });

  it('starts every day fresh: yesterday’s restocks and sales don’t carry over', () => {
    const yesterday = {
      ...withCoins(0),
      tank: { day: '2026-09-22', restocks: 3, sold: ['x'], goldfish: ['y'] }
    };

    expect(tankToday(yesterday, DAY)).toEqual({ day: DAY, restocks: 0, sold: [], goldfish: [] });
  });

  it('restocks for a price, clearing the day’s sales', () => {
    const bought = buyListing(withCoins(500), listing(2), NOW).account;
    const { account, outcome } = restockTank(bought, DAY);

    expect(outcome).toBe('restocked');
    expect(account.coins).toBe(500 - 80 - RESTOCK_PRICE);
    expect(account.tank).toEqual({ day: DAY, restocks: 1, sold: [], goldfish: [] });
    expect(restockTank(account, DAY).account.tank.restocks).toBe(2);
  });

  it('won’t restock on credit', () => {
    const account = withCoins(RESTOCK_PRICE - 5);

    expect(restockTank(account, DAY)).toEqual({ account, outcome: 'short' });
  });
});

describe('seen and welcome flags', () => {
  it('marks a day seen without churning when it already is', () => {
    const seen = markSeen(withCoins(0), DAY);

    expect(seen.seenDay).toBe(DAY);
    expect(markSeen(seen, DAY)).toBe(seen);
  });

  it('dismisses the welcome for good', () => {
    const account = createAccount([], DAY);

    expect(dismissWelcome(account).welcome).toBeNull();
  });
});

describe('parseAccount', () => {
  it('round-trips an account through storage', () => {
    const bought = buyListing(withCoins(500), listing(1, 80), NOW).account;
    const withGoldfish = buyGoldfish(bought, goldfish('comet'), NOW).account;
    const rewarded = rewardBranch(withGoldfish, 'feat/x', DAY).account;
    const restocked = restockTank(rewarded, DAY).account;

    expect(parseAccount(JSON.stringify(restocked))).toEqual(restocked);
  });

  it('reads an account saved before the tank was remembered as a fresh tank', () => {
    const account = parseAccount(JSON.stringify({ coins: 40, owned: [] }))!;

    expect(account.tank).toEqual({ day: '', restocks: 0, sold: [], goldfish: [] });
    expect(tankToday(account, DAY)).toEqual({ day: DAY, restocks: 0, sold: [], goldfish: [] });
    expect(account.goldfish).toEqual([]);
  });

  it('gives a koi bought before sizes the length it was listed at, and room to grow', () => {
    const old = {
      id: 'o',
      name: 'Old',
      price: 80,
      acquiredAt: NOW.toISOString(),
      genome: { variety: 'kohaku', modifiers: [], seed: 1 }
    };
    const [koi] = parseAccount(JSON.stringify({ coins: 0, owned: [old] }))!.owned;

    // The build-length sizes the market used to quote ran from about 51 to 71 cm.
    expect(koi!.lengthCm).toBeGreaterThanOrEqual(51);
    expect(koi!.lengthCm).toBeLessThanOrEqual(71);
    expect(koi!.adultCm).toBeGreaterThan(koi!.lengthCm);
    expect(parseAccount(JSON.stringify({ coins: 0, owned: [old] }))!.owned[0]).toEqual(koi);
  });

  it('returns null for nothing, garbage, or a balance that makes no sense', () => {
    expect(parseAccount(null)).toBeNull();
    expect(parseAccount('{not json')).toBeNull();
    expect(parseAccount(JSON.stringify({ coins: -5 }))).toBeNull();
    expect(parseAccount(JSON.stringify([1, 2, 3]))).toBeNull();
  });

  it('drops what it can’t read, without losing the rest of the account', () => {
    const stored = {
      coins: 50,
      owned: [
        {
          id: 'a',
          name: 'Good',
          price: 80,
          acquiredAt: NOW.toISOString(),
          genome: { variety: 'kohaku', modifiers: ['ginrin', 'laser-eyes'], seed: 1 }
        },
        {
          id: 'b',
          name: 'Nameless',
          price: 80,
          acquiredAt: NOW.toISOString(),
          genome: { variety: '', modifiers: [], seed: 2 }
        },
        {
          id: 'a',
          name: 'Duplicate',
          price: 80,
          acquiredAt: NOW.toISOString(),
          genome: { variety: 'kohaku', modifiers: [], seed: 3 }
        },
        'not a koi'
      ],
      goldfish: [
        {
          id: 'g',
          name: 'Sizeless',
          price: 5,
          acquiredAt: NOW.toISOString(),
          genome: { species: 'goldfish', variety: 'comet', seed: 4 }
        }
      ]
    };
    const account = parseAccount(JSON.stringify(stored))!;

    expect(account.coins).toBe(50);
    expect(account.owned.map((koi) => koi.name)).toEqual(['Good']);
    expect(account.owned[0]!.genome.modifiers).toEqual(['ginrin']);
    expect(account.goldfish).toEqual([]);
    expect(account.welcome).toBeNull();
    expect(account.rewarded).toEqual([]);
  });

  it('keeps a fish of a variety this version doesn’t know, so an older build can’t lose it', () => {
    const future = {
      id: 'f',
      name: 'Future',
      price: 900,
      lengthCm: 40,
      adultCm: 80,
      acquiredAt: NOW.toISOString(),
      genome: { variety: 'space-koi', modifiers: ['butterfly'], seed: 5 }
    };
    const futureGoldfish = {
      id: 'fg',
      name: 'Futura',
      price: 9,
      lengthCm: 9,
      adultCm: 20,
      acquiredAt: NOW.toISOString(),
      genome: { species: 'goldfish', variety: 'space-comet', seed: 6 }
    };
    const account = parseAccount(
      JSON.stringify({ coins: 0, owned: [future], goldfish: [futureGoldfish] })
    )!;

    expect(account.owned).toEqual([future]);
    expect(account.goldfish).toEqual([futureGoldfish]);
  });

  it('never lets a stored pond outgrow the pond', () => {
    const fish = (count: number, genome: (index: number) => object): object[] =>
      Array.from({ length: count }, (_unused, index) => ({
        id: `f${index}`,
        name: 'Fish',
        price: 60,
        lengthCm: 30,
        adultCm: 70,
        acquiredAt: NOW.toISOString(),
        genome: genome(index)
      }));
    const account = parseAccount(
      JSON.stringify({
        coins: 0,
        owned: fish(MAX_KOI + 5, (seed) => ({ variety: 'kohaku', modifiers: [], seed })),
        goldfish: fish(MAX_GOLDFISH + 5, (seed) => ({
          species: 'goldfish',
          variety: 'comet',
          seed
        }))
      })
    )!;

    expect(account.owned).toHaveLength(MAX_KOI);
    expect(account.goldfish).toHaveLength(MAX_GOLDFISH);
  });
});
