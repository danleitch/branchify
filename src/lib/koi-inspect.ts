/**
 * Everything worth knowing about one fish in the pond, for the card a visitor
 * opens by clicking it.
 *
 * Every fish has a story to tell, not only the ones bought at the market. A
 * market fish reads its variety, traits, size and worth from its genome and
 * its account entry; a branch koi or a resident has none of those, so it is
 * named off its seed and appraised as the variety its markings are drawn from,
 * the same way every visit.
 *
 * Its personality comes from the swimming brain's own traits, so a fish the
 * card calls shy is the one that hangs back when the water is touched.
 *
 * Nothing here touches three.js or React, so the rules can be tested alone.
 */
import type { KoiTraits } from '../vendor/koi-pond/model/types';
import { formatCm, growthOf, koiAdultCm, koiAgeClass, ageAtLength } from './fish-growth';
import { goldfishOf, isGoldfish } from './goldfish';
import type { OwnedGoldfish, OwnedKoi } from './koi-account';
import { koiRarity, koiTitle, varietyOf, type FishGenome, type KoiGenome } from './koi-genome';
import { KOI_NAMES, nameMeaning, priceFor } from './koi-market';
import type { KoiDescriptor } from './koi-roster';
import {
  KOI_GROUPS,
  MODIFIER_INFO,
  findVariety,
  type KoiRarity,
  type KoiVarietyId
} from './koi-varieties';

/** What a fish happens to be doing the moment it is clicked. */
export type FishActivity = 'cruising' | 'resting' | 'curious' | 'feeding' | 'leaving';

/** What the pond itself knows about a fish, which its roster entry does not. */
export type FishReading = {
  traits: KoiTraits;
  /** The pattern a branch koi or resident is dressed in; market fish wear their genome. */
  pattern: string;
  /** How long it is drawn, in centimetres. */
  lengthCm: number;
  activity: FishActivity;
};

export type FishKind = 'koi' | 'goldfish' | 'branch' | 'resident';

export type FishCard = {
  key: string;
  kind: FishKind;
  name: string;
  /** What the name means, when it is one the market gives. */
  nameMeaning: string | null;
  /** The variety or breed, with any traits: "Butterfly Gin Rin Kohaku", "Comet". */
  species: string;
  kanji: string | null;
  /** What the variety's name means in English. */
  speciesMeaning: string | null;
  /** The show family a koi variety is judged in. */
  group: string | null;
  rarity: KoiRarity | null;
  /** Traits it was born with, like gin rin scales or butterfly fins. */
  traits: readonly { label: string; blurb: string }[];
  /** A few words on its character, from the way it swims. */
  personality: readonly string[];
  blurb: string;
  /** The age class a koi dealer would sell it in: "Nisai". */
  ageClass: string | null;
  lengthCm: number;
  /** How big it could grow. */
  adultCm: number | null;
  /** What it is worth now; for a fish that was never sold, what it would appraise at. */
  worth: number;
  /** Whether that worth is an appraisal rather than a market value. */
  appraised: boolean;
  /** What the visitor paid, for a fish that was bought. */
  paid: number | null;
  /** How much more it will be worth tomorrow. */
  perDay: number;
  /** When a bought fish arrived in the pond. */
  acquiredAt: string | null;
  /** The branch a branch koi swims for. */
  branch: string | null;
  activity: FishActivity;
  /** Present for a market fish, whose portrait can be taken. */
  genome: FishGenome | null;
};

/** The market varieties the branch koi's patterns are drawn from. */
const PATTERN_VARIETIES: Readonly<Record<string, KoiVarietyId>> = {
  kohaku: 'kohaku',
  sanke: 'taisho-sanke',
  showa: 'showa',
  asagi: 'asagi',
  ogon: 'yamabuki-ogon',
  karasu: 'karasugoi'
};

/**
 * How far a trait has to lean off the middle before it says anything about
 * the fish; an ordinary koi is not remarkable for being ordinary.
 */
