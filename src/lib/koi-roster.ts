/**
 * Who is swimming, and what they wear.
 *
 * Each recent branch gets its own koi, dressed in its branch type's colour and
 * seeded off its name, so the same branch always produces the same fish and the
 * pond fills up as you work. A couple of resident koi keep the pond occupied
 * before anything has been saved.
 *
 * The variety idea comes from the hyperfrontend koi-pond demo: the accent is
 * the only thing that identifies a koi, while the ground and second marking
 * colour are natural nishikigoi tones that make the animal read as a fish
 * rather than a logo.
 */
import type { RecentBranch } from '../types';
import { WATER_TINT, dimHex, hslToHex, mixHex, withAlpha } from './koi-colour';
import type { KoiPatternName } from './koi-pattern';
import { MAX_KOI, RESIDENT_KOI } from './koi';

/** The white nishikigoi ground most varieties are written on. */
const WHITE_GROUND = '#f6f1e9';

/** Sumi — the near-black a sanke or showa carries. */
const SUMI = '#221e1b';

/** The warm orange a koi's beni brings, used only as a natural tone. */
const BENI_ORANGE = '#e08a3c';

/** Fin translucency applied to the accent colour, as an alpha channel byte. */
const FIN_ALPHA = 0xc0;

/** Colours for the branch types that ship as defaults; anything custom gets a hashed hue. */
const TYPE_ACCENTS: Readonly<Record<string, string>> = {
  bugfix: '#e5484d',
  chore: '#8d8f98',
  docs: '#3178c6',
  experiment: '#14b8a6',
  feat: '#42b883',
  feature: '#42b883',
  fix: '#e5484d',
  hotfix: '#ff6b35',
  refactor: '#a855f7',
  release: '#f59e0b',
  style: '#ec4899',
  test: '#eab308'
};

/** One koi's colours. */
export type KoiPalette = {
  /** The ground the markings are written on. */
  body: string;
  /** The marking that identifies the koi. */
  marking: string;
  /** The second marking colour, a natural tone. */
  shade: string;
  /** Translucent fin colour. */
  fin: string;
  /** The variety the markings are drawn from. */
  pattern: KoiPatternName;
};

/** One koi in the pond, before it has a position. */
export type KoiDescriptor = {
  /** Stable identity, so a koi survives the roster changing around it. */
  key: string;
  /** Drives every deterministic number about this fish. */
  seed: number;
  /** The branch this koi stands for, or null for a resident. */
  label: string | null;
  palette: KoiPalette;
};

/** A stable 32-bit hash, so the same branch name always seeds the same koi. */
export const hashString = (value: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

/** A small deterministic generator, so traits are stable per seed. */
export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296;
  };
};

/** Falls back to a hashed hue so custom branch types still get a distinct koi. */
const accentForType = (branchType: string): string =>
  TYPE_ACCENTS[branchType] ?? hslToHex(hashString(branchType) % 360, 70, 55);

/**
 * The varieties, picked by seed so no two koi share a colour topology.
 *
 * The mixture is deliberate: kohaku keeps some fish simple while sanke and
 * showa carry a second marking colour, so the shoal shows a spread of patterns
 * rather than five of one.
 */
const VARIETIES: readonly Pick<KoiPalette, 'body' | 'shade' | 'pattern'>[] = [
  { body: WHITE_GROUND, shade: SUMI, pattern: 'kohaku' },
  { body: WHITE_GROUND, shade: SUMI, pattern: 'sanke' },
  { body: WHITE_GROUND, shade: BENI_ORANGE, pattern: 'showa' },
  { body: '#efe3c8', shade: BENI_ORANGE, pattern: 'kohaku' },
  { body: '#e7ecef', shade: BENI_ORANGE, pattern: 'asagi' }
];

const paletteFor = (accent: string, seed: number): KoiPalette => {
  const variety = VARIETIES[seed % VARIETIES.length] ?? VARIETIES[0]!;

  return { ...variety, marking: accent, fin: withAlpha('#d9d2c5', FIN_ALPHA) };
};

/** The colours a branch's koi wears. */
export const paletteForBranch = (branchType: string, seed: number): KoiPalette => {
  const accent = accentForType(branchType);
  return { ...paletteFor(accent, seed), fin: withAlpha(accent, FIN_ALPHA) };
};

/** A plain koi with no branch behind it: natural tones only. */
export const residentPalette = (seed: number): KoiPalette =>
  paletteFor(seed % 2 === 0 ? BENI_ORANGE : SUMI, seed);

/**
 * Sinks a palette to a depth.
 *
 * A koi further down washes toward the water's own colour and dims, rather
 * than simply fading out. That is what the demo’s skin shader does with
 * `mix(colour, uWaterTint, uDepthFade) * uDepthDim`, and it is most of why
 * its pond reads as water instead of as fish on a dark background. Depth is
 * fixed per koi, so this is paid once rather than every frame.
 */
export const sinkPalette = (palette: KoiPalette, depth: number): KoiPalette => {
  const sink = (hex: string): string =>
    dimHex(mixHex(hex, WATER_TINT, depth * 0.72), 1 - depth * 0.3);

  return {
    ...palette,
    body: sink(palette.body),
    marking: sink(palette.marking),
    shade: sink(palette.shade),
    // The fin keeps its alpha byte, so only its first six digits are sunk.
    fin: `${sink(palette.fin.slice(0, 7))}${palette.fin.slice(7)}`
  };
};

/** Reads the branch type off a recent entry, falling back to its leading segment. */
const branchTypeOf = (item: RecentBranch): string =>
  item.form?.branchType ?? /^[a-z0-9_-]+/.exec(item.value)?.[0] ?? 'feat';

/**
 * Builds the pond's roster: one koi per recent branch, topped up with residents
 * so at least a couple are always swimming, and capped at the recent-list size.
 */
export const buildKoiRoster = (recentBranches: readonly RecentBranch[]): KoiDescriptor[] => {
  const roster = recentBranches.slice(0, MAX_KOI).map((item): KoiDescriptor => {
    const seed = hashString(item.value);

    return {
      key: item.value,
      seed,
      label: item.value,
      palette: paletteForBranch(branchTypeOf(item), seed)
    };
  });

  for (let index = roster.length; index < RESIDENT_KOI; index += 1) {
    const key = `resident-${index}`;
    const seed = hashString(key);
    roster.push({ key, seed, label: null, palette: residentPalette(seed) });
  }

  return roster;
};
