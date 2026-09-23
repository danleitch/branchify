/**
 * The market's catalogue: real nishikigoi varieties, written as recipes.
 *
 * A variety is not a colour scheme, it is a set of rules about where colour
 * may sit. A kohaku's hi lies over the back and stops at the belly; a sanke's
 * sumi stays above the lateral line and never touches the head; a tancho wears
 * one round crown and nothing else; an utsuri's sumi wraps the body and splits
 * the face. Each recipe below is those rules, expressed as bands of patches in
 * the koi's own body coordinates — the same coordinates the vendored skin
 * shader paints in — so the pattern sits where the variety says it should.
 *
 * Colours are given as a pair where real fish of the variety vary, and each
 * individual is drawn somewhere between the two: no two kohaku share exactly
 * the same red, just as no two in a real pond do.
 */
import type { KoiFramework } from '../vendor/koi-pond/model/types';
import type { KoiModifier } from './koi-modifiers';
import type { KoiPatternName as FlatPattern } from './koi-pattern';

// The traits live on their own so the header can read an account without the
// catalogue; they are re-exported here for everything that has both.
export { MODIFIERS, MODIFIER_INFO } from './koi-modifiers';
export type { KoiModifier, KoiModifierInfo } from './koi-modifiers';

export type KoiRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Every rarity, least to most precious; the order is used for ranking. */
export const RARITIES: readonly KoiRarity[] = ['common', 'uncommon', 'rare', 'legendary'];

export const RARITY_LABELS: Readonly<Record<KoiRarity, string>> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary'
};

/** How a variety reads at a glance, used to keep every day's stock varied. */
export type KoiFamily = 'solid' | 'patterned' | 'metallic' | 'scaleless';

/** The families koi shows sort varieties into, which the guide follows. */
export type KoiGroup = 'gosanke' | 'utsuri' | 'bekko' | 'asagi' | 'hikari' | 'kawarimono';

export type KoiGroupInfo = { id: KoiGroup; name: string; kanji: string; blurb: string };

/** In the order a show catalogue runs: the big three first, the unusual ones last. */
export const KOI_GROUPS: readonly KoiGroupInfo[] = [
  {
    id: 'gosanke',
    name: 'Gosanke',
    kanji: '御三家',
    blurb:
      'The big three: Kohaku, Sanke and Showa, the varieties most shows are won with. The Tancho, a kohaku with nothing but its crown, is judged in a class of its own.'
  },
  {
    id: 'utsuri',
    name: 'Utsurimono',
    kanji: '写り物',
    blurb: 'The reflections: black koi with a single colour showing through, white, red or yellow.'
  },
  {
    id: 'bekko',
    name: 'Bekko',
    kanji: '別甲',
    blurb: 'The tortoiseshells: one ground colour with small sumi stepping stones down the back.'
  },
  {
    id: 'asagi',
    name: 'Asagi & Shusui',
    kanji: '浅葱・秋翠',
    blurb:
      'The blue ones: the old netted Asagi, and the Shusui, its scaleless descendant, bred in 1910 by crossing Asagi with German mirror carp.'
  },
  {
    id: 'hikari',
    name: 'Hikarimono',
    kanji: '光り物',
    blurb:
      'The shining ones: every metallic koi, from the single-coloured Ogon to the patterned Kujaku and Hariwake.'
  },
  {
    id: 'kawarimono',
    name: 'Kawarimono',
    kanji: '変わり物',
    blurb:
      'The unusual ones: everything else, from the friendly Chagoi to the Kumonryu, whose swirls shift with the seasons.'
  }
];

/** A colour, or the band an individual fish's colour is drawn from. */
export type Tone = string | readonly [string, string];