const NOTABLE = 0.18;

/** How many words a card spends on a fish's character. */
const PERSONALITY_WORDS = 3;

/** Each trait's two ends, low first. */
const CHARACTER: readonly [keyof KoiTraits, string, string][] = [
  ['shyness', 'Bold', 'Shy'],
  ['socialAffinity', 'Loner', 'Sociable'],
  ['cruiseSpeed', 'Leisurely', 'Brisk swimmer'],
  ['awareness', 'Dreamy', 'Watchful'],
  ['reactionIntensity', 'Unflappable', 'Jumpy'],
  ['turnResponsiveness', 'Steady', 'Nimble'],
  ['depthWillingness', 'Keeps to its depth', 'Loves to dive']
];

/**
 * A fish's character in a few words: its most pronounced traits, strongest
 * first, or "Easy-going" for a fish with nothing to set it apart.
 */
export const personalityOf = (traits: KoiTraits): string[] => {
  const notable = CHARACTER.map(([trait, low, high]) => ({
    lean: traits[trait] - 0.5,
    low,
    high
  }))
    .filter(({ lean }) => Math.abs(lean) >= NOTABLE)
    .sort((a, b) => Math.abs(b.lean) - Math.abs(a.lean))
    .slice(0, PERSONALITY_WORDS)
    .map(({ lean, low, high }) => (lean < 0 ? low : high));

  return notable.length > 0 ? notable : ['Easy-going'];
};

/** A name for a fish nobody named, the same one every visit. */
export const pondNameFor = (seed: number): string => KOI_NAMES[seed % KOI_NAMES.length]![0];

const groupName = (genome: KoiGenome): string | null =>
  KOI_GROUPS.find((group) => group.id === varietyOf(genome).group)?.name ?? null;

const traitsOf = (genome: KoiGenome): FishCard['traits'] =>
  genome.modifiers.map((modifier) => ({
    label: MODIFIER_INFO[modifier].label,
    blurb: MODIFIER_INFO[modifier].blurb
  }));

/** The id a bought fish was listed under, from its pond key. */
const listingId = (key: string, prefix: string): string | null =>
  key.startsWith(prefix) ? key.slice(prefix.length) : null;

const koiCard = (
  descriptor: KoiDescriptor,
  koi: OwnedKoi,
  reading: FishReading,
  now: Date
): FishCard => {
  const { genome } = koi;
  const variety = varietyOf(genome);
  const growth = growthOf('koi', koi, now);

  return {
    key: descriptor.key,
    kind: 'koi',
    name: koi.name,
    nameMeaning: nameMeaning(koi.name),
    species: koiTitle(genome),
    kanji: variety.kanji,
    speciesMeaning: variety.meaning,
    group: groupName(genome),
    rarity: koiRarity(genome),
    traits: traitsOf(genome),
    personality: personalityOf(reading.traits),
    blurb: variety.blurb,
    ageClass: koiAgeClass(growth.ageYears).name,
    lengthCm: growth.lengthCm,
    adultCm: koi.adultCm,
    worth: growth.value,
    appraised: false,
    paid: koi.price,
    perDay: growth.valuePerDay,
    acquiredAt: koi.acquiredAt,
    branch: null,
    activity: reading.activity,
    genome
  };
};

const goldfishCard = (
  descriptor: KoiDescriptor,
  fish: OwnedGoldfish,
  reading: FishReading,
  now: Date
): FishCard => {
  const breed = goldfishOf(fish.genome);
  const growth = growthOf('goldfish', fish, now);

  return {
    key: descriptor.key,
    kind: 'goldfish',
    name: fish.name,
    nameMeaning: null,
    species: breed.name,
    kanji: breed.kanji ?? null,
    speciesMeaning: breed.origin ?? null,
    group: null,
    rarity: null,
    traits: [],
    personality: personalityOf(reading.traits),
    blurb: breed.blurb,
    ageClass: null,
    lengthCm: growth.lengthCm,
    adultCm: fish.adultCm,
    worth: growth.value,
    appraised: false,
    paid: fish.price,
    perDay: growth.valuePerDay,
    acquiredAt: fish.acquiredAt,
    branch: null,
    activity: reading.activity,
    genome: fish.genome
  };
};

