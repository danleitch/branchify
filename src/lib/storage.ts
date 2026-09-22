import type {
  BackgroundStyle,
  BranchSeparators,
  BranchSettings,
  PersistedForm,
  RecentBranch
} from '../types';
import { DEFAULT_NAMING_SETTINGS, sanitizeBranchType } from './branch-utils';

export const FORM_STORAGE_KEY = 'branchify-form';
export const RECENT_STORAGE_KEY = 'branchify-recent';
export const SETTINGS_STORAGE_KEY = 'branchify-settings';
// Kept apart from the naming settings: the backdrop says nothing about branch names.
export const BACKGROUND_STORAGE_KEY = 'branchify-background';
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

/** Sanitises and de-duplicates stored branch types; falls back to defaults when none survive. */
const sanitizeBranchTypes = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [...DEFAULT_SETTINGS.branchTypes];
  }

  const types = value
    .filter((item): item is string => typeof item === 'string')
    .map(sanitizeBranchType)
    .filter((type, index, all) => type !== '' && all.indexOf(type) === index);

  return types.length > 0 ? types : [...DEFAULT_SETTINGS.branchTypes];
};

export const parseSettings = (raw: string | null): BranchSettings => {
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BranchSettings>;

    return {
      typeSeparator: sanitizeSeparator(parsed.typeSeparator, DEFAULT_SETTINGS.typeSeparator),
      ticketSeparator: sanitizeSeparator(parsed.ticketSeparator, DEFAULT_SETTINGS.ticketSeparator),
      branchTypes: sanitizeBranchTypes(parsed.branchTypes),
      showAiLinks:
        typeof parsed.showAiLinks === 'boolean' ? parsed.showAiLinks : DEFAULT_SETTINGS.showAiLinks
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseSnapshotForm = (value: unknown): PersistedForm | undefined =>
  isRecord(value) &&
  typeof value.branchType === 'string' &&
  typeof value.ticketNumber === 'string' &&
  typeof value.description === 'string'
    ? {
        branchType: value.branchType,
        ticketNumber: value.ticketNumber,
        description: value.description
      }
    : undefined;

const parseSnapshotSeparators = (value: unknown): BranchSeparators | undefined =>
  isRecord(value) &&
  typeof value.typeSeparator === 'string' &&
  typeof value.ticketSeparator === 'string'
    ? {
        typeSeparator: sanitizeSeparator(value.typeSeparator, DEFAULT_SETTINGS.typeSeparator),
        ticketSeparator: sanitizeSeparator(value.ticketSeparator, DEFAULT_SETTINGS.ticketSeparator)
      }
    : undefined;

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
        (item): item is Record<string, unknown> =>
          isRecord(item) && typeof item.value === 'string' && typeof item.createdAt === 'string'
      )
      .slice(0, MAX_RECENT_BRANCHES)
      .map((item): RecentBranch => {
        const form = parseSnapshotForm(item.form);
        const separators = parseSnapshotSeparators(item.separators);

        return {
          value: item.value as string,
          createdAt: item.createdAt as string,
          // Only keep the snapshot when it is complete; a half-valid one can't be loaded reliably.
          ...(form && separators ? { form, separators } : {})
        };
      });
  } catch {
    return [];
  }
};

export const BACKGROUND_STYLES: readonly BackgroundStyle[] = ['koi', 'particles', 'plain'];

export const DEFAULT_BACKGROUND: BackgroundStyle = 'koi';

/** Falls back to the default for anything written by a future or broken version. */
export const parseBackground = (raw: string | null): BackgroundStyle =>
  BACKGROUND_STYLES.includes(raw as BackgroundStyle)
    ? (raw as BackgroundStyle)
    : DEFAULT_BACKGROUND;