/** One band of markings, in the vendored pattern generator's own terms. */
export type MarkingBand = {
  /** 0 paints in the primary colour, 1 in the secondary. */
  layer: 0 | 1;
  /** How many patches, or the band a fish's count is drawn from. */
  count: number | readonly [number, number];
  /** Stations the patches fall between; 0 is the snout, 0.8 the tail's root. */
  station: readonly [number, number];
  /** How far the centres wander around the body, in turns. */
  girth: number;
  /**
   * Where the band is centred around the body, in turns off the dorsal
   * midline. Mirrored bands paint the same patch on both flanks, which is how
   * an asagi's red rises up both sides at once.
   */
  centre?: number;
  mirror?: boolean;
  /** The band of lengths patches take, as a fraction of the body. */
  length: readonly [number, number];
  /** How far around the body a patch reaches, as a multiple of its length. */
  wrap: number;
  /** How soft the edges are; a nishikigoi's are razor-thin. */
  softness: number;
  /** How much noise breaks up the outline. */
  warp: number;
  /** How far a patch may turn off the body's axis, in radians either way. */
  turn?: number;
};

export type KoiVarietyId =
  | 'kohaku'
  | 'benigoi'
  | 'orenji-ogon'
  | 'yamabuki-ogon'
  | 'chagoi'
  | 'soragoi'
  | 'shiro-bekko'
  | 'taisho-sanke'
  | 'showa'
  | 'asagi'
  | 'kigoi'
  | 'platinum-ogon'
  | 'hi-utsuri'
  | 'aka-matsuba'
  | 'karasugoi'
  | 'tancho'
  | 'shiro-utsuri'
  | 'ki-utsuri'
  | 'shusui'
  | 'goshiki'
  | 'kujaku'
  | 'hariwake'
  | 'ochiba'
  | 'kumonryu'
  | 'beni-kumonryu'
  | 'kin-kikokuryu'
  | 'midorigoi';

export type KoiVariety = {
  id: KoiVarietyId;
  name: string;
  kanji: string;
  /** What the name means in English, for the guide. */
  meaning: string;
  blurb: string;
  rarity: KoiRarity;
  family: KoiFamily;
  /** The show family it belongs to. */
  group: KoiGroup;
  /** The ground the markings are written on. */
  base: Tone;
  /** The layer-0 marking colour; a solid fish simply has no layer-0 bands. */
  primary?: Tone;
  /** The layer-1 marking colour. */
  secondary?: Tone;
  /** The underside; defaults to the ground washed toward cream. */
  belly?: Tone;
  /** The colour bled into the fin roots; defaults to the ground. */
  fin?: Tone;
  markings: readonly MarkingBand[];
  /** How strongly each scale's edge is picked out, 0 to 1. */
  netting: number;
  /** How metallic the ground reads, 0 to 1. */
  metallic: number;
  /** Scale relief against the vendored default of 0.45; doitsu skin is nearly smooth. */
  scales?: number;
  gloss?: number;
  roughness?: number;
  /** How opaque the fins are, where a variety's are thinner than a koi's usual 0.8. */
  finOpacity?: number;
  /** Born doitsu: no scales to sparkle and none to strip. */
  scaleless?: boolean;
  /** The body archetype, where the variety is known for one. */
  build?: KoiFramework;
  /** The 2D pond's nearest pattern, for visitors without WebGL. */
  flat: FlatPattern;
};

/** The part of a variety that says how a fish of it looks, which the goldfish share. */
export type FishLookRecipe = Pick<
  KoiVariety,
  | 'base'
  | 'primary'
  | 'secondary'
  | 'belly'
  | 'fin'
  | 'markings'
  | 'netting'
  | 'metallic'
  | 'scales'
  | 'gloss'
  | 'roughness'
  | 'finOpacity'
  | 'flat'
>;

/** The bright white ground the go-sanke are written on. */
const WHITE: Tone = ['#f8f4ec', '#efe9dd'];

/** Kohaku hi, from warm orange-red to deep crimson. */
const HI: Tone = ['#e3552e', '#c3281d'];

/** Sumi, the lacquer black. */
const SUMI: Tone = ['#1d1917', '#2b2522'];

