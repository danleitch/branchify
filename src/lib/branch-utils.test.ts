import { describe, expect, it } from 'vitest';
import {
  BRANCH_TYPES,
  formatPullRequestDescription,
  generateBranchName,
  generatePullRequestTitle,
  normalizeTicket,
  slugifyDescription
} from './branch-utils';

describe('slugifyDescription', () => {
  it('lowercases and hyphenates whitespace', () => {
    expect(slugifyDescription('Add User Authentication')).toBe('add-user-authentication');
  });

  it('strips characters that are not alphanumeric, space, or hyphen', () => {
    expect(slugifyDescription('Fix: login (broken)!')).toBe('fix-login-broken');
  });

  it('collapses repeated whitespace and hyphens', () => {
    expect(slugifyDescription('too    many   -- spaces')).toBe('too-many-spaces');
  });

  it('trims leading and trailing whitespace', () => {
    expect(slugifyDescription('   trimmed   ')).toBe('trimmed');
  });

  it('returns an empty string when nothing survives slugifying', () => {
    expect(slugifyDescription('!!!')).toBe('');
    expect(slugifyDescription('   ')).toBe('');
  });

  it('preserves numbers', () => {
    expect(slugifyDescription('upgrade to v2 api')).toBe('upgrade-to-v2-api');
  });
});

describe('normalizeTicket', () => {
  it('uppercases and trims', () => {
    expect(normalizeTicket('  brf-123 ')).toBe('BRF-123');
  });

  it('replaces internal whitespace with hyphens', () => {
    expect(normalizeTicket('proj 456')).toBe('PROJ-456');
  });

  it('returns an empty string for blank input', () => {
    expect(normalizeTicket('   ')).toBe('');
  });
});

describe('formatPullRequestDescription', () => {
  it('capitalizes the first letter and adds a trailing period', () => {
    expect(formatPullRequestDescription('add user authentication')).toBe(
      'Add user authentication.'
    );
  });

  it('does not add a second terminal punctuation mark', () => {
    expect(formatPullRequestDescription('is this done?')).toBe('Is this done?');
    expect(formatPullRequestDescription('done!')).toBe('Done!');
    expect(formatPullRequestDescription('already ends.')).toBe('Already ends.');
  });

  it('collapses internal whitespace', () => {
    expect(formatPullRequestDescription('spaced   out   text')).toBe('Spaced out text.');
  });

  it('returns an empty string for blank input', () => {
    expect(formatPullRequestDescription('   ')).toBe('');
  });
});

describe('generateBranchName', () => {
  it('combines type, ticket, and description', () => {
    expect(
      generateBranchName({
        branchType: 'feat',
        ticketNumber: 'BRF-123',
        description: 'Add user authentication'
      })
    ).toBe('feat/BRF-123-add-user-authentication');
  });

  it('omits the ticket segment when no ticket is supplied', () => {
    expect(
      generateBranchName({ branchType: 'fix', ticketNumber: '', description: 'Broken login' })
    ).toBe('fix/broken-login');
  });

  it('returns an empty string when the description slug is empty', () => {
    expect(
      generateBranchName({ branchType: 'feat', ticketNumber: 'BRF-1', description: '!!!' })
    ).toBe('');
  });

  it('returns an empty string when the branch type is missing', () => {
    expect(generateBranchName({ branchType: '', ticketNumber: '', description: 'x' })).toBe('');
  });
});

describe('generatePullRequestTitle', () => {
  it('uses the type/ticket: Description form when a ticket is present', () => {
    expect(
      generatePullRequestTitle({
        branchType: 'feat',
        ticketNumber: 'BRF-123',
        description: 'add user authentication'
      })
    ).toBe('feat/BRF-123: Add user authentication.');
  });

  it('uses the type: Description form when no ticket is present', () => {
    expect(
      generatePullRequestTitle({ branchType: 'fix', ticketNumber: '', description: 'broken login' })
    ).toBe('fix: Broken login.');
  });

  it('returns an empty string when the description is blank', () => {
    expect(
      generatePullRequestTitle({ branchType: 'feat', ticketNumber: 'BRF-1', description: '   ' })
    ).toBe('');
  });
});

describe('BRANCH_TYPES', () => {
  it('exposes the supported conventional-commit types', () => {
    expect(BRANCH_TYPES).toContain('feat');
    expect(BRANCH_TYPES).toContain('fix');
    expect(new Set(BRANCH_TYPES).size).toBe(BRANCH_TYPES.length);
  });
});
