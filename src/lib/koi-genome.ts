/**
 * One market koi, from its genome to everything a renderer needs.
 *
 * A genome is three things: the variety, any traits it was born with, and a
 * seed. That is all a pond has to remember about a fish, because everything
 * else — the exact shade of its red, where its markings fall, how long its
 * fins trail, how big it grew — is drawn from the seed the same way every time.
 *
 * A goldfish comes through here too. Its genome names a breed instead of a
 * variety and carries no traits, but it is dressed by the same recipe
 * machinery and drawn with the same body, so everything that draws a fish can
 * take either.
 *
 * Nothing here touches three.js, so the roster, the market and the 2D fallback
 * can all read a koi's look without pulling the renderer into the main bundle.
 */
import type { KoiAppearance } from '../vendor/koi-pond/koi3d/config';
import { DEFAULT_PHYSICAL } from '../vendor/koi-pond/koi3d/config';
import type { KoiPatch, KoiPatternData } from '../vendor/koi-pond/koi3d/pattern';
import { MAX_PATCHES } from '../vendor/koi-pond/koi3d/pattern';
import type { KoiFramework, KoiPhenotype } from '../vendor/koi-pond/model/types';
import { goldfishOf, goldfishPhysique, isGoldfish, type GoldfishGenome } from './goldfish';
import { mixHex, withAlpha } from './koi-colour';
import type { KoiPalette as FlatPalette } from './koi-roster';
import { createRandom, hashString } from './seeded-random';
import {
  MODIFIERS,
  MODIFIER_INFO,
  RARITIES,
  allowsModifier,
  findVariety,
  type FishLookRecipe,
  type KoiModifier,
  type KoiRarity,
  type KoiVariety,
  type KoiVarietyId,
  type MarkingBand,
  type Tone
} from './koi-varieties';

export type KoiGenome = {
  variety: KoiVarietyId;
  modifiers: readonly KoiModifier[];
  seed: number;
};

/** Any fish the market sells: a koi, or a goldfish. */
export type FishGenome = KoiGenome | GoldfishGenome;

/** Everything a renderer needs to dress one koi. */
export type KoiLook = {
  /** The vendored skin, ready for `createKoi`; its pattern name is a placeholder. */
  appearance: KoiAppearance;
  /** The markings, which replace whatever the placeholder pattern generated. */
  pattern: KoiPatternData;
  /** The pale underside. */
  belly: string;
  /** The nearest the 2D pond can draw it. */
  flat: FlatPalette;
};

/**
 * The eight body archetypes the vendored koi are sculpted in.
 *
 * Kept in the same order as the branch koi pick them, so a variety without a
 * build of its own gets one the same way any other fish does.
 */
const BUILDS: readonly KoiFramework[] = [
  'vanilla',
  'react',
  'vue',
  'svelte',
  'solid',
  'preact',
  'lit',
  'angular'
];

/** The cream a pale belly washes toward. */
const CREAM = '#f7f2e6';

/** Band offsets, so a colour draw never shifts where a marking falls. */
const TONE_DRAWS = 0x51ed;
const PATTERN_DRAWS = 80;

/** The vendored skin's defaults, which a variety or a trait adjusts. */
const DEFAULT_SCALES = 0.45;
const DEFAULT_GLOSS = 0.45;
const DEFAULT_ROUGHNESS = 0.52;
const DEFAULT_FIN_OPACITY = 0.8;

/** Fin translucency for the 2D pond, as an alpha channel byte. */
const FLAT_FIN_ALPHA = 0xc0;

/**
 * How much longer a butterfly koi's fins grow than a standard fish's.
 *
 * The pectorals and the tail carry the effect; the smaller fins grow enough to
 * match them without the fish turning into a fan.
 */
const BUTTERFLY_FINS = {
  caudal: 1.55,
  pectoral: 1.9,
  dorsal: 1.55,
  pelvic: 1.7,
  anal: 1.4
} as const;

/** Looks up a genome's variety, falling back to kohaku for anything unknown. */
export const varietyOf = (genome: KoiGenome): KoiVariety =>
  findVariety(genome.variety) ?? findVariety('kohaku')!;

