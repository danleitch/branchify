/**
 * The surface of the pond: rings where it is touched, and food floating on it.
 *
 * Everything that happens on the water, rather than in it, lives here: the
 * ring a fingertip leaves, the gulp of a koi breaking the surface for air, the
 * splash of pellets landing, and the pellets themselves drifting until a koi
 * takes them or they sink. The koi only ever read where the pellets are and
 * report when one has been eaten.
 */
import { createRandom } from './seeded-random';

export type Pellet = {
  id: number;
  x: number;
  y: number;
  /** Slow drift across the surface, in pixels per second. */
  vx: number;
  vy: number;
  /** Surface clock reading when it landed. */
  bornS: number;
  /** Where in its bob it is. */
  phase: number;
};

type Ripple = { x: number; y: number; bornS: number; strength: number };

/** How long a pellet floats before it starts to sink. */
export const PELLET_FLOAT_S = 30;

/** How long sinking takes, as it fades from the surface. */
const PELLET_SINK_S = 4;

/** Pellets beyond this many are not scattered; a pond is not a trough. */
export const MAX_PELLETS = 36;

/** How many pellets one handful scatters. */
const HANDFUL = { min: 6, max: 9 } as const;

/** How long a ripple takes to spread and fade. */
const RIPPLE_S = 2.1;

/** How fast a ripple's ring spreads, in pixels per second, at full strength. */
const RIPPLE_SPEED = 46;

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

export type PondSurface = {
  resize: (width: number, height: number) => void;
  /** A ring spreading from where the surface was touched; strength 1 is a fingertip. */
  ripple: (x: number, y: number, strength?: number) => void;
  /**
   * Scatters a handful of pellets around a point, each landing with its own
   * small splash. Returns how many landed.
   */
  scatter: (x: number, y: number, spread: number) => number;
  /** The pellets still floating, oldest first; sinking ones are past eating. */
  food: () => readonly Pellet[];
  /** A koi has taken a pellet: it goes, with a splash. */
  eat: (id: number) => void;
  step: (dt: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
  /** Whether anything on the surface is still moving. */
  readonly busy: boolean;
};

export const createPondSurface = (seed = 0x5eed): PondSurface => {
  const random = createRandom(seed);
  let pellets: Pellet[] = [];
  let ripples: Ripple[] = [];
  let clock = 0;
  let nextId = 1;
  let bounds = { width: 0, height: 0 };

  const ripple = (x: number, y: number, strength = 1): void => {
    ripples.push({ x, y, bornS: clock, strength });
  };

  const floating = (pellet: Pellet): boolean => clock - pellet.bornS < PELLET_FLOAT_S;

  return {
    resize(width, height) {
      bounds = { width, height };
    },

    ripple,

    scatter(x, y, spread) {
      const room = MAX_PELLETS - pellets.length;
      const count = Math.min(
        room,
        HANDFUL.min + Math.floor(random() * (HANDFUL.max - HANDFUL.min + 1))
      );

      for (let index = 0; index < count; index += 1) {
        const angle = random() * Math.PI * 2;
        const reach = Math.sqrt(random()) * spread;
        const pellet: Pellet = {
          id: nextId,
          x: clamp(x + Math.cos(angle) * reach, 4, Math.max(4, bounds.width - 4)),
          y: clamp(y + Math.sin(angle) * reach, 4, Math.max(4, bounds.height - 4)),
          vx: (random() - 0.5) * 6,
          vy: (random() - 0.5) * 6,
          bornS: clock,
          phase: random() * Math.PI * 2
        };
        nextId += 1;
        pellets.push(pellet);
        ripple(pellet.x, pellet.y, 0.32);
      }

      return count;
    },

    food: () => pellets.filter(floating),

    eat(id) {
      const pellet = pellets.find((candidate) => candidate.id === id);

      if (pellet) {
        pellets = pellets.filter((candidate) => candidate.id !== id);
        ripple(pellet.x, pellet.y, 0.85);
      }
    },

    step(dt) {
      clock += dt;
      // Drift eases off, the way anything floating settles once it has landed.
      const drag = Math.exp(-dt * 0.35);

      for (const pellet of pellets) {
        pellet.x = clamp(pellet.x + pellet.vx * dt, 4, Math.max(4, bounds.width - 4));
        pellet.y = clamp(pellet.y + pellet.vy * dt, 4, Math.max(4, bounds.height - 4));
        pellet.vx *= drag;
        pellet.vy *= drag;
      }

      pellets = pellets.filter((pellet) => clock - pellet.bornS < PELLET_FLOAT_S + PELLET_SINK_S);
      ripples = ripples.filter((ring) => clock - ring.bornS < RIPPLE_S);
    },

    draw(ctx) {
      for (const ring of ripples) {
        const age = (clock - ring.bornS) / RIPPLE_S;
        const fade = (1 - age) * (1 - age);

        // A second, fainter ring trails the first, as real rings come in trains.
        for (const lag of [0, 0.22]) {
          const spread = Math.max(0, clock - ring.bornS - lag * RIPPLE_S);
          const radius = 3 + spread * RIPPLE_SPEED * (0.55 + ring.strength * 0.45);

          ctx.beginPath();
          ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
          ctx.lineWidth = 1.4 + ring.strength * 0.8;
          ctx.strokeStyle = `rgba(222, 244, 238, ${fade * ring.strength * (lag ? 0.28 : 0.55)})`;
          ctx.stroke();
        }
      }

      for (const pellet of pellets) {
        const age = clock - pellet.bornS;
        const sinking = Math.max(0, (age - PELLET_FLOAT_S) / PELLET_SINK_S);
        const alpha = 1 - sinking;
        const radius = 3.1 * (1 - sinking * 0.4);
        const y = pellet.y + Math.sin(clock * 2.2 + pellet.phase) * 0.5;

        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = '#081414';
        ctx.beginPath();
        ctx.arc(pellet.x + 1, y + 1.6, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        const body = ctx.createRadialGradient(
          pellet.x - radius * 0.35,
          y - radius * 0.4,
          0,
          pellet.x,
          y,
          radius
        );
        body.addColorStop(0, '#c9975a');
        body.addColorStop(1, '#7a5228');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(pellet.x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },

    get busy() {
      return pellets.length > 0 || ripples.length > 0;
    }
  };
};