/** A kohaku's hi: saddles over the back, stopping short of the belly. */
const KOHAKU_HI: MarkingBand = {
  layer: 0,
  count: [3, 4],
  station: [0.07, 0.68],
  girth: 0.11,
  length: [0.055, 0.105],
  wrap: 2.1,
  softness: 0.05,
  warp: 0.4
};

/** A sanke's small sumi sits above the lateral line and never on the head. */
const SANKE_SUMI: MarkingBand = {
  layer: 1,
  count: 3,
  station: [0.3, 0.74],
  girth: 0.08,
  length: [0.028, 0.055],
  wrap: 1.6,
  softness: 0.04,
  warp: 0.34
};

/** A bekko's sumi: small stepping stones down the back, nothing more. */
const BEKKO_SUMI: MarkingBand = {
  layer: 1,
  count: [4, 6],
  station: [0.28, 0.72],
  girth: 0.1,
  length: [0.022, 0.04],
  wrap: 1.5,
  softness: 0.035,
  warp: 0.3
};

/** A showa's hi, which runs further down the flanks than a kohaku's. */
const SHOWA_HI: MarkingBand = {
  layer: 0,
  count: 4,
  station: [0.06, 0.72],
  girth: 0.14,
  length: [0.055, 0.11],
  wrap: 2.2,
  softness: 0.05,
  warp: 0.42
};

/** The bold, wrapping sumi of a showa or an utsuri, which reaches onto the head. */
const WRAPPING_SUMI: MarkingBand = {
  layer: 1,
  count: [4, 5],
  station: [0.05, 0.78],
  girth: 0.17,
  length: [0.065, 0.12],
  wrap: 2.7,
  softness: 0.045,
  warp: 0.52
};

/** A tancho's crown: one round spot between the eyes and the gills. */
const TANCHO_CROWN: MarkingBand = {
  layer: 0,
  count: 1,
  station: [0.1, 0.125],
  girth: 0.004,
  length: [0.042, 0.052],
  wrap: 1.85,
  softness: 0.03,
  warp: 0.1,
  turn: 0
};

/** Warmth rising up both flanks and the cheeks, as an asagi or shusui carries it. */
const FLANK_HI: MarkingBand = {
  layer: 0,
  count: 3,
  mirror: true,
  centre: 0.25,
  station: [0.1, 0.6],
  girth: 0.03,
  length: [0.05, 0.09],
  wrap: 1.4,
  softness: 0.1,
  warp: 0.3
};

/** A doitsu's mirror scales: one clean row down the spine. */
const MIRROR_ROW: MarkingBand = {
  layer: 1,
  count: 6,
  station: [0.24, 0.7],
  girth: 0.004,
  length: [0.013, 0.018],
  wrap: 1.25,
  softness: 0.025,
  warp: 0.06,
  turn: 0
};

/** A dragon's swirls: large, restless, and all the way to the nose. */
const DRAGON_SUMI: MarkingBand = {
  layer: 1,
  count: 5,
  station: [0.05, 0.78],
  girth: 0.22,
  length: [0.045, 0.09],
  wrap: 2.4,
  softness: 0.05,
  warp: 0.68
};

/** Large, drifting patches, as an ochiba's leaves or a hariwake's gold. */
const DRIFTING_PATCHES: MarkingBand = {
  layer: 0,
  count: [3, 4],
  station: [0.08, 0.72],
  girth: 0.16,
  length: [0.06, 0.12],
  wrap: 2.3,
  softness: 0.06,
  warp: 0.5
};

