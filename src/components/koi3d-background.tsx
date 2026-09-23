import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPondStage, type KoiEntry, type PondStage } from '../lib/koi3d';
import type { OwnedKoi } from '../lib/koi-account';
import { buildKoiRoster } from '../lib/koi-roster';
import { createWater } from '../lib/koi-water';
import type { RecentBranch } from '../types';
import { KoiBackground } from './koi-background';

type Koi3dBackgroundProps = {
  recentBranches: readonly RecentBranch[];
  /** The floor on how many koi swim; branches fill in before residents do, up to MAX_KOI. */
  baseFishCount?: number;
  /** Koi bought at the market; when there are any, they are the whole pond. */
  ownedKoi?: readonly OwnedKoi[];
  /** The panel, which the koi lean away from so they stay in view around it. */
  avoidRef?: RefObject<HTMLElement>;
};

/** Retina is honoured up to a point for the water; the koi renderer sets its own. */
const MAX_PIXEL_RATIO = 2;

/** Frames run to settle the pond before a reduced-motion pond is drawn once. */
const SETTLE_STEPS = 120;
const SETTLE_STEP_S = 1 / 30;

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const Koi3dBackground = ({
  recentBranches,
  baseFishCount,
  ownedKoi,
  avoidRef
}: Koi3dBackgroundProps): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<PondStage | null>(null);
  // A reduced-motion pond is drawn once and left; a roster change redraws it.
  const redrawRef = useRef<(() => void) | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  // The same roster the 2D pond swims, so who is in the water and what colour
  // they wear is decided in one place whichever renderer draws them.
  const entries = useMemo<KoiEntry[]>(
    () =>
      buildKoiRoster(recentBranches, baseFishCount, ownedKoi).map((descriptor) => ({
        key: descriptor.key,
        seed: descriptor.seed,
        accent: descriptor.palette.marking,
        genome: descriptor.genome
      })),
    [recentBranches, baseFishCount, ownedKoi]
  );

  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const avoidElementRef = useRef(avoidRef);
  avoidElementRef.current = avoidRef;

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const reducedMotion = prefersReducedMotion();

    // The koi render transparent — upstream they composite over the host's
    // water — so the pond itself is painted on a 2D canvas underneath them.
    const waterCanvas = waterRef.current;
    const waterCtx = waterCanvas?.getContext('2d') ?? null;
    const water = createWater();

    let stage: PondStage;

    try {
      stage = createPondStage(canvas, reducedMotion);
    } catch {
      // No WebGL, or the context was refused; the 2D pond takes over.
      setUnavailable(true);
      return;
    }

    stageRef.current = stage;

    const measureIsland = (): void => {
      const element = avoidElementRef.current?.current;

      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      stage.setIsland({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    };

    const resize = (): void => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      stage.setSize(width, height);

      if (waterCanvas && waterCtx) {
        const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
        waterCanvas.width = Math.round(width * ratio);
        waterCanvas.height = Math.round(height * ratio);
        waterCanvas.style.width = `${width}px`;
        waterCanvas.style.height = `${height}px`;
        // Resizing a canvas resets its transform, so the scale is reapplied here.
        waterCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
        water.resize(width, height);
      }

      measureIsland();
    };

    const drawWater = (elapsedS: number): void => {
      if (waterCtx) {
        water.draw(waterCtx, window.innerWidth, window.innerHeight, elapsedS);
      }
    };

    resize();
    measureIsland();
    stage.setRoster(entriesRef.current);

    // The panel grows and shrinks with the recent list, so its rect is watched
    // rather than read per frame, which would force a layout every tick.
    const panel = avoidElementRef.current?.current;
    const observer =
      panel && typeof ResizeObserver === 'function' ? new ResizeObserver(measureIsland) : null;
    observer?.observe(panel!);

    if (reducedMotion) {
      // One settled pond, drawn once: no loop, no repaints, no battery.
      const settle = (): void => {
        for (let index = 0; index < SETTLE_STEPS; index += 1) {
          stage.draw(SETTLE_STEP_S);
        }

        drawWater(SETTLE_STEPS * SETTLE_STEP_S);
      };

      settle();
      redrawRef.current = settle;
      window.addEventListener('resize', resize);

      return () => {
        redrawRef.current = null;
        window.removeEventListener('resize', resize);
        observer?.disconnect();
        stage.dispose();
        stageRef.current = null;
      };
    }

    let frame = 0;
    let last = performance.now();
    let elapsedS = 0;

    const tick = (now: number): void => {
      frame = window.requestAnimationFrame(tick);
      // A frame this long means the tab was away; the koi hold their place
      // rather than teleporting across the pond.
      const dt = Math.min((now - last) / 1000, 0.05);
      elapsedS += dt;
      last = now;
      drawWater(elapsedS);
      stage.draw(dt);
    };

    const handleVisibility = (): void => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        return;
      }

      if (frame === 0) {
        last = performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      observer?.disconnect();
      stage.dispose();
      stageRef.current = null;
    };
  }, []);

  // Branches coming and going must not restart the loop or move the other koi.
  useEffect(() => {
    stageRef.current?.setRoster(entries);
    redrawRef.current?.();
  }, [entries]);

  if (unavailable) {
    return (
      <KoiBackground
        recentBranches={recentBranches}
        baseFishCount={baseFishCount}
        ownedKoi={ownedKoi}
        avoidRef={avoidRef}
      />
    );
  }

  return (
    <>
      <canvas ref={waterRef} className="koi-pond koi-water" aria-hidden="true" />
      <canvas ref={canvasRef} className="koi-pond" aria-hidden="true" />
    </>
  );
};
