import { normalizeTicket } from './branch-utils';

export type TicketPromptInput = {
  ticketNumber: string;
  acceptanceCriteria: string;
  description: string;
};

const PROMPT_INTRO = 'I am starting a new ticket.';

const PROMPT_OUTRO =
  'If there are any attached links or images on the ticket, please ask me for that material and I will download it or make it available for you.';

const PROMPT_FOOTER =
  "Let's do this as a plan first — I want to plan before anything gets built. Then please explain the problem to me simply, the solution or potential solution, and how things will change going forward if applicable.";

/** Trims the edges of a pasted block while preserving the author's internal line breaks. */
const trimBlock = (value: string): string => value.replace(/^\s+|\s+$/g, '');

/**
 * Builds a ready-to-paste prompt from a Jira ticket's acceptance criteria and
 * description. Returns '' until at least one of the two blocks has content, so
 * the UI can stay quiet while the fields are empty.
 */
export const buildTicketPrompt = ({
  ticketNumber,
  acceptanceCriteria,
  description
}: TicketPromptInput): string => {
  const criteria = trimBlock(acceptanceCriteria);
  const body = trimBlock(description);

  if (!criteria && !body) {
    return '';
  }

  const ticket = normalizeTicket(ticketNumber);
  const sections = [ticket ? `${PROMPT_INTRO} This is the Jira ticket: ${ticket}` : PROMPT_INTRO];

  if (criteria) {
    sections.push(`Acceptance criteria:\n${criteria}`);
  }

  if (body) {
    sections.push(`Description:\n${body}`);
  }

  sections.push(PROMPT_OUTRO, PROMPT_FOOTER);

  return sections.join('\n\n');
};
