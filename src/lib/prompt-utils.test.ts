import { describe, expect, it } from 'vitest';
import { DEFAULT_PROMPT_TEMPLATES, buildTicketPrompt } from './prompt-utils';
import { DEFAULT_PROMPT_FOOTER, DEFAULT_PROMPT_HEADER } from './prompt-templates';

const OUTRO =
  'If there are any attached links or images on the ticket, please ask me for that material and I will download it or make it available for you.';

const FOOTER_PLAN = "Let's do this as a plan first";

describe('buildTicketPrompt', () => {
  it('builds a prompt with the ticket, criteria, description, closing request, and footer', () => {
    const result = buildTicketPrompt({
      ticketNumber: 'BRF-123',
      acceptanceCriteria: '- Login works\n- Errors are shown',
      description: 'Users cannot sign in on mobile.'
    });

    expect(result).toBe(
      [
        'I am starting a new ticket.\nThis is the Jira ticket: BRF-123',
        'Acceptance criteria:\n- Login works\n- Errors are shown',
        'Description:\nUsers cannot sign in on mobile.',
        DEFAULT_PROMPT_FOOTER
      ].join('\n\n')
    );
  });

  it('returns an empty string until criteria or description has content', () => {
    expect(
      buildTicketPrompt({ ticketNumber: 'BRF-1', acceptanceCriteria: '', description: '' })
    ).toBe('');
    expect(
      buildTicketPrompt({ ticketNumber: 'BRF-1', acceptanceCriteria: '   \n ', description: '\n' })
    ).toBe('');
  });

  it('drops the ticket line when no ticket number is given', () => {
    const result = buildTicketPrompt({
      ticketNumber: '',
      acceptanceCriteria: 'Must be accessible.',
      description: ''
    });

    expect(result.startsWith('I am starting a new ticket.\n\n')).toBe(true);
    expect(result).not.toContain('This is the Jira ticket');
  });

  it('normalises the ticket number the same way branch names do', () => {
    const result = buildTicketPrompt({
      ticketNumber: '  brf-42 ',
      acceptanceCriteria: 'Something',
      description: ''
    });

    expect(result).toContain('This is the Jira ticket: BRF-42');
  });

  it('omits a section that was left empty', () => {
    const criteriaOnly = buildTicketPrompt({
      ticketNumber: 'BRF-7',
      acceptanceCriteria: 'Only criteria',
      description: ''
    });
    expect(criteriaOnly).toContain('Acceptance criteria:\nOnly criteria');
    expect(criteriaOnly).not.toContain('Description:');

    const descriptionOnly = buildTicketPrompt({
      ticketNumber: 'BRF-7',
      acceptanceCriteria: '',
      description: 'Only description'
    });
    expect(descriptionOnly).toContain('Description:\nOnly description');
    expect(descriptionOnly).not.toContain('Acceptance criteria:');
  });

  it('keeps internal line breaks but trims the edges of each block', () => {
    const result = buildTicketPrompt({
      ticketNumber: 'BRF-8',
      acceptanceCriteria: '\n\n  Given a user\nWhen they log in  \n\n',
      description: '  Padded body  '
    });

    expect(result).toContain('Acceptance criteria:\nGiven a user\nWhen they log in');
    expect(result).toContain('Description:\nPadded body');
  });

  it('defaults to asking for attached material and ends with the plan footer', () => {
    const result = buildTicketPrompt({
      ticketNumber: 'BRF-9',
      acceptanceCriteria: 'Criteria',
      description: 'Description'
    });

    expect(result).toContain(OUTRO);
    expect(result.endsWith(DEFAULT_PROMPT_FOOTER)).toBe(true);
  });

  it('asks for a plan before anything is built, then a simple explanation', () => {
    const result = buildTicketPrompt({
      ticketNumber: '',
      acceptanceCriteria: 'Criteria',
      description: ''
    });

    expect(result).toContain(FOOTER_PLAN);
    expect(result).toContain('explain the problem to me simply');
    expect(result).toContain('the solution or potential solution');
    expect(result).toContain('how things will change going forward if applicable');
  });

  describe('custom header and footer', () => {
    it('uses the supplied templates instead of the defaults', () => {
      const result = buildTicketPrompt(
        { ticketNumber: 'ACME-5', acceptanceCriteria: 'Criteria', description: '' },
        { promptHeader: 'New work on {ticket}.', promptFooter: 'Ship it carefully.' }
      );

      expect(result).toBe(
        ['New work on ACME-5.', 'Acceptance criteria:\nCriteria', 'Ship it carefully.'].join('\n\n')
      );
      expect(result).not.toContain(FOOTER_PLAN);
    });

    it('substitutes the ticket anywhere in either template, as often as it appears', () => {
      const result = buildTicketPrompt(
        { ticketNumber: 'ACME-5', acceptanceCriteria: 'Criteria', description: '' },
        { promptHeader: '{ticket} start, {ticket} again', promptFooter: 'Done with {ticket}.' }
      );

      expect(result).toContain('ACME-5 start, ACME-5 again');
      expect(result).toContain('Done with ACME-5.');
    });

    it('drops only the lines that mention the ticket when there is no ticket ID', () => {
      const result = buildTicketPrompt(
        { ticketNumber: '', acceptanceCriteria: 'Criteria', description: '' },
        { promptHeader: 'Keep this line\nTicket: {ticket}\nKeep this one too', promptFooter: '' }
      );

      expect(result).toContain('Keep this line\nKeep this one too');
      expect(result).not.toContain('Ticket:');
    });

    it('omits an empty header or footer entirely', () => {
      const noHeader = buildTicketPrompt(
        { ticketNumber: 'BRF-1', acceptanceCriteria: 'Criteria', description: '' },
        { promptHeader: '', promptFooter: 'Footer only' }
      );
      expect(noHeader).toBe('Acceptance criteria:\nCriteria\n\nFooter only');

      const noFooter = buildTicketPrompt(
        { ticketNumber: 'BRF-1', acceptanceCriteria: 'Criteria', description: '' },
        { promptHeader: 'Header only', promptFooter: '   \n  ' }
      );
      expect(noFooter).toBe('Header only\n\nAcceptance criteria:\nCriteria');
    });

    it('exposes the defaults so settings can restore them', () => {
      expect(DEFAULT_PROMPT_TEMPLATES).toEqual({
        promptHeader: DEFAULT_PROMPT_HEADER,
        promptFooter: DEFAULT_PROMPT_FOOTER
      });
    });
  });
});
