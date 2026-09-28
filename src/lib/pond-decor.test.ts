import { describe, expect, it } from 'vitest';
import {
  LILY_COUNT,
  layoutDecor,
  renderBed,
  renderLilies,
  sanitizeLilyPlacements
} from './pond-decor';

describe('the pond’s furniture', () => {
  it('lays the same pond out for the same viewport', () => {
    expect(layoutDecor(1400, 900, 150)).toEqual(layoutDecor(1400, 900, 150));
  });

  it('keeps everything in the pond, and out of the middle where the panel sits', () => {
    const { stones, lilies } = layoutDecor(1400, 900, 150);

    for (const item of [...stones, ...lilies]) {
      expect(item.x).toBeGreaterThan(0);
      expect(item.x).toBeLessThan(1400);
      expect(item.y).toBeGreaterThan(0);
      expect(item.y).toBeLessThan(900);
      // The panel is centred; the furniture keeps to the outer fifths.
      expect(Math.abs(item.x - 700)).toBeGreaterThan(1400 * 0.3);
    }
  });

  it('grows with the koi, so a lily is always in proportion to the fish under it', () => {
    const small = layoutDecor(1400, 900, 100);
    const large = layoutDecor(1400, 900, 200);

    expect(large.lilies[0]!.radius).toBeCloseTo(small.lilies[0]!.radius * 2);
    expect(large.stones[0]!.radius).toBeCloseTo(small.stones[0]!.radius * 2);
  });

  it('has a lily in flower', () => {
    expect(layoutDecor(1400, 900, 150).lilies.some((lily) => lily.bloom === 'flower')).toBe(true);
  });

  it('draws nothing, rather than failing, where there is no canvas to draw on', () => {
    const decor = layoutDecor(1400, 900, 150);

    expect(renderBed(decor, 1400, 900, 1)).toBeNull();
    expect(renderLilies(decor, 1)).toEqual([]);
  });

  it('floats a lily the visitor moved to where they left it, and leaves the rest alone', () => {
    const own = layoutDecor(1400, 900, 150);
    const placed = layoutDecor(1400, 900, 150, [null, { x: 0.5, y: 0.25 }]);

    expect(placed.lilies[1]).toMatchObject({ x: 700, y: 225 });
    expect(placed.lilies[0]).toEqual(own.lilies[0]);
    expect(placed.lilies[2]).toEqual(own.lilies[2]);
    expect(placed.stones).toEqual(own.stones);
  });

  it('keeps a placement where it was put across a resize, as a share of the viewport', () => {
    const placed = layoutDecor(700, 450, 150, [{ x: 0.5, y: 0.25 }]);

    expect(placed.lilies[0]).toMatchObject({ x: 350, y: 112.5 });
  });
});

describe('stored lily placements', () => {
  it('keeps valid placements and drops anything it can’t use', () => {
    expect(
      sanitizeLilyPlacements([{ x: 0.2, y: 0.3 }, null, { x: 'a', y: 1 }, 7, { x: 1.4, y: -2 }])
    ).toEqual([{ x: 0.2, y: 0.3 }, null, null, null, { x: 1, y: 0 }]);
  });

  it('holds no more placements than there are lilies', () => {
    const many = Array.from({ length: LILY_COUNT + 3 }, () => ({ x: 0.5, y: 0.5 }));

    expect(sanitizeLilyPlacements(many)).toHaveLength(LILY_COUNT);
  });

  it('treats anything that isn’t a list as no placements at all', () => {
    expect(sanitizeLilyPlacements({ x: 0.5, y: 0.5 })).toEqual([]);
    expect(sanitizeLilyPlacements(null)).toEqual([]);
  });
});
