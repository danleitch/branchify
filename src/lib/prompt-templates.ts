/**
 * The editable parts of the ticket prompt, kept free of imports so both
 * `branch-utils` (for the default settings) and `prompt-utils` (for rendering)
 * can use them without a cycle.
 */

/** Stands in for the ticket ID. A line containing it is dropped when there is no ticket. */
export const TICKET_PLACEHOLDER = '{ticket}';

export const DEFAULT_PROMPT_HEADER = [
  'I am starting a new ticket.',
  `This is the Jira ticket: ${TICKET_PLACEHOLDER}`
].join('\n');

export const DEFAULT_PROMPT_FOOTER = [
  'If there are any attached links or images on the ticket, please ask me for that material and I will download it or make it available for you.',
  "Let's do this as a plan first — I want to plan before anything gets built. Then please explain the problem to me simply, the solution or potential solution, and how things will change going forward if applicable."
].join('\n\n');

/** Generous enough for a long house style, small enough to keep localStorage sane. */
export const MAX_PROMPT_TEMPLATE_LENGTH = 2000;
