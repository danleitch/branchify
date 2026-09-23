import { describe, expect, it } from 'vitest';
import { MAX_PATCHES } from '../vendor/koi-pond/koi3d/pattern';
import {
  KOI_GROUPS,
  MODIFIERS,
  MODIFIER_INFO,
  RARITIES,
  VARIETIES,
  allowsModifier,
  findVariety,
  type MarkingBand,
  type Tone
} from './koi-varieties';

const HEX = /^#[0-9a-f]{6}$/i;

const tones = (tone: Tone | undefined): string[] =>
  tone === undefined ? [] : typeof tone === 'string' ? [tone] : [...tone];

/** The most patches a recipe can ever ask for: every count at its top, mirrors doubled. */
const mostPatches = (bands: readonly MarkingBand[]): number =>
  bands.reduce(
    (total, band) =>
      total + (typeof band.count === 'number' ? band.count : band.count[1]) * (band.mirror ? 2 : 1),
    0
  );

describe('the variety catalogue', () => {
  it('names every variety once, with its kanji and a blurb', () => {
    expect(new Set(VARIETIES.map((variety) => variety.id)).size).toBe(VARIETIES.length);
    expect(new Set(VARIETIES.map((variety) => variety.name)).size).toBe(VARIETIES.length);

    for (const variety of VARIETIES) {
      expect(variety.kanji.length).toBeGreaterThan(0);
      expect(variety.blurb.length).toBeGreaterThan(20);
    }
  });

  it('writes every colour as plain #rrggbb, which the colour maths depends on', () => {
    for (const variety of VARIETIES) {
      const colours = [
        ...tones(variety.base),
        ...tones(variety.primary),
        ...tones(variety.secondary),
        ...tones(variety.belly),
        ...tones(variety.fin)
      ];

      for (const colour of colours) {
        expect(colour, `${variety.id} ${colour}`).toMatch(HEX);
      }
    }
  });

  it('never asks the shader for more markings than it composites', () => {
    for (const variety of VARIETIES) {
      expect(mostPatches(variety.markings), variety.id).toBeLessThanOrEqual(MAX_PATCHES);
    }
  });

  it('paints only in colours the variety actually has', () => {
    for (const variety of VARIETIES) {
      for (const band of variety.markings) {
        const colour = band.layer === 0 ? variety.primary : variety.secondary;
        expect(colour, `${variety.id} layer ${band.layer}`).toBeDefined();
      }
    }
  });

  it('stocks every rarity', () => {
    for (const rarity of RARITIES) {
      expect(VARIETIES.filter((variety) => variety.rarity === rarity).length).toBeGreaterThan(2);
    }
  });

  it('includes the plain fish: completely orange and completely red', () => {
    const orange = findVariety('orenji-ogon');
    const red = findVariety('benigoi');

    expect(orange?.markings).toHaveLength(0);
    expect(red?.markings).toHaveLength(0);
  });

  it('says what every name means, and which show family it belongs to', () => {
    const groups = new Set(KOI_GROUPS.map((group) => group.id));

    for (const variety of VARIETIES) {
      expect(variety.meaning.length, variety.id).toBeGreaterThan(2);
      expect(groups.has(variety.group), variety.id).toBe(true);
    }

    for (const group of KOI_GROUPS) {
      expect(
        VARIETIES.some((variety) => variety.group === group.id),
        group.id
      ).toBe(true);
    }
  });

  it('files the big three together', () => {
    const gosanke = VARIETIES.filter((variety) => variety.group === 'gosanke').map(
      (variety) => variety.id
    );

    expect(gosanke).toEqual(expect.arrayContaining(['kohaku', 'taisho-sanke', 'showa']));
  });

  it('finds varieties by id and shrugs at unknown ones', () => {
    expect(findVariety('tancho')?.name).toBe('Tancho');
    expect(findVariety('unicorn')).toBeUndefined();
  });
});

describe('traits', () => {
  it('lets any fish grow butterfly fins', () => {
    for (const variety of VARIETIES) {
      expect(allowsModifier(variety, 'butterfly')).toBe(true);
    }
  });

  it('keeps sparkle and scale-stripping off fish born without scales', () => {
    const kumonryu = findVariety('kumonryu')!;
    const kohaku = findVariety('kohaku')!;

    expect(allowsModifier(kumonryu, 'ginrin')).toBe(false);
    expect(allowsModifier(kumonryu, 'doitsu')).toBe(false);
    expect(allowsModifier(kohaku, 'ginrin')).toBe(true);
    expect(allowsModifier(kohaku, 'doitsu')).toBe(true);
  });

  it('prices every trait up, never down', () => {
    for (const modifier of MODIFIERS) {
      expect(MODIFIER_INFO[modifier].price).toBeGreaterThan(1);
      expect(MODIFIER_INFO[modifier].chance).toBeGreaterThan(0);
      expect(MODIFIER_INFO[modifier].chance).toBeLessThan(0.5);
    }
  });
});
