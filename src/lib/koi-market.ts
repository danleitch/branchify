/**
 * The koi market: a fresh tank of fish every day.
 *
 * The stock is seeded by the calendar date and nothing else, so every visitor
 * sees the same six fish on the same day — there is no server to agree with,
 * and none is needed. Tomorrow's tank is a different six; today's never
 * changes, however often the page reloads.
 *
 * Each listing is a whole genome, so the fish in the photograph is exactly the
 * fish that swims in the pond once it is bought.
 */
import { koiRarity, koiTitle, rollModifiers, type KoiGenome } from './koi-genome';
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

/** How many koi the market lists each day. */
export const DAILY_STOCK = 6;

/** One fish in today's tank. */
export type KoiListing = {
  /** `YYYY-MM-DD#slot`: unique across every day the market has ever stocked. */
  id: string;
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
 * Picks the day's varieties: rarities by weight, no variety twice.
 *
 * Every tank then gets at least one self-coloured fish and at least one
 * patterned one, so a visitor looking for a plain orange or red koi — or a
 * classic kohaku — is never shown a day without one.
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

/** The six koi for sale on a market day; the same day always stocks the same fish. */
export const dailyStock = (day: string): KoiListing[] => {
  const random = createRandom(hashString(`branchify-koi-market:${day}`));
  const varieties = chooseVarieties(random);
  const unnamed = [...KOI_NAMES];

  return varieties
    .map((variety, slot): KoiListing => {
      const seed = hashString(`${day}#${slot}`);
      const fish = createRandom(seed);
      const genome: KoiGenome = {
        variety: variety.id,
        modifiers: rollModifiers(variety, fish),
        seed
      };
      const name = unnamed.splice(Math.floor(random() * unnamed.length), 1)[0]![0];

      return { id: `${day}#${slot}`, name, genome, price: priceFor(genome, variety, fish()) };
    })
    .sort(byPrestige);
};

/** What a name means, when it is one the market gives. */
export const nameMeaning = (name: string): string | null =>
  KOI_NAMES.find(([candidate]) => candidate === name)?.[1] ?? null;

/** "Hana, a Gin Rin Kohaku" or "Suzu, an Orenji Ogon": the whole fish in one breath. */
export const describeListing = (listing: Pick<KoiListing, 'name' | 'genome'>): string => {
  const title = koiTitle(listing.genome);
  return `${listing.name}, ${/^[aeiou]/i.test(title) ? 'an' : 'a'} ${title}`;
};
