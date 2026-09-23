/**
 * The goldfish counter: every pond breed, always in stock.
 *
 * Goldfish are the market's cheap and cheerful corner. There is no daily six
 * and no restock: every breed is on the counter all day, one fish of each at a
 * time. Like the koi, the fish on show is a whole genome, so the fish in the
 * photograph is the one that swims home, and buying it brings the next fish of
 * its breed up to the glass. Sales are replayed from the account the same way
 * the koi tank's are, so the counter needs nothing stored of its own.
 */
import {
  GOLDFISH,
  GOLDFISH_LIST_CM,
  GOLDFISH_NAMES,
  type GoldfishGenome,
  type GoldfishVariety
} from './goldfish';
import { createRandom, hashString } from './seeded-random';

export type GoldfishListing = {
  /**
   * `YYYY-MM-DD~breed.generation`: the day, the breed, and how many of that
   * breed had been bought that day before this fish came up.
   */
  id: string;
  day: string;
  name: string;
  genome: GoldfishGenome;
  /** How long it is today, nose to tail, in centimetres. */
  lengthCm: number;
  /** How long it will grow. */
  adultCm: number;
  price: number;
};

/** The sizes goldfish are sold at: pond size, big enough to hold their own among koi. */
const SALE_CM: readonly [number, number] = [7.5, 11];

const tenths = (value: number): number => Math.round(value * 10) / 10;

const listingId = (day: string, breed: string, generation: number): string =>
  `${day}~${breed}.${generation}`;

/**
 * A name from a draw, skipping on to the next free one when it is taken.
 *
 * Stepping on, rather than drawing from whatever names are left, means one
 * fish taking a name only moves another fish off it if they actually clash:
 * buying a comet never renames the wakin beside it.
 */
const nameFor = (draw: number, taken: ReadonlySet<string>): string => {
  const start = Math.floor(draw * GOLDFISH_NAMES.length);

  for (let step = 0; step < GOLDFISH_NAMES.length; step += 1) {
    const name = GOLDFISH_NAMES[(start + step) % GOLDFISH_NAMES.length]!;

    if (!taken.has(name)) {
      return name;
    }
  }

  return GOLDFISH_NAMES[start]!;
};

/** The next fish of a breed: its size, its adult size and its name, all from its seed. */
const stockGoldfish = (
  variety: GoldfishVariety,
  day: string,
  generation: number,
  taken: ReadonlySet<string>
): GoldfishListing => {
  const id = listingId(day, variety.id, generation);
  const seed = hashString(`goldfish:${id}`);
  const random = createRandom(seed);
  const lengthCm = tenths(SALE_CM[0] + random() * (SALE_CM[1] - SALE_CM[0]));
  const [small, large] = variety.adult;
  const adultCm = tenths(small + random() * (large - small));

  return {
    id,
    day,
    name: nameFor(random(), taken),
    genome: { species: 'goldfish', variety: variety.id, seed },
    lengthCm,
    adultCm,
    // Priced by size like a koi, but in single coins: these are pocket money.
    price: Math.max(2, Math.round(variety.price * (lengthCm / GOLDFISH_LIST_CM) ** 2))
  };
};

/**
 * The counter as one visitor sees it: one fish of every breed, cheapest breed
 * first.
 *
 * @param sold - Goldfish bought today, oldest first; each has been replaced by
 * the next of its breed.
 * @param avoid - Names already swimming in the visitor's pond, so a new
 * goldfish never arrives sharing one.
 */
export const goldfishCounter = (
  day: string,
  sold: readonly string[] = [],
  avoid: readonly string[] = []
): GoldfishListing[] => {
  const taken = new Set(avoid);

  return [...GOLDFISH]
    .sort((a, b) => a.price - b.price)
    .map((variety) => {
      const prefix = `${day}~${variety.id}.`;
      const generation = sold.filter((id) => id.startsWith(prefix)).length;
      const listing = stockGoldfish(variety, day, generation, taken);
      taken.add(listing.name);

      return listing;
    });
};