export const hasModifier = (genome: KoiGenome, modifier: KoiModifier): boolean =>
  genome.modifiers.includes(modifier);

/** The fish's full variety name, traits first: "Butterfly Gin Rin Kohaku". */
export const koiTitle = (genome: KoiGenome): string =>
  [
    ...MODIFIERS.filter((modifier) => hasModifier(genome, modifier)).map(
      (modifier) => MODIFIER_INFO[modifier].label
    ),
    varietyOf(genome).name
  ].join(' ');

/** The variety's rarity, raised a step for each rare trait the fish carries. */
export const koiRarity = (genome: KoiGenome): KoiRarity => {
  const bumps = genome.modifiers.reduce(
    (total, modifier) => total + MODIFIER_INFO[modifier].bump,
    0
  );
  const index = RARITIES.indexOf(varietyOf(genome).rarity) + bumps;

  return RARITIES[Math.min(RARITIES.length - 1, index)]!;
};

/** The body archetype; varieties known for their size keep theirs, and every goldfish breed has one. */
export const koiBuildFor = (genome: FishGenome): KoiFramework =>
  isGoldfish(genome)
    ? goldfishOf(genome).build
    : (varietyOf(genome).build ?? BUILDS[genome.seed % BUILDS.length]!);

/** The recipe a fish is dressed from: its variety's, or its breed's. */
const recipeOf = (genome: FishGenome): FishLookRecipe =>
  isGoldfish(genome) ? goldfishOf(genome) : varietyOf(genome);

/** The traits a fish carries; a goldfish is born with none. */
const modifiersOf = (genome: FishGenome): readonly KoiModifier[] =>
  isGoldfish(genome) ? [] : genome.modifiers;

const within = (draw: number, band: readonly [number, number]): number =>
  band[0] + draw * (band[1] - band[0]);

const countFor = (count: MarkingBand['count'], draw: number): number =>
  typeof count === 'number' ? count : count[0] + Math.floor(draw * (count[1] - count[0] + 1));

/**
 * Lays one variety's markings out on one fish.
 *
 * The same scheme as the vendored generator — patches spaced evenly down their
 * band and only jittered within their own slot, so a pattern reads as a
 * pattern rather than a clump — with the two things the real varieties need
 * that it does not do: bands centred off the spine, and bands mirrored onto
 * both flanks.
 */
export const buildMarkings = (bands: readonly MarkingBand[], seed: number): KoiPatch[] => {
  const random = createRandom(seed + PATTERN_DRAWS);
  const patches: KoiPatch[] = [];

  for (const band of bands) {
    const count = countFor(band.count, random());

    for (let index = 0; index < count; index += 1) {
      const slot = count === 1 ? 0.5 : (index + 0.5 * random()) / count;
      const length = within(random(), band.length);
      const patch: KoiPatch = {
        station: within(slot, band.station),
        girth: (band.centre ?? 0) + (random() - 0.5) * 2 * band.girth,
        lengthSpan: length,
        girthSpan: length * band.wrap * (0.8 + random() * 0.4),
        rotation: (random() - 0.5) * 2 * (band.turn ?? 0.45),
        softness: band.softness * (0.7 + random() * 0.6),
        layer: band.layer,
        warp: band.warp * (0.75 + random() * 0.5)
      };
      const sides = band.mirror
        ? [patch, { ...patch, girth: -patch.girth, rotation: -patch.rotation }]
        : [patch];

      for (const side of sides) {
        // The shader composites a fixed number of patches; a recipe that asks
        // for more simply stops, rather than overflowing the uniform.
        if (patches.length < MAX_PATCHES) {
          patches.push(side);
        }
      }
    }
  }

  return patches;
};

/**
 * Resolves a genome into the skin one renderer or another will draw.
 *
 * The same genome always resolves to the same look, so a fish bought today is
 * exactly the fish that swims in the pond tomorrow.
 */
