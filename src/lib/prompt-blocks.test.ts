import { describe, expect, it } from 'vitest';
import {
  MAX_BLOCKS,
  MAX_BLOCK_BODY_LENGTH,
  MAX_BLOCK_HEADING_LENGTH,
  createBlock,
  parseBlocks,
  pruneSelectedBlockIds,
  sanitizeBlockBody,
  sanitizeBlockHeading,
  selectedBlockBodies,
  serializeBlocks
} from './prompt-blocks';
import type { PromptBlock } from '../types';

const block = (id: string, heading: string, body: string): PromptBlock => ({ id, heading, body });

describe('sanitizeBlockHeading', () => {
  it('collapses the heading onto one line and trims it', () => {
    expect(sanitizeBlockHeading('  Creating\n  a PR  ')).toBe('Creating a PR');
  });

  it('caps the heading length', () => {
    expect(sanitizeBlockHeading('x'.repeat(200))).toHaveLength(MAX_BLOCK_HEADING_LENGTH);
  });
});

describe('sanitizeBlockBody', () => {
  it('keeps internal line breaks and lists, trimming only the edges', () => {
    expect(sanitizeBlockBody('\n\n  - one\n  - two  \n\n')).toBe('- one\n  - two');
  });

  it('caps the body length', () => {
    expect(sanitizeBlockBody('x'.repeat(9000))).toHaveLength(MAX_BLOCK_BODY_LENGTH);
  });
});

describe('createBlock', () => {
  it('builds a block with a unique id', () => {
    const first = createBlock('Creating a PR', 'Raise it against develop.');
    const second = createBlock('Creating a PR', 'Raise it against develop.');

    expect(first?.heading).toBe('Creating a PR');
    expect(first?.body).toBe('Raise it against develop.');
    expect(first?.id).not.toBe(second?.id);
  });

  it('returns null when the heading or body is empty', () => {
    expect(createBlock('', 'Some text')).toBeNull();
    expect(createBlock('A heading', '   \n ')).toBeNull();
  });
});

describe('parseBlocks', () => {
  it('returns an empty library when nothing is stored', () => {
    expect(parseBlocks(null)).toEqual([]);
    expect(parseBlocks('not json')).toEqual([]);
    expect(parseBlocks(JSON.stringify({ not: 'an array' }))).toEqual([]);
  });

  it('round-trips a serialized library', () => {
    const blocks = [block('b1', 'Work stream A', 'Do it the A way.')];

    expect(parseBlocks(serializeBlocks(blocks))).toEqual(blocks);
  });

  it('drops entries missing an id, heading, or body', () => {
    const raw = JSON.stringify([
      { id: 'b1', heading: 'Keep', body: 'Kept text' },
      { id: '', heading: 'No id', body: 'text' },
      { id: 'b3', heading: '', body: 'text' },
      { id: 'b4', heading: 'No body', body: '  ' },
      { id: 'b5', heading: 'Wrong types', body: 42 },
      'not an object'
    ]);

    expect(parseBlocks(raw)).toEqual([block('b1', 'Keep', 'Kept text')]);
  });

  it('drops duplicate ids, keeping the first', () => {
    const raw = JSON.stringify([
      { id: 'b1', heading: 'First', body: 'one' },
      { id: 'b1', heading: 'Second', body: 'two' }
    ]);

    expect(parseBlocks(raw)).toEqual([block('b1', 'First', 'one')]);
  });

  it('caps an oversized imported library', () => {
    const raw = JSON.stringify(
      Array.from({ length: MAX_BLOCKS + 10 }, (_unused, index) => ({
        id: `b${index}`,
        heading: `Block ${index}`,
        body: 'text'
      }))
    );

    expect(parseBlocks(raw)).toHaveLength(MAX_BLOCKS);
  });
});

describe('pruneSelectedBlockIds', () => {
  it('keeps only ids that still exist', () => {
    const blocks = [block('b1', 'A', 'a'), block('b2', 'B', 'b')];

    expect(pruneSelectedBlockIds(blocks, ['b1', 'gone', 'b2'])).toEqual(['b1', 'b2']);
    expect(pruneSelectedBlockIds([], ['b1'])).toEqual([]);
  });
});

describe('selectedBlockBodies', () => {
  const blocks = [
    block('b1', 'A', 'body a'),
    block('b2', 'B', 'body b'),
    block('b3', 'C', 'body c')
  ];

  it('returns the bodies of the ticked blocks', () => {
    expect(selectedBlockBodies(blocks, ['b1', 'b3'])).toEqual(['body a', 'body c']);
  });

  it('uses library order, not the order they were ticked', () => {
    expect(selectedBlockBodies(blocks, ['b3', 'b1'])).toEqual(['body a', 'body c']);
  });

  it('ignores unknown ids and an empty selection', () => {
    expect(selectedBlockBodies(blocks, ['gone'])).toEqual([]);
    expect(selectedBlockBodies(blocks, [])).toEqual([]);
  });
});
