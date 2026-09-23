import { describe, expect, it } from 'vitest';
import { layoutDecor, renderBed, renderLilies } from './pond-decor';

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
});
