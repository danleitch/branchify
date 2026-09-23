/**
 * The 3D pond: the real koi from the hyperfrontend demo, in one canvas.
 *
 * Everything that makes a koi a koi — the sculpted body, the skin and deform
 * shaders, the nishikigoi varieties, the swimming brain — is the vendored
 * library's, untouched. This module only does the two things Branchify needs
 * that the demo did differently.
 *
 * First, composition. There, every fish is its own browser app with its own
 * canvas and its own WebGL context, each narrowed onto that fish's frame box.
 * Here there is one app, so there is one context and one scene with every koi
 * mounted into it, rendered through the shared pond camera at full view. Five
 * WebGL contexts to draw five fish in one document would be waste.
 *
 * Second, the panel. The demo's pond is the whole page; ours has a form in the
 * middle of it. The brain's `desire` hook is the sanctioned way to lean a koi's
 * judgement, so the panel is applied there rather than by fighting the motion
 * model from outside.
 */
import { Scene } from 'three';
import { wrapAngle } from '../vendor/koi-pond/geometry/steering';
import { swimDepth } from '../vendor/koi-pond/model/depth';
import { POND_VIEW, pxPerUnit } from '../vendor/koi-pond/model/pond-view';
import { koiProfile } from '../vendor/koi-pond/model/traits';
import { DEPTH_LEVELS, SURFACE_DEPTH } from '../vendor/koi-pond/model/types';
import type {
  KoiFramework,
  KoiPalette,
  KoiProfile,
  KoiTraits,
  PondEnvironment
} from '../vendor/koi-pond/model/types';
import { createKoiMotion } from '../vendor/koi-pond/motion/koi-motion';
import type { KoiDesire, KoiMotion, KoiSteerContext } from '../vendor/koi-pond/motion/koi-motion';
import { createKoi } from '../vendor/koi-pond/three/koi';
import type { Koi } from '../vendor/koi-pond/three/koi';
import {
  createPondRenderer,
  createPondView,
  sizePondRenderer
} from '../vendor/koi-pond/three/pond-view';
import type { PondView } from '../vendor/koi-pond/three/pond-view';
import { createLighting } from '../vendor/koi-pond/three/scene';
import {
  ARRIVED_REACH,
  BITE_REACH,
  CURIOUS_GAIN,
  CURIOUS_S,
  GULP_EVERY_S,
  HUNGRY_GAIN,
  LINGER_S,
  MILLING_GAIN,
  SURFACING_REACH,
  distance,
  headingTo,
  insidePond,
  nearestTo,
  noticeDelay,
  tooShyToLook,
  type PondPoint
} from './koi-attention';
import { createGenomeKoi } from './koi-body';
import { koiBuildFor, type KoiGenome } from './koi-genome';

/** A rectangle the koi will not swim under, in CSS pixels. */
export type PondIsland = { x: number; y: number; width: number; height: number };

/** One koi to put in the pond. */
export type KoiEntry = {
  /** Stable identity, so a koi survives the roster changing around it. */
  key: string;
  /** Drives every deterministic trait; the same branch is always the same fish. */
  seed: number;
  /** The branch's own colour, worn as the dominant marking. */
  accent: string;
  /** A market koi's genome, which dresses it as its variety instead of in `accent`. */
  genome?: KoiGenome;
};

export type PondStage = {
  /** Advances every koi and draws the scene. */
  draw: (dt: number) => void;
  setSize: (width: number, height: number) => void;
  setIsland: (island: PondIsland | null) => void;
  /**
   * Adds and removes koi in place; the ones that stay keep swimming.
   *
   * After the first roster, newcomers swim in from the edge of the pond and
   * leavers swim out of it, rather than popping in and out of existence.
   */
  setRoster: (entries: readonly KoiEntry[]) => void;
  /** Something touched the water here; the koi come over to see, each in its own time. */
  attend: (point: PondPoint) => void;
  dispose: () => void;
};

