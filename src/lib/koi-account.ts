/**
 * The visitor's side of the market: their coins, and the koi they own.
 *
 * Coins are earned by doing what Branchify is for. The first time a new branch
 * name is put to use — copied from the outputs, or saved to the recent list —
 * it pays out once. Paying per branch name rather than per click is what keeps
 * copying the same name twice from counting twice, and a daily cap keeps a
 * keyboard full of throwaway names from buying the whole tank in an afternoon.
 *
 * Everything here is a pure function of the account, so the rules can be
 * tested without React, storage, or a clock.
 */
import type { KoiGenome } from './koi-genome';
import { MAX_KOI } from './koi';
import type { KoiListing } from './koi-market';
import { MODIFIERS, type KoiModifier } from './koi-modifiers';
import type { KoiVarietyId } from './koi-varieties';
import { hashString } from './seeded-random';

export const KOI_ACCOUNT_STORAGE_KEY = 'branchify-koi-market';

/** What one new branch earns. */
export const COINS_PER_BRANCH = 25;

/** How many branches a day can pay out; normal days never come near it. */
export const DAILY_BRANCH_REWARDS = 8;

/** What a new account opens with, before its recent branches are counted. */
export const WELCOME_COINS = 100;

/** How much of a koi's price the market pays back when it is released. */
export const REFUND_SHARE = 0.5;

/** What swapping today's tank for a fresh six costs. */
export const RESTOCK_PRICE = 100;

/** How many paid-out branch names are remembered; older ones may pay again, which is harmless. */
const MAX_REWARD_LEDGER = 300;

/** How many of a day's sales are remembered; far more than a day of buying ever makes. */
const MAX_SOLD = 200;

/**
 * Today's tank as this visitor has changed it.
 *
 * Only the changes are kept, never the fish: the market rebuilds the tank from
 * the day, the restocks and the sales, the same way every time.
 */
export type KoiTankState = {
  day: string;
  /** How many times the visitor has paid to restock it today. */
  restocks: number;
  /** Listings bought from the current tank, oldest first; each has been replaced. */
  sold: string[];
};

/** A koi the visitor has bought. */
export type OwnedKoi = {
  /** The listing it was bought from, so the same fish is never sold twice at once. */
  id: string;
  name: string;
  genome: KoiGenome;
  /** What was paid, which is what a release refunds against. */
  price: number;
  acquiredAt: string;
};

export type KoiAccount = {
  coins: number;
  /** Hashes of branch names that have already paid out, newest first. */
  rewarded: string[];
  /** The market day `earnedToday` counts. */
  earnDay: string;
  earnedToday: number;
  /** The koi in the pond, in the order they were bought. */
  owned: OwnedKoi[];
  /** The last market day the visitor opened the market; drives the "new stock" dot. */
  seenDay: string | null;
  /** How the account was opened, shown once and then dismissed. */
  welcome: { coins: number; branches: number } | null;
  tank: KoiTankState;
};

/** The visitor's tank for a day; yesterday's restocks and sales don't carry over. */
export const tankToday = (account: KoiAccount, day: string): KoiTankState =>
  account.tank.day === day ? account.tank : { day, restocks: 0, sold: [] };

const branchKey = (branch: string): string => hashString(branch).toString(36);

/**
 * Opens an account.
 *
 * Branches already in the recent list are paid for up front — they are work
 * the visitor did before the market existed — and remembered, so they never
 * pay a second time.
 */
export const createAccount = (recentBranches: readonly string[], day: string): KoiAccount => {
  const branches = [...new Set(recentBranches.filter(Boolean))];

  return {
    coins: WELCOME_COINS + branches.length * COINS_PER_BRANCH,
    rewarded: branches.map(branchKey),
    earnDay: day,
    earnedToday: 0,
    owned: [],
    seenDay: null,
    welcome: {
      coins: WELCOME_COINS + branches.length * COINS_PER_BRANCH,
      branches: branches.length
    },
    tank: { day, restocks: 0, sold: [] }
  };
};

export type RewardOutcome = 'rewarded' | 'already-rewarded' | 'daily-limit' | 'empty';

/** Pays for a branch the first time it is put to use. */
export const rewardBranch = (
  account: KoiAccount,
  branch: string,
  day: string
): { account: KoiAccount; earned: number; outcome: RewardOutcome } => {
  if (!branch) {
    return { account, earned: 0, outcome: 'empty' };
  }

  const key = branchKey(branch);

  if (account.rewarded.includes(key)) {
    return { account, earned: 0, outcome: 'already-rewarded' };
  }

  const earnedToday = account.earnDay === day ? account.earnedToday : 0;

  if (earnedToday >= DAILY_BRANCH_REWARDS) {
    return { account, earned: 0, outcome: 'daily-limit' };
  }

  return {
    account: {
      ...account,
      coins: account.coins + COINS_PER_BRANCH,
      rewarded: [key, ...account.rewarded].slice(0, MAX_REWARD_LEDGER),
      earnDay: day,
      earnedToday: earnedToday + 1
    },
    earned: COINS_PER_BRANCH,
    outcome: 'rewarded'
  };
};

/** How many more branches can pay out today. */
export const rewardsLeftToday = (account: KoiAccount, day: string): number =>
  DAILY_BRANCH_REWARDS - (account.earnDay === day ? account.earnedToday : 0);

export type PurchaseOutcome = 'bought' | 'owned' | 'pond-full' | 'short';

/** Why a listing can't be bought right now, or null when it can. */
export const purchaseBlocker = (
  account: KoiAccount,
  listing: KoiListing
): Exclude<PurchaseOutcome, 'bought'> | null => {
  if (account.owned.some((koi) => koi.id === listing.id)) {
    return 'owned';
  }

  if (account.owned.length >= MAX_KOI) {
    return 'pond-full';
  }

  return account.coins < listing.price ? 'short' : null;
};

