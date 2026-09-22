import { describe, expect, it } from 'vitest';
import { DEFAULT_BASE_FISH, MAX_KOI } from './koi';
import { buildKoiRoster, hashString, paletteForBranch, residentPalette } from './koi-roster';
import {
  MAX_LENGTH,
  MIN_LENGTH,
  createSwimmer,
  nominalLength,
  reconcilePond,
  stepSwimmer
} from './koi-pond';
import type { RecentBranch } from '../types';

const BOUNDS = { width: 1280, height: 800 };

const branch = (value: string, branchType?: string): RecentBranch => ({
  value,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...(branchType
    ? {
        form: { branchType, ticketNumber: '', description: value },
        separators: { typeSeparator: '/', ticketSeparator: '-' }
      }
    : {})
});

describe('buildKoiRoster', () => {
  it('keeps a couple of residents swimming when nothing has been saved', () => {
    const roster = buildKoiRoster([]);

    expect(roster).toHaveLength(DEFAULT_BASE_FISH);
    expect(roster.every((koi) => koi.label === null)).toBe(true);
  });

  it('tops a single branch up to the base fish count', () => {
    const roster = buildKoiRoster([branch('feat/one')]);

    expect(roster).toHaveLength(DEFAULT_BASE_FISH);
    expect(roster.filter((koi) => koi.label !== null)).toHaveLength(1);
  });

  it('swims one koi per recent branch once past the base count', () => {
    const roster = buildKoiRoster([branch('feat/a'), branch('fix/b'), branch('docs/c')]);

    expect(roster).toHaveLength(3);
    expect(roster.map((koi) => koi.label)).toEqual(['feat/a', 'fix/b', 'docs/c']);
  });

  it('never exceeds the pond cap regardless of how many branches are recent', () => {
    const many = Array.from({ length: 12 }, (_unused, index) => branch(`feat/branch-${index}`));

    expect(buildKoiRoster(many)).toHaveLength(MAX_KOI);
  });

  it('gives the same branch the same fish every time', () => {
    const [first] = buildKoiRoster([branch('feat/stable')]);
    const [again] = buildKoiRoster([branch('feat/stable')]);

    expect(first).toEqual(again);
  });

  it('colours every branch its own hue rather than one colour per type', () => {
    // Most projects are mostly `feat` branches; a type-keyed palette meant
    // almost every koi wore the same green. The colour now comes off the
    // branch's own seed, so two branches of the same type still differ.
    const [first] = buildKoiRoster([branch('feat/one', 'feat')]);
    const [second] = buildKoiRoster([branch('feat/two', 'feat')]);

    expect(first!.palette.marking).not.toBe(second!.palette.marking);
  });

  it('gives every branch a distinct hashed colour, as hex', () => {
    const spike = paletteForBranch(hashString('spike'));
    const chore = paletteForBranch(hashString('chore'));

    // Hex, not hsl(): depth mixes every colour toward the water, which needs
    // channels it can actually read.
    expect(spike.marking).toMatch(/^#[0-9a-f]{6}$/);
    expect(spike.marking).not.toBe(chore.marking);
  });

  it('dresses residents in natural tones rather than a branch colour', () => {
    const plain = residentPalette(hashString('resident-0'));
    const branded = paletteForBranch(hashString('resident-0'));

    expect(plain.marking).not.toBe(branded.marking);
  });

  describe('base fish count', () => {
    it('raises the floor when Settings asks for more residents', () => {
      const roster = buildKoiRoster([branch('feat/one')], 5);

      expect(roster).toHaveLength(5);
      expect(roster.filter((koi) => koi.label !== null)).toHaveLength(1);
    });

    it('lets branches outgrow the floor rather than capping at it', () => {
      const branches = Array.from({ length: 4 }, (_unused, index) => branch(`feat/${index}`));
      const roster = buildKoiRoster(branches, 2);

      expect(roster).toHaveLength(4);
      expect(roster.every((koi) => koi.label !== null)).toBe(true);
    });

    it('clamps a floor above the pond cap rather than growing past it', () => {
      expect(buildKoiRoster([], 999)).toHaveLength(MAX_KOI);
    });

    it('clamps a negative or fractional floor into range', () => {
      expect(buildKoiRoster([], -3)).toHaveLength(0);
      expect(buildKoiRoster([], 2.6)).toHaveLength(3);
    });
  });
});

describe('createSwimmer', () => {
  it('places the koi inside the pond', () => {
    const swimmer = createSwimmer(buildKoiRoster([])[0]!, BOUNDS);

    expect(swimmer.nose.x).toBeGreaterThan(0);
    expect(swimmer.nose.x).toBeLessThan(BOUNDS.width);
    expect(swimmer.nose.y).toBeLessThan(BOUNDS.height);
  });

  it('scales the koi to the pond, within limits', () => {
    expect(nominalLength({ width: 200, height: 200 })).toBe(MIN_LENGTH);
    expect(nominalLength({ width: 4000, height: 4000 })).toBe(MAX_LENGTH);
  });
});

describe('stepSwimmer', () => {
  const swim = (frames: number, bounds = BOUNDS) => {
    let swimmer = createSwimmer(buildKoiRoster([branch('feat/swim')])[0]!, bounds);
    let elapsed = 0;

    for (let frame = 0; frame < frames; frame += 1) {
      elapsed += 1 / 60;
      swimmer = stepSwimmer(swimmer, 1 / 60, elapsed, bounds, false);
    }

    return swimmer;
  };

  it('moves the koi and keeps it in the pond', () => {
    const swimmer = swim(60 * 60);

    expect(swimmer.nose.x).toBeGreaterThanOrEqual(0);
    expect(swimmer.nose.x).toBeLessThanOrEqual(BOUNDS.width);
    expect(swimmer.nose.y).toBeGreaterThanOrEqual(0);
    expect(swimmer.nose.y).toBeLessThanOrEqual(BOUNDS.height);
  });

  it('actually goes somewhere', () => {
    const start = createSwimmer(buildKoiRoster([branch('feat/swim')])[0]!, BOUNDS);
    const later = swim(120);

    expect(Math.hypot(later.nose.x - start.nose.x, later.nose.y - start.nose.y)).toBeGreaterThan(5);
  });

  it('reads as turning when it swings hard', () => {
    const swimmer = createSwimmer(buildKoiRoster([branch('feat/turn')])[0]!, BOUNDS);
    // Nose at the top-left corner: both banks push at once, so it must turn hard.
    const cornered = stepSwimmer(
      { ...swimmer, nose: { x: 1, y: 1 }, heading: Math.PI },
      1 / 60,
      0,
      BOUNDS,
      false
    );

    expect(cornered.phase).toBe('turning');
  });

  it('caps a long frame so a backgrounded tab cannot teleport the shoal', () => {
    const swimmer = createSwimmer(buildKoiRoster([branch('feat/gap')])[0]!, BOUNDS);
    const huge = stepSwimmer(swimmer, 30, 0.05, BOUNDS, false);
    const capped = stepSwimmer(swimmer, 0.05, 0.05, BOUNDS, false);

    expect(huge.nose).toEqual(capped.nose);
  });

  it('keeps every joint finite through a long swim', () => {
    const swimmer = swim(60 * 120);

    expect(
      swimmer.spine.joints.every((joint) => Number.isFinite(joint.x) && Number.isFinite(joint.y))
    ).toBe(true);
  });
});

describe('the panel as an island', () => {
  // A panel roughly where the real one sits: centred, tall, and wide enough
  // that the only water left is down either side.
  const ISLAND = { x: 340, y: 120, width: 720, height: 660 };
  const POND = { width: 1400, height: 900, island: ISLAND };

  const insideIsland = (swimmer: { nose: { x: number; y: number } }): boolean =>
    swimmer.nose.x > ISLAND.x &&
    swimmer.nose.x < ISLAND.x + ISLAND.width &&
    swimmer.nose.y > ISLAND.y &&
    swimmer.nose.y < ISLAND.y + ISLAND.height;

  const swimFor = (seconds: number) => {
    let pond = reconcilePond([], buildKoiRoster([branch('feat/a'), branch('fix/b')]), POND);
    let elapsed = 0;

    for (let frame = 0; frame < seconds * 60; frame += 1) {
      elapsed += 1 / 60;
      pond = pond.map((swimmer) => stepSwimmer(swimmer, 1 / 60, elapsed, POND, false));
    }

    return pond;
  };

  it('never starts a koi under the panel', () => {
    // Steering would clear them eventually; a visitor should not have to wait.
    const pond = reconcilePond(
      [],
      buildKoiRoster([branch('a'), branch('b'), branch('c'), branch('d'), branch('e')]),
      POND
    );

    expect(pond.some(insideIsland)).toBe(false);
  });

  it('clears every koi out from under the panel', () => {
    expect(swimFor(40).some(insideIsland)).toBe(false);
  });

  it('keeps them out rather than letting them drift back under', () => {
    // Sampled over a long swim: escaping once is not the same as staying out.
    let pond = reconcilePond([], buildKoiRoster([branch('feat/a'), branch('fix/b')]), POND);
    let elapsed = 0;
    let breaches = 0;

    for (let frame = 0; frame < 120 * 60; frame += 1) {
      elapsed += 1 / 60;
      pond = pond.map((swimmer) => stepSwimmer(swimmer, 1 / 60, elapsed, POND, false));

      if (frame > 40 * 60 && pond.some(insideIsland)) {
        breaches += 1;
      }
    }

    expect(breaches).toBe(0);
  });

  it('leaves the koi somewhere visible, not jammed into a corner', () => {
    for (const swimmer of swimFor(40)) {
      expect(swimmer.nose.x).toBeGreaterThan(0);
      expect(swimmer.nose.x).toBeLessThan(POND.width);
      expect(swimmer.nose.y).toBeGreaterThan(0);
      expect(swimmer.nose.y).toBeLessThan(POND.height);
    }
  });

  it('lets them roam freely when there is no panel', () => {
    const free = { width: 1400, height: 900 };
    let pond = reconcilePond([], buildKoiRoster([branch('feat/a')]), free);
    let elapsed = 0;

    for (let frame = 0; frame < 40 * 60; frame += 1) {
      elapsed += 1 / 60;
      pond = pond.map((swimmer) => stepSwimmer(swimmer, 1 / 60, elapsed, free, false));
    }

    expect(pond).toHaveLength(2);
  });
});

describe('reconcilePond', () => {
  it('leaves the other koi exactly where they were when one is added', () => {
    const first = reconcilePond([], buildKoiRoster([branch('feat/a'), branch('fix/b')]), BOUNDS);
    const moved = first.map((swimmer) => ({ ...swimmer, nose: { x: 42, y: 42 } }));
    const grown = reconcilePond(
      moved,
      buildKoiRoster([branch('feat/a'), branch('fix/b'), branch('docs/c')]),
      BOUNDS
    );

    expect(grown).toHaveLength(3);
    expect(grown.filter((swimmer) => swimmer.nose.x === 42)).toHaveLength(2);
  });

  it('drops a koi whose branch was removed', () => {
    const start = reconcilePond([], buildKoiRoster([branch('feat/a'), branch('fix/b')]), BOUNDS);
    const after = reconcilePond(start, buildKoiRoster([branch('feat/a')]), BOUNDS);

    expect(after.some((swimmer) => swimmer.descriptor.label === 'fix/b')).toBe(false);
  });

  it('draws the deepest koi first, so depth reads correctly', () => {
    const pond = reconcilePond([], buildKoiRoster([branch('a'), branch('b'), branch('c')]), BOUNDS);
    const depths = pond.map((swimmer) => swimmer.depth);

    expect(depths).toEqual([...depths].sort((a, b) => b - a));
  });

  it('washes a deeper koi toward the water rather than just fading it', () => {
    const pond = reconcilePond([], buildKoiRoster([branch('a'), branch('b'), branch('c')]), BOUNDS);
    const deepest = pond[0]!;
    const shallowest = pond[pond.length - 1]!;

    expect(deepest.palette.body).not.toBe(deepest.descriptor.palette.body);
    expect(shallowest.palette.body).not.toBe(deepest.palette.body);
  });
});
