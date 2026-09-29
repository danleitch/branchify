import { describe, expect, it } from 'vitest';
import type { KoiTraits } from '../vendor/koi-pond/model/types';
import type { OwnedGoldfish, OwnedKoi } from './koi-account';
import {
  fishCardFor,
  marketFishOf,
  personalityOf,
  pondNameFor,
  sizeLine,
  type FishReading
} from './koi-inspect';
import { KOI_NAMES } from './koi-market';
import { buildKoiRoster } from './koi-roster';

const NOW = new Date('2026-03-10T12:00:00.000Z');

const EVEN: KoiTraits = {
  cruiseSpeed: 0.5,
  shyness: 0.5,
  socialAffinity: 0.5,
  awareness: 0.5,
  directionalCaution: 0.5,
  depthWillingness: 0.5,
  reactionIntensity: 0.5,
  turnResponsiveness: 0.5
};

const reading = (patch: Partial<FishReading> = {}): FishReading => ({
  traits: EVEN,
  pattern: 'kohaku',
  lengthCm: 48,
  activity: 'cruising',
  ...patch
});

const koi: OwnedKoi = {
  id: '2026-03-01#0.0.0',
  name: 'Hana',
  genome: { variety: 'showa', modifiers: ['ginrin'], seed: 42 },
  price: 400,
  lengthCm: 30,
  adultCm: 70,
  acquiredAt: '2026-03-01T09:00:00.000Z'
};

const goldfish: OwnedGoldfish = {
  id: '2026-03-02#g.0',
  name: 'Pip',
  genome: { species: 'goldfish', variety: 'comet', seed: 7 },
  price: 20,
  lengthCm: 9,
  adultCm: 25,
  acquiredAt: '2026-03-02T09:00:00.000Z'
};

describe('personalityOf', () => {
  it('calls an unremarkable fish easy-going', () => {
    expect(personalityOf(EVEN)).toEqual(['Easy-going']);
  });

  it('names the most pronounced traits first, at most three', () => {
    const words = personalityOf({
      ...EVEN,
      shyness: 0.95,
      socialAffinity: 0.1,
      cruiseSpeed: 0.8,
      awareness: 0.75
    });

    expect(words).toEqual(['Shy', 'Loner', 'Brisk swimmer']);
  });

  it('reads the low end of a trait as its own word', () => {
    expect(personalityOf({ ...EVEN, shyness: 0.1 })).toEqual(['Bold']);
  });
});

describe('pondNameFor', () => {
  it('gives the same fish the same name every time', () => {
    expect(pondNameFor(1234)).toBe(pondNameFor(1234));
    expect(KOI_NAMES.map(([name]) => name)).toContain(pondNameFor(1234));
  });
});

describe('fishCardFor', () => {
  it('reads a market koi from its genome and what it cost', () => {
    const [descriptor] = buildKoiRoster([], 0, [koi], [], NOW);
    const card = fishCardFor(descriptor!, { koi: [koi], goldfish: [] }, reading(), NOW);

    expect(card).toMatchObject({
      kind: 'koi',
      name: 'Hana',
      nameMeaning: 'flower',
      species: 'Gin Rin Showa Sanshoku',
      group: 'Gosanke',
      paid: 400,
      appraised: false,
      branch: null,
      genome: koi.genome
    });
    expect(card.traits.map((trait) => trait.label)).toEqual(['Gin Rin']);
    // A week and more in the pond has grown it, and its worth with it.
    expect(card.lengthCm).toBeGreaterThan(30);
    expect(card.worth).toBeGreaterThan(400);
    expect(card.ageClass).toBeTruthy();
  });

  it('reads a goldfish as its breed', () => {
    const descriptor = buildKoiRoster([], 0, [], [goldfish], NOW).find((fish) =>
      fish.key.startsWith('goldfish:')
    );
    const card = fishCardFor(descriptor!, { koi: [], goldfish: [goldfish] }, reading(), NOW);

    expect(card).toMatchObject({ kind: 'goldfish', name: 'Pip', species: 'Comet', paid: 20 });
    expect(card.rarity).toBeNull();
    expect(card.ageClass).toBeNull();
  });

  it('names and appraises a branch koi as the variety it is dressed in', () => {
    const [descriptor] = buildKoiRoster(
      [{ value: 'feat/BRF-1-add-auth', createdAt: '2026-01-01T00:00:00.000Z' }],
      0
    );
    const card = fishCardFor(
      descriptor!,
      { koi: [], goldfish: [] },
      reading({ pattern: 'sanke', activity: 'resting' }),
      NOW
    );

    expect(card).toMatchObject({
      kind: 'branch',
      branch: 'feat/BRF-1-add-auth',
      species: 'Taisho Sanke',
      appraised: true,
      paid: null,
      activity: 'resting',
      genome: null
    });
    expect(card.name).toBe(pondNameFor(descriptor!.seed));
    expect(card.worth).toBeGreaterThan(0);
  });

  it('calls a resident a resident', () => {
    const [descriptor] = buildKoiRoster([], 1);
    const card = fishCardFor(descriptor!, { koi: [], goldfish: [] }, reading(), NOW);

    expect(card.kind).toBe('resident');
    expect(card.branch).toBeNull();
  });

  it('falls back to a kohaku for a pattern the catalogue does not know', () => {
    const [descriptor] = buildKoiRoster([], 1);
    const card = fishCardFor(
      descriptor!,
      { koi: [], goldfish: [] },
      reading({ pattern: 'brand' }),
      NOW
    );

    expect(card.species).toBe('Kohaku');
  });

  it('treats a market key whose fish is gone as a plain pond koi rather than failing', () => {
    const [descriptor] = buildKoiRoster([], 0, [koi], [], NOW);
    const card = fishCardFor(descriptor!, { koi: [], goldfish: [] }, reading(), NOW);

    expect(card.kind).toBe('resident');
  });
});

