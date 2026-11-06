import { normalizeTicket } from './branch-utils';
import {
  DEFAULT_PROMPT_FOOTER,
  DEFAULT_PROMPT_HEADER,
  TICKET_PLACEHOLDER
} from './prompt-templates';

export type TicketPromptInput = {
  ticketNumber: string;
  title: string;
  acceptanceCriteria: string;
  description: string;
};

/** The editable intro and closing text, as held in settings. */
export type PromptTemplates = {
  promptHeader: string;
  promptFooter: string;
};

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplates = {
  promptHeader: DEFAULT_PROMPT_HEADER,
  promptFooter: DEFAULT_PROMPT_FOOTER
};

/** Trims the edges of a pasted block while preserving the author's internal line breaks. */
const trimBlock = (value: string): string => value.replace(/^\s+|\s+$/g, '');

/** The title is a summary line, so a pasted newline is collapsed rather than kept. */
const toSingleLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

/**
 * Fills in the ticket ID. Lines that mention the ticket are dropped entirely
 * when there isn't one, so the default header degrades from two lines to
 * "I am starting a new ticket." rather than trailing an empty label.
 */
const renderTemplate = (template: string, ticket: string): string =>
  trimBlock(
    template
      .split('\n')
      .filter((line) => Boolean(ticket) || !line.includes(TICKET_PLACEHOLDER))
      .map((line) => line.split(TICKET_PLACEHOLDER).join(ticket))
      .join('\n')
  );

/**
 * Builds a ready-to-paste prompt from a Jira ticket's acceptance criteria and
 * description, wrapped in the configured header and footer. Returns '' until at
 * least one of the two blocks has content, so the UI can stay quiet while the
 * fields are empty.
 */
export const buildTicketPrompt = (
  { ticketNumber, title, acceptanceCriteria, description }: TicketPromptInput,
  { promptHeader, promptFooter }: PromptTemplates = DEFAULT_PROMPT_TEMPLATES
): string => {
  const summary = toSingleLine(title);
  const criteria = trimBlock(acceptanceCriteria);
  const body = trimBlock(description);

  if (!summary && !criteria && !body) {
    return '';
  }

  const ticket = normalizeTicket(ticketNumber);
  const header = renderTemplate(promptHeader, ticket);
  const footer = renderTemplate(promptFooter, ticket);
  const sections = [];

  if (header) {
    sections.push(header);
  }

  if (summary) {
    sections.push(`Title: ${summary}`);
  }

  if (criteria) {
    sections.push(`Acceptance criteria:\n${criteria}`);
  }

  if (body) {
    sections.push(`Description:\n${body}`);
  }

  if (footer) {
    sections.push(footer);
  }

  return sections.join('\n\n');
};
