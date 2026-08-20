import type { BranchSettings } from '../types';

export const BRANCH_TYPES = [
  'feat',
  'fix',
  'bugfix',
  'chore',
  'refactor',
  'release',
  'style',
  'test',
  'experiment'
] as const;

export type BranchType = (typeof BRANCH_TYPES)[number];

/** Full-word forms for types that are commonly abbreviated. Types not listed display as-is. */
export const FULL_TYPE_NAMES: Partial<Record<BranchType, string>> = {
  feat: 'feature'
};

export const DEFAULT_NAMING_SETTINGS: BranchSettings = {
  useFullTypeName: false,
  typeSeparator: '/',
  ticketSeparator: '-'
};

export const getDisplayType = (branchType: string, useFullTypeName: boolean): string => {
  if (!useFullTypeName) {
    return branchType;
  }

  return FULL_TYPE_NAMES[branchType as BranchType] ?? branchType;
};

export type BranchInput = {
  branchType: string;
  ticketNumber: string;
  description: string;
};

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
  const displayType = getDisplayType(branchType, settings.useFullTypeName);

  if (!branchType || !normalizedDescription) {
    return '';
  }

  if (!normalizedTicket) {
    return `${displayType}${settings.typeSeparator}${normalizedDescription}`;
  }

  return `${displayType}${settings.typeSeparator}${normalizedTicket}${settings.ticketSeparator}${normalizedDescription}`;
};

export const generatePullRequestTitle = (
  { branchType, ticketNumber, description }: BranchInput,
  settings: BranchSettings = DEFAULT_NAMING_SETTINGS
): string => {
  const formattedDescription = formatPullRequestDescription(description);
  const normalizedTicket = normalizeTicket(ticketNumber);
  const displayType = getDisplayType(branchType, settings.useFullTypeName);

  if (!branchType || !formattedDescription) {
    return '';
  }

  if (!normalizedTicket) {
    return `${displayType}: ${formattedDescription}`;
  }

  return `${displayType}${settings.typeSeparator}${normalizedTicket}: ${formattedDescription}`;
};
