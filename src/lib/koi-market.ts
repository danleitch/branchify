/**
 * The koi market: a fresh tank of fish every day.
 *
 * Every visitor starts the day with the same six fish: the tank is seeded by
 * the calendar date and nothing else, so there is no server to agree with and
 * none is needed. From there the tank is the visitor's own. Buying a fish
 * brings a new one into its place, and a paid restock swaps all six for a
 * fresh tank. Both are replayed from the account rather than stored, so the
 * same purchases always rebuild the same tank.
 *
 * Each listing is a whole genome, so the fish in the photograph is exactly the
 * fish that swims in the pond once it is bought.
 */
import { koiRarity, koiTitle, rollModifiers, varietyOf, type KoiGenome } from './koi-genome';
import {
  MODIFIER_INFO,
  RARITIES,
  VARIETIES,
  type KoiRarity,
  type KoiVariety
} from './koi-varieties';
import { createRandom, hashString, pickWith } from './seeded-random';

// The calendar lives on its own so the header can use it without the catalogue.
export { formatCountdown, marketDay, msUntilRestock } from './koi-market-clock';

/** How many koi the tank holds; a bought fish is always replaced. */
export const DAILY_STOCK = 6;

/** One fish in the tank. */
export type KoiListing = {
  /**
   * `YYYY-MM-DD#restock.slot.generation`: the day's tank, how many times it had
   * been restocked, the place in it, and how many fish had been bought from
   * that place before this one arrived. Unique across every tank ever stocked.
   */
  id: string;
  /** The market day it was stocked on. */
  day: string;
  /** Which of the tank's six places it swims in; a replacement takes the same place. */
  slot: number;
  /** The name the fish arrives with. */
  name: string;
  genome: KoiGenome;
  /** The asking price, in coins. */
  price: number;
};

/** How likely each rarity is to fill a slot, out of the total. */
const RARITY_WEIGHTS: Readonly<Record<KoiRarity, number>> = {
  common: 50,
  uncommon: 30,
  rare: 15,
  legendary: 5
};

/** What a fish of each rarity asks, before its traits multiply it. */
const PRICE_BANDS: Readonly<Record<KoiRarity, readonly [number, number]>> = {
  common: [60, 100],
  uncommon: [140, 200],
  rare: [260, 360],
  legendary: [600, 800]
};

/** Band offset for a replacement's own draws, so they never shadow its genome's. */
const REPLACEMENT_DRAWS = 0x2f6b;

/** Names a koi can arrive with, and what they mean. */
export const KOI_NAMES: readonly (readonly [string, string])[] = [
  ['Hana', 'flower'],
  ['Sora', 'sky'],
  ['Yuki', 'snow'],
  ['Kumo', 'cloud'],
  ['Hoshi', 'star'],
  ['Tsuki', 'moon'],
  ['Kaze', 'wind'],
  ['Nami', 'wave'],
  ['Ren', 'lotus'],
  ['Haru', 'spring'],
  ['Natsu', 'summer'],
  ['Aki', 'autumn'],
  ['Fuyu', 'winter'],
  ['Momo', 'peach'],
  ['Ume', 'plum blossom'],
  ['Sakura', 'cherry blossom'],
  ['Kiku', 'chrysanthemum'],
  ['Botan', 'peony'],
  ['Taki', 'waterfall'],
  ['Kawa', 'river'],
  ['Mizu', 'water'],
  ['Ishi', 'stone'],
  ['Kage', 'shadow'],
  ['Hikari', 'light'],
  ['Hotaru', 'firefly'],
  ['Take', 'bamboo'],
  ['Matsu', 'pine'],
  ['Kaede', 'maple'],
  ['Akane', 'madder red'],
  ['Beni', 'crimson'],
  ['Kin', 'gold'],
  ['Gin', 'silver'],
  ['Sumi', 'ink'],
  ['Kohana', 'little flower'],
  ['Mochi', 'rice cake'],
  ['Daifuku', 'great luck'],
  ['Tora', 'tiger'],
  ['Ryu', 'dragon'],
  ['Kame', 'turtle'],
  ['Tanuki', 'raccoon dog'],
  ['Suzu', 'bell'],
  ['Kasumi', 'mist'],
  ['Shizuku', 'droplet'],
  ['Asahi', 'morning sun'],
  ['Yoru', 'night'],
  ['Niji', 'rainbow'],
  ['Kiri', 'fog'],
  ['Arashi', 'storm']
];