/**
 * The eight builds the library sculpts.
 *
 * Upstream these name the framework each fish is written in. Branchify has no
 * frameworks to show, but the slug also picks the koi's heft — how broad and
 * deep-bodied it is — so it is kept purely as a body archetype, chosen by seed
 * so the shoal reads as related animals of different builds.
 */
const BUILDS: readonly KoiFramework[] = [
  'vanilla',
  'react',
  'vue',
  'svelte',
  'solid',
  'preact',
  'lit',
  'angular'
];

/** The varieties the branch colour is written into. */
const PATTERNS: readonly KoiPalette['pattern'][] = ['kohaku', 'sanke', 'showa', 'asagi'];

/** Nose-to-tail length at depth scale 1, as a fraction of the smaller viewport side. */
const FISH_FRACTION = 0.17;
const MIN_FISH = 90;
const MAX_FISH = 180;

/** How far off the panel a koi starts leaning away, as a fraction of its length. */
const ISLAND_MARGIN = 1;

/** How hard a koi turns off the panel; the brain's own gain for ordinary travel is 1. */
const ISLAND_GAIN = 1.6;

/** Fin translucency applied to the branch colour, as an alpha channel byte. */
const FIN_ALPHA = 'cc';

const fishLengthFor = (width: number, height: number): number =>
  Math.max(MIN_FISH, Math.min(MAX_FISH, Math.min(width, height) * FISH_FRACTION));

export const pondFor = (width: number, height: number, reducedMotion: boolean): PondEnvironment => {
  const fishLength = fishLengthFor(width, height);

  return {
    width,
    height,
    margin: fishLength,
    fishLength,
    view: { x: 0, y: 0, width, height },
    depthLevels: DEPTH_LEVELS,
    reducedMotion
  };
};

/**
 * Dresses one of the library's koi in a branch's colour.
 *
 * A market koi keeps the library's palette untouched here: its skin comes from
 * its variety when the body is built, and the brain never reads colours.
 */
export const profileFor = (entry: KoiEntry): KoiProfile => {
  if (entry.genome) {
    return koiProfile(koiBuildFor(entry.genome), entry.seed);
  }

  const build = BUILDS[entry.seed % BUILDS.length]!;
  const profile = koiProfile(build, entry.seed);
  const pattern = PATTERNS[Math.floor(entry.seed / BUILDS.length) % PATTERNS.length]!;

  return {
    ...profile,
    palette: {
      ...profile.palette,
      // The ground and the second marking stay the variety's natural koi tones;
      // only the dominant marking carries the branch.
      pattern,
      marking: entry.accent,
      accent: entry.accent,
      fin: `${entry.accent}${FIN_ALPHA}`
    }
  };
};

/** What a koi is steering for, and how firmly. */
export type KoiFocus = { point: PondPoint; gain: number };

/** A touch on the water a koi has decided to go and look at. */
type Curiosity = {
  point: PondPoint;
  /** When it notices, and turns toward the ripple. */
  fromS: number;
  /** When it loses interest: a while after arriving, or when it gives up getting there. */
  untilS: number;
  arrived: boolean;
};

/** A pellet as the koi see it: somewhere to go, and something to take. */
export type FoodPellet = PondPoint & { id: number };

/** What the pond tells the page about, and asks it for. */
export type PondHooks = {
  /** A koi broke the surface: gulping air, or taking a pellet. */
  onRipple?: (x: number, y: number, strength: number) => void;
  /** The pellets floating on the surface right now. */
  readFood?: () => readonly FoodPellet[];
  /** A koi has eaten a pellet. */
  onEat?: (id: number) => void;
};

