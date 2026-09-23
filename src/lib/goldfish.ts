/**
 * The goldfish: real pond breeds, written as recipes like the koi.
 *
 * A goldfish is drawn with the vendored koi's own body, because the two are
 * close cousins. Both are carp, and a goldfish is shaped like a small koi
 * with bigger eyes, a larger tail and no barbels. So each breed below is a
 * look, in the same body coordinates the koi varieties use, plus the tail
 * that tells the breeds apart from above.
 *
 * Only pond breeds are sold. Fancy goldfish (orandas, ranchu, bubble eyes) are
 * too slow and delicate to share water with koi, and keepers don't try. The
 * fantail is the one exception, and it is sold as one.
 */
import type { KoiCaudalShape, KoiPhysical } from '../vendor/koi-pond/koi3d/config';
import { DEFAULT_PHYSICAL } from '../vendor/koi-pond/koi3d/config';
import type { KoiFramework, KoiPhenotype } from '../vendor/koi-pond/model/types';
import type { FishLookRecipe, MarkingBand, Tone } from './koi-varieties';

export type GoldfishVarietyId =
  | 'common'
  | 'comet'
  | 'sarasa'
  | 'shubunkin'
  | 'bristol-shubunkin'
  | 'wakin'
  | 'tamasaba'
  | 'fantail';

/** What tells the breeds apart from above: the tail. */
export type GoldfishTail = 'short' | 'comet' | 'broad' | 'twin';

export type GoldfishVariety = FishLookRecipe & {
  id: GoldfishVarietyId;
  name: string;
  /** The Japanese name, for the breeds Japan gave us. */
  kanji?: string;
  /** Where and when the breed was fixed, where that is known. */
  origin?: string;
  blurb: string;
  tail: GoldfishTail;
  /** The body archetype: slender for a comet, round for a fantail. */
  build: KoiFramework;
  /** How much broader and deeper than the build the body is. */
  body?: { width?: number; height?: number; belly?: number };
  /** How briskly it swims against an ordinary goldfish; the quick ones are first to food. */
  pace?: number;
  /** The band a grown fish's length falls in, in centimetres. */
  adult: readonly [number, number];
  /** What a fish of the breed asks at the market's usual size. */
  price: number;
};

/** A goldfish is its breed and a seed; there are no traits to be born with. */
export type GoldfishGenome = {
  species: 'goldfish';
  variety: GoldfishVarietyId;
  seed: number;
};

/** The size the market's price list is written for, in centimetres. */
export const GOLDFISH_LIST_CM = 9;

const GOLD: Tone = ['#f26b1d', '#dc4c19'];
const RED: Tone = ['#e2381d', '#c42619'];
const WHITE: Tone = ['#f7f3ea', '#eee6d8'];
const CALICO_BLUE: Tone = ['#8ba5c7', '#6c87af'];
const CALICO_RED: Tone = ['#e46a2e', '#cf4a22'];
const CALICO_BLACK: Tone = ['#1e1f26', '#2c2e36'];

/** Red saddles on white, the way a sarasa or a tamasaba wears them. */
const SADDLES: MarkingBand = {
  layer: 0,
  count: [2, 4],
  station: [0.06, 0.7],
  girth: 0.13,
  length: [0.06, 0.12],
  wrap: 2.3,
  softness: 0.07,
  warp: 0.45
};

/** White breaking through a red goldfish, from a splash to a saddle. */
const WHITE_BREAKS: MarkingBand = {
  layer: 0,
  count: [1, 3],
  station: [0.12, 0.72],
  girth: 0.16,
  length: [0.04, 0.09],
  wrap: 2,
  softness: 0.07,
  warp: 0.5
};

/** A calico's patches of red and orange, softer-edged than a koi's. */
const CALICO_PATCHES: MarkingBand = {
  layer: 0,
  count: [2, 3],
  station: [0.08, 0.7],
  girth: 0.18,
  length: [0.05, 0.1],
  wrap: 2,
  softness: 0.09,
  warp: 0.55
};

/** A calico's black: small speckles all over, nose to tail. */
const CALICO_SPECKLES: MarkingBand = {
  layer: 1,
  count: [6, 8],
  station: [0.05, 0.78],
  girth: 0.22,
  length: [0.012, 0.03],
  wrap: 1.3,
  softness: 0.05,
  warp: 0.3
};

/** The shine every metallic goldfish has; calico scales are half metallic, half clear. */
const METALLIC = { netting: 0.3, metallic: 0.55, gloss: 0.62, scales: 0.4 } as const;
const NACREOUS = { netting: 0.08, metallic: 0.16, gloss: 0.55, scales: 0.18 } as const;

