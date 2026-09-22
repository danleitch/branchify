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
import { DEPTH_LEVELS } from '../vendor/koi-pond/model/types';
import type {
  KoiFramework,
  KoiPalette,
  KoiProfile,
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

/** A rectangle the koi will not swim under, in CSS pixels. */
export type PondIsland = { x: number; y: number; width: number; height: number };

/** One koi to put in the pond. */
export type KoiEntry = {
  /** Stable identity, so a koi survives the roster changing around it. */
  key: string;
  /** Drives every deterministic trait; the same branch is always the same fish. */
  seed: number;
  /** The branch type's colour, worn as the dominant marking. */
  accent: string;
};

export type PondStage = {
  /** Advances every koi and draws the scene. */
  draw: (dt: number) => void;
  setSize: (width: number, height: number) => void;
  setIsland: (island: PondIsland | null) => void;
  /** Adds and removes koi in place; the ones that stay keep swimming. */
  setRoster: (entries: readonly KoiEntry[]) => void;
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

/** Dresses one of the library's koi in a branch's colour. */
export const profileFor = (entry: KoiEntry): KoiProfile => {
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

/** One koi in the pond: its body, its brain, and what it was doing last frame. */
type Swimmer = {
  entry: KoiEntry;
  koi: Koi;
  motion: KoiMotion;
  bodyPx: number;
  lastHeading: number | null;
  lastSpeed: number;
};

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
  readIsland: () => PondIsland | null
): { profile: KoiProfile; motion: KoiMotion } => {
  const profile = profileFor(entry);
  // Start beside the panel rather than under it; steering would clear a koi
  // out eventually, but "eventually" is a long look at an empty pond.
  const side = entry.seed % 2 === 0 ? 0.12 : 0.88;

  return {
    profile,
    motion: createKoiMotion(
      {
        profile,
        pond,
        position: {
          x: pond.width * side,
          y: pond.height * (0.2 + ((entry.seed >>> 3) % 60) / 100)
        },
        heading: (entry.seed % 360) * (Math.PI / 180),
        depth: entry.seed % DEPTH_LEVELS
      },
      {
        desire: (desire, context) =>
          leanOffIsland(desire, context, readIsland, pond.fishLength * profile.build.lengthScale)
      }
    )
  };
};

/**
 * Builds the pond behind a canvas.
 *
 * @param canvas - The canvas to draw into; it owns the only WebGL context.
 * @param reducedMotion - Whether the visitor asked for reduced motion.
 */
export const createPondStage = (canvas: HTMLCanvasElement, reducedMotion: boolean): PondStage => {
  const gl = createPondRenderer(canvas);
  const scene = new Scene();
  scene.add(createLighting(POND_VIEW.lighting));

  let pond = pondFor(canvas.clientWidth || 1, canvas.clientHeight || 1, reducedMotion);
  let island: PondIsland | null = null;
  const view: PondView = createPondView(pond);
  const swimmers = new Map<string, Swimmer>();

  const readIsland = (): PondIsland | null => island;

  const spawn = (entry: KoiEntry): Swimmer => {
    const { profile, motion } = createKoiBrain(entry, pond, readIsland);
    const koi = createKoi({
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

    return {
      entry,
      koi,
      motion,
      bodyPx: pxPerUnit(pond.fishLength) * profile.build.lengthScale,
      lastHeading: null,
      lastSpeed: 0
    };
  };

  return {
    draw(dt) {
      const seconds = dt > 0 ? dt : 1e-6;

      for (const swimmer of swimmers.values()) {
        swimmer.motion.advance(dt);

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
          depth: swimDepth(state.depth)
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

      for (const [key, swimmer] of swimmers) {
        if (!wanted.has(key)) {
          swimmer.koi.unmount();
          swimmer.koi.dispose();
          swimmers.delete(key);
        }
      }

      for (const entry of entries) {
        if (!swimmers.has(entry.key)) {
          swimmers.set(entry.key, spawn(entry));
        }
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
