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

export const generateBranchName = ({
  branchType,
  ticketNumber,
  description
}: BranchInput): string => {
  const normalizedDescription = slugifyDescription(description);
  const normalizedTicket = normalizeTicket(ticketNumber);

  if (!branchType || !normalizedTicket || !normalizedDescription) {
    return '';
  }

  return `${branchType}/${normalizedTicket}/${normalizedDescription}`;
};
