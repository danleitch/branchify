export type PersistedForm = {
  branchType: string;
  ticketNumber: string;
  description: string;
};

export type RecentBranch = {
  createdAt: string;
  value: string;
};

export type BranchSettings = {
  typeSeparator: string;
  ticketSeparator: string;
};