/** One koi in the pond: its body, its brain, and what it was doing last frame. */
type Swimmer = {
  entry: KoiEntry;
  koi: Koi;
  motion: KoiMotion;
  bodyPx: number;
  lastHeading: number | null;
  lastSpeed: number;
  /** Where a koi that has left the roster is swimming off to; null while it belongs here. */
  exit: KoiExit;
  traits: KoiTraits;
  /** Known for being first to food, as a chagoi is. */
  eager: boolean;
  /** The depth level it keeps when nothing is going on. */
  home: number;
  /** The depth level it is drawn at, easing toward where it wants to be. */
  level: number;
  curiosity: Curiosity | null;
  /** When it notices there is food; null while there is none. */
  hungryFromS: number | null;
  /** The pellet it is after, if any. */
  meal: number | null;
  /** What it is steering for this frame, which its brain reads. */
  focus: KoiFocus | null;
  /** Whether it is up at the surface for a look, rather than for food. */
  looking: boolean;
  /** Whether what it wants is up at the surface. */
  rising: boolean;
  /** When it will next gulp at the surface. */
  gulpAtS: number;
};

/** How quickly a koi rises to the surface or sinks back, in seconds to close most of the way. */
const DEPTH_EASE_S = 0.9;

/** A departing koi's way out: the heading to hold, and how long it has to get there. */
type KoiExit = { heading: number; secondsLeft: number } | null;

/** How hard a departing koi turns for the edge; brisker than a cruise, gentler than a bolt. */
const EXIT_GAIN = 1.4;

/** The longest a departing koi is given before it is lifted out wherever it is. */
const EXIT_TIMEOUT_S = 9;

/** How far past the edge a departing koi swims, in body lengths, before it is gone. */
const EXIT_CLEARANCE = 1.2;

/** How far off-screen an arriving koi starts, as a fraction of the nominal fish length. */
const ARRIVAL_OFFSET = 0.6;

/** Whether a departing koi is far enough past every edge to vanish without being seen to. */
export const hasLeftPond = (
  position: { x: number; y: number },
  length: number,
  pond: { width: number; height: number }
): boolean => {
  const clear = length * EXIT_CLEARANCE;

  return (
    position.x < -clear ||
    position.y < -clear ||
    position.x > pond.width + clear ||
    position.y > pond.height + clear
  );
};

/** The heading straight out through the nearer side of the pond. */
export const exitHeading = (position: { x: number }, width: number): number =>
  position.x < width / 2 ? Math.PI : 0;

/**
 * Leans a koi's desire away from the panel.
 *
 * The brain settles its own heading first; this only overrides it when the koi
 * is close to the panel and is not already busy avoiding something, since a
 * fish dodging a neighbour has a better reason to be where it is going.
 */
export const leanOffIsland = (
  desire: KoiDesire,
  context: KoiSteerContext,
  island: () => PondIsland | null,
  length: number
): KoiDesire => {
  const rect = island();

  if (!rect || desire.kind === 'avoid') {
    return desire;
  }

  const margin = length * ISLAND_MARGIN;
  const { position } = context;
  const exits = [
    { depth: position.x - (rect.x - margin), heading: Math.PI },
    { depth: rect.x + rect.width + margin - position.x, heading: 0 },
    { depth: position.y - (rect.y - margin), heading: -Math.PI / 2 },
    { depth: rect.y + rect.height + margin - position.y, heading: Math.PI / 2 }
  ];

  // Every depth positive means the koi is within the panel's margin.
  if (exits.some((exit) => exit.depth <= 0)) {
    return desire;
  }

  // Only sideways exits are offered: the panel is tall, so above and below it
  // there is nothing but a sliver of water against the pond edge.
  const sideways = exits.slice(0, 2);
  const nearest = sideways.reduce((best, exit) => (exit.depth < best.depth ? exit : best));

  return { heading: nearest.heading, gain: ISLAND_GAIN, kind: 'travel' };
};

/**
 * Builds one koi's brain, already leaning away from the panel.
 *
 * Split out of the stage so the swimming can be exercised without a GPU: the
 * brain is where "does this fish roam or just circle" is decided, and that is
 * not a question a screenshot answers well.
 */
