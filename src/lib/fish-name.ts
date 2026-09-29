/**
 * What a visitor may call a fish.
 *
 * Kept to one line of ordinary text that fits on a card, so a pasted essay or
 * a run of blank lines can't stretch the pond's UI or its stored state.
 */

/** The longest a name may be, in characters. */
export const MAX_FISH_NAME = 24;

/**
 * Tidies a typed name: whitespace collapsed to single spaces, trimmed, cut to
 * length. Returns null when nothing is left, which is not a name.
 */
export const cleanFishName = (raw: unknown): string | null => {
  if (typeof raw !== 'string') {
    return null;
  }

  // Control characters go first, so a stray newline can't hide a name in a second line.
  const name = raw
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return name === '' ? null : Array.from(name).slice(0, MAX_FISH_NAME).join('').trim();
};
