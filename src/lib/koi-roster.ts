/**
 * Who is swimming, and what they wear.
 *
 * Each recent branch gets its own koi, seeded off its name, so the same
 * branch always produces the same fish and the pond fills up as you work. A
 * couple of resident koi keep the pond occupied before anything has been
 * saved.
 *
 * The accent colour is drawn from the branch's own seed rather than its type
 * — a type-keyed palette meant every `feat` branch wore the same green, which
 * is most branches on most projects. Hashing the branch name instead gives
 * every fish its own hue while staying exactly as stable: the same branch
 * always comes back as the same colour.
 *
 * The variety idea comes from the hyperfrontend koi-pond demo: the accent is
 * the only thing that identifies a koi, while the ground and second marking
 * colour are natural nishikigoi tones that make the animal read as a fish
 * rather than a logo.
 */
import type { RecentBranch } from '../types';
import { WATER_TINT, dimHex, hslToHex, mixHex, withAlpha } from './koi-colour';
import type { KoiPatternName } from './koi-pattern';
import { DEFAULT_BASE_FISH, MAX_KOI } from './koi';
import type { OwnedKoi } from './koi-account';
import { resolveLook, type KoiGenome } from './koi-genome';
import { hashString } from './seeded-random';

// Re-exported so existing callers keep importing the seeded helpers from here.
export { createRandom, hashString } from './seeded-random';

/** The white nishikigoi ground most varieties are written on. */
const WHITE_GROUND = '#f6f1e9';

/** Sumi — the near-black a sanke or showa carries. */
const SUMI = '#221e1b';

/** The warm orange a koi's beni brings, used only as a natural tone. */
const BENI_ORANGE = '#e08a3c';

/** Fin translucency applied to the accent colour, as an alpha channel byte. */
const FIN_ALPHA = 0xc0;

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
  /** The branch this koi stands for, a market koi's name, or null for a resident. */
  label: string | null;
  palette: KoiPalette;
  /** Present for a koi bought at the market, whose look comes from its variety. */
  genome?: KoiGenome;
};

/**
 * The hue a branch's koi wears.
 *
 * Re-hashed off the seed rather than reading it directly: the seed also picks
 * the variety via `seed % VARIETIES.length`, and 360 shares a factor with 5,
 * so hue-mod-5 would otherwise land on the same value as the variety index
 * every time — every kohaku the same fifth of the wheel. Hashing first breaks
 * that tie.
 */
const accentHue = (seed: number): number => hashString(`${seed}`) % 360;

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

/**
 * The colours a branch's koi wears.
 *
 * The accent is drawn from the branch's own seed rather than looked up by
 * type, so every branch gets its own hue instead of every `feat` branch
 * wearing the same green.
 */
export const paletteForBranch = (seed: number): KoiPalette => {
  const accent = hslToHex(accentHue(seed), 70, 55);
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

/**
 * Builds the pond's roster: one koi per recent branch, topped up with residents
 * so the pond never drops below `baseFishCount`, and never exceeds `MAX_KOI`
 * regardless of how high that floor is set.
 *
 * A branch always outranks a resident — raising the base fish count only
 * grows the pond when there aren't enough branches to fill it on their own.
 *
 * Koi bought at the market outrank both: once the visitor owns one, the pond
 * is theirs, and the branch koi and residents rest until every market koi has
 * been released again.
 *
 * @param baseFishCount - The floor Settings has chosen; clamped into range so
 * a corrupt or future stored value can't grow the pond past its own cap.
 */
export const buildKoiRoster = (
  recentBranches: readonly RecentBranch[],
  baseFishCount: number = DEFAULT_BASE_FISH,
  ownedKoi: readonly OwnedKoi[] = []
): KoiDescriptor[] => {
  if (ownedKoi.length > 0) {
    return ownedKoi.slice(0, MAX_KOI).map((koi) => ({
      // Prefixed so a market koi can never share a key with a branch of the same name.
      key: `market:${koi.id}`,
      seed: koi.genome.seed,
      label: koi.name,
      palette: resolveLook(koi.genome).flat,
      genome: koi.genome
    }));
  }

  const base = Math.min(MAX_KOI, Math.max(0, Math.round(baseFishCount)));
  const roster = recentBranches.slice(0, MAX_KOI).map((item): KoiDescriptor => {
    const seed = hashString(item.value);

    return {
      key: item.value,
      seed,
      label: item.value,
      palette: paletteForBranch(seed)
    };
  });

  for (let index = roster.length; index < base; index += 1) {
    const key = `resident-${index}`;
    const seed = hashString(key);
    roster.push({ key, seed, label: null, palette: residentPalette(seed) });
  }

  return roster;
};
