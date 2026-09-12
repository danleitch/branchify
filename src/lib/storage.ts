import type { BranchSettings, PersistedForm, RecentBranch } from '../types';
import { DEFAULT_NAMING_SETTINGS } from './branch-utils';

export const FORM_STORAGE_KEY = 'branchify-form';
export const RECENT_STORAGE_KEY = 'branchify-recent';
export const SETTINGS_STORAGE_KEY = 'branchify-settings';
export const MAX_RECENT_BRANCHES = 5;
export const MAX_SEPARATOR_LENGTH = 3;

export const EMPTY_FORM: PersistedForm = {
  branchType: 'feat',
  ticketNumber: '',
  description: ''
};

export const DEFAULT_SETTINGS: BranchSettings = DEFAULT_NAMING_SETTINGS;

/**
 * Reads a raw string from localStorage, tolerating environments where storage
 * is unavailable (private browsing, SSR, blocked cookies).
 */
export const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Writes to localStorage, silently ignoring quota/availability errors. */
export const writeStorage = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage is best-effort; ignore failures */
  }
};

export const parseForm = (raw: string | null): PersistedForm => {
  if (!raw) {
    return EMPTY_FORM;
  }

  try {
    return { ...EMPTY_FORM, ...(JSON.parse(raw) as Partial<PersistedForm>) };
  } catch {
    return EMPTY_FORM;
  }
};

/** Strips whitespace and caps length; falls back to the default when the value isn't a string. */
const sanitizeSeparator = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.replace(/\s+/g, '').slice(0, MAX_SEPARATOR_LENGTH);
};

export const parseSettings = (raw: string | null): BranchSettings => {
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BranchSettings>;

    return {
      typeSeparator: sanitizeSeparator(parsed.typeSeparator, DEFAULT_SETTINGS.typeSeparator),
      ticketSeparator: sanitizeSeparator(parsed.ticketSeparator, DEFAULT_SETTINGS.ticketSeparator)
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const parseRecentBranches = (raw: string | null): RecentBranch[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item): item is RecentBranch =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as RecentBranch).value === 'string' &&
          typeof (item as RecentBranch).createdAt === 'string'
      )
      .slice(0, MAX_RECENT_BRANCHES);
  } catch {
    return [];
  }
};