/**
 * A branch koi or a resident: named off its seed, and appraised as the
 * variety its markings are drawn from, at the size it swims at.
 */
const pondKoiCard = (descriptor: KoiDescriptor, reading: FishReading): FishCard => {
  const variety =
    findVariety(PATTERN_VARIETIES[reading.pattern] ?? 'kohaku') ?? findVariety('kohaku')!;
  const genome: KoiGenome = { variety: variety.id, modifiers: [], seed: descriptor.seed };
  const adultCm = Math.max(koiAdultCm(variety.id, descriptor.seed), reading.lengthCm);
  const name = pondNameFor(descriptor.seed);
  // A branch koi is keyed by its branch; a market fish's label is only its name.
  const branch = descriptor.label === descriptor.key ? descriptor.label : null;

  return {
    key: descriptor.key,
    kind: branch ? 'branch' : 'resident',
    name,
    nameMeaning: nameMeaning(name),
    species: variety.name,
    kanji: variety.kanji,
    speciesMeaning: variety.meaning,
    group: groupName(genome),
    rarity: variety.rarity,
    traits: [],
    personality: personalityOf(reading.traits),
    blurb: variety.blurb,
    ageClass: koiAgeClass(ageAtLength('koi', reading.lengthCm, adultCm)).name,
    lengthCm: reading.lengthCm,
    adultCm: null,
    worth: priceFor(genome, variety, (descriptor.seed % 100) / 100, reading.lengthCm),
    appraised: true,
    paid: null,
    perDay: 0,
    acquiredAt: null,
    branch,
    activity: reading.activity,
    genome: null
  };
};

/**
 * Builds the card for one fish in the pond.
 *
 * @param descriptor - The fish's roster entry.
 * @param owned - The visitor's fish, where a market fish's history is kept.
 * @param reading - What the pond knows about it right now.
 * @param now - When it was clicked, which sets how far a bought fish has grown.
 */
export const fishCardFor = (
  descriptor: KoiDescriptor,
  owned: { koi: readonly OwnedKoi[]; goldfish: readonly OwnedGoldfish[] },
  reading: FishReading,
  now: Date = new Date()
): FishCard => {
  const koiId = listingId(descriptor.key, 'market:');
  const goldfishId = listingId(descriptor.key, 'goldfish:');
  const koi = koiId === null ? undefined : owned.koi.find((fish) => fish.id === koiId);
  const goldfish =
    goldfishId === null ? undefined : owned.goldfish.find((fish) => fish.id === goldfishId);

  if (koi) {
    return koiCard(descriptor, koi, reading, now);
  }

  if (goldfish && isGoldfish(goldfish.genome)) {
    return goldfishCard(descriptor, goldfish, reading, now);
  }

  return pondKoiCard(descriptor, reading);
};

/** What a fish is up to, the way the card says it. */
export const ACTIVITY_LABELS: Readonly<Record<FishActivity, string>> = {
  cruising: 'Cruising the pond',
  resting: 'Resting in the water',
  curious: 'Checking out a ripple',
  feeding: 'Chasing food',
  leaving: 'Heading off'
};

/** "Nisai · 42 cm, could reach 71 cm": its size the way a dealer's tag reads it. */
export const sizeLine = (card: Pick<FishCard, 'ageClass' | 'lengthCm' | 'adultCm'>): string => {
  const now = [card.ageClass, formatCm(card.lengthCm)].filter(Boolean).join(' · ');

  return card.adultCm !== null && Math.round(card.adultCm) > Math.round(card.lengthCm)
    ? `${now}, could reach ${formatCm(card.adultCm)}`
    : now;
};
