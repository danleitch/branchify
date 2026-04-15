import { memo, useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

const engineReady = initParticlesEngine(async (engine) => {
  await loadSlim(engine);
});

const ParticlesBackgroundInner = (): JSX.Element | null => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    engineReady.then(() => setReady(true));
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <Particles
      id="tsparticles"
      options={{
        background: {
          color: { value: '#0d1117' }
        },
        fpsLimit: 60,
        interactivity: {
          events: {
            onHover: { enable: true, mode: 'repulse' }
          },
          modes: {
            repulse: { distance: 100, duration: 0.4 }
          }
        },
        particles: {
          color: { value: '#4c7ff7' },
          links: {
            color: '#4c7ff7',
            distance: 150,
            enable: true,
            opacity: 0.3,
            width: 1
          },
          move: {
            enable: true,
            speed: 1.2,
            outModes: { default: 'bounce' }
          },
          number: {
            density: { enable: true },
            value: 300
          },
          opacity: { value: 0.5 },
          shape: { type: 'circle' },
          size: { value: { min: 1, max: 3 } }
        },
        detectRetina: true
      }}
    />
  );
};

export const ParticlesBackground = memo(ParticlesBackgroundInner);
