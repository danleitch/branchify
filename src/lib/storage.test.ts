import { describe, expect, it } from 'vitest';
import { EMPTY_FORM, parseForm, parseRecentBranches } from './storage';

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
