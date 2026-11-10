import type { PromptBlock } from '../types';

export const MAX_BLOCKS = 30;
export const MAX_BLOCK_HEADING_LENGTH = 60;
export const MAX_BLOCK_BODY_LENGTH = 4000;

/** Collapses a heading to one line; it is a pick-list label, not prose. */
export const sanitizeBlockHeading = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, MAX_BLOCK_HEADING_LENGTH);

/** Keeps the author's line breaks and lists, trimming only the outer edges. */
export const sanitizeBlockBody = (value: string): string =>
  value.replace(/^\s+|\s+$/g, '').slice(0, MAX_BLOCK_BODY_LENGTH);

/**
 * Ids only need to be unique within one browser's library, so the clock plus a
 * short random suffix is enough and avoids pulling in a uuid dependency.
 */
const nextBlockId = (): string =>
  `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Returns null when nothing usable survives sanitising. */
export const createBlock = (heading: string, body: string): PromptBlock | null => {
  const cleanHeading = sanitizeBlockHeading(heading);
  const cleanBody = sanitizeBlockBody(body);

  if (!cleanHeading || !cleanBody) {
    return null;
  }

  return { id: nextBlockId(), heading: cleanHeading, body: cleanBody };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Parses a stored or imported library. Entries missing an id, heading, or body
 * are dropped rather than repaired, so a half-written block can never silently
 * contribute empty text to a prompt.
 */
export const parseBlocks = (raw: string | null): PromptBlock[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const items = Array.isArray(parsed) ? parsed : [];
    const seen = new Set<string>();

    return items
      .filter(isRecord)
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : '',
        heading: typeof item.heading === 'string' ? sanitizeBlockHeading(item.heading) : '',
        body: typeof item.body === 'string' ? sanitizeBlockBody(item.body) : ''
      }))
      .filter((block) => {
        if (!block.id || !block.heading || !block.body || seen.has(block.id)) {
          return false;
        }

        seen.add(block.id);
        return true;
      })
      .slice(0, MAX_BLOCKS);
  } catch {
    return [];
  }
};

/** Drops ids that no longer exist, so deleting a block un-ticks it everywhere. */
export const pruneSelectedBlockIds = (blocks: PromptBlock[], ids: string[]): string[] => {
  const known = new Set(blocks.map((block) => block.id));
  return ids.filter((id) => known.has(id));
};

/**
 * The bodies of the ticked blocks, in library order rather than the order they
 * were ticked, so the same selection always produces the same prompt.
 */
export const selectedBlockBodies = (blocks: PromptBlock[], ids: string[]): string[] => {
  const selected = new Set(ids);
  return blocks.filter((block) => selected.has(block.id)).map((block) => block.body);
};

/** Pretty-printed so an exported library stays readable and diffable. */
export const serializeBlocks = (blocks: PromptBlock[]): string => JSON.stringify(blocks, null, 2);
