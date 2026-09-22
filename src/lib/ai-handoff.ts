import type { AiProvider, BranchSettings } from '../types';
import { generateBranchName, type BranchInput } from './branch-utils';

export type AiHandoffTarget = {
  id: AiProvider;
  label: string;
  /** Undefined until there is a branch name worth shortening. */
  href?: string;
};

export const AI_PROVIDERS: readonly AiProvider[] = ['chatgpt', 'claude'];

export const AI_PROVIDER_LABELS: Readonly<Record<AiProvider, string>> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude'
};

/** Asks an AI assistant to shorten only the description part of the current branch name. */
export const buildShortenPrompt = (input: BranchInput, settings: BranchSettings): string => {
  const branchName = generateBranchName(input, settings);

  if (!branchName) {
    return '';
  }

  return [
    'Suggest a more concise git branch name.',
    '',
    `Original description: ${input.description.trim()}`,
    '',
    'Rules:',
    '- Keep the branch type, ticket and separators exactly as they are; only shorten the description.',
    '- The description should be lowercase, hyphen-separated, and ideally 2-4 words.',
    '- Keep the words that carry the most meaning and drop filler.',
    '',
    'Give me 3 options, each on its own line in a code block I can copy.'
  ].join('\n');
};

export const buildAiHandoffTargets = (
  input: BranchInput,
  settings: BranchSettings
): AiHandoffTarget[] => {
  const prompt = buildShortenPrompt(input, settings);
  const query = encodeURIComponent(prompt);

  return [
    {
      id: 'chatgpt',
      label: 'Shorten in ChatGPT',
      href: prompt ? `https://chatgpt.com/?q=${query}` : undefined
    },
    {
      id: 'claude',
      label: 'Shorten in Claude',
      href: prompt ? `https://claude.ai/new?q=${query}` : undefined
    }
  ];
};