const rollRarity = (draw: number): KoiRarity => {
  const total = RARITIES.reduce((sum, rarity) => sum + RARITY_WEIGHTS[rarity], 0);
  let remaining = draw * total;

  for (const rarity of RARITIES) {
    remaining -= RARITY_WEIGHTS[rarity];

    if (remaining < 0) {
      return rarity;
    }
  }

  return 'common';
};

/** A self-coloured fish: one colour nose to tail, like a benigoi or an ogon. */
export const isSelfColoured = (variety: KoiVariety): boolean => variety.markings.length === 0;

/** Rounds to the nearest five coins, the way a price tag would. */
const roundPrice = (value: number): number => Math.max(5, Math.round(value / 5) * 5);

/** What a fish asks: its variety's band, multiplied up by any traits it carries. */
export const priceFor = (genome: KoiGenome, variety: KoiVariety, draw: number): number => {
  const [low, high] = PRICE_BANDS[variety.rarity];
  const traits = genome.modifiers.reduce(
    (multiplier, modifier) => multiplier * MODIFIER_INFO[modifier].price,
    1
  );

  return roundPrice((low + draw * (high - low)) * traits);
};

/**
 * Picks a fresh tank's varieties: rarities by weight, no variety twice.
 *
 * Every tank then gets at least one self-coloured fish and at least one
 * patterned one, so a visitor looking for a plain orange or red koi — or a
 * classic kohaku — is never shown a tank without one.
 */
const chooseVarieties = (random: () => number): KoiVariety[] => {
  const chosen: KoiVariety[] = [];

  for (let slot = 0; slot < DAILY_STOCK; slot += 1) {
    const rarity = rollRarity(random());
    const pool = VARIETIES.filter(
      (variety) => variety.rarity === rarity && !chosen.includes(variety)
    );
    const fallback = VARIETIES.filter((variety) => !chosen.includes(variety));
    chosen.push(pickWith(pool.length > 0 ? pool : fallback, random()));
  }

  const ensure = (wanted: (variety: KoiVariety) => boolean, replaceAt: number): void => {
    const draw = random();

    if (chosen.some(wanted)) {
      return;
    }

    const candidates = VARIETIES.filter(
      (variety) => wanted(variety) && variety.rarity === 'common' && !chosen.includes(variety)
    );
    chosen[replaceAt] = pickWith(candidates, draw);
  };

  // The replaced slots are the last two, which the ranking below reorders anyway.
  ensure(isSelfColoured, DAILY_STOCK - 1);
  ensure((variety) => !isSelfColoured(variety), DAILY_STOCK - 2);

  return chosen;
};

/** Ranks rarest first, then dearest, so the tank leads with its best fish. */
const byPrestige = (a: KoiListing, b: KoiListing): number =>
  RARITIES.indexOf(koiRarity(b.genome)) - RARITIES.indexOf(koiRarity(a.genome)) ||
  b.price - a.price;

const listingId = (day: string, restocks: number, slot: number, generation: number): string =>
  `${day}#${restocks}.${slot}.${generation}`;

/** Dresses one fish of a variety from its own seed: traits, then price. */
const stockFish = (
  variety: KoiVariety,
  seed: number,
  place: Pick<KoiListing, 'id' | 'day' | 'slot' | 'name'>
): KoiListing => {
  const fish = createRandom(seed);
  const genome: KoiGenome = { variety: variety.id, modifiers: rollModifiers(variety, fish), seed };

  return { ...place, genome, price: priceFor(genome, variety, fish()) };
};

