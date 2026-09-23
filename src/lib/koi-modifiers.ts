/**
 * The traits a koi can be born with, on top of its variety.
 *
 * Kept apart from the catalogue: an account only needs to know which traits
 * exist to read a stored fish, and that should not cost the page the whole
 * catalogue of varieties.
 */

/** A trait a fish of (almost) any variety can be born with. */
export type KoiModifier = 'ginrin' | 'doitsu' | 'butterfly';

export type KoiModifierInfo = {
  label: string;
  kanji: string;
  blurb: string;
  /** How likely a market fish is to carry it. */
  chance: number;
  /** What it multiplies the asking price by. */
  price: number;
  /** How many rarity steps it adds. */
  bump: number;
};

/** In the order they are named: "Butterfly Gin Rin Kohaku", never "Gin Rin Butterfly Kohaku". */
export const MODIFIERS: readonly KoiModifier[] = ['butterfly', 'doitsu', 'ginrin'];

export const MODIFIER_INFO: Readonly<Record<KoiModifier, KoiModifierInfo>> = {
  ginrin: {
    label: 'Gin Rin',
    kanji: '銀鱗',
    blurb: 'Sparkling, diamond-cut scales that catch every glint of light.',
    chance: 0.12,
    price: 1.5,
    bump: 1
  },
  doitsu: {
    label: 'Doitsu',
    kanji: 'ドイツ',
    blurb: 'Scaleless "German" skin, as smooth as lacquer.',
    chance: 0.1,
    price: 1.2,
    bump: 0
  },
  butterfly: {
    label: 'Butterfly',
    kanji: '鰭長',
    blurb: 'Long, flowing hirenaga fins that trail behind like silk.',
    chance: 0.08,
    price: 1.6,
    bump: 1
  }
};
