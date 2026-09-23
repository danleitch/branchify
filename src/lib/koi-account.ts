/**
 * The visitor's side of the market: their coins, and the fish they own.
 *
 * Coins are earned by doing what Branchify is for. The first time a new branch
 * name is put to use — copied from the outputs, or saved to the recent list —
 * it pays out once. Paying per branch name rather than per click is what keeps
 * copying the same name twice from counting twice, and a daily cap keeps a
 * keyboard full of throwaway names from buying the whole tank in an afternoon.
 *
 * A fish is remembered with what it cost and how big it was when it arrived.
 * From those, and the date, it can be worked out how far it has grown and what
 * it is worth now, so releasing a fish that has grown pays back more than one
 * that hasn't.
 *
 * Everything here is a pure function of the account, so the rules can be
 * tested without React, storage, or a clock.
 */
import { koiBuild } from '../vendor/koi-pond/model/traits';
import { KOI_FRAMEWORKS } from '../vendor/koi-pond/model/types';
import { growthOf, koiAdultCm, type FishSpecies, type Stocked } from './fish-growth';
import type { GoldfishGenome, GoldfishVarietyId } from './goldfish';
import type { GoldfishListing } from './goldfish-market';
import type { KoiGenome } from './koi-genome';
import { MAX_GOLDFISH, MAX_KOI } from './koi';
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

/** How much of a fish's worth the market pays back when it is released. */
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
  /** Goldfish bought from the counter today, which no restock touches. */
  goldfish: string[];
};

/** A fish the visitor has bought, as it was the day it arrived. */
type OwnedFish<Genome> = Stocked & {
  /** The listing it was bought from, so the same fish is never sold twice at once. */
  id: string;
  name: string;
  genome: Genome;
};

export type OwnedKoi = OwnedFish<KoiGenome>;
export type OwnedGoldfish = OwnedFish<GoldfishGenome>;

export type KoiAccount = {
  coins: number;
  /** Hashes of branch names that have already paid out, newest first. */
  rewarded: string[];
  /** The market day `earnedToday` counts. */
  earnDay: string;
  earnedToday: number;
  /** The koi in the pond, in the order they were bought. */
  owned: OwnedKoi[];
  /** The goldfish swimming with them. */
  goldfish: OwnedGoldfish[];
  /** The last market day the visitor opened the market; drives the "new stock" dot. */
  seenDay: string | null;
  /** How the account was opened, shown once and then dismissed. */
  welcome: { coins: number; branches: number } | null;
  tank: KoiTankState;
};

/** The visitor's tank for a day; yesterday's restocks and sales don't carry over. */
export const tankToday = (account: KoiAccount, day: string): KoiTankState =>
  account.tank.day === day ? account.tank : { day, restocks: 0, sold: [], goldfish: [] };

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
    goldfish: [],
    seenDay: null,
    welcome: {
      coins: WELCOME_COINS + branches.length * COINS_PER_BRANCH,
      branches: branches.length
    },
    tank: { day, restocks: 0, sold: [], goldfish: [] }
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
const blockerIn = (
  account: KoiAccount,
  fish: readonly { id: string }[],
  room: number,
  listing: { id: string; price: number }
): Exclude<PurchaseOutcome, 'bought'> | null => {
  if (fish.some((owned) => owned.id === listing.id)) {
    return 'owned';
  }

  if (fish.length >= room) {
    return 'pond-full';
  }

  return account.coins < listing.price ? 'short' : null;
};

/** Why a koi can't be bought right now, or null when it can. */
export const purchaseBlocker = (
  account: KoiAccount,
  listing: KoiListing
): Exclude<PurchaseOutcome, 'bought'> | null => blockerIn(account, account.owned, MAX_KOI, listing);

/** Why a goldfish can't be bought right now, or null when it can. */
export const goldfishBlocker = (
  account: KoiAccount,
  listing: GoldfishListing
): Exclude<PurchaseOutcome, 'bought'> | null =>
  blockerIn(account, account.goldfish, MAX_GOLDFISH, listing);

/** A listing as the pond will remember it. */
const arrival = <Genome>(
  listing: { id: string; name: string; genome: Genome } & Pick<
    Stocked,
    'price' | 'lengthCm' | 'adultCm'
  >,
  now: Date
): OwnedFish<Genome> => ({
  id: listing.id,
  name: listing.name,
  genome: listing.genome,
  price: listing.price,
  lengthCm: listing.lengthCm,
  adultCm: listing.adultCm,
  acquiredAt: now.toISOString()
});

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
      owned: [...account.owned, arrival(listing, now)],
      // Buying is as good as saying hello; the welcome has done its job.
      welcome: null
    },
    outcome: 'bought'
  };
};

export const buyGoldfish = (
  account: KoiAccount,
  listing: GoldfishListing,
  now: Date
): { account: KoiAccount; outcome: PurchaseOutcome } => {
  const blocker = goldfishBlocker(account, listing);

  if (blocker) {
    return { account, outcome: blocker };
  }

  const tank = tankToday(account, listing.day);

  return {
    account: {
      ...account,
      coins: account.coins - listing.price,
      tank: { ...tank, goldfish: [...tank.goldfish, listing.id].slice(-MAX_SOLD) },
      goldfish: [...account.goldfish, arrival(listing, now)],
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
      tank: { ...tank, restocks: tank.restocks + 1, sold: [] }
    },
    outcome: 'restocked'
  };
};

/** What the market pays back for a fish today: half of what it is worth now. */
export const refundFor = (species: FishSpecies, fish: Stocked, now: Date): number =>
  Math.floor(growthOf(species, fish, now).value * REFUND_SHARE);

