import { describe, expect, it } from 'vitest';
import { buildAiHandoffTargets, buildShortenPrompt } from './ai-handoff';
import { DEFAULT_NAMING_SETTINGS } from './branch-utils';

const input = {
  branchType: 'feat',
  ticketNumber: 'brf-123',
  description: 'Add user authentication with single sign on'
};

describe('buildShortenPrompt', () => {
  it('includes only the original description and the rules', () => {
    const prompt = buildShortenPrompt(input, DEFAULT_NAMING_SETTINGS);

    expect(prompt).toContain('Original description: Add user authentication with single sign on');
    expect(prompt).toContain('Rules:');
    expect(prompt).not.toContain('Current branch name');
    expect(prompt).not.toContain('BRF-123');
    expect(prompt).not.toContain('separator: "');
  });

  it('returns an empty prompt when no branch name can be generated', () => {
    expect(buildShortenPrompt({ ...input, description: '' }, DEFAULT_NAMING_SETTINGS)).toBe('');
  });
});

describe('buildAiHandoffTargets', () => {
  it('builds ChatGPT and Claude links carrying the encoded prompt', () => {
    const [chatgpt, claude] = buildAiHandoffTargets(input, DEFAULT_NAMING_SETTINGS);
    const query = encodeURIComponent(buildShortenPrompt(input, DEFAULT_NAMING_SETTINGS));

    expect(chatgpt.href).toBe(`https://chatgpt.com/?q=${query}`);
    expect(claude.href).toBe(`https://claude.ai/new?q=${query}`);
  });

  it('leaves the links without an href when there is nothing to shorten', () => {
    const targets = buildAiHandoffTargets({ ...input, description: '' }, DEFAULT_NAMING_SETTINGS);

    expect(targets.map((target) => target.id)).toEqual(['chatgpt', 'claude']);
    expect(targets.every((target) => target.href === undefined)).toBe(true);
  });
});
