import { describe, expect, it, vi } from 'vitest';
import { ProxyUnavailableError, fetchQuotes, formatPrice, parseQuote, sparkline } from './markets';

const chart = (closes: (number | null)[], meta: Record<string, unknown> = {}) => ({
  chart: {
    result: [
      {
        meta: {
          symbol: 'AAPL',
          currency: 'USD',
          regularMarketPrice: 110,
          shortName: 'Apple Inc.',
          priceHint: 2,
          ...meta
        },
        indicators: { quote: [{ close: closes }] }
      }
    ]
  }
});

describe('parseQuote', () => {
  it('works out the day’s change from the last two closes', () => {
    const quote = parseQuote({ symbol: 'AAPL', name: '' }, chart([90, null, 100, 110]));

    expect(quote).toMatchObject({ name: 'Apple Inc.', price: 110, currency: 'USD' });
    expect(quote?.change).toBeCloseTo(10);
    expect(quote?.closes).toEqual([90, 100, 110]);
  });

  it('prefers the change Yahoo reports, and the visitor’s own name for the symbol', () => {
    const quote = parseQuote(
      { symbol: 'AAPL', name: 'Apple' },
      chart([100, 110], { regularMarketChangePercent: -1.5 })
    );

    expect(quote).toMatchObject({ name: 'Apple', change: -1.5 });
  });

  it('returns nothing for a symbol Yahoo does not know', () => {
    expect(parseQuote({ symbol: 'NOPE', name: '' }, { chart: { result: [] } })).toBeNull();
  });
});

describe('formatPrice', () => {
  it('uses the currency’s symbol and the precision Yahoo suggests', () => {
    const base = { symbol: 'X', name: 'X', change: 0, closes: [], precision: 2 };

    expect(formatPrice({ ...base, price: 1234.5, currency: 'USD' })).toBe('$1,234.50');
    expect(formatPrice({ ...base, price: 18.2, currency: 'ZAR' })).toBe('R18.20');
    expect(formatPrice({ ...base, price: 3, currency: 'XYZ' })).toBe('3.00 XYZ');
  });
});

describe('sparkline', () => {
  it('draws the closes across the box, highest at the top', () => {
    const { line, area } = sparkline([1, 3, 2], 100, 20);

    expect(line).toBe('M0.00 18.00 L50.00 2.00 L100.00 10.00');
    expect(area).toMatch(/Z$/);
  });

  it('draws nothing from a single point', () => {
    expect(sparkline([5], 100, 20)).toEqual({ line: '', area: '' });
  });
});

describe('fetchQuotes', () => {
  it('asks the same-origin proxy for each symbol', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(chart([100, 110])), {
          headers: { 'content-type': 'application/json' }
        })
    );
    vi.stubGlobal('fetch', fetch);

    const quotes = await fetchQuotes([{ symbol: 'AAPL', name: '' }], new AbortController().signal);

    expect(fetch).toHaveBeenCalledWith(
      '/api/markets/AAPL?range=1mo&interval=1d',
      expect.anything()
    );
    expect(quotes[0].price).toBe(110);
  });

  it('knows a static host without the proxy when it answers with the app’s own page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } })
      )
    );

    await expect(
      fetchQuotes([{ symbol: 'AAPL', name: '' }], new AbortController().signal)
    ).rejects.toBeInstanceOf(ProxyUnavailableError);
  });
});
