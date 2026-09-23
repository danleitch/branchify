import { memo, useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { isOpenWater } from '../lib/koi-attention';
import { toParticlesOptions, type ParticleSettings } from '../lib/particles';

const engineReady = initParticlesEngine(async (engine) => {
  await loadSlim(engine);
});

/**
 * Every change rebuilds the canvas and scatters the particles afresh, so a
 * slider being dragged is only applied once it pauses.
 */
const APPLY_DELAY_MS = 150;

const useSettled = <T,>(value: T, delayMs: number): T => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
};

/**
 * tsParticles listens for clicks on the whole window, so a click on the form
 * or a dialog would push, remove or repulse particles too. Stopping those
 * presses at the document keeps click modes to the open background, the same
 * way the koi only answer a touch on open water.
 */
const useClicksOnOpenBackgroundOnly = (): void => {
  useEffect(() => {
    const swallow = (event: PointerEvent): void => {
      if (!isOpenWater(event.target)) {
        event.stopPropagation();
      }
    };

    document.addEventListener('pointerdown', swallow);
    document.addEventListener('pointerup', swallow);

    return () => {
      document.removeEventListener('pointerdown', swallow);
      document.removeEventListener('pointerup', swallow);
    };
  }, []);
};

type ParticlesBackgroundProps = {
  settings: ParticleSettings;
};

const ParticlesBackgroundInner = ({ settings }: ParticlesBackgroundProps): JSX.Element | null => {
  const [ready, setReady] = useState(false);
  const applied = useSettled(settings, APPLY_DELAY_MS);
  const options = useMemo(() => toParticlesOptions(applied), [applied]);

  useClicksOnOpenBackgroundOnly();

  useEffect(() => {
    engineReady.then(() => setReady(true));
  }, []);

  // The wrapper reloads on any new props object, so it only gets a new
  // element when the options it draws have actually changed.
  const canvas = useMemo(() => <Particles id="tsparticles" options={options} />, [options]);

  return ready ? canvas : null;
};

export const ParticlesBackground = memo(ParticlesBackgroundInner);