export const GOLDFISH: readonly GoldfishVariety[] = [
  {
    id: 'common',
    name: 'Common Goldfish',
    origin: 'China, over a thousand years ago',
    blurb:
      'The original: one bright metallic orange, and as hardy as a pond fish gets. Every fancy goldfish descends from it.',
    tail: 'short',
    build: 'svelte',
    base: GOLD,
    belly: '#f6b47c',
    markings: [],
    ...METALLIC,
    finOpacity: 0.62,
    adult: [24, 30],
    price: 5,
    flat: 'kohaku'
  },
  {
    id: 'comet',
    name: 'Comet',
    origin: 'United States, 1880s',
    blurb:
      'Slim and quick, with a long, deeply forked tail. Bred in America in the 1880s, and the fastest fish in most ponds.',
    tail: 'comet',
    build: 'vanilla',
    pace: 1.2,
    base: ['#ef4f1b', '#f7922b'],
    belly: '#f7c08e',
    markings: [],
    ...METALLIC,
    finOpacity: 0.58,
    adult: [24, 32],
    price: 8,
    flat: 'kohaku'
  },
  {
    id: 'sarasa',
    name: 'Sarasa Comet',
    kanji: '更紗',
    blurb:
      'A comet dressed like a kohaku: red saddles on white, trailing the long forked tail. Sarasa is Japanese for printed chintz.',
    tail: 'comet',
    build: 'vanilla',
    pace: 1.2,
    base: WHITE,
    primary: RED,
    fin: '#f4e9de',
    markings: [SADDLES],
    ...METALLIC,
    metallic: 0.4,
    finOpacity: 0.55,
    adult: [24, 32],
    price: 12,
    flat: 'kohaku'
  },
  {
    id: 'shubunkin',
    name: 'Shubunkin',
    kanji: '朱文錦',
    origin: 'Japan, around 1900',
    blurb:
      'Calico: sky-blue skin speckled with black and splashed with red, under nacreous scales that are half shine, half glass.',
    tail: 'short',
    build: 'preact',
    base: CALICO_BLUE,
    primary: CALICO_RED,
    secondary: CALICO_BLACK,
    belly: '#c9d6e4',
    fin: '#9fb3cf',
    markings: [CALICO_PATCHES, CALICO_SPECKLES],
    ...NACREOUS,
    finOpacity: 0.6,
    adult: [20, 26],
    price: 12,
    flat: 'sanke'
  },
  {
    id: 'bristol-shubunkin',
    name: 'Bristol Shubunkin',
    origin: 'Bristol, England, 1930s',
    blurb:
      'A shubunkin bred in Bristol to show off one thing: a huge, rounded tail in the shape of a heart.',
    tail: 'broad',
    build: 'preact',
    base: ['#7f9dc6', '#5f7eab'],
    primary: CALICO_RED,
    secondary: CALICO_BLACK,
    belly: '#c9d6e4',
    fin: '#93a9c9',
    markings: [CALICO_PATCHES, CALICO_SPECKLES],
    ...NACREOUS,
    finOpacity: 0.58,
    adult: [20, 26],
    price: 20,
    flat: 'sanke'
  },
  {
    id: 'wakin',
    name: 'Wakin',
    kanji: '和金',
    origin: 'Japan, since the 1500s',
    blurb:
      'Japan’s oldest goldfish: a common goldfish’s long body with a twin tail. Hardy, big, and usually red and white.',
    tail: 'twin',
    build: 'solid',
    base: RED,
    primary: WHITE,
    belly: '#f2b49a',
    markings: [WHITE_BREAKS],
    ...METALLIC,
    finOpacity: 0.6,
    adult: [26, 34],
    price: 15,
    flat: 'kohaku'
  },
  {
    id: 'tamasaba',
    name: 'Tamasaba',
    kanji: '玉鯖',
    origin: 'Yamagata, Japan',
    blurb:
      'A round-bodied goldfish with one long tail like a mackerel’s (saba), bred in snowy Yamagata to winter under ice.',
    tail: 'comet',
    build: 'vue',
    body: { width: 1.1, belly: 0.62 },
    pace: 0.9,
    base: WHITE,
    primary: RED,
    fin: '#f4e6da',
    markings: [{ ...SADDLES, count: [2, 3], length: [0.08, 0.14] }],
    ...METALLIC,
    metallic: 0.4,
    finOpacity: 0.55,
    adult: [20, 26],
    price: 25,
    flat: 'kohaku'
  },
  {
    id: 'fantail',
    name: 'Fantail',
    origin: 'China',
    blurb:
      'The one fancy goldfish hardy enough for a pond: an egg-shaped body and a split, flowing tail. It’s slow, so it’s last to the food.',
    tail: 'twin',
    build: 'react',
    body: { width: 1.22, height: 1.15, belly: 0.78 },
    pace: 0.6,
    base: ['#f5751f', '#e85a1a'],
    primary: WHITE,
    belly: '#f7c492',
    markings: [{ ...WHITE_BREAKS, count: [0, 2] }],
    ...METALLIC,
    finOpacity: 0.55,
    adult: [15, 20],
    price: 18,
    flat: 'kohaku'
  }
];

