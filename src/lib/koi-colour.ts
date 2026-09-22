/**
 * Colour arithmetic for the pond.
 *
 * Depth in the hyperfrontend demo is not a fade to nothing: a koi further down
 * washes toward the water's own colour and dims, which is what makes the pond
 * read as water rather than as fish on a dark background. Doing that needs
 * real mixing, so every colour in a palette is kept as plain `#rrggbb` and
 * blended here.
 */

/** The colour deep water washes a koi toward, as the demo's skin shader sets it. */
export const WATER_TINT = '#2c4a52';

type Rgb = { r: number; g: number; b: number };

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const parseHex = (hex: string): Rgb => {
  const value = Number.parseInt(hex.slice(1, 7), 16);

  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
};

const toHex = ({ r, g, b }: Rgb): string =>
  `#${((clampByte(r) << 16) | (clampByte(g) << 8) | clampByte(b)).toString(16).padStart(6, '0')}`;

/** Blends two `#rrggbb` colours; `amount` of 0 keeps the first, 1 takes the second. */
export const mixHex = (from: string, to: string, amount: number): string => {
  const a = parseHex(from);
  const b = parseHex(to);
  const t = Math.max(0, Math.min(1, amount));

  return toHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  });
};

/** Scales a colour's brightness, for the dimming that comes with depth. */
export const dimHex = (hex: string, amount: number): string => {
  const { r, g, b } = parseHex(hex);

  return toHex({ r: r * amount, g: g * amount, b: b * amount });
};

/** Appends an alpha byte to a `#rrggbb` colour. */
export const withAlpha = (hex: string, alpha: number): string =>
  `${hex}${clampByte(alpha).toString(16).padStart(2, '0')}`;

/**
 * Converts an HSL triple to `#rrggbb`.
 *
 * Custom branch types get a hashed hue, and everything downstream mixes
 * colours, so a hashed accent has to arrive as hex like every other.
 */
export const hslToHex = (hue: number, saturation: number, lightness: number): string => {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const sector = (((hue % 360) + 360) % 360) / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const match = l - chroma / 2;
  const [r, g, b] = (
    [
      [chroma, second, 0],
      [second, chroma, 0],
      [0, chroma, second],
      [0, second, chroma],
      [second, 0, chroma],
      [chroma, 0, second]
    ][Math.floor(sector) % 6] ?? [0, 0, 0]
  ).map((channel) => (channel + match) * 255);

  return toHex({ r: r ?? 0, g: g ?? 0, b: b ?? 0 });
};