export const VARIETIES: readonly KoiVariety[] = [
  {
    id: 'kohaku',
    name: 'Kohaku',
    kanji: '紅白',
    meaning: 'red and white',
    blurb:
      'Crimson hi on snow-white skin. The variety every keeper starts with, and many never leave.',
    rarity: 'common',
    family: 'patterned',
    group: 'gosanke',
    base: WHITE,
    primary: HI,
    markings: [KOHAKU_HI],
    netting: 0.18,
    metallic: 0,
    flat: 'kohaku'
  },
  {
    id: 'benigoi',
    name: 'Benigoi',
    kanji: '紅鯉',
    meaning: 'crimson carp',
    blurb: 'Red from nose to tail: one deep, unbroken beni with nothing to interrupt it.',
    rarity: 'common',
    family: 'solid',
    group: 'kawarimono',
    base: ['#d23c21', '#b5291a'],
    belly: '#e9a58c',
    markings: [],
    netting: 0.3,
    metallic: 0,
    flat: 'kohaku'
  },
  {
    id: 'orenji-ogon',
    name: 'Orenji Ogon',
    kanji: 'オレンジ黄金',
    meaning: 'orange gold',
    blurb: 'Solid metallic orange that glows like a paper lantern under the water.',
    rarity: 'common',
    family: 'metallic',
    group: 'hikari',
    base: ['#f59a33', '#ea731b'],
    belly: '#f6c894',
    markings: [],
    netting: 0.34,
    metallic: 0.62,
    gloss: 0.6,
    flat: 'kohaku'
  },
  {
    id: 'yamabuki-ogon',
    name: 'Yamabuki Ogon',
    kanji: '山吹黄金',
    meaning: 'kerria-rose gold',
    blurb: 'Named for the yellow kerria rose: a single sheet of burnished gold.',
    rarity: 'common',
    family: 'metallic',
    group: 'hikari',
    base: ['#f2c640', '#e2a92a'],
    markings: [],
    netting: 0.34,
    metallic: 0.62,
    gloss: 0.6,
    flat: 'kohaku'
  },
  {
    id: 'chagoi',
    name: 'Chagoi',
    kanji: '茶鯉',
    meaning: 'tea carp',
    blurb:
      'Tea-brown and famously friendly: first to the surface at feeding time, and the biggest in the pond.',
    rarity: 'common',
    family: 'solid',
    group: 'kawarimono',
    base: ['#93704a', '#77583a'],
    markings: [],
    netting: 0.75,
    metallic: 0,
    scales: 0.7,
    build: 'react',
    flat: 'kohaku'
  },
  {
    id: 'soragoi',
    name: 'Soragoi',
    kanji: '空鯉',
    meaning: 'sky carp',
    blurb: 'The soft grey-blue of an overcast sky, netted with darker scales.',
    rarity: 'common',
    family: 'solid',
    group: 'kawarimono',
    base: ['#9aa8b0', '#81919b'],
    markings: [],
    netting: 0.7,
    metallic: 0,
    scales: 0.65,
    flat: 'kohaku'
  },
  {
    id: 'shiro-bekko',
    name: 'Shiro Bekko',
    kanji: '白別甲',
    meaning: 'white tortoiseshell',
    blurb: 'White, with small sumi stepping stones scattered down the back.',
    rarity: 'common',
    family: 'patterned',
    group: 'bekko',
    base: WHITE,
    secondary: SUMI,
    markings: [BEKKO_SUMI],
    netting: 0.18,
    metallic: 0,
    flat: 'sanke'
  },
  {
    id: 'taisho-sanke',
    name: 'Taisho Sanke',
    kanji: '大正三色',
    meaning: 'three colours of the Taisho era',
    blurb:
      'Three colours: a kohaku with small sumi above the lateral line, and never black on the head.',
    rarity: 'uncommon',
    family: 'patterned',
    group: 'gosanke',
    base: WHITE,
    primary: HI,
    secondary: SUMI,
    markings: [KOHAKU_HI, SANKE_SUMI],
    netting: 0.18,
    metallic: 0,
    flat: 'sanke'
  },
  {
    id: 'showa',
    name: 'Showa Sanshoku',
    kanji: '昭和三色',
    meaning: 'three colours of the Showa era',
    blurb: 'Black-based, with red and white: bold sumi wraps the body and splits the face.',
    rarity: 'uncommon',
    family: 'patterned',
    group: 'gosanke',
    base: WHITE,
    primary: HI,
    secondary: SUMI,
    fin: SUMI,
    markings: [SHOWA_HI, WRAPPING_SUMI],
    netting: 0.12,
    metallic: 0,
    flat: 'showa'
  },
  {
    id: 'asagi',
    name: 'Asagi',
    kanji: '浅葱',
    meaning: 'pale indigo',
    blurb:
      'One of the oldest varieties: a pale-blue netted back, with red rising up the cheeks and flanks.',
    rarity: 'uncommon',
    family: 'patterned',
    group: 'asagi',
    base: ['#8ba4b6', '#7690a3'],
    primary: ['#e0602f', '#c9482a'],
    belly: '#ead3c3',
    fin: ['#e0602f', '#c9482a'],
    markings: [FLANK_HI],
    netting: 0.9,
    metallic: 0.08,
    scales: 0.7,
    flat: 'asagi'
  },
  {
    id: 'kigoi',
    name: 'Kigoi',
    kanji: '黄鯉',
    meaning: 'yellow carp',
    blurb:
      'Lemon yellow and non-metallic. Finding one this evenly coloured is rarer than it looks.',
    rarity: 'uncommon',
    family: 'solid',
    group: 'kawarimono',
    base: ['#f5da57', '#eac83f'],
    markings: [],
    netting: 0.3,
    metallic: 0,
    flat: 'kohaku'
  },
  {
    id: 'platinum-ogon',
    name: 'Platinum Ogon',
    kanji: 'プラチナ黄金',
    meaning: 'platinum gold',
    blurb: 'Pure metallic white with a brilliant sheen, like moonlight lying on the water.',
    rarity: 'uncommon',
    family: 'metallic',
    group: 'hikari',
    base: ['#f1f0eb', '#e2e1db'],
    markings: [],
    netting: 0.3,
    metallic: 0.7,
    gloss: 0.62,
    flat: 'kohaku'
  },
  {
    id: 'hi-utsuri',
    name: 'Hi Utsuri',
    kanji: '緋写り',
    meaning: 'scarlet reflection',
    blurb: 'Fiery red over lacquer black, the sumi "reflected" across the whole body.',
    rarity: 'uncommon',
    family: 'patterned',
    group: 'utsuri',
    base: ['#e25a2d', '#cc4223'],
    secondary: SUMI,
    belly: '#eec3a8',
    fin: SUMI,
    markings: [WRAPPING_SUMI],
    netting: 0.12,
    metallic: 0,
    flat: 'showa'
  },
  {
    id: 'aka-matsuba',
    name: 'Aka Matsuba',
    kanji: '赤松葉',
    meaning: 'red pine needles',
    blurb: 'Red, with a dark pine-cone net drawn over every single scale.',
    rarity: 'uncommon',
    family: 'solid',
    group: 'kawarimono',
    base: ['#cc472b', '#b43621'],
    belly: '#e8a88f',
    markings: [],
    netting: 1,
    metallic: 0,
    scales: 1.25,
    flat: 'kohaku'
  },
  {
    id: 'karasugoi',
    name: 'Karasugoi',
    kanji: '烏鯉',
    meaning: 'crow carp',
    blurb: 'The crow koi: black from nose to tail, with a faint smoky net.',
    rarity: 'uncommon',
    family: 'solid',
    group: 'kawarimono',
    base: ['#221f1d', '#2d2826'],
    belly: '#3d3632',
    markings: [],
    netting: 0.3,
    metallic: 0,
    flat: 'kohaku'
  },
  {
    id: 'tancho',
    name: 'Tancho',
    kanji: '丹頂',
    meaning: 'red crown',
    blurb:
      'A single round crimson crown on pure white. Named for the red-crowned crane, and prized as a living flag.',
    rarity: 'rare',
    family: 'patterned',
    group: 'gosanke',
    base: WHITE,
    primary: ['#dc3a26', '#c4261d'],
    markings: [TANCHO_CROWN],
    netting: 0.16,
    metallic: 0,
    flat: 'kohaku'
  },
  {
    id: 'shiro-utsuri',
    name: 'Shiro Utsuri',
    kanji: '白写り',
    meaning: 'white reflection',
    blurb: 'Ink black and snow white, as stark as a brushstroke of calligraphy.',
    rarity: 'rare',
    family: 'patterned',
    group: 'utsuri',
    base: WHITE,
    secondary: SUMI,
    fin: SUMI,
    markings: [WRAPPING_SUMI],
    netting: 0.12,
    metallic: 0,
    flat: 'showa'
  },
  {
    id: 'ki-utsuri',
    name: 'Ki Utsuri',
    kanji: '黄写り',
    meaning: 'yellow reflection',
    blurb: 'Lemon yellow broken by bold black. One of the rarest utsuri to find done well.',
    rarity: 'rare',
    family: 'patterned',
    group: 'utsuri',
    base: ['#f1cf4b', '#e5bb36'],
    secondary: SUMI,
    fin: SUMI,
    markings: [WRAPPING_SUMI],
    netting: 0.12,
    metallic: 0,
    flat: 'showa'
  },
  {
    id: 'shusui',
    name: 'Shusui',
    kanji: '秋翠',
    meaning: 'autumn jade',
    blurb:
      'A scaleless asagi: one row of mirror scales down a sky-blue back, and autumn red along the sides.',
    rarity: 'rare',
    family: 'scaleless',
    group: 'asagi',
    base: ['#9dbacd', '#86a4ba'],
    primary: ['#e06a32', '#cf522b'],
    secondary: '#2d4459',
    belly: '#ecd6c4',
    fin: ['#e06a32', '#cf522b'],
    markings: [FLANK_HI, MIRROR_ROW],
    netting: 0.06,
    metallic: 0.06,
    scales: 0.08,
    gloss: 0.6,
    scaleless: true,
    flat: 'asagi'
  },
  {
    id: 'goshiki',
    name: 'Goshiki',
    kanji: '五色',
    meaning: 'five colours',
    blurb: 'Five colours: a kohaku pattern laid over dark, deeply netted blue.',
    rarity: 'rare',
    family: 'patterned',
    group: 'kawarimono',
    base: ['#5f6b76', '#4f5b66'],
    primary: HI,
    belly: '#bcbfbb',
    markings: [KOHAKU_HI],
    netting: 0.95,
    metallic: 0,
    scales: 0.8,
    flat: 'kohaku'
  },
  {
    id: 'kujaku',
    name: 'Kujaku',
    kanji: '孔雀',
    meaning: 'peacock',
    blurb: 'The peacock: metallic platinum netted in grey, splashed with orange.',
    rarity: 'rare',
    family: 'metallic',
    group: 'hikari',
    base: '#e9e7e0',
    primary: ['#f08d33', '#e36b23'],
    markings: [{ ...DRIFTING_PATCHES, count: 4 }],
    netting: 0.95,
    metallic: 0.5,
    scales: 0.8,
    gloss: 0.55,
    flat: 'kohaku'
  },
  {
    id: 'hariwake',
    name: 'Hariwake',
    kanji: '張分',
    meaning: 'split in two',
    blurb: 'Two metals at once: a platinum ground patched with bright gold.',
    rarity: 'rare',
    family: 'metallic',
    group: 'hikari',
    base: '#ecebe5',
    primary: ['#f2b53f', '#e89a2b'],
    markings: [DRIFTING_PATCHES],
    netting: 0.3,
    metallic: 0.58,
    gloss: 0.58,
    flat: 'kohaku'
  },
  {
    id: 'ochiba',
    name: 'Ochiba Shigure',
    kanji: '落葉時雨',
    meaning: 'fallen leaves in an autumn shower',
    blurb: '"Autumn leaves falling on water": russet patches drifting over grey-blue.',
    rarity: 'rare',
    family: 'patterned',
    group: 'kawarimono',
    base: ['#9ba8ae', '#8796a0'],
    primary: ['#aa6d3f', '#935830'],
    markings: [DRIFTING_PATCHES],
    netting: 0.6,
    metallic: 0,
    scales: 0.6,
    flat: 'kohaku'
  },
  {
    id: 'kumonryu',
    name: 'Kumonryu',
    kanji: '九紋竜',
    meaning: 'nine-tattooed dragon',
    blurb:
      'The nine-tattooed dragon: scaleless black and white in swirls that shift with the seasons.',
    rarity: 'legendary',
    family: 'scaleless',
    group: 'kawarimono',
    base: WHITE,
    secondary: SUMI,
    fin: SUMI,
    markings: [DRAGON_SUMI],
    netting: 0.04,
    metallic: 0,
    scales: 0.08,
    gloss: 0.62,
    scaleless: true,
    flat: 'showa'
  },
  {
    id: 'beni-kumonryu',
    name: 'Beni Kumonryu',
    kanji: '紅九紋竜',
    meaning: 'crimson nine-tattooed dragon',
    blurb: 'A kumonryu that caught fire: dragon swirls in black, white and red.',
    rarity: 'legendary',
    family: 'scaleless',
    group: 'kawarimono',
    base: WHITE,
    primary: HI,
    secondary: SUMI,
    fin: SUMI,
    markings: [
      { ...KOHAKU_HI, count: 3 },
      { ...DRAGON_SUMI, count: 5 }
    ],
    netting: 0.04,
    metallic: 0,
    scales: 0.08,
    gloss: 0.62,
    scaleless: true,
    flat: 'showa'
  },
  {
    id: 'kin-kikokuryu',
    name: 'Kin Kikokuryu',
    kanji: '金輝黒竜',
    meaning: 'gold-crowned shining black dragon',
    blurb: 'A metallic dragon: platinum and black swirls beneath a crown of gold.',
    rarity: 'legendary',
    family: 'metallic',
    group: 'hikari',
    base: '#ebe9e2',
    primary: ['#f2a93c', '#e98c2a'],
    secondary: SUMI,
    markings: [
      {
        layer: 0,
        count: 2,
        station: [0.05, 0.3],
        girth: 0.06,
        length: [0.05, 0.08],
        wrap: 2.2,
        softness: 0.05,
        warp: 0.4
      },
      { ...DRAGON_SUMI, count: 4, station: [0.28, 0.78] }
    ],
    netting: 0.05,
    metallic: 0.55,
    scales: 0.08,
    gloss: 0.7,
    scaleless: true,
    flat: 'showa'
  },
  {
    id: 'midorigoi',
    name: 'Midorigoi',
    kanji: '緑鯉',
    meaning: 'green carp',
    blurb:
      'The green koi, so rare most keepers never see one: lustrous yellow-green, with one row of scales down the back.',
    rarity: 'legendary',
    family: 'scaleless',
    group: 'kawarimono',
    base: ['#abc058', '#95ab45'],
    secondary: '#56672c',
    markings: [MIRROR_ROW],
    netting: 0.05,
    metallic: 0.35,
    scales: 0.08,
    gloss: 0.66,
    scaleless: true,
    flat: 'kohaku'
  }
];

// Built on first use rather than at load, so a module that only needs the
// trait list can import it without dragging the whole catalogue along.
let byId: Map<string, KoiVariety> | undefined;

/** Looks a variety up by id; unknown ids (from a future or corrupt save) return undefined. */
export const findVariety = (id: string): KoiVariety | undefined =>
  (byId ??= new Map(VARIETIES.map((variety) => [variety.id, variety]))).get(id);

/**
 * Whether a variety can carry a trait at all.
 *
 * Gin rin sparkle lives on scales, so a scaleless fish has nothing to sparkle
 * with, and stripping the scales from a fish born without them changes nothing.
 */
export const allowsModifier = (variety: KoiVariety, modifier: KoiModifier): boolean =>
  modifier === 'butterfly' || !variety.scaleless;