export const createKoiBrain = (
  entry: KoiEntry,
  pond: PondEnvironment,
  readIsland: () => PondIsland | null,
  {
    arriving = false,
    readExit = () => null,
    readFocus = () => null
  }: {
    /** Start just off-screen, facing in, rather than already in the water. */
    arriving?: boolean;
    /** The way out, once the koi has been asked to leave. */
    readExit?: () => KoiExit;
    /** Whatever has caught its attention: a ripple to investigate, or food. */
    readFocus?: () => KoiFocus | null;
  } = {}
): { profile: KoiProfile; motion: KoiMotion } => {
  const profile = profileFor(entry);
  // Start beside the panel rather than under it; steering would clear a koi
  // out eventually, but "eventually" is a long look at an empty pond.
  const left = entry.seed % 2 === 0;
  const y = pond.height * (0.2 + ((entry.seed >>> 3) % 60) / 100);
  // An arrival waits just past the nearer edge, where the pond's own margin
  // still counts as water, facing in with a little angle so it swims in on a
  // slant rather than square to the screen.
  const tilt = (((entry.seed >>> 5) % 50) / 100 - 0.25) * Math.PI;
  const offset = pond.fishLength * ARRIVAL_OFFSET;
  const start = arriving
    ? {
        position: { x: left ? -offset : pond.width + offset, y },
        heading: (left ? 0 : Math.PI) + tilt
      }
    : {
        position: { x: pond.width * (left ? 0.12 : 0.88), y },
        heading: (entry.seed % 360) * (Math.PI / 180)
      };

  return {
    profile,
    motion: createKoiMotion(
      { profile, pond, ...start, depth: entry.seed % DEPTH_LEVELS },
      {
        desire: (desire, context) => {
          const exit = readExit();

          // Leaving outranks everything, the panel included: a koi on its way
          // out should not be turned back in by the shore it is crossing.
          if (exit) {
            return { heading: exit.heading, gain: EXIT_GAIN, kind: 'travel' };
          }

          // Something caught its eye. The pace stays the koi's own cruise;
          // only the heading changes, so it comes over rather than rushes.
          const focus = readFocus();

          return focus
            ? {
                heading: headingTo(context.position, focus.point),
                gain: focus.gain,
                kind: 'travel'
              }
            : leanOffIsland(
                desire,
                context,
                readIsland,
                pond.fishLength * profile.build.lengthScale
              );
        }
      }
    )
  };
};

/**
 * Builds the pond behind a canvas.
 *
 * @param canvas - The canvas to draw into; it owns the only WebGL context.
 * @param reducedMotion - Whether the visitor asked for reduced motion.
 * @param hooks - How the koi reach the surface: ripples, and the food on it.
 */
