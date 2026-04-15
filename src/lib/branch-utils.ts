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

  const sentenceCaseValue =
    normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1);

  return /[.!?]$/.test(sentenceCaseValue)
    ? sentenceCaseValue
    : `${sentenceCaseValue}.`;
};

export const generateBranchName = ({
  branchType,
  ticketNumber,
  description
}: BranchInput): string => {
  const normalizedDescription = slugifyDescription(description);
  const normalizedTicket = normalizeTicket(ticketNumber);

  if (!branchType || !normalizedDescription) {
    return '';
  }

  if (!normalizedTicket) {
    return `${branchType}/${normalizedDescription}`;
  }

  return `${branchType}/${normalizedTicket}-${normalizedDescription}`;
};

export const generatePullRequestTitle = ({
  branchType,
  ticketNumber,
  description
}: BranchInput): string => {
  const formattedDescription = formatPullRequestDescription(description);
  const normalizedTicket = normalizeTicket(ticketNumber);

  if (!branchType || !formattedDescription) {
    return '';
  }

  if (!normalizedTicket) {
    return `${branchType}: ${formattedDescription}`;
  }

  return `${branchType}/${normalizedTicket}: ${formattedDescription}`;
};
