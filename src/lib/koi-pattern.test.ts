import { describe, expect, it } from 'vitest';
import { buildPattern, type KoiPatch } from './koi-pattern';
import { hashString } from './koi-roster';

const SEED = hashString('feat/BRF-1-add-user-authentication');

const extent = (patch: KoiPatch, axis: 'station' | 'across'): number => {
  const values = patch.outline.map((point) => point[axis]);
  return Math.max(...values) - Math.min(...values);
};

describe('buildPattern', () => {
  it('gives the same seed the same markings every time', () => {
    expect(buildPattern('kohaku', SEED)).toEqual(buildPattern('kohaku', SEED));
  });

  it('gives different koi different markings', () => {
    expect(buildPattern('kohaku', SEED)).not.toEqual(buildPattern('kohaku', SEED + 1));
  });

  it('writes a kohaku in one colour and a sanke in two', () => {
    const kohaku = buildPattern('kohaku', SEED);
    const sanke = buildPattern('sanke', SEED);

    expect(new Set(kohaku.map((patch) => patch.layer))).toEqual(new Set([0]));
    expect(new Set(sanke.map((patch) => patch.layer))).toEqual(new Set([0, 1]));
    expect(sanke.length).toBeGreaterThan(kohaku.length);
  });

  it('keeps every marking on the body', () => {
    for (const patch of buildPattern('showa', SEED)) {
      for (const point of patch.outline) {
        // Some overhang is expected — warp pushes outlines past their centre and
        // the renderer clips to the silhouette — but nothing should be adrift.
        expect(point.station).toBeGreaterThan(-0.3);
        expect(point.station).toBeLessThan(1.3);
        expect(Math.abs(point.across)).toBeLessThan(3);
      }
    }
  });

  it('reaches far enough across the body to read as a saddle', () => {
    // Regression: the recipes measure spans in turns around the body, and only
    // a quarter turn is visible from above. Forgetting that conversion made
    // every marking a quarter of its proper width and the shoal looked plain.
    for (const patch of buildPattern('kohaku', SEED)) {
      expect(extent(patch, 'across')).toBeGreaterThan(0.8);
    }
  });

  it('does not shear a marking into a diagonal stripe', () => {
    // Regression: rotating in raw body coordinates, where a step of station is
    // ~9x a step of across in pixels, sheared every patch into racing livery.
    // A saddle is wider across the body than it is long.
    for (const patch of buildPattern('kohaku', SEED)) {
      expect(extent(patch, 'station')).toBeLessThan(0.45);
    }
  });

  it('breaks every outline up rather than leaving it elliptical', () => {
    const radii = buildPattern('kohaku', SEED)[0]!.outline.map((point) =>
      Math.hypot(point.station, point.across)
    );

    expect(new Set(radii).size).toBeGreaterThan(1);
  });
});
