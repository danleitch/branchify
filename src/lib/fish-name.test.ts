import { describe, expect, it } from 'vitest';
import { MAX_FISH_NAME, cleanFishName } from './fish-name';

describe('cleanFishName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanFishName('  Sir   Splash\tA Lot ')).toBe('Sir Splash A Lot');
  });

  it('turns line breaks and control characters into spaces', () => {
    expect(cleanFishName('Big\nBubbles\u0000')).toBe('Big Bubbles');
  });

  it('is not a name when nothing is left', () => {
    expect(cleanFishName('   ')).toBeNull();
    expect(cleanFishName('\n\t')).toBeNull();
    expect(cleanFishName(42)).toBeNull();
  });

  it('cuts a long name to length without splitting an emoji', () => {
    const cleaned = cleanFishName(`${'a'.repeat(MAX_FISH_NAME - 1)}🐟🐟`)!;

    expect(Array.from(cleaned)).toHaveLength(MAX_FISH_NAME);
    expect(cleaned.endsWith('🐟')).toBe(true);
  });

  it('keeps Japanese names whole', () => {
    expect(cleanFishName('花')).toBe('花');
  });
});
