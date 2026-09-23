import { describe, expect, it } from 'vitest';
import {
  createKoiBrain,
  exitHeading,
  hasLeftPond,
  pondFor,
  profileFor,
  type KoiEntry,
  type PondIsland
} from './koi3d';
import { hashString } from './koi-roster';

const POND = pondFor(1400, 900, false);
const ISLAND: PondIsland = { x: 340, y: 120, width: 720, height: 660 };

const entry = (branch: string, accent = '#42b883'): KoiEntry => ({
  key: branch,
  seed: hashString(branch),
  accent
});

/** Swims one koi and reports where it went. */
const swim = (
  koi: KoiEntry,
  seconds: number,
  island: PondIsland | null = null
): { path: { x: number; y: number }[]; distance: number } => {
  const { motion } = createKoiBrain(koi, POND, () => island);
  const path: { x: number; y: number }[] = [];
  let distance = 0;
  let previous = { ...motion.state.position };

  for (let frame = 0; frame < seconds * 60; frame += 1) {
    motion.advance(1 / 60);
    const here = { ...motion.state.position };
    distance += Math.hypot(here.x - previous.x, here.y - previous.y);
    previous = here;

    if (frame % 30 === 0) {
      path.push(here);
    }
  }

  return { path, distance };
};

const spread = (path: { x: number; y: number }[]): { width: number; height: number } => {
  const xs = path.map((point) => point.x);
  const ys = path.map((point) => point.y);

  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
};

describe('profileFor', () => {
  it('wears the branch colour as its marking, over natural koi tones', () => {
    const profile = profileFor(entry('feat/green', '#42b883'));

    expect(profile.palette.marking).toBe('#42b883');
    expect(profile.palette.accent).toBe('#42b883');
    // The ground and second marking stay the variety's own, not the branch's.
    expect(profile.palette.body).not.toBe('#42b883');
    expect(profile.palette.shade).not.toBe('#42b883');
  });

  it('gives the same branch the same fish every time', () => {
    expect(profileFor(entry('feat/stable'))).toEqual(profileFor(entry('feat/stable')));
  });

  it('gives different branches different builds and varieties', () => {
    const profiles = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => profileFor(entry(name)));

    expect(new Set(profiles.map((profile) => profile.framework)).size).toBeGreaterThan(1);
    expect(new Set(profiles.map((profile) => profile.palette.pattern)).size).toBeGreaterThan(1);
  });
});

describe('a koi swimming', () => {
  it('roams the pond rather than circling', () => {
    // The whole point of vendoring the library's brain: the first attempt
    // steered by nudging the current heading, which turns at a constant rate
    // and draws a circle. A roaming koi covers real ground on both axes.
    const { path, distance } = swim(entry('feat/roam'), 120);
    const covered = spread(path);

    expect(distance).toBeGreaterThan(1000);
    expect(covered.width).toBeGreaterThan(POND.width * 0.25);
    expect(covered.height).toBeGreaterThan(POND.height * 0.25);
  });

  it('does not retrace the same loop', () => {
    // A circling koi returns to where it was a lap ago; a roaming one does not.
    const { path } = swim(entry('fix/loop'), 120);
    const half = Math.floor(path.length / 2);
    const early = path.slice(0, half);
    const late = path.slice(half);
    const revisits = late.filter((point) =>
      early.some((seen) => Math.hypot(point.x - seen.x, point.y - seen.y) < 20)
    );

    expect(revisits.length).toBeLessThan(late.length * 0.5);
  });

  it('stays in the pond', () => {
    const { path } = swim(entry('chore/bounds'), 120);

    for (const point of path) {
      expect(point.x).toBeGreaterThan(-POND.margin);
      expect(point.x).toBeLessThan(POND.width + POND.margin);
      expect(point.y).toBeGreaterThan(-POND.margin);
      expect(point.y).toBeLessThan(POND.height + POND.margin);
    }
  });

  it('keeps clear of the panel', () => {
    const { path } = swim(entry('docs/panel'), 120, ISLAND);
    const under = path.filter(
      (point) =>
        point.x > ISLAND.x &&
        point.x < ISLAND.x + ISLAND.width &&
        point.y > ISLAND.y &&
        point.y < ISLAND.y + ISLAND.height
    );

    // Brushing the edge while turning off it is fine; living under it is not.
    expect(under.length).toBeLessThan(path.length * 0.1);
  });

  it('still swims freely when there is no panel', () => {
    const { distance } = swim(entry('docs/panel'), 120);

    expect(distance).toBeGreaterThan(1000);
  });
});

describe('market koi in the pond', () => {
  const marketEntry = (variety: 'chagoi' | 'tancho', seed: number): KoiEntry => ({
    key: `market:${seed}`,
    seed,
    accent: '#ffffff',
    genome: { variety, modifiers: [], seed }
  });

  it('builds a market koi on its variety’s body, not the branch archetype', () => {
    expect(profileFor(marketEntry('chagoi', 3)).framework).toBe('react');
    expect(profileFor(marketEntry('chagoi', 4)).framework).toBe('react');
  });
});

describe('arrivals and departures', () => {
  it('starts an arriving koi just out of sight, and swims it into view', () => {
    const { motion } = createKoiBrain(entry('feat/new'), POND, () => null, { arriving: true });
    const start = motion.state.position;

    expect(start.x < 0 || start.x > POND.width).toBe(true);

    for (let frame = 0; frame < 6 * 60; frame += 1) {
      motion.advance(1 / 60);
    }

    const { x, y } = motion.state.position;
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(POND.width);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(POND.height);
  });

  it('swims a departing koi out through the nearer side until it has left the pond', () => {
    let exit: { heading: number; secondsLeft: number } | null = null;
    const { motion } = createKoiBrain(entry('feat/old'), POND, () => ISLAND, {
      readExit: () => exit
    });

    for (let frame = 0; frame < 60; frame += 1) {
      motion.advance(1 / 60);
    }

    exit = { heading: exitHeading(motion.state.position, POND.width), secondsLeft: 9 };
    let seconds = 0;

    while (!hasLeftPond(motion.state.position, motion.state.length, POND) && seconds < 20) {
      motion.advance(1 / 60);
      seconds += 1 / 60;
    }

    expect(hasLeftPond(motion.state.position, motion.state.length, POND)).toBe(true);
    expect(seconds).toBeLessThan(15);
  });

  it('heads for whichever side is nearer', () => {
    expect(exitHeading({ x: 100 }, 1000)).toBe(Math.PI);
    expect(exitHeading({ x: 900 }, 1000)).toBe(0);
  });

  it('only counts a koi as gone once it is clear of every edge', () => {
    expect(hasLeftPond({ x: 500, y: 400 }, 100, POND)).toBe(false);
    expect(hasLeftPond({ x: -10, y: 400 }, 100, POND)).toBe(false);
    expect(hasLeftPond({ x: -130, y: 400 }, 100, POND)).toBe(true);
    expect(hasLeftPond({ x: 500, y: POND.height + 130 }, 100, POND)).toBe(true);
  });
});
