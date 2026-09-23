import { describe, expect, it } from 'vitest';
import type { RecentBranch } from '../types';
import { POND_YEAR_DAYS } from './fish-growth';
import { MAX_GOLDFISH, MAX_KOI } from './koi';
import type { OwnedGoldfish, OwnedKoi } from './koi-account';
import { resolveLook } from './koi-genome';
import { buildKoiRoster } from './koi-roster';

const BOUGHT = '2026-09-23T00:00:00.000Z';
const NOW = new Date(BOUGHT);

const branch = (value: string): RecentBranch => ({ value, createdAt: '2026-09-01T00:00:00.000Z' });

const owned = (id: string, seed = 7): OwnedKoi => ({
  id,
  name: `Koi ${id}`,
  genome: { variety: 'tancho', modifiers: [], seed },
  price: 300,
  lengthCm: 30,
  adultCm: 75,
  acquiredAt: BOUGHT
});

const goldfish = (id: string, seed = 9): OwnedGoldfish => ({
  id,
  name: `Goldfish ${id}`,
  genome: { species: 'goldfish', variety: 'comet', seed },
  price: 8,
  lengthCm: 9,
  adultCm: 28,
  acquiredAt: BOUGHT
});

describe('buildKoiRoster with market koi', () => {
  it('swims only market koi once there are any: branches and residents rest', () => {
    const roster = buildKoiRoster([branch('feat/a'), branch('fix/b')], 5, [
      owned('1'),
      owned('2', 8)
    ]);

    expect(roster).toHaveLength(2);
    expect(roster.map((koi) => koi.label)).toEqual(['Koi 1', 'Koi 2']);
    expect(roster.every((koi) => koi.genome !== undefined)).toBe(true);
  });

  it('keys market koi apart from branches, so a koi named like a branch can’t collide', () => {
    const [koi] = buildKoiRoster([], 2, [owned('feat/a')]);

    expect(koi!.key).toBe('market:feat/a');
  });

  it('dresses a market koi in its variety for the 2D pond, too', () => {
    const [koi] = buildKoiRoster([], 2, [owned('1')]);

    expect(koi!.palette).toEqual(resolveLook(owned('1').genome).flat);
    expect(koi!.seed).toBe(7);
  });

  it('never exceeds the pond’s cap', () => {
    const many = Array.from({ length: MAX_KOI + 3 }, (_unused, index) => owned(`${index}`, index));

    expect(buildKoiRoster([], 2, many)).toHaveLength(MAX_KOI);
  });

  it('brings branch koi and residents back when the last market koi is released', () => {
    const roster = buildKoiRoster([branch('feat/a')], 3, []);

    expect(roster).toHaveLength(3);
    expect(roster[0]!.label).toBe('feat/a');
    expect(roster.every((koi) => koi.genome === undefined)).toBe(true);
  });

  it('puts a market koi in the water at the length it has grown to', () => {
    const [today] = buildKoiRoster([], 2, [owned('1')], [], NOW);
    const [yearOn] = buildKoiRoster(
      [],
      2,
      [owned('1')],
      [],
      new Date(NOW.getTime() + POND_YEAR_DAYS * 86_400_000)
    );

    expect(today!.lengthCm).toBe(30);
    expect(yearOn!.lengthCm).toBeGreaterThan(40);
  });
});

describe('buildKoiRoster with goldfish', () => {
  it('lets goldfish swim with the branch koi, without sending them to rest', () => {
    const roster = buildKoiRoster([branch('feat/a')], 2, [], [goldfish('g1')], NOW);

    expect(roster.map((fish) => fish.label)).toEqual(['feat/a', null, 'Goldfish g1']);
    expect(roster[2]!.key).toBe('goldfish:g1');
    expect(roster[2]!.lengthCm).toBe(9);
  });

  it('lets goldfish swim with market koi too, in their own room', () => {
    const koi = Array.from({ length: MAX_KOI }, (_unused, index) => owned(`${index}`, index));
    const shoal = Array.from({ length: MAX_GOLDFISH + 2 }, (_unused, index) =>
      goldfish(`g${index}`, index)
    );
    const roster = buildKoiRoster([branch('feat/a')], 2, koi, shoal, NOW);

    expect(roster).toHaveLength(MAX_KOI + MAX_GOLDFISH);
    expect(roster.filter((fish) => fish.key.startsWith('goldfish:'))).toHaveLength(MAX_GOLDFISH);
  });
});
