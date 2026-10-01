import { describe, expect, it } from 'vitest';
import { faviconCandidates, monogramFor, resolveIcon } from './icons';

const sources = (icon: string, url = 'https://github.com'): string[] => {
  const source = resolveIcon(icon, url);
  return source.kind === 'images' ? source.candidates.map((candidate) => candidate.src) : [];
};

describe('faviconCandidates', () => {
  it('asks Google for a large icon first, refusing its tiny globe', () => {
    const [first, second] = faviconCandidates('https://github.com/pulls');

    expect(first.src).toContain('google.com/s2/favicons?domain=github.com&sz=128');
    expect(first.minSize).toBeGreaterThan(16);
    expect(second.src).toContain('icons.duckduckgo.com');
  });

  it('goes straight to a box on the visitor’s own network', () => {
    expect(faviconCandidates('http://192.168.1.4:8080/web').map((item) => item.src)).toEqual([
      'http://192.168.1.4:8080/favicon.ico',
      'http://192.168.1.4:8080/apple-touch-icon.png'
    ]);
  });

  it('has nothing to offer for an address that is not on the web', () => {
    expect(faviconCandidates('not a url')).toEqual([]);
  });
});

describe('resolveIcon', () => {
  it('uses the favicon when no icon is chosen', () => {
    expect(sources('')[0]).toContain('github.com');
  });

  it('draws Simple Icons and MDI as masks, with an optional colour', () => {
    expect(resolveIcon('si-github', '')).toEqual({
      kind: 'mask',
      src: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/github.svg',
      color: null
    });
    expect(resolveIcon('mdi:home-#ff8800', '')).toMatchObject({
      kind: 'mask',
      src: 'https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/home.svg',
      color: '#ff8800'
    });
  });

  it('reads homepage’s dashboard-icons and selfh.st names, falling back to the favicon', () => {
    expect(sources('plex.png')[0]).toBe(
      'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png'
    );
    expect(sources('sh-jellyfin.svg')[0]).toBe(
      'https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/jellyfin.svg'
    );
    expect(sources('plex').slice(0, 2)).toEqual([
      'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg',
      'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png'
    ]);
    const plex = sources('plex');
    expect(plex[plex.length - 1]).toContain('github.com');
  });

  it('shows an emoji as itself', () => {
    expect(resolveIcon('🚀', 'https://example.com')).toEqual({ kind: 'emoji', text: '🚀' });
  });

  it('tries an image address before the favicon', () => {
    expect(sources('https://example.com/logo.svg')[0]).toBe('https://example.com/logo.svg');
  });
});

describe('monogramFor', () => {
  it('takes initials and a colour that stays the same for a site', () => {
    const first = monogramFor('Stack Overflow', 'https://stackoverflow.com');

    expect(first.letters).toBe('SO');
    expect(monogramFor('Stack Overflow', 'https://stackoverflow.com').hue).toBe(first.hue);
    expect(monogramFor('npm', 'https://npmjs.com').letters).toBe('N');
  });
});