let byId: Map<string, GoldfishVariety> | undefined;

/** Looks a breed up by id; unknown ids (from a future or corrupt save) return undefined. */
export const findGoldfish = (id: string): GoldfishVariety | undefined =>
  (byId ??= new Map(GOLDFISH.map((variety) => [variety.id, variety]))).get(id);

/** A genome's breed, falling back to the common goldfish for anything unknown. */
export const goldfishOf = (genome: GoldfishGenome): GoldfishVariety =>
  findGoldfish(genome.variety) ?? GOLDFISH[0]!;

/** Whether a genome is a goldfish's rather than a koi's. */
export const isGoldfish = (genome: { seed: number; species?: string }): genome is GoldfishGenome =>
  genome.species === 'goldfish';

/**
 * Each tail, from above.
 *
 * A comet's lobes trail far behind and fork deep; a Bristol's are broad and
 * rounded; a twin tail is two tails side by side, which from overhead is a
 * fan spread wide across the water.
 */
const TAILS: Readonly<Record<GoldfishTail, { caudal: Partial<KoiCaudalShape>; fins: number }>> = {
  short: { caudal: { span: 0.42, fork: 0.3, sweep: 0.25, spread: 0.24 }, fins: 1.1 },
  comet: { caudal: { span: 0.58, fork: 0.74, sweep: 0.46, spread: 0.26 }, fins: 1.3 },
  broad: { caudal: { span: 0.64, fork: 0.16, sweep: 0.36, spread: 0.34 }, fins: 1.35 },
  twin: { caudal: { span: 0.5, fork: 0.55, sweep: 0.36, spread: 0.56 }, fins: 1.3 }
};

type FinName = 'pectoral' | 'dorsal' | 'pelvic' | 'anal';

/**
 * Turns the koi body a build chose into a goldfish of this breed: a shorter,
 * blunter head, bigger eyes, longer fins and the breed's own tail.
 */
export const goldfishPhysique = (
  variety: GoldfishVariety,
  phenotype: KoiPhenotype
): KoiPhenotype => {
  const tail = TAILS[variety.tail];
  const fin = (name: FinName): Partial<KoiPhysical[FinName]> => ({
    ...phenotype[name],
    span: (phenotype[name]?.span ?? DEFAULT_PHYSICAL[name].span) * tail.fins
  });

  return {
    ...phenotype,
    width: (phenotype.width ?? 1) * (variety.body?.width ?? 1),
    height: (phenotype.height ?? 1) * (variety.body?.height ?? 1),
    belly: variety.body?.belly ?? phenotype.belly,
    head: { ...phenotype.head, length: 0.235, snout: 0.92, forehead: 0.5 },
    eyes: { ...phenotype.eyes, size: 0.027, protrusion: 0.5 },
    caudal: { ...phenotype.caudal, ...tail.caudal },
    pectoral: fin('pectoral'),
    dorsal: fin('dorsal'),
    pelvic: fin('pelvic'),
    anal: fin('anal')
  };
};

/** Names a goldfish can arrive with: cheerful ones, since goldfish are. */
export const GOLDFISH_NAMES: readonly string[] = [
  'Goldie',
  'Nugget',
  'Biscuit',
  'Pumpkin',
  'Marmalade',
  'Clementine',
  'Tangerine',
  'Satsuma',
  'Kumquat',
  'Paprika',
  'Saffron',
  'Ginger',
  'Copper',
  'Penny',
  'Sunny',
  'Mango',
  'Peaches',
  'Apricot',
  'Butterscotch',
  'Toffee',
  'Custard',
  'Crumpet',
  'Waffle',
  'Pickle',
  'Noodle',
  'Jellybean',
  'Sprinkles',
  'Pip',
  'Dotty',
  'Bubbles',
  'Fizz',
  'Sparky',
  'Ember',
  'Flicker',
  'Zippy',
  'Dash',
  'Poppy',
  'Marigold',
  'Buttercup',
  'Honey',
  'Amber',
  'Rusty',
  'Tango',
  'Salsa'
];
