import { describe, expect, it } from 'vitest';
import type { KoiTraits } from '../vendor/koi-pond/model/types';
import {
  headingTo,
  insidePond,
  isOpenWater,
  nearestTo,
  noticeDelay,
  tooShyToLook
} from './koi-attention';

const traits = (shyness: number): KoiTraits => ({
  cruiseSpeed: 0.5,
  shyness,
  socialAffinity: 0.5,
  awareness: 0.5,
  directionalCaution: 0.5,
  depthWillingness: 0.5,
  reactionIntensity: 0.5,
  turnResponsiveness: 0.5
});

describe('noticing', () => {
  it('lets the bold notice before the shy', () => {
    expect(noticeDelay(traits(0.1), 0.5)).toBeLessThan(noticeDelay(traits(0.9), 0.5));
  });

  it('puts an eager eater ahead of everyone', () => {
    expect(noticeDelay(traits(0.5), 0.5, true)).toBeLessThan(noticeDelay(traits(0.1), 0.5));
  });

  it('never keeps a koi waiting long, and never has it turn before it could have seen', () => {
    for (const shyness of [0, 0.5, 1]) {
      for (const draw of [0, 0.99]) {
        const delay = noticeDelay(traits(shyness), draw);
        expect(delay).toBeGreaterThan(0.2);
        expect(delay).toBeLessThan(2.5);
      }
    }
  });

  it('leaves the very shyest to keep their distance', () => {
    expect(tooShyToLook(traits(0.95))).toBe(true);
    expect(tooShyToLook(traits(0.6))).toBe(false);
  });
});

describe('finding the way', () => {
  it('heads along the pond’s own compass: +x is 0, and down the screen is positive', () => {
    expect(headingTo({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0);
    expect(headingTo({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(Math.PI / 2);
  });

  it('picks the nearest pellet, and nothing from nothing', () => {
    const pellets = [
      { id: 1, x: 100, y: 100 },
      { id: 2, x: 12, y: 8 },
      { id: 3, x: -40, y: 0 }
    ];

    expect(nearestTo({ x: 0, y: 0 }, pellets)?.id).toBe(2);
    expect(nearestTo({ x: 0, y: 0 }, [])).toBeNull();
  });

  it('keeps a point of interest far enough inside the pond to stay in view', () => {
    const pond = { width: 800, height: 600 };

    expect(insidePond({ x: -50, y: 900 }, pond, 60)).toEqual({ x: 60, y: 540 });
    expect(insidePond({ x: 400, y: 300 }, pond, 60)).toEqual({ x: 400, y: 300 });
  });
});

describe('isOpenWater', () => {
  it('counts the page around the panel as water, and the panel and its controls as not', () => {
    document.body.innerHTML = `
      <main class="app-shell">
        <section class="panel"><p>Branchify</p><button type="button">Copy</button></section>
        <div class="settings-backdrop"><div role="dialog">Market</div></div>
      </main>`;

    expect(isOpenWater(document.querySelector('main'))).toBe(true);
    expect(isOpenWater(document.body)).toBe(true);
    expect(isOpenWater(document.querySelector('.panel p'))).toBe(false);
    expect(isOpenWater(document.querySelector('button'))).toBe(false);
    expect(isOpenWater(document.querySelector('.settings-backdrop'))).toBe(false);
    expect(isOpenWater(document.querySelector('[role="dialog"]'))).toBe(false);
  });
});
