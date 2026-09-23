import { describe, expect, it } from 'vitest';
import { MAX_PELLETS, PELLET_FLOAT_S, createPondSurface } from './pond-surface';

const surfaceOf = (width = 800, height = 600) => {
  const surface = createPondSurface(7);
  surface.resize(width, height);
  return surface;
};

describe('the pond surface', () => {
  it('scatters a handful of pellets around where it was touched', () => {
    const surface = surfaceOf();
    const landed = surface.scatter(400, 300, 50);
    const food = surface.food();

    expect(landed).toBeGreaterThanOrEqual(6);
    expect(landed).toBeLessThanOrEqual(9);
    expect(food).toHaveLength(landed);

    for (const pellet of food) {
      expect(Math.hypot(pellet.x - 400, pellet.y - 300)).toBeLessThanOrEqual(50);
    }

    expect(new Set(food.map((pellet) => pellet.id)).size).toBe(landed);
  });

  it('keeps pellets on the water, even when thrown at its edge', () => {
    const surface = surfaceOf();
    surface.scatter(2, 598, 60);

    for (let second = 0; second < 10; second += 1) {
      surface.step(1);
    }

    for (const pellet of surface.food()) {
      expect(pellet.x).toBeGreaterThanOrEqual(0);
      expect(pellet.x).toBeLessThanOrEqual(800);
      expect(pellet.y).toBeGreaterThanOrEqual(0);
      expect(pellet.y).toBeLessThanOrEqual(600);
    }
  });

  it('lets a koi eat a pellet, once', () => {
    const surface = surfaceOf();
    surface.scatter(400, 300, 50);
    const [first] = surface.food();

    surface.eat(first!.id);
    surface.eat(first!.id);

    expect(surface.food().map((pellet) => pellet.id)).not.toContain(first!.id);
  });

  it('stops offering pellets to the koi once they start to sink, and then clears them', () => {
    const surface = surfaceOf();
    surface.scatter(400, 300, 50);

    surface.step(PELLET_FLOAT_S + 0.5);
    expect(surface.food()).toHaveLength(0);
    expect(surface.busy).toBe(true);

    surface.step(10);
    expect(surface.busy).toBe(false);
  });

  it('never lets the pond turn into a trough', () => {
    const surface = surfaceOf();

    for (let handful = 0; handful < 20; handful += 1) {
      surface.scatter(400, 300, 50);
    }

    expect(surface.food().length).toBeLessThanOrEqual(MAX_PELLETS);
  });

  it('lets a ripple spread and fade', () => {
    const surface = surfaceOf();
    surface.ripple(100, 100);

    expect(surface.busy).toBe(true);
    surface.step(3);
    expect(surface.busy).toBe(false);
  });
});
