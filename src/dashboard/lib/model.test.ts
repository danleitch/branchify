import { describe, expect, it } from 'vitest';
import { GRID_COLUMNS, MIN_SPAN, countBookmarks, createWidget, sanitizeConfig } from './model';

describe('sanitizeConfig', () => {
  it('turns anything that is not a board into an empty one', () => {
    for (const value of [null, 'nope', 42, ['a']]) {
      const config = sanitizeConfig(value);
      expect(config.groups).toEqual([]);
      expect(config.widgets).toEqual([]);
      expect(config.title).toBe('Home');
    }
  });

  it('accepts href for url, as other dashboards write it, and drops bookmarks with neither', () => {
    const config = sanitizeConfig({
      groups: [
        {
          name: 'Links',
          bookmarks: [{ name: 'A', href: 'https://a.example' }, { name: 'No address' }, 'junk']
        }
      ]
    });

    expect(config.groups[0].bookmarks).toHaveLength(1);
    expect(config.groups[0].bookmarks[0].url).toBe('https://a.example');
  });

  it('keeps widths on the board and styles it knows', () => {
    const config = sanitizeConfig({
      groups: [
        { name: 'Wide', width: 40, style: 'carousel' },
        { name: 'Narrow', width: 1 },
        { name: 'Text', width: '6', style: 'tiles' }
      ]
    });

    expect(config.groups.map((group) => group.width)).toEqual([GRID_COLUMNS, MIN_SPAN, 6]);
    expect(config.groups.map((group) => group.style)).toEqual(['cards', 'cards', 'tiles']);
  });

  it('reads each kind of widget, and glance’s word for markets', () => {
    const config = sanitizeConfig({
      widgets: [
        { type: 'weather', location: 'Cape Town', units: 'imperial' },
        { type: 'stocks', symbols: ['aapl', { symbol: 'btc-usd', name: 'Bitcoin' }] },
        { type: 'clock', zones: ['Europe/Paris', { timezone: 'Asia/Tokyo', name: 'Tokyo' }] },
        { type: 'hackernews', count: 99 },
        { type: 'calendar', weekStart: 'sunday' },
        { type: 'rss' }
      ]
    });

    expect(config.widgets.map((widget) => widget.type)).toEqual([
      'weather',
      'markets',
      'clock',
      'hackernews',
      'calendar'
    ]);
    expect(config.widgets[1]).toMatchObject({
      symbols: [
        { symbol: 'AAPL', name: '' },
        { symbol: 'BTC-USD', name: 'Bitcoin' }
      ]
    });
    expect(config.widgets[2]).toMatchObject({
      zones: [
        { zone: 'Europe/Paris', label: '' },
        { zone: 'Asia/Tokyo', label: 'Tokyo' }
      ]
    });
    expect(config.widgets[3]).toMatchObject({ count: 15 });
    expect(config.widgets[4]).toMatchObject({ weekStart: 0 });
  });

  it('keeps the glass within its range', () => {
    expect(sanitizeConfig({ glass: { blur: 400, tint: -1 } }).glass).toEqual({ blur: 32, tint: 0 });
  });

  it('gives every new widget something sensible to show', () => {
    expect(createWidget('weather')).toMatchObject({ location: 'London' });
    expect(createWidget('markets')).toMatchObject({ type: 'markets' });
  });

  it('counts bookmarks across groups', () => {
    const config = sanitizeConfig({
      groups: [
        { name: 'A', bookmarks: [{ url: 'https://a.example' }] },
        { name: 'B', bookmarks: [{ url: 'https://b.example' }, { url: 'https://c.example' }] }
      ]
    });

    expect(countBookmarks(config)).toBe(3);
  });
});
