import { describe, expect, it } from 'vitest';
import type { RecentBranch } from '../types';
import { MAX_KOI } from './koi';
import type { OwnedKoi } from './koi-account';
import { resolveLook } from './koi-genome';
import { buildKoiRoster } from './koi-roster';

const branch = (value: string): RecentBranch => ({ value, createdAt: '2026-09-01T00:00:00.000Z' });

const owned = (id: string, seed = 7): OwnedKoi => ({
  id,
  name: `Koi ${id}`,
  genome: { variety: 'tancho', modifiers: [], seed },
  price: 300,
  acquiredAt: '2026-09-23T00:00:00.000Z'
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
});
