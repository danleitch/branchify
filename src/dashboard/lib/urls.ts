/** Helpers for the addresses visitors paste, type and drop. */

const PRIVATE_HOST =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|\[?::1\]?)$/i;

const LOCAL_SUFFIX = /\.(local|lan|home|internal|localdomain|home\.arpa)$/i;

/** Whether a host is on the visitor's own network, where public favicon services can't see. */
export const isPrivateHost = (host: string): boolean =>
  PRIVATE_HOST.test(host) || LOCAL_SUFFIX.test(host) || !host.includes('.');

/**
 * Turns what someone typed into an address a browser can open: "github.com"
 * becomes https://github.com, "nas:8080" and "192.168.1.4" become http.
 * Returns null for anything that isn't an address at all.
 */
export const normalizeUrl = (input: string): string | null => {
  const value = input.trim();

  if (!value || /\s/.test(value)) {
    return null;
  }

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value) && !/^[^/:]+:\d+/.test(value);
  let candidate = value;

  if (!hasScheme) {
    const host = value.split(/[/?#]/)[0].replace(/:\d+$/, '');

    if (!host.includes('.') && !/^localhost$/i.test(host) && !/:\d+/.test(value)) {
      return null;
    }

    candidate = `${isPrivateHost(host) ? 'http' : 'https'}://${value}`;
  }

  try {
    const url = new URL(candidate);

    if (!['http:', 'https:', 'ftp:', 'file:'].includes(url.protocol)) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
};

/** Whether text someone pasted is an address, rather than words to search for. */
export const looksLikeUrl = (input: string): boolean => {
  const value = input.trim();
  return (
    /^https?:\/\//i.test(value) ||
    (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(value) && normalizeUrl(value) !== null)
  );
};

export const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
};

/** What to show under a bookmark that has no description: the host and a little of the path. */
export const displayUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const host = parsed.host.replace(/^www\./i, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
    return `${host}${path}`;
  } catch {
    return url;
  }
};

/** Names a site is known by, where its domain doesn't spell them. */
const KNOWN_NAMES: Readonly<Record<string, string>> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  stackoverflow: 'Stack Overflow',
  ycombinator: 'Hacker News',
  chatgpt: 'ChatGPT',
  openai: 'OpenAI',
  claude: 'Claude',
  npmjs: 'npm',
  mdn: 'MDN',
  mozilla: 'Mozilla',
  paypal: 'PayPal',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  icloud: 'iCloud',
  devdocs: 'DevDocs',
  dev: 'DEV',
  digitalocean: 'DigitalOcean',
  cloudflare: 'Cloudflare',
  vercel: 'Vercel',
  netlify: 'Netlify',
  figma: 'Figma',
  notion: 'Notion',
  reddit: 'Reddit'
};

const GOOGLE_APPS: Readonly<Record<string, string>> = {
  mail: 'Gmail',
  calendar: 'Calendar',
  drive: 'Drive',
  docs: 'Docs',
  sheets: 'Sheets',
  maps: 'Maps',
  photos: 'Photos',
  meet: 'Meet',
  keep: 'Keep',
  news: 'News'
};

/** A first guess at a name from the address alone; the visitor can always change it. */
export const guessName = (url: string): string => {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return '';
  }

  const labels = parsed.hostname.replace(/^www\./i, '').split('.');

  if (labels.length >= 3 && labels[labels.length - 2] === 'google' && GOOGLE_APPS[labels[0]]) {
    return GOOGLE_APPS[labels[0]];
  }

  if (/^\d+(\.\d+){3}$/.test(parsed.hostname) || labels.length === 1) {
    return parsed.host;
  }

  // The registrable part, give or take: "news.ycombinator.com" is ycombinator,
  // "bbc.co.uk" is bbc, and "en.wikipedia.org" is wikipedia.
  const last = (back: number): string => labels[labels.length - back];
  const secondLevel = labels.length >= 3 && last(2).length <= 3 ? last(3) : last(2);
  const known = KNOWN_NAMES[secondLevel.toLowerCase()];

  if (known) {
    return known;
  }

  return secondLevel
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
};

/** A link dragged in from another tab or the address bar, if that is what is being dropped. */
export const readDroppedLink = (
  data: Pick<DataTransfer, 'getData'>
): { url: string; title: string } | null => {
  const uriList = data
    .getData('text/uri-list')
    .split(/\r?\n/)
    .find((line) => line.trim() && !line.startsWith('#'));
  const mozilla = data.getData('text/x-moz-url').split(/\r?\n/);
  const plain = data.getData('text/plain').trim();
  const url =
    normalizeUrl(uriList ?? mozilla[0] ?? '') ?? (looksLikeUrl(plain) ? normalizeUrl(plain) : null);

  if (!url) {
    return null;
  }

  let title = mozilla[1]?.trim() ?? '';

  if (!title) {
    const html = data.getData('text/html');

    if (html) {
      const anchor = new DOMParser().parseFromString(html, 'text/html').querySelector('a');
      title = anchor?.textContent?.trim() ?? '';
    }
  }

  return { url, title: title && title !== url ? title.slice(0, 120) : '' };
};

/** Whether a native drag is carrying a link, judged before it is dropped. */
export const isLinkDrag = (types: readonly string[]): boolean =>
  types.includes('text/uri-list') || types.includes('text/x-moz-url');

/** Opens an address the way the visitor's settings say bookmarks open. */
export const openUrl = (url: string, newTab: boolean): void => {
  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.assign(url);
  }
};
