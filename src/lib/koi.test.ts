import { describe, expect, it } from 'vitest';
import {
  SPINE_JOINTS,
  advanceSpine,
  createSpine,
  spineGirth,
  turnToward,
  wanderOffset,
  widthProfile,
  wrapAngle
} from './koi';

const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe('wrapAngle', () => {
  it('folds any angle into [-PI, PI]', () => {
    for (const angle of [0, 3, -3, 7, -7, 100]) {
      expect(Math.abs(wrapAngle(angle))).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
  });

  it('leaves an angle already in range alone', () => {
    expect(wrapAngle(1)).toBeCloseTo(1);
  });
});

describe('turnToward', () => {
  it('never turns further than the limit allows', () => {
    expect(turnToward(0, Math.PI / 2, 0.1)).toBeCloseTo(0.1);
  });

  it('turns the short way around the circle', () => {
    // Just below +PI to just above -PI is a hair forward, not the long way back.
    const turned = turnToward(3.1, -3.1, 1);

    expect(turned).toBeCloseTo(-3.1);
    expect(Math.abs(wrapAngle(turned - 3.1))).toBeLessThan(0.1);
  });

  it('settles exactly on the target once within reach', () => {
    expect(turnToward(0, 0.05, 1)).toBeCloseTo(0.05);
  });
});

describe('wanderOffset', () => {
  it('stays within the combined amplitude of its two sines', () => {
    for (let t = 0; t < 120; t += 0.5) {
      expect(Math.abs(wanderOffset(1.234, t))).toBeLessThanOrEqual(1);
    }
  });

  it('detunes one koi from another', () => {
    expect(wanderOffset(1, 10)).not.toBeCloseTo(wanderOffset(2, 10));
  });
});

describe('widthProfile', () => {
  it('is widest through the shoulders and narrow at both ends', () => {
    expect(widthProfile(0.35)).toBe(1);
    expect(widthProfile(0)).toBeLessThan(0.3);
    expect(widthProfile(1)).toBeLessThan(0.15);
  });

  it('clamps out-of-range positions', () => {
    expect(widthProfile(-1)).toBe(widthProfile(0));
    expect(widthProfile(2)).toBe(widthProfile(1));
  });
});

describe('spineGirth', () => {
  it('returns one half-width per joint, none wider than the beam', () => {
    const girths = spineGirth(100, 0.12);

    expect(girths).toHaveLength(SPINE_JOINTS);
    expect(Math.max(...girths)).toBeCloseTo(12);
  });
});

describe('createSpine', () => {
  it('lays the body out behind the nose at even spacing', () => {
    const spine = createSpine({ x: 100, y: 100 }, 0, 110);
    const link = 110 / (SPINE_JOINTS - 1);

    expect(spine.joints).toHaveLength(SPINE_JOINTS);
    expect(spine.joints[0]).toEqual({ x: 100, y: 100 });
    // Heading 0 is +x, so the body trails off to -x.
    expect(spine.joints[1]!.x).toBeCloseTo(100 - link);
    expect(distance(spine.joints[0]!, spine.joints[1]!)).toBeCloseTo(link);
  });
});

describe('advanceSpine', () => {
  const step = (nose: { x: number; y: number }, dt = 1 / 60) => ({
    nose,
    length: 110,
    speed: 30,
    phase: 'relaxed' as const,
    dt,
    reducedMotion: false
  });

  it('keeps the joints a fixed distance apart as the nose moves', () => {
    let spine = createSpine({ x: 0, y: 0 }, 0, 110);
    const link = 110 / (SPINE_JOINTS - 1);

    for (let frame = 1; frame <= 60; frame += 1) {
      spine = advanceSpine(spine, step({ x: frame * 2, y: Math.sin(frame / 10) * 20 }));
    }

    for (let index = 1; index < SPINE_JOINTS; index += 1) {
      expect(distance(spine.centreline[index - 1]!, spine.centreline[index]!)).toBeCloseTo(link);
    }
  });

  it('puts the nose exactly where it was told to', () => {
    const spine = advanceSpine(createSpine({ x: 0, y: 0 }, 0, 110), step({ x: 5, y: 5 }));

    expect(spine.joints[0]).toEqual({ x: 5, y: 5 });
  });

  it('swings the tail further than the shoulders', () => {
    let spine = createSpine({ x: 0, y: 0 }, 0, 110);
    let tailSwing = 0;
    let shoulderSwing = 0;

    for (let frame = 1; frame <= 120; frame += 1) {
      spine = advanceSpine(spine, step({ x: frame, y: 0 }));
      tailSwing = Math.max(
        tailSwing,
        Math.abs(spine.joints[SPINE_JOINTS - 1]!.y - spine.centreline[SPINE_JOINTS - 1]!.y)
      );
      shoulderSwing = Math.max(
        shoulderSwing,
        Math.abs(spine.joints[2]!.y - spine.centreline[2]!.y)
      );
    }

    expect(tailSwing).toBeGreaterThan(shoulderSwing);
  });

  it('damps the beat under reduced motion', () => {
    const start = createSpine({ x: 0, y: 0 }, 0, 110);
    const lively = advanceSpine(start, step({ x: 1, y: 0 }));
    const damped = advanceSpine(start, { ...step({ x: 1, y: 0 }), reducedMotion: true });

    expect(damped.wavePhase).toBeLessThan(lively.wavePhase);
  });

  it('survives a nose that has not moved at all', () => {
    const spine = advanceSpine(createSpine({ x: 0, y: 0 }, 0, 110), step({ x: 0, y: 0 }));

    expect(
      spine.joints.every((joint) => Number.isFinite(joint.x) && Number.isFinite(joint.y))
    ).toBe(true);
  });

  it('does not divide by zero on a zero-length body', () => {
    const spine = advanceSpine(createSpine({ x: 0, y: 0 }, 0, 0), {
      ...step({ x: 1, y: 1 }),
      length: 0
    });

    expect(Number.isFinite(spine.wavePhase)).toBe(true);
  });
});
