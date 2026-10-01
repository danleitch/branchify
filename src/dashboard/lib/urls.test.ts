import { describe, expect, it } from 'vitest';
import {
  displayUrl,
  guessName,
  isPrivateHost,
  looksLikeUrl,
  normalizeUrl,
  readDroppedLink
} from './urls';

describe('normalizeUrl', () => {
  it.each([
    ['github.com', 'https://github.com/'],
    ['  https://example.com/a?b=c  ', 'https://example.com/a?b=c'],
    ['192.168.1.4:8080', 'http://192.168.1.4:8080/'],
    ['nas:5000', 'http://nas:5000/'],
    ['localhost:5173', 'http://localhost:5173/'],
    ['plex.lan', 'http://plex.lan/']
  ])('turns %s into %s', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it.each(['', 'hello', 'two words.com', 'javascript:alert(1)', 'mailto:me@example.com'])(
    'refuses %s',
    (input) => {
      expect(normalizeUrl(input)).toBeNull();
    }
  );
});

describe('looksLikeUrl', () => {
  it('tells addresses from words to search for', () => {
    expect(looksLikeUrl('github.com/pulls')).toBe(true);
    expect(looksLikeUrl('https://x.example')).toBe(true);
    expect(looksLikeUrl('how to center a div')).toBe(false);
    expect(looksLikeUrl('react')).toBe(false);
  });
});

describe('guessName', () => {
  it.each([
    ['https://github.com/pulls', 'GitHub'],
    ['https://news.ycombinator.com', 'Hacker News'],
    ['https://mail.google.com/mail/u/0', 'Gmail'],
    ['https://www.bbc.co.uk/news', 'Bbc'],
    ['https://en.wikipedia.org', 'Wikipedia'],
    ['https://my-cool-site.dev', 'My Cool Site'],
    ['http://192.168.1.4:8080', '192.168.1.4:8080']
  ])('names %s %s', (url, expected) => {
    expect(guessName(url)).toBe(expected);
  });
});

describe('displayUrl', () => {
  it('shows the host and path without the noise', () => {
    expect(displayUrl('https://www.github.com/pulls/')).toBe('github.com/pulls');
    expect(displayUrl('https://example.com/')).toBe('example.com');
  });
});

describe('isPrivateHost', () => {
  it('knows the visitor’s own network', () => {
    expect(isPrivateHost('192.168.0.10')).toBe(true);
    expect(isPrivateHost('10.0.0.2')).toBe(true);
    expect(isPrivateHost('jellyfin.home')).toBe(true);
    expect(isPrivateHost('nas')).toBe(true);
    expect(isPrivateHost('github.com')).toBe(false);
  });
});

describe('readDroppedLink', () => {
  const transfer = (data: Record<string, string>): Pick<DataTransfer, 'getData'> => ({
    getData: (type: string) => data[type] ?? ''
  });

  it('reads a link and its title from Firefox', () => {
    expect(readDroppedLink(transfer({ 'text/x-moz-url': 'https://lobste.rs/\nLobsters' }))).toEqual(
      { url: 'https://lobste.rs/', title: 'Lobsters' }
    );
  });

  it('reads a link and its title from Chrome', () => {
    expect(
      readDroppedLink(
        transfer({
          'text/uri-list': '# comment\nhttps://github.com/pulls',
          'text/html': '<a href="https://github.com/pulls">Pull requests</a>'
        })
      )
    ).toEqual({ url: 'https://github.com/pulls', title: 'Pull requests' });
  });

  it('ignores text that is not an address', () => {
    expect(readDroppedLink(transfer({ 'text/plain': 'just some words' }))).toBeNull();
  });
});
