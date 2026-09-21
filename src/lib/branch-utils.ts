import type { BranchSettings, PersistedForm } from '../types';

export const DEFAULT_BRANCH_TYPES: readonly string[] = [
  'bugfix',
  'chore',
  'docs',
  'experiment',
  'feat',
  'feature',
  'fix',
  'hotfix',
  'refactor',
  'release',
  'style',
  'test'
];

export const MAX_BRANCH_TYPE_LENGTH = 20;

export const DEFAULT_NAMING_SETTINGS: BranchSettings = {
  typeSeparator: '/',
  ticketSeparator: '-',
  branchTypes: [...DEFAULT_BRANCH_TYPES]
};

export type BranchInput = {
  branchType: string;
  ticketNumber: string;
  description: string;
};

/** Normalises a user-entered branch type; returns '' when nothing valid remains. */
export const sanitizeBranchType = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, MAX_BRANCH_TYPE_LENGTH);

export const slugifyDescription = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export const normalizeTicket = (value: string): string =>
  value.trim().toUpperCase().replace(/\s+/g, '-');

export const formatPullRequestDescription = (value: string): string => {
  const normalizedValue = value.trim().replace(/\s+/g, ' ');

  if (!normalizedValue) {
    return '';
  }

  const sentenceCaseValue = normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1);

  return /[.!?]$/.test(sentenceCaseValue) ? sentenceCaseValue : `${sentenceCaseValue}.`;
};

export const generateBranchName = (
  { branchType, ticketNumber, description }: BranchInput,
  settings: BranchSettings = DEFAULT_NAMING_SETTINGS
): string => {
  const normalizedDescription = slugifyDescription(description);
  const normalizedTicket = normalizeTicket(ticketNumber);

  if (!branchType || !normalizedDescription) {
    return '';
  }

  if (!normalizedTicket) {
    return `${branchType}${settings.typeSeparator}${normalizedDescription}`;
  }

  return `${branchType}${settings.typeSeparator}${normalizedTicket}${settings.ticketSeparator}${normalizedDescription}`;
};

/** Ways `rest` (a branch name minus its type prefix) could split into ticket + description. */
const splitTicketAndDescription = (
  rest: string,
  ticketSeparator: string
): Pick<PersistedForm, 'ticketNumber' | 'description'>[] => {
  const options = [{ ticketNumber: '', description: rest.replace(/-/g, ' ') }];
  const firstLowercase = rest.search(/[a-z]/);

  if (ticketSeparator && firstLowercase > 0) {
    // Tickets are uppercased, descriptions are lowercased, so the ticket is the
    // leading run before the first lowercase letter (minus its trailing separator).
    const run = rest.slice(0, firstLowercase);

    if (run.endsWith(ticketSeparator) && run.length > ticketSeparator.length) {
      options.unshift({
        ticketNumber: run.slice(0, -ticketSeparator.length),
        description: rest.slice(firstLowercase).replace(/-/g, ' ')
      });
    }
  }

  return options;
};

/**
 * Best-effort reconstruction of form fields from a generated branch name, for
 * history entries saved before the form was stored alongside them. Returns null
 * unless the parsed fields regenerate exactly the same name.
 */
export const parseBranchName = (value: string, settings: BranchSettings): PersistedForm | null => {
  const { typeSeparator, ticketSeparator, branchTypes } = settings;
  const candidates = [...branchTypes]
    .sort((a, b) => b.length - a.length)
    .filter((type) => value.startsWith(type + typeSeparator));

  // Also try whatever precedes the first separator, in case the type has since been removed.
  const separatorIndex = typeSeparator ? value.indexOf(typeSeparator) : -1;
  if (separatorIndex > 0) {
    candidates.push(value.slice(0, separatorIndex));
  }

  for (const branchType of candidates) {
    const rest = value.slice(branchType.length + typeSeparator.length);

    for (const fields of splitTicketAndDescription(rest, ticketSeparator)) {
      const form = { branchType, ...fields };

      if (generateBranchName(form, settings) === value) {
        return form;
      }
    }
  }

  return null;
};

export const generatePullRequestTitle = (
  { branchType, ticketNumber, description }: BranchInput,
  settings: BranchSettings = DEFAULT_NAMING_SETTINGS
): string => {
  const formattedDescription = formatPullRequestDescription(description);
  const normalizedTicket = normalizeTicket(ticketNumber);

  if (!branchType || !formattedDescription) {
    return '';
  }

  if (!normalizedTicket) {
    return `${branchType}: ${formattedDescription}`;
  }

  return `${branchType}${settings.typeSeparator}${normalizedTicket}: ${formattedDescription}`;
};
