/**
 * The market's live koi: the fish under the pointer comes to life.
 *
 * One canvas and one WebGL context travel from card to card, so running the
 * pointer along a row of koi never holds more than a single context, and a
 * market nobody is pointing at holds none that is drawing. The koi is seated
 * exactly as its photograph was taken, so when the canvas replaces the still
 * the fish doesn't jump: it simply starts to swim, holding station in place
 * the way a koi does against a gentle current.
 */
import type { Koi } from '../vendor/koi-pond/three/koi';
import type { KoiGenome } from './koi-genome';
import { PORTRAIT_BEAT, portraitKey } from './koi-portrait';
import {
  STUDIO_MOTION,
  closeStudio,
  frameStudio,
  hasWebgl,
  openStudio,
  seatKoi,
  type Studio
} from './koi-studio';

/** How far the body sways either side of its lazy turn, and how slowly. */
const SWAY = 0.22;
const SWAY_RATE = 0.8;

type Live = {
  studio: Studio;
  koi: Koi | null;
  key: string | null;
  host: HTMLElement | null;
  frame: number;
  last: number;
  clock: number;
};

let live: Live | null = null;
let unavailable = false;

/**
 * Still is better on a touch screen, which has no hover to end the preview,
 * and for anyone who asked their system for less motion.
 */
const prefersStill = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  !window.matchMedia('(hover: hover)').matches;

const open = (): Live | null => {
  if (live || unavailable) {
    return live;
  }

  try {
    if (!hasWebgl()) {
      throw new Error('No WebGL');
    }

    const studio = openStudio();
    const canvas = studio.renderer.domElement;
    canvas.className = 'koi-live';
    canvas.setAttribute('aria-hidden', 'true');
    live = { studio, koi: null, key: null, host: null, frame: 0, last: 0, clock: 0 };
  } catch {
    unavailable = true;
  }

  return live;
};

const tick = (now: number): void => {
  const room = live;

  if (!room?.koi) {
    return;
  }

  room.frame = window.requestAnimationFrame(tick);
  // A long gap means the tab was away; the fish carries on rather than lurching.
  const dt = Math.min((now - room.last) / 1000, 0.05);
  room.last = now;
  room.clock += dt;
  room.koi.setMotion({
    ...STUDIO_MOTION,
    turnRate: STUDIO_MOTION.turnRate + Math.sin(room.clock * SWAY_RATE) * SWAY
  });
  room.koi.update(dt);
  room.studio.renderer.render(room.studio.scene, room.studio.camera);
};

/** Stops the live koi in a host, if that is where it is swimming. */
export const hideLiveKoi = (host: HTMLElement | null): void => {
  const room = live;

  if (!room || !host || room.host !== host) {
    return;
  }

  window.cancelAnimationFrame(room.frame);
  room.frame = 0;
  room.studio.renderer.domElement.remove();
  delete host.dataset.live;
  room.host = null;
};

/** Brings a genome's koi to life inside a host, over its photograph. */
export const showLiveKoi = (genome: KoiGenome, host: HTMLElement): void => {
  if (prefersStill()) {
    return;
  }

  const room = open();

  if (!room) {
    return;
  }

  hideLiveKoi(room.host);
  const key = portraitKey(genome);

  if (room.key !== key || !room.koi) {
    room.koi?.dispose();
    room.koi = seatKoi(room.studio, genome);
    // The same instant of the stroke the photograph caught, so the swap is seamless.
    room.koi.setBeat(PORTRAIT_BEAT);
    room.key = key;
    room.clock = 0;
  }

  const { width, height } = host.getBoundingClientRect();
  room.studio.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  frameStudio(
    room.studio,
    Math.max(1, width),
    Math.max(1, height),
    room.koi.config.physical.length
  );
  // One frame before the canvas goes in, so it never shows empty water.
  room.studio.renderer.render(room.studio.scene, room.studio.camera);

  host.append(room.studio.renderer.domElement);
  host.dataset.live = 'true';
  room.host = host;
  room.last = performance.now();
  room.frame = window.requestAnimationFrame(tick);
};

/** Hands the live koi's WebGL context back; the market calls this as it closes. */
export const closeLiveKoi = (): void => {
  if (!live) {
    return;
  }

  hideLiveKoi(live.host);
  live.koi?.dispose();
  closeStudio(live.studio);
  live = null;
};
