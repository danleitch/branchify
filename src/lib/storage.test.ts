import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  EMPTY_FORM,
  parseForm,
  parseRecentBranches,
  parseSettings
} from './storage';

describe('parseForm', () => {
  it('returns the empty form when nothing is stored', () => {
    expect(parseForm(null)).toEqual(EMPTY_FORM);
  });

  it('merges stored values over the defaults', () => {
    expect(parseForm(JSON.stringify({ description: 'hello' }))).toEqual({
      ...EMPTY_FORM,
      description: 'hello'
    });
  });

  it('falls back to the empty form for malformed JSON', () => {
    expect(parseForm('{ not json')).toEqual(EMPTY_FORM);
  });
});

describe('parseRecentBranches', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(parseRecentBranches(null)).toEqual([]);
  });

  it('parses a valid array of branches', () => {
    const branches = [{ value: 'feat/x', createdAt: '2026-01-01T00:00:00.000Z' }];
    expect(parseRecentBranches(JSON.stringify(branches))).toEqual(branches);
  });

  it('filters out malformed entries', () => {
    const raw = JSON.stringify([
      { value: 'feat/ok', createdAt: '2026-01-01T00:00:00.000Z' },
      { value: 123 },
      null,
      'nope'
    ]);
    expect(parseRecentBranches(raw)).toEqual([
      { value: 'feat/ok', createdAt: '2026-01-01T00:00:00.000Z' }
    ]);
  });

  it('caps the number of entries', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      value: `feat/branch-${index}`,
      createdAt: new Date(2026, 0, index + 1).toISOString()
    }));
    expect(parseRecentBranches(JSON.stringify(many))).toHaveLength(5);
  });

  it('returns an empty array for non-array JSON', () => {
    expect(parseRecentBranches(JSON.stringify({ value: 'x' }))).toEqual([]);
  });

  it('returns an empty array for malformed JSON', () => {
    expect(parseRecentBranches('[oops')).toEqual([]);
  });
});

describe('parseRecentBranches snapshots', () => {
  const entry = { value: 'feat/x', createdAt: '2026-01-01T00:00:00.000Z' };
  const form = { branchType: 'feat', ticketNumber: '', description: 'x' };
  const separators = { typeSeparator: '/', ticketSeparator: '-' };

  it('keeps a complete form and separators snapshot', () => {
    const raw = JSON.stringify([{ ...entry, form, separators }]);
    expect(parseRecentBranches(raw)).toEqual([{ ...entry, form, separators }]);
  });

  it('drops a snapshot that is incomplete or malformed', () => {
    const raw = JSON.stringify([
      { ...entry, form },
      { ...entry, createdAt: '2026-01-02T00:00:00.000Z', form: { branchType: 1 }, separators }
    ]);
    expect(parseRecentBranches(raw)).toEqual([
      entry,
      { ...entry, createdAt: '2026-01-02T00:00:00.000Z' }
    ]);
  });
});

describe('parseSettings', () => {
  it('returns the default settings when nothing is stored', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('accepts custom separators', () => {
    expect(parseSettings(JSON.stringify({ typeSeparator: '_', ticketSeparator: '.' }))).toEqual({
      ...DEFAULT_SETTINGS,
      typeSeparator: '_',
      ticketSeparator: '.'
    });
  });

  it('strips whitespace and caps the length of separators', () => {
    expect(parseSettings(JSON.stringify({ typeSeparator: '  a b c d  ' }))).toEqual({
      ...DEFAULT_SETTINGS,
      typeSeparator: 'abc'
    });
  });

  it('falls back to defaults for non-string separator values', () => {
    expect(parseSettings(JSON.stringify({ typeSeparator: 42 }))).toEqual(DEFAULT_SETTINGS);
  });

  it('defaults branch types for settings saved before they were configurable', () => {
    expect(parseSettings(JSON.stringify({ typeSeparator: '_' })).branchTypes).toEqual(
      DEFAULT_SETTINGS.branchTypes
    );
  });

  it('accepts custom branch types, sanitising and de-duplicating them', () => {
    const raw = JSON.stringify({ branchTypes: ['Bug', 'bug', ' new type ', '!!!', 42] });
    expect(parseSettings(raw).branchTypes).toEqual(['bug', 'new-type']);
  });

  it('falls back to the default types when none are valid', () => {
    expect(parseSettings(JSON.stringify({ branchTypes: [] })).branchTypes).toEqual(
      DEFAULT_SETTINGS.branchTypes
    );
    expect(parseSettings(JSON.stringify({ branchTypes: 'bug' })).branchTypes).toEqual(
      DEFAULT_SETTINGS.branchTypes
    );
  });

  it('falls back to the default settings for malformed JSON', () => {
    expect(parseSettings('{ not json')).toEqual(DEFAULT_SETTINGS);
  });
});