export const releaseKoi = (
  account: KoiAccount,
  id: string,
  now: Date
): { account: KoiAccount; refund: number } => {
  const koi = account.owned.find((candidate) => candidate.id === id);

  if (!koi) {
    return { account, refund: 0 };
  }

  const refund = refundFor('koi', koi, now);

  return {
    account: {
      ...account,
      coins: account.coins + refund,
      owned: account.owned.filter((candidate) => candidate.id !== id)
    },
    refund
  };
};

export const releaseGoldfish = (
  account: KoiAccount,
  id: string,
  now: Date
): { account: KoiAccount; refund: number } => {
  const fish = account.goldfish.find((candidate) => candidate.id === id);

  if (!fish) {
    return { account, refund: 0 };
  }

  const refund = refundFor('goldfish', fish, now);

  return {
    account: {
      ...account,
      coins: account.coins + refund,
      goldfish: account.goldfish.filter((candidate) => candidate.id !== id)
    },
    refund
  };
};

/** The whole pond at a glance: what it is worth, what it cost, and how fast it is growing. */
export type PondWorth = { value: number; paid: number; perDay: number };

export const pondWorth = (account: KoiAccount, now: Date): PondWorth => {
  const all = [
    ...account.owned.map((fish) => growthOf('koi', fish, now)),
    ...account.goldfish.map((fish) => growthOf('goldfish', fish, now))
  ];

  return {
    value: all.reduce((total, growth) => total + growth.value, 0),
    paid: [...account.owned, ...account.goldfish].reduce((total, fish) => total + fish.price, 0),
    perDay: all.reduce((total, growth) => total + growth.valuePerDay, 0)
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

const isLength = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

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

/** A stored goldfish's genome; an unknown breed is kept, and drawn as a common goldfish. */
const parseGoldfishGenome = (value: unknown): GoldfishGenome | null =>
  isRecord(value) &&
  value.species === 'goldfish' &&
  typeof value.variety === 'string' &&
  value.variety !== '' &&
  isCount(value.seed)
    ? { species: 'goldfish', variety: value.variety as GoldfishVarietyId, seed: value.seed }
    : null;

/**
 * How long a koi bought before the market sold them by size was.
 *
 * Those koi were listed at their build's length, so they keep it: the same
 * sum the listing used then, frozen here, since the market no longer does it.
 */
const legacyKoiCm = (genome: KoiGenome): number => {
  const build =
    genome.variety === 'chagoi' ? 'react' : KOI_FRAMEWORKS[genome.seed % KOI_FRAMEWORKS.length]!;

  return Math.round(koiBuild(build, genome.seed).lengthScale * 60);
};

const parseOwnedFish = <Genome>(
  value: unknown,
  readGenome: (raw: unknown) => Genome | null,
  sizeOf: (genome: Genome) => { lengthCm: number; adultCm: number } | null
): OwnedFish<Genome> | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !isCount(value.price) ||
    typeof value.acquiredAt !== 'string'
  ) {
    return null;
  }

  const genome = readGenome(value.genome);

  if (!genome) {
    return null;
  }

  const size =
    isLength(value.lengthCm) && isLength(value.adultCm)
      ? { lengthCm: value.lengthCm, adultCm: value.adultCm }
      : sizeOf(genome);

  return size
    ? {
        id: value.id,
        name: value.name,
        genome,
        price: value.price,
        acquiredAt: value.acquiredAt,
        ...size
      }
    : null;
};

/** A koi from before sizes keeps the length it was listed at, with room still to grow. */
const legacyKoiSize = (genome: KoiGenome): { lengthCm: number; adultCm: number } => {
  const lengthCm = legacyKoiCm(genome);
  return { lengthCm, adultCm: Math.max(koiAdultCm(genome.variety, genome.seed), lengthCm * 1.1) };
};

const parseList = <Fish extends { id: string }>(
  value: unknown,
  parse: (raw: unknown) => Fish | null,
  room: number
): Fish[] =>
  (Array.isArray(value) ? value : [])
    .map(parse)
    .filter((fish): fish is Fish => fish !== null)
    .filter((fish, index, all) => all.findIndex((other) => other.id === fish.id) === index)
    .slice(0, room);

/** A tank state that can't be read is simply a fresh tank: nothing restocked, nothing sold. */
const parseTank = (value: unknown): KoiTankState => {
  const ids = (list: unknown): string[] =>
    (Array.isArray(list) ? list : [])
      .filter((id): id is string => typeof id === 'string')
      .slice(-MAX_SOLD);

  return isRecord(value) &&
    typeof value.day === 'string' &&
    isCount(value.restocks) &&
    Array.isArray(value.sold)
    ? {
        day: value.day,
        restocks: value.restocks,
        sold: ids(value.sold),
        goldfish: ids(value.goldfish)
      }
    : { day: '', restocks: 0, sold: [], goldfish: [] };
};

/**
 * Reads a stored account, or null when there is none worth keeping.
 *
 * Anything unreadable is dropped rather than failing the whole account, so a
 * damaged save still opens with whatever of it survived.
 */
export const parseAccount = (raw: string | null): KoiAccount | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed) || !isCount(parsed.coins)) {
      return null;
    }

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
      owned: parseList(
        parsed.owned,
        (value) => parseOwnedFish(value, parseGenome, legacyKoiSize),
        MAX_KOI
      ),
      // Goldfish have always been sold by size, so one without a size is damaged, not old.
      goldfish: parseList(
        parsed.goldfish,
        (value) => parseOwnedFish(value, parseGoldfishGenome, () => null),
        MAX_GOLDFISH
      ),
      seenDay: typeof parsed.seenDay === 'string' ? parsed.seenDay : null,
      welcome,
      tank: parseTank(parsed.tank)
    };
  } catch {
    return null;
  }
};