/** A fresh six, ranked rarest first, each given the place it will keep. */
const freshTank = (day: string, restocks: number): KoiListing[] => {
  const random = createRandom(hashString(`branchify-koi-market:${day}:${restocks}`));
  const varieties = chooseVarieties(random);
  const unnamed = [...KOI_NAMES];

  return varieties
    .map((variety, index) =>
      stockFish(variety, hashString(`${day}#${restocks}#${index}`), {
        id: '',
        day,
        slot: 0,
        name: unnamed.splice(Math.floor(random() * unnamed.length), 1)[0]![0]
      })
    )
    .sort(byPrestige)
    .map((listing, slot) => ({ ...listing, slot, id: listingId(day, restocks, slot, 0) }));
};

/**
 * The fish that takes a bought one's place.
 *
 * Drawn by rarity like any other, from a seed of its own, but never a variety
 * already on show, never a name already swimming, and always keeping at least
 * one self-coloured and one patterned fish in the tank.
 */
const replacementFor = (
  tank: readonly KoiListing[],
  restocks: number,
  slot: number,
  generation: number
): KoiListing => {
  const day = tank[slot]!.day;
  const id = listingId(day, restocks, slot, generation);
  const seed = hashString(id);
  const random = createRandom(seed ^ REPLACEMENT_DRAWS);
  const others = tank.filter((listing) => listing.slot !== slot);
  const shown = others.map((listing) => varietyOf(listing.genome));
  const rarity = rollRarity(random());
  const wanted = !shown.some(isSelfColoured)
    ? isSelfColoured
    : shown.every(isSelfColoured)
      ? (variety: KoiVariety): boolean => !isSelfColoured(variety)
      : (): boolean => true;
  const open = VARIETIES.filter((variety) => wanted(variety) && !shown.includes(variety));
  const pool = open.filter((variety) => variety.rarity === rarity);
  const variety = pickWith(pool.length > 0 ? pool : open, random());
  const taken = others.map((listing) => listing.name);
  const [name] = pickWith(
    KOI_NAMES.filter(([candidate]) => !taken.includes(candidate)),
    random()
  );

  return stockFish(variety, seed, { id, day, slot, name });
};

/**
 * The tank as one visitor sees it.
 *
 * Everyone starts the day with the same six. Each paid restock swaps in a
 * fresh six, and every fish bought is replaced where it swam. Purchases are
 * replayed in the order they were made, so the same purchases always rebuild
 * the same tank, and a fish on show never changes under the visitor's eyes.
 *
 * @param sold - Listings bought from this tank, oldest first; anything not in
 * it (another day's, or another restock's) is ignored.
 */
export const koiTank = (day: string, restocks = 0, sold: readonly string[] = []): KoiListing[] => {
  const tank = freshTank(day, restocks);
  const generations = tank.map(() => 0);

  for (const id of sold) {
    const slot = tank.findIndex((listing) => listing.id === id);

    if (slot !== -1) {
      generations[slot] = generations[slot]! + 1;
      tank[slot] = replacementFor(tank, restocks, slot, generations[slot]!);
    }
  }

  return tank;
};

/** What a name means, when it is one the market gives. */
export const nameMeaning = (name: string): string | null =>
  KOI_NAMES.find(([candidate]) => candidate === name)?.[1] ?? null;

/** "Hana, a Gin Rin Kohaku" or "Suzu, an Orenji Ogon": the whole fish in one breath. */
export const describeListing = (listing: Pick<KoiListing, 'name' | 'genome'>): string => {
  const title = koiTitle(listing.genome);
  return `${listing.name}, ${/^[aeiou]/i.test(title) ? 'an' : 'a'} ${title}`;
};
