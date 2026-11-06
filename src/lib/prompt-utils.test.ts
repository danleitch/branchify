import { describe, expect, it } from 'vitest';
import { buildTicketPrompt } from './prompt-utils';

const OUTRO =
  'If there are any attached links or images on the ticket, please ask me for that material and I will download it or make it available for you.';

const FOOTER =
  "Let's do this as a plan first — I want to plan before anything gets built. Then please explain the problem to me simply, the solution or potential solution, and how things will change going forward if applicable.";

describe('buildTicketPrompt', () => {
  it('builds a prompt with the ticket, criteria, description, closing request, and footer', () => {
    const result = buildTicketPrompt({
      ticketNumber: 'BRF-123',
      acceptanceCriteria: '- Login works\n- Errors are shown',
      description: 'Users cannot sign in on mobile.'
    });

    expect(result).toBe(
      [
        'I am starting a new ticket. This is the Jira ticket: BRF-123',
        'Acceptance criteria:\n- Login works\n- Errors are shown',
        'Description:\nUsers cannot sign in on mobile.',
        OUTRO,
        FOOTER
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

  it('omits the ticket reference when no ticket number is given', () => {
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

  it('always includes the request for attached material and ends with the plan footer', () => {
    const result = buildTicketPrompt({
      ticketNumber: 'BRF-9',
      acceptanceCriteria: 'Criteria',
      description: 'Description'
    });

    expect(result).toContain(OUTRO);
    expect(result.endsWith(FOOTER)).toBe(true);
  });

  it('asks for a plan before anything is built, then a simple explanation', () => {
    const result = buildTicketPrompt({
      ticketNumber: '',
      acceptanceCriteria: 'Criteria',
      description: ''
    });

    expect(result).toContain("Let's do this as a plan first");
    expect(result).toContain('explain the problem to me simply');
    expect(result).toContain('the solution or potential solution');
    expect(result).toContain('how things will change going forward if applicable');
  });
});
