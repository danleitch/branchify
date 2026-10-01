/**
 * What a bookmark's icon field can say, and where each kind is fetched from.
 *
 * The forms follow homepage's, so a homepage config imports with its icons:
 *   ""                 the site's own favicon
 *   si-github          Simple Icons, drawn as a mask in the card's ink
 *   mdi-home           Material Design Icons, the same way
 *   sh-jellyfin(.svg)  selfh.st icons
 *   plex.png / .svg    dashboard-icons
 *   🚀                 any emoji
 *   https://…          any image
 */
import { hostOf, isPrivateHost } from './urls';

/** One address to try, and the smallest picture from it that counts as an icon. */
export type IconCandidate = { src: string; minSize?: number };

export type IconSource =
  | { kind: 'images'; candidates: IconCandidate[] }
  | { kind: 'mask'; src: string; color: string | null }
  | { kind: 'emoji'; text: string }
  | { kind: 'none' };

const JSDELIVR = 'https://cdn.jsdelivr.net';
const SIMPLE_ICONS = `${JSDELIVR}/npm/simple-icons@latest/icons/`;
const MDI = `${JSDELIVR}/npm/@mdi/svg@latest/svg/`;
const SELFHST = `${JSDELIVR}/gh/selfhst/icons@main/`;
const DASHBOARD_ICONS = `${JSDELIVR}/gh/homarr-labs/dashboard-icons/`;

/**
 * Google's service finds the best icon a site offers, but answers a site it
 * knows nothing about with a 16px globe; asking for 128 and refusing anything
 * that small skips the globe and tries the next source.
 */
export const faviconCandidates = (url: string): IconCandidate[] => {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return [];
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    return [];
  }

  const host = parsed.hostname;
  const own = [
    { src: `${parsed.origin}/favicon.ico` },
    { src: `${parsed.origin}/apple-touch-icon.png` }
  ];

  // Nothing on the public internet can see a box on the visitor's own network.
  if (isPrivateHost(host)) {
    return own;
  }

  return [
    {
      src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
      minSize: 17
    },
    { src: `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico` },
    ...own
  ];
};

/** A string with no letters or digits in it, short enough to be an emoji or two. */
const isEmoji = (value: string): boolean =>
  [...value].length <= 4 &&
  !/[a-z0-9./:]/i.test(value) &&
  /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{So}/u.test(value);

const withExtension = (value: string): { name: string; ext: 'svg' | 'png' | 'webp' | null } => {
  const match = /^(.*)\.(svg|png|webp)$/i.exec(value);
  return match
    ? { name: match[1], ext: match[2].toLowerCase() as 'svg' | 'png' | 'webp' }
    : { name: value, ext: null };
};

/** Splits a trailing "-#ff8800" colour off a Simple Icons or MDI name. */
const withColor = (value: string): { name: string; color: string | null } => {
  const match = /^(.*?)-?(#[0-9a-f]{3,8})$/i.exec(value);
  return match ? { name: match[1], color: match[2] } : { name: value, color: null };
};

/** Resolves a bookmark's icon field, falling back to the site's favicon. */
export const resolveIcon = (icon: string, url: string): IconSource => {
  const value = icon.trim();
  const favicon = faviconCandidates(url);

  if (!value) {
    return favicon.length ? { kind: 'images', candidates: favicon } : { kind: 'none' };
  }

  if (/^(https?:|data:image\/|\/)/i.test(value)) {
    return { kind: 'images', candidates: [{ src: value }, ...favicon] };
  }

  if (isEmoji(value)) {
    return { kind: 'emoji', text: value };
  }

  const prefixed = /^(si|mdi|sh|di)[-:](.+)$/i.exec(value);

  if (prefixed) {
    const prefix = prefixed[1].toLowerCase();
    const rest = prefixed[2];

    if (prefix === 'si' || prefix === 'mdi') {
      const { name, color } = withColor(rest.replace(/\.svg$/i, ''));
      return { kind: 'mask', src: `${prefix === 'si' ? SIMPLE_ICONS : MDI}${name}.svg`, color };
    }

    const { name, ext } = withExtension(rest);

    if (prefix === 'sh') {
      const kind = ext ?? 'png';
      return {
        kind: 'images',
        candidates: [{ src: `${SELFHST}${kind}/${name}.${kind}` }, ...favicon]
      };
    }

    return {
      kind: 'images',
      candidates: [
        ...(ext
          ? [{ src: `${DASHBOARD_ICONS}${ext}/${name}.${ext}` }]
          : [
              { src: `${DASHBOARD_ICONS}svg/${name}.svg` },
              { src: `${DASHBOARD_ICONS}png/${name}.png` }
            ]),
        ...favicon
      ]
    };
  }

  // A bare name, as homepage writes dashboard-icons: "plex.png", or just "plex".
  const { name, ext } = withExtension(value);

  if (/^[a-z0-9][a-z0-9-]*$/i.test(name)) {
    return {
      kind: 'images',
      candidates: [
        ...(ext
          ? [{ src: `${DASHBOARD_ICONS}${ext}/${name.toLowerCase()}.${ext}` }]
          : [
              { src: `${DASHBOARD_ICONS}svg/${name.toLowerCase()}.svg` },
              { src: `${DASHBOARD_ICONS}png/${name.toLowerCase()}.png` }
            ]),
        ...favicon
      ]
    };
  }

  return favicon.length ? { kind: 'images', candidates: favicon } : { kind: 'none' };
};

const hash = (value: string): number => {
  let result = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
};

/** A letter or two to stand in for an icon that never arrived. */
export const monogramFor = (name: string, url: string): { letters: string; hue: number } => {
  const words = (name || hostOf(url) || '?')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters =
    words.length >= 2 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? '?').slice(0, 1);

  return { letters: letters.toUpperCase(), hue: hash(hostOf(url) || name) % 360 };
};

/**
 * Which candidate last worked for each icon, remembered across visits so a
 * board of favicons doesn't walk the whole chain again on every load.
 */
const ICON_CACHE_KEY = 'dashboard-icon-hits';
const MAX_CACHED = 400;
let hits: Record<string, number> | null = null;

const readHits = (): Record<string, number> => {
  if (hits) {
    return hits;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ICON_CACHE_KEY) ?? '{}') as unknown;
    hits = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, number>) : {};
  } catch {
    hits = {};
  }

  return hits;
};

let saveTimer: number | undefined;

export const rememberedIcon = (key: string): number => readHits()[key] ?? 0;

export const rememberIcon = (key: string, index: number): void => {
  const current = readHits();

  if (current[key] === index) {
    return;
  }

  const entries = Object.entries(current).filter(([other]) => other !== key);
  entries.push([key, index]);
  hits = Object.fromEntries(entries.slice(-MAX_CACHED));

  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(hits));
    } catch {
      /* best effort */
    }
  }, 500);
};
