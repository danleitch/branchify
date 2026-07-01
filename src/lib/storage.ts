import type { PersistedForm, RecentBranch } from '../types';

export const FORM_STORAGE_KEY = 'branchify-form';
export const RECENT_STORAGE_KEY = 'branchify-recent';
export const MAX_RECENT_BRANCHES = 5;

export const EMPTY_FORM: PersistedForm = {
  branchType: 'feat',
  ticketNumber: '',
  description: ''
};

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