describe('marketFishOf', () => {
  it('tells a bought fish from a branch koi or a resident', () => {
    expect(marketFishOf('market:2026-03-01#0.0.0')).toEqual({
      species: 'koi',
      id: '2026-03-01#0.0.0'
    });
    expect(marketFishOf('goldfish:2026-03-02#g.0')).toEqual({
      species: 'goldfish',
      id: '2026-03-02#g.0'
    });
    expect(marketFishOf('feat/BRF-1-add-auth')).toBeNull();
    expect(marketFishOf('resident-0')).toBeNull();
  });
});

describe('a given name', () => {
  it('replaces the seeded name on a branch koi and a resident, and no other', () => {
    const [branch] = buildKoiRoster(
      [{ value: 'feat/BRF-1-add-auth', createdAt: '2026-01-01T00:00:00.000Z' }],
      0
    );
    const [resident] = buildKoiRoster([], 1);
    const names = { 'feat/BRF-1-add-auth': 'Sir Splash', 'resident-0': 'Momo' };
    const owned = { koi: [], goldfish: [], names };

    expect(fishCardFor(branch!, owned, reading(), NOW).name).toBe('Sir Splash');
    expect(fishCardFor(resident!, owned, reading(), NOW).name).toBe('Momo');
    expect(fishCardFor(branch!, { koi: [], goldfish: [] }, reading(), NOW).name).toBe(
      pondNameFor(branch!.seed)
    );
  });

  it('gives a name the market knows its meaning', () => {
    const [resident] = buildKoiRoster([], 1);
    const card = fishCardFor(
      resident!,
      { koi: [], goldfish: [], names: { 'resident-0': 'Hana' } },
      reading(),
      NOW
    );

    expect(card.nameMeaning).toBe('flower');
  });

  it("does not touch a bought fish's own name", () => {
    const [descriptor] = buildKoiRoster([], 0, [koi], [], NOW);
    const card = fishCardFor(
      descriptor!,
      { koi: [koi], goldfish: [], names: { [descriptor!.key]: 'Nope' } },
      reading(),
      NOW
    );

    expect(card.name).toBe('Hana');
  });
});

describe('sizeLine', () => {
  it('says how big a fish could grow while it still has growing to do', () => {
    expect(sizeLine({ ageClass: 'Nisai', lengthCm: 42.2, adultCm: 71 })).toBe(
      'Nisai · 42 cm, could reach 71 cm'
    );
  });

  it('leaves out a size it has already reached, or never had', () => {
    expect(sizeLine({ ageClass: 'Hassai', lengthCm: 70.8, adultCm: 71 })).toBe('Hassai · 71 cm');
    expect(sizeLine({ ageClass: null, lengthCm: 12, adultCm: null })).toBe('12 cm');
  });
});
