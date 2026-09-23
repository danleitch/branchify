/**
 * The market's photo studio: how a koi is lit, posed and framed for a card.
 *
 * Shared by the still portraits and the live preview, so a fish that starts
 * swimming when the pointer lands on its card is posed, lit and framed exactly
 * as its photograph was — it simply comes to life where it lay.
 */
import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { PIVOT_STATION } from '../vendor/koi-pond/koi3d/config';
import { POND_VIEW } from '../vendor/koi-pond/model/pond-view';
import { koiProfile } from '../vendor/koi-pond/model/traits';
import type { Koi } from '../vendor/koi-pond/three/koi';
import { createLighting } from '../vendor/koi-pond/three/scene';
import { createGenomeKoi } from './koi-body';
import { koiBuildFor, type KoiGenome } from './koi-genome';

/** How much of the frame's width the fish's length fills. */
export const FILL = 0.82;

/** A gentle cruise with a lazy turn: the pose that reads most like a koi. */
export const STUDIO_MOTION = {
  speed: 0.5,
  turnRate: 0.24,
  acceleration: 0,
  escapeIntensity: 0,
  depth: 0,
  climbRate: 0
};

/** Frames swum before the first picture, so the body has settled into its curve. */
const SETTLE_FRAMES = 40;

export type Studio = { renderer: WebGLRenderer; scene: Scene; camera: PerspectiveCamera };

/** Whether this browser will give us WebGL at all, asked without keeping a context. */
export const hasWebgl = (): boolean => {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    return false;
  }
};

/**
 * Opens a studio rendering the way the pond renders: transparent, with the
 * pond's lights, tone curve and exposure, so a fish wears the same colours on
 * its card as in the water.
 */
export const openStudio = (options: { preserveDrawingBuffer?: boolean } = {}): Studio => {
  const renderer = new WebGLRenderer({
    canvas: document.createElement('canvas'),
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: options.preserveDrawingBuffer ?? false
  });
  renderer.setClearAlpha(0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = POND_VIEW.exposure;

  const scene = new Scene();
  scene.add(createLighting(POND_VIEW.lighting));

  return { renderer, scene, camera: new PerspectiveCamera(POND_VIEW.fovDeg, 1, 0.01, 20) };
};

export const closeStudio = (studio: Studio): void => {
  studio.renderer.dispose();
  studio.renderer.forceContextLoss();
};

/** Sizes the studio's frame and points the camera down at a fish of this length. */
export const frameStudio = (
  studio: Studio,
  width: number,
  height: number,
  length: number
): void => {
  const { camera, renderer } = studio;
  const halfFov = ((POND_VIEW.fovDeg / 2) * Math.PI) / 180;
  const tilt = (POND_VIEW.tiltDeg * Math.PI) / 180;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;

  const distance = length / FILL / (2 * Math.tan(halfFov) * camera.aspect);
  camera.position.set(0, Math.cos(tilt) * distance, Math.sin(tilt) * distance);
  // The pond's own convention: world -z is up-screen, so the nose (local +x) points right.
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
};

/**
 * Seats a genome's koi in the studio, centred and settled into its stroke.
 *
 * The model's origin is its pivot, a third of the way back from the nose;
 * sliding it forward by the rest of the way to half-length centres the fish.
 */
export const seatKoi = (studio: Studio, genome: KoiGenome): Koi => {
  const profile = koiProfile(koiBuildFor(genome), genome.seed);
  const koi = createGenomeKoi(genome, profile.phenotype, profile.trim);
  const length = koi.config.physical.length;

  koi.mount(studio.scene);
  koi.setMotion(STUDIO_MOTION);

  for (let frame = 0; frame < SETTLE_FRAMES; frame += 1) {
    koi.update(1 / 30);
  }

  koi.object.position.set(length * (0.5 - PIVOT_STATION), 0, 0);
  return koi;
};
