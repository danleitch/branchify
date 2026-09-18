import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRANCH_TYPES,
  DEFAULT_NAMING_SETTINGS,
  formatPullRequestDescription,
  generateBranchName,
  generatePullRequestTitle,
  normalizeTicket,
  parseBranchName,
  sanitizeBranchType,
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

  it('uses the branch type exactly as provided, including full type names', () => {
    expect(
      generateBranchName({
        branchType: 'feature',
        ticketNumber: 'BRF-123',
        description: 'Add user authentication'
      })
    ).toBe('feature/BRF-123-add-user-authentication');
  });

  it('honors custom type and ticket separators', () => {
    expect(
      generateBranchName(
        { branchType: 'feat', ticketNumber: 'BRWT-1123', description: 'this is the branch name' },
        { ...DEFAULT_NAMING_SETTINGS, typeSeparator: '/', ticketSeparator: '_' }
      )
    ).toBe('feat/BRWT-1123_this-is-the-branch-name');
  });

  it('applies custom separators even without a ticket', () => {
    expect(
      generateBranchName(
        { branchType: 'fix', ticketNumber: '', description: 'broken login' },
        { ...DEFAULT_NAMING_SETTINGS, typeSeparator: '_', ticketSeparator: '-' }
      )
    ).toBe('fix_broken-login');
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

  it('uses the branch type exactly as provided with a custom type separator', () => {
    expect(
      generatePullRequestTitle(
        { branchType: 'feature', ticketNumber: 'BRF-123', description: 'add user authentication' },
        { ...DEFAULT_NAMING_SETTINGS, typeSeparator: '_', ticketSeparator: '-' }
      )
    ).toBe('feature_BRF-123: Add user authentication.');
  });
});

describe('DEFAULT_BRANCH_TYPES', () => {
  it('exposes both the full and abbreviated forms of the feature type', () => {
    expect(DEFAULT_BRANCH_TYPES).toContain('feature');
    expect(DEFAULT_BRANCH_TYPES).toContain('feat');
    expect(DEFAULT_BRANCH_TYPES).toContain('fix');
    expect(new Set(DEFAULT_BRANCH_TYPES).size).toBe(DEFAULT_BRANCH_TYPES.length);
  });
});

describe('sanitizeBranchType', () => {
  it('lowercases, trims, and hyphenates whitespace', () => {
    expect(sanitizeBranchType('  Bug Fix ')).toBe('bug-fix');
  });

  it('strips characters other than letters, numbers, hyphen, and underscore', () => {
    expect(sanitizeBranchType('bug/fix!')).toBe('bugfix');
    expect(sanitizeBranchType('my_type-2')).toBe('my_type-2');
  });

  it('caps the length', () => {
    expect(sanitizeBranchType('a'.repeat(50))).toHaveLength(20);
  });

  it('returns an empty string when nothing valid remains', () => {
    expect(sanitizeBranchType(' !!! ')).toBe('');
  });
});

describe('parseBranchName', () => {
  const settings = DEFAULT_NAMING_SETTINGS;

  it('parses a name with a ticket', () => {
    expect(parseBranchName('feat/BRF-123-add-user-authentication', settings)).toEqual({
      branchType: 'feat',
      ticketNumber: 'BRF-123',
      description: 'add user authentication'
    });
  });

  it('parses a name without a ticket', () => {
    expect(parseBranchName('fix/broken-login', settings)).toEqual({
      branchType: 'fix',
      ticketNumber: '',
      description: 'broken login'
    });
  });

  it('prefers the longest known type', () => {
    expect(
      parseBranchName('bug-fix-login', {
        ...settings,
        typeSeparator: '-',
        branchTypes: ['bug', 'bug-fix']
      })
    ).toEqual({ branchType: 'bug-fix', ticketNumber: '', description: 'login' });
  });

  it('parses types that are no longer in the settings list', () => {
    expect(parseBranchName('bug/broken-login', settings)).toEqual({
      branchType: 'bug',
      ticketNumber: '',
      description: 'broken login'
    });
  });

  it('honors custom separators', () => {
    expect(
      parseBranchName('feat_BRF-1.some-work', {
        ...settings,
        typeSeparator: '_',
        ticketSeparator: '.'
      })
    ).toEqual({ branchType: 'feat', ticketNumber: 'BRF-1', description: 'some work' });
  });

  it('round-trips through generateBranchName', () => {
    const form = { branchType: 'hotfix', ticketNumber: 'ABC-9', description: 'patch the thing' };
    const name = generateBranchName(form, settings);

    expect(parseBranchName(name, settings)).toEqual(form);
  });

  it('returns null when the name cannot be reproduced', () => {
    expect(parseBranchName('no-separator-here', settings)).toBeNull();
    expect(parseBranchName('feat/', settings)).toBeNull();
    expect(parseBranchName('feat/Not_Slug!', settings)).toBeNull();
  });
});