export const buyListing = (
  account: KoiAccount,
  listing: KoiListing,
  now: Date
): { account: KoiAccount; outcome: PurchaseOutcome } => {
  const blocker = purchaseBlocker(account, listing);

  if (blocker) {
    return { account, outcome: blocker };
  }

  const tank = tankToday(account, listing.day);

  return {
    account: {
      ...account,
      coins: account.coins - listing.price,
      // Sold for good: a new fish takes its place, and releasing it later
      // sends it off rather than back into the tank.
      tank: { ...tank, sold: [...tank.sold, listing.id].slice(-MAX_SOLD) },
      owned: [
        ...account.owned,
        {
          id: listing.id,
          name: listing.name,
          genome: listing.genome,
          price: listing.price,
          acquiredAt: now.toISOString()
        }
      ],
      // Buying is as good as saying hello; the welcome has done its job.
      welcome: null
    },
    outcome: 'bought'
  };
};

export type RestockOutcome = 'restocked' | 'short';

/** Swaps today's tank for a fresh six, for a price. */
export const restockTank = (
  account: KoiAccount,
  day: string
): { account: KoiAccount; outcome: RestockOutcome } => {
  if (account.coins < RESTOCK_PRICE) {
    return { account, outcome: 'short' };
  }

  const tank = tankToday(account, day);

  return {
    account: {
      ...account,
      coins: account.coins - RESTOCK_PRICE,
      tank: { day, restocks: tank.restocks + 1, sold: [] }
    },
    outcome: 'restocked'
  };
};

/** What the market pays back for a koi, rounded down to five coins. */
export const refundFor = (koi: Pick<OwnedKoi, 'price'>): number =>
  Math.floor((koi.price * REFUND_SHARE) / 5) * 5;

export const releaseKoi = (
  account: KoiAccount,
  id: string
): { account: KoiAccount; refund: number } => {
  const koi = account.owned.find((candidate) => candidate.id === id);

  if (!koi) {
    return { account, refund: 0 };
  }

  const refund = refundFor(koi);

  return {
    account: {
      ...account,
      coins: account.coins + refund,
      owned: account.owned.filter((candidate) => candidate.id !== id)
    },
    refund
  };
};

export const markSeen = (account: KoiAccount, day: string): KoiAccount =>
  account.seenDay === day ? account : { ...account, seenDay: day };

export const dismissWelcome = (account: KoiAccount): KoiAccount =>
  account.welcome ? { ...account, welcome: null } : account;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/**
 * Reads a stored genome.
 *
 * A variety this version doesn't recognise is kept rather than dropped: it is
 * most likely one a newer Branchify sold, and dropping it here would lose the
 * fish for good the moment this version wrote the account back. Until the
 * catalogue knows it, the genome's readers draw it as a kohaku.
 */
const parseGenome = (value: unknown): KoiGenome | null => {
  if (
    !isRecord(value) ||
    typeof value.variety !== 'string' ||
    value.variety === '' ||
    !isCount(value.seed) ||
    !Array.isArray(value.modifiers)
  ) {
    return null;
  }

  const modifiers = MODIFIERS.filter((modifier: KoiModifier) =>
    (value.modifiers as unknown[]).includes(modifier)
  );

  return { variety: value.variety as KoiVarietyId, modifiers, seed: value.seed };
};

const parseOwned = (value: unknown): OwnedKoi | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !isCount(value.price) ||
    typeof value.acquiredAt !== 'string'
  ) {
    return null;
  }

  const genome = parseGenome(value.genome);

  return genome
    ? { id: value.id, name: value.name, genome, price: value.price, acquiredAt: value.acquiredAt }
    : null;
};

/**
 * Reads a stored account, or null when there is none worth keeping.
 *
 * Anything unreadable is dropped rather than failing the whole account, so a
 * damaged save still opens with whatever of it survived.
 */
/** A tank state that can't be read is simply a fresh tank: nothing restocked, nothing sold. */
const parseTank = (value: unknown): KoiTankState =>
  isRecord(value) &&
  typeof value.day === 'string' &&
  isCount(value.restocks) &&
  Array.isArray(value.sold)
    ? {
        day: value.day,
        restocks: value.restocks,
        sold: value.sold.filter((id): id is string => typeof id === 'string').slice(-MAX_SOLD)
      }
    : { day: '', restocks: 0, sold: [] };

export const parseAccount = (raw: string | null): KoiAccount | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed) || !isCount(parsed.coins)) {
      return null;
    }

    const owned = (Array.isArray(parsed.owned) ? parsed.owned : [])
      .map(parseOwned)
      .filter((koi): koi is OwnedKoi => koi !== null)
      .filter((koi, index, all) => all.findIndex((other) => other.id === koi.id) === index)
      .slice(0, MAX_KOI);
    const welcome =
      isRecord(parsed.welcome) && isCount(parsed.welcome.coins) && isCount(parsed.welcome.branches)
        ? { coins: parsed.welcome.coins, branches: parsed.welcome.branches }
        : null;

    return {
      coins: parsed.coins,
      rewarded: (Array.isArray(parsed.rewarded) ? parsed.rewarded : [])
        .filter((key): key is string => typeof key === 'string')
        .slice(0, MAX_REWARD_LEDGER),
      earnDay: typeof parsed.earnDay === 'string' ? parsed.earnDay : '',
      earnedToday: isCount(parsed.earnedToday) ? parsed.earnedToday : 0,
      owned,
      seenDay: typeof parsed.seenDay === 'string' ? parsed.seenDay : null,
      welcome,
      tank: parseTank(parsed.tank)
    };
  } catch {
    return null;
  }
};