export const createPondStage = (
  canvas: HTMLCanvasElement,
  reducedMotion: boolean,
  hooks: PondHooks = {}
): PondStage => {
  const gl = createPondRenderer(canvas);
  const scene = new Scene();
  scene.add(createLighting(POND_VIEW.lighting));

  let pond = pondFor(canvas.clientWidth || 1, canvas.clientHeight || 1, reducedMotion);
  let island: PondIsland | null = null;
  const view: PondView = createPondView(pond);
  const swimmers = new Map<string, Swimmer>();
  let clock = 0;

  const readIsland = (): PondIsland | null => island;
  // The first roster is the pond as the visitor finds it; only later changes
  // are arrivals and departures worth swimming in and out.
  let settled = false;

  /**
   * Decides what a koi is after this frame, before its brain steers.
   *
   * Food outranks curiosity: a koi mid-look will break off for a pellet, and
   * each hungry koi goes for whichever pellet is nearest its nose right now.
   */
  const think = (swimmer: Swimmer, food: readonly FoodPellet[]): void => {
    const nose = swimmer.motion.state.position;
    const reach = pond.fishLength;
    swimmer.focus = null;
    swimmer.looking = false;
    swimmer.rising = false;

    if (swimmer.exit) {
      return;
    }

    if (food.length === 0) {
      swimmer.hungryFromS = null;
      swimmer.meal = null;
    } else if (swimmer.hungryFromS === null) {
      swimmer.hungryFromS = clock + noticeDelay(swimmer.traits, Math.random(), swimmer.eager);
    }

    const pellet =
      swimmer.hungryFromS !== null && clock >= swimmer.hungryFromS ? nearestTo(nose, food) : null;

    if (pellet) {
      swimmer.meal = pellet.id;
      swimmer.focus = { point: pellet, gain: HUNGRY_GAIN };
      swimmer.rising = distance(nose, pellet) < SURFACING_REACH * reach;
      return;
    }

    const curious = swimmer.curiosity;

    if (curious && clock >= curious.untilS) {
      swimmer.curiosity = null;
    } else if (curious && clock >= curious.fromS) {
      const away = distance(nose, curious.point);

      if (!curious.arrived && away < ARRIVED_REACH * reach) {
        // However long the way was, it gets its time at the surface once there.
        curious.arrived = true;
        curious.untilS = clock + LINGER_S;
      }

      swimmer.focus = {
        point: curious.point,
        gain: curious.arrived ? MILLING_GAIN : CURIOUS_GAIN
      };
      swimmer.looking = curious.arrived;
      swimmer.rising = away < SURFACING_REACH * reach;
    }
  };

  /**
   * Carries out what the koi decided, once it has moved: rising or sinking,
   * taking a pellet its mouth has reached, and gulping at the surface.
   */
  const act = (
    swimmer: Swimmer,
    dt: number,
    food: readonly FoodPellet[],
    eaten: Set<number>
  ): void => {
    const nose = swimmer.motion.state.position;
    const target = swimmer.rising ? SURFACE_DEPTH : swimmer.home;
    swimmer.level += (target - swimmer.level) * (1 - Math.exp(-dt / DEPTH_EASE_S));

    if (swimmer.meal !== null && !eaten.has(swimmer.meal)) {
      const pellet = food.find((candidate) => candidate.id === swimmer.meal);

      if (pellet && distance(nose, pellet) < BITE_REACH * pond.fishLength) {
        eaten.add(pellet.id);
        hooks.onEat?.(pellet.id);
        swimmer.meal = null;
        swimmer.gulpAtS = clock + GULP_EVERY_S;
      }
    }

    // Up at the surface for a look, a koi mouths at the air now and then,
    // and every gulp sends a ring out across the water.
    if (swimmer.looking && swimmer.level > SURFACE_DEPTH - 0.8 && clock >= swimmer.gulpAtS) {
      hooks.onRipple?.(nose.x, nose.y, 0.7);
      swimmer.gulpAtS = clock + GULP_EVERY_S * (0.7 + Math.random() * 0.6);
    }
  };

  const spawn = (entry: KoiEntry, arriving: boolean): Swimmer => {
    // The swimmer is referenced by its own brain's hooks, so it exists before
    // the brain does and is filled in straight after.
    const swimmer = { exit: null, focus: null } as Swimmer;
    const { profile, motion } = createKoiBrain(entry, pond, readIsland, {
      arriving,
      readExit: () => swimmer.exit,
      readFocus: () => swimmer.focus
    });
    const koi = entry.genome
      ? createGenomeKoi(entry.genome, profile.phenotype, profile.trim)
      : createKoi({
          seed: entry.seed,
          physical: profile.phenotype,
          appearance: {
            pattern: profile.palette.pattern,
            base: profile.palette.body,
            primary: profile.palette.marking,
            secondary: profile.palette.shade,
            accent: profile.palette.accent
          },
          trim: profile.trim
        });
    koi.mount(scene);

    const home = entry.seed % DEPTH_LEVELS;

    return Object.assign(swimmer, {
      entry,
      koi,
      motion,
      bodyPx: pxPerUnit(pond.fishLength) * profile.build.lengthScale,
      lastHeading: null,
      lastSpeed: 0,
      traits: profile.traits,
      eager: entry.genome?.variety === 'chagoi',
      home,
      level: home,
      curiosity: null,
      hungryFromS: null,
      meal: null,
      looking: false,
      rising: false,
      gulpAtS: 0
    });
  };

  const remove = (key: string, swimmer: Swimmer): void => {
    swimmer.koi.unmount();
    swimmer.koi.dispose();
    swimmers.delete(key);
  };

  return {
    draw(dt) {
      const seconds = dt > 0 ? dt : 1e-6;
      clock += dt;
      const food = hooks.readFood?.() ?? [];
      const eaten = new Set<number>();

      for (const [key, swimmer] of swimmers) {
        if (swimmer.exit) {
          swimmer.exit.secondsLeft -= dt;

          if (
            swimmer.exit.secondsLeft <= 0 ||
            hasLeftPond(swimmer.motion.state.position, swimmer.motion.state.length, pond)
          ) {
            remove(key, swimmer);
            continue;
          }
        }

        think(swimmer, eaten.size > 0 ? food.filter((pellet) => !eaten.has(pellet.id)) : food);
        swimmer.motion.advance(dt);
        act(swimmer, dt, food, eaten);

        const { state } = swimmer.motion;
        // The swimming model thinks in this koi's own body lengths, while the
        // brain thinks in pond pixels.
        const speed = state.speed / swimmer.bodyPx;
        const turnRate =
          swimmer.lastHeading === null
            ? 0
            : wrapAngle(state.heading - swimmer.lastHeading) / seconds;

        swimmer.koi.setMotion({
          speed,
          turnRate,
          acceleration: (speed - swimmer.lastSpeed) / seconds,
          escapeIntensity: state.phase === 'escape' ? 1 : 0,
          // Drawn at the stage's own eased level, so a koi rising to the
          // surface grows and brightens smoothly instead of popping up.
          depth: swimDepth(swimmer.level)
        });
        swimmer.lastHeading = state.heading;
        swimmer.lastSpeed = speed;
        swimmer.koi.update(dt);
        view.placeKoi(swimmer.koi.object, state.position, state.heading, state.length);
      }

      gl.render(scene, view.camera);
    },

    setSize(width, height) {
      pond = pondFor(width, height, reducedMotion);
      sizePondRenderer(gl, width, height);
      view.setPond(pond);

      for (const swimmer of swimmers.values()) {
        swimmer.motion.setPond(pond);
      }
    },

    setIsland(next) {
      island = next;
    },

    setRoster(entries) {
      const wanted = new Set(entries.map((entry) => entry.key));
      // Reduced motion draws a still pond, where a koi swimming off would
      // never get anywhere; there, the roster simply changes.
      const animate = settled && !reducedMotion;

      for (const [key, swimmer] of swimmers) {
        if (wanted.has(key)) {
          // Asked back before it made it out: it turns around and stays.
          swimmer.exit = null;
        } else if (!animate) {
          remove(key, swimmer);
        } else if (!swimmer.exit) {
          swimmer.exit = {
            heading: exitHeading(swimmer.motion.state.position, pond.width),
            secondsLeft: EXIT_TIMEOUT_S
          };
        }
      }

      for (const entry of entries) {
        if (!swimmers.has(entry.key)) {
          swimmers.set(entry.key, spawn(entry, animate));
        }
      }

      settled = true;
    },

    attend(point) {
      // Kept far enough inside that a koi going to look stays in view.
      const spot = insidePond(point, pond, pond.fishLength * 0.6);

      for (const swimmer of swimmers.values()) {
        if (swimmer.exit || tooShyToLook(swimmer.traits)) {
          continue;
        }

        const fromS = clock + noticeDelay(swimmer.traits, Math.random(), swimmer.eager);
        swimmer.curiosity = { point: spot, fromS, untilS: fromS + CURIOUS_S, arrived: false };
      }
    },

    dispose() {
      for (const swimmer of swimmers.values()) {
        swimmer.koi.unmount();
        swimmer.koi.dispose();
      }

      swimmers.clear();
      gl.dispose();
    }
  };
};
