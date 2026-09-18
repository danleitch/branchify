export type PersistedForm = {
  branchType: string;
  ticketNumber: string;
  description: string;
};

export type BranchSeparators = {
  typeSeparator: string;
  ticketSeparator: string;
};

export type RecentBranch = {
  createdAt: string;
  value: string;
  /** Form and separators used to generate `value`; absent on entries saved by older versions. */
  form?: PersistedForm;
  separators?: BranchSeparators;
};

export type BranchSettings = BranchSeparators & {
  branchTypes: string[];
};
