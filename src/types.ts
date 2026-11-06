export type PersistedForm = {
  branchType: string;
  ticketNumber: string;
  description: string;
};

export type BranchSeparators = {
  typeSeparator: string;
  ticketSeparator: string;
};

/** Jira fields pasted in to build a ticket prompt; kept separate from the branch form. */
export type TicketPromptForm = {
  /** The ticket's summary line. Short, but it frames everything under it. */
  title: string;
  acceptanceCriteria: string;
  description: string;
};

export type RecentBranch = {
  createdAt: string;
  value: string;
  /** Form and separators used to generate `value`; absent on entries saved by older versions. */
  form?: PersistedForm;
  separators?: BranchSeparators;
};

/** An AI assistant the "shorten with AI" icons can hand a description off to. */
export type AiProvider = 'chatgpt' | 'claude';

export type BranchSettings = BranchSeparators & {
  branchTypes: string[];
  /** Which "shorten with AI" icons appear beside the description field. */
  aiHandoffTargets: AiProvider[];
  /** Ticket prompt intro. A line containing `{ticket}` is dropped when there is no ticket ID. */
  promptHeader: string;
  /** Ticket prompt closing text. Also supports `{ticket}`. */
  promptFooter: string;
};

/** Which backdrop the app draws behind the panel. */
export type BackgroundStyle = 'koi' | 'particles' | 'plain';