export const resolveLook = (genome: FishGenome): KoiLook => {
  const variety = recipeOf(genome);
  const modifiers = modifiersOf(genome);
  const random = createRandom(hashString(`${genome.seed}`) ^ TONE_DRAWS);
  const tone = (value: Tone): string =>
    typeof value === 'string' ? value : mixHex(value[0], value[1], random());

  // Drawn in a fixed order, so adding a colour later never re-rolls these.
  const base = tone(variety.base);
  const primary = variety.primary ? tone(variety.primary) : base;
  const secondary = variety.secondary ? tone(variety.secondary) : base;
  const belly = variety.belly ? tone(variety.belly) : mixHex(base, CREAM, 0.6);
  const fin = variety.fin ? tone(variety.fin) : base;

  let scales = variety.scales ?? DEFAULT_SCALES;
  let netting = variety.netting;
  let metallic = variety.metallic;
  let gloss = variety.gloss ?? DEFAULT_GLOSS;
  let roughness = variety.roughness ?? DEFAULT_ROUGHNESS;

  if (modifiers.includes('doitsu')) {
    scales = 0.08;
    netting *= 0.25;
    gloss = Math.max(gloss, 0.6);
  }

  if (modifiers.includes('ginrin')) {
    // Deeper relief under a hard, glassy coat is what makes each scale flash
    // as the fish turns, which is the whole of gin rin.
    scales = Math.min(1.25, scales * 1.6 + 0.2);
    gloss = 0.95;
    roughness = 0.24;
    metallic = Math.min(1, metallic + 0.2);
  }

  const markings = buildMarkings(variety.markings, genome.seed);
  const hasPrimary = markings.some((patch) => patch.layer === 0);
  const hasSecondary = markings.some((patch) => patch.layer === 1);

  return {
    appearance: {
      pattern: 'kohaku',
      base,
      primary,
      secondary,
      accent: fin,
      roughness,
      gloss,
      finOpacity: modifiers.includes('butterfly')
        ? 0.66
        : (variety.finOpacity ?? DEFAULT_FIN_OPACITY),
      scaleDepth: scales,
      scaleDensity: 30
    },
    pattern: { patches: markings, netting, metallic },
    belly,
    flat: {
      body: base,
      marking: hasPrimary ? primary : base,
      shade: hasSecondary ? secondary : base,
      fin: withAlpha(mixHex(base, fin, 0.5), FLAT_FIN_ALPHA),
      pattern: variety.flat
    }
  };
};

/**
 * Grows a butterfly koi's fins on top of the body its build already chose, and
 * turns a goldfish's body into its breed's.
 *
 * Other koi pass straight through: the build's own proportions are the fish.
 */
export const physiqueFor = (genome: FishGenome, phenotype: KoiPhenotype): KoiPhenotype => {
  if (isGoldfish(genome)) {
    return goldfishPhysique(goldfishOf(genome), phenotype);
  }

  if (!hasModifier(genome, 'butterfly')) {
    return phenotype;
  }

  const span = (fin: keyof typeof BUTTERFLY_FINS): number =>
    (phenotype[fin]?.span ?? DEFAULT_PHYSICAL[fin].span) * BUTTERFLY_FINS[fin];

  return {
    ...phenotype,
    caudal: { ...phenotype.caudal, span: span('caudal'), sweep: 0.38 },
    pectoral: { ...phenotype.pectoral, span: span('pectoral'), sweep: 0.78 },
    dorsal: { ...phenotype.dorsal, span: span('dorsal') },
    pelvic: { ...phenotype.pelvic, span: span('pelvic'), sweep: 0.8 },
    anal: { ...phenotype.anal, span: span('anal') }
  };
};

/** Rolls which traits a fish is born with, respecting what its variety allows. */
export const rollModifiers = (variety: KoiVariety, random: () => number): KoiModifier[] => {
  // Every trait is rolled whether or not it is allowed, so the draws a fish
  // makes never depend on its variety and the stream stays aligned.
  const rolled = MODIFIERS.filter((modifier) => random() < MODIFIER_INFO[modifier].chance).filter(
    (modifier) => allowsModifier(variety, modifier)
  );

  // Gin rin sparkles on scales that a doitsu fish no longer has.
  return rolled.includes('doitsu') ? rolled.filter((modifier) => modifier !== 'ginrin') : rolled;
};
