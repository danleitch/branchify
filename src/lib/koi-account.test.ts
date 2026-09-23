import { describe, expect, it } from 'vitest';
import { MAX_KOI } from './koi';
import {
  COINS_PER_BRANCH,
  DAILY_BRANCH_REWARDS,
  RESTOCK_PRICE,
  WELCOME_COINS,
  buyListing,
  createAccount,
  dismissWelcome,
  markSeen,
  parseAccount,
  purchaseBlocker,
  refundFor,
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

const listing = (slot: number, price = 80): KoiListing => ({
  id: `${DAY}#0.${slot}.0`,
  day: DAY,
  slot,
  name: `Koi ${slot}`,
  genome: { variety: 'kohaku', modifiers: [], seed: 1000 + slot },
  price
});

const withCoins = (coins: number): KoiAccount => ({ ...createAccount([], DAY), coins });

describe('createAccount', () => {
  it('opens with a welcome, plus back pay for branches made before the market existed', () => {
    const account = createAccount(['feat/a', 'fix/b', 'fix/b', ''], DAY);

    expect(account.coins).toBe(WELCOME_COINS + 2 * COINS_PER_BRANCH);
    expect(account.welcome).toEqual({ coins: account.coins, branches: 2 });
    expect(account.owned).toEqual([]);
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
  it('spends the price and puts the koi in the pond', () => {
    const { account, outcome } = buyListing(withCoins(100), listing(1, 80), NOW);

    expect(outcome).toBe('bought');
    expect(account.coins).toBe(20);
    expect(account.owned).toEqual([
      expect.objectContaining({ id: `${DAY}#0.1.0`, name: 'Koi 1', price: 80 })
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

describe('releasing', () => {
  it('pays half the price back, rounded down to five', () => {
    expect(refundFor({ price: 80 })).toBe(40);
    expect(refundFor({ price: 145 })).toBe(70);
    expect(refundFor({ price: 5 })).toBe(0);
  });

  it('takes the koi out of the pond and refunds it', () => {
    const bought = buyListing(withCoins(100), listing(1, 80), NOW).account;
    const { account, refund } = releaseKoi(bought, `${DAY}#0.1.0`);

    expect(refund).toBe(40);
    expect(account.coins).toBe(60);
    expect(account.owned).toEqual([]);
  });

  it('ignores a koi that isn’t there', () => {
    const account = withCoins(10);

    expect(releaseKoi(account, 'nope')).toEqual({ account, refund: 0 });
  });

  it('sends a released koi off for good, rather than back into the tank', () => {
    const [first] = koiTank(DAY);
    const bought = buyListing(withCoins(5000), first!, NOW).account;
    const released = releaseKoi(bought, first!.id).account;
    const { restocks, sold } = tankToday(released, DAY);

    expect(sold).toEqual([first!.id]);
    expect(koiTank(DAY, restocks, sold).map((listing) => listing.id)).not.toContain(first!.id);
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
    const yesterday = { ...withCoins(0), tank: { day: '2026-09-22', restocks: 3, sold: ['x'] } };

    expect(tankToday(yesterday, DAY)).toEqual({ day: DAY, restocks: 0, sold: [] });
  });

  it('restocks for a price, clearing the day’s sales', () => {
    const bought = buyListing(withCoins(500), listing(2), NOW).account;
    const { account, outcome } = restockTank(bought, DAY);

    expect(outcome).toBe('restocked');
    expect(account.coins).toBe(500 - 80 - RESTOCK_PRICE);
    expect(account.tank).toEqual({ day: DAY, restocks: 1, sold: [] });
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
    const rewarded = rewardBranch(bought, 'feat/x', DAY).account;
    const restocked = restockTank(rewarded, DAY).account;

    expect(parseAccount(JSON.stringify(restocked))).toEqual(restocked);
  });

  it('reads an account saved before the tank was remembered as a fresh tank', () => {
    const account = parseAccount(JSON.stringify({ coins: 40, owned: [] }))!;

    expect(account.tank).toEqual({ day: '', restocks: 0, sold: [] });
    expect(tankToday(account, DAY)).toEqual({ day: DAY, restocks: 0, sold: [] });
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
      ]
    };
    const account = parseAccount(JSON.stringify(stored))!;

    expect(account.coins).toBe(50);
    expect(account.owned.map((koi) => koi.name)).toEqual(['Good']);
    expect(account.owned[0]!.genome.modifiers).toEqual(['ginrin']);
    expect(account.welcome).toBeNull();
    expect(account.rewarded).toEqual([]);
  });

  it('keeps a koi of a variety this version doesn’t know, so an older build can’t lose it', () => {
    const future = {
      id: 'f',
      name: 'Future',
      price: 900,
      acquiredAt: NOW.toISOString(),
      genome: { variety: 'space-koi', modifiers: ['butterfly'], seed: 5 }
    };
    const account = parseAccount(JSON.stringify({ coins: 0, owned: [future] }))!;

    expect(account.owned).toEqual([future]);
  });

  it('never lets a stored pond outgrow the pond', () => {
    const owned = Array.from({ length: MAX_KOI + 5 }, (_unused, index) => ({
      id: `k${index}`,
      name: 'Koi',
      price: 60,
      acquiredAt: NOW.toISOString(),
      genome: { variety: 'kohaku', modifiers: [], seed: index }
    }));

    expect(parseAccount(JSON.stringify({ coins: 0, owned }))!.owned).toHaveLength(MAX_KOI);
  });
});
