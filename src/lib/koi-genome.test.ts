import { describe, expect, it } from 'vitest';
import { DEFAULT_PHYSICAL } from '../vendor/koi-pond/koi3d/config';
import {
  buildMarkings,
  koiBuildFor,
  koiLengthCm,
  koiRarity,
  koiTitle,
  physiqueFor,
  resolveLook,
  rollModifiers,
  varietyOf,
  type KoiGenome
} from './koi-genome';
import { createRandom } from './seeded-random';
import { VARIETIES, findVariety, type KoiVarietyId } from './koi-varieties';

const genome = (
  variety: KoiVarietyId,
  seed = 4242,
  modifiers: KoiGenome['modifiers'] = []
): KoiGenome => ({ variety, modifiers, seed });

const channels = (hex: string): number[] =>
  [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));

/** Whether a colour lies on the line between two others, channel by channel. */
const between = (colour: string, [from, to]: readonly [string, string]): boolean => {
  const [a, b, c] = [channels(from), channels(to), channels(colour)];
  return c.every(
    (value, index) =>
      value >= Math.min(a[index]!, b[index]!) - 1 && value <= Math.max(a[index]!, b[index]!) + 1
  );
};

describe('resolveLook', () => {
  it('is the same fish every time for the same genome', () => {
    expect(resolveLook(genome('showa'))).toEqual(resolveLook(genome('showa')));
  });

  it('gives two fish of one variety their own shades and markings', () => {
    const first = resolveLook(genome('kohaku', 1));
    const second = resolveLook(genome('kohaku', 2));

    expect(first.appearance.primary).not.toBe(second.appearance.primary);
    expect(first.pattern.patches).not.toEqual(second.pattern.patches);
  });

  it('draws each colour from inside its variety’s band', () => {
    const benigoi = findVariety('benigoi')!;

    for (let seed = 0; seed < 20; seed += 1) {
      const { appearance } = resolveLook(genome('benigoi', seed));
      expect(between(appearance.base, benigoi.base as readonly [string, string])).toBe(true);
    }
  });

  it('crowns a tancho with one round marking on its head, and nothing else', () => {
    const { pattern } = resolveLook(genome('tancho'));

    expect(pattern.patches).toHaveLength(1);
    expect(pattern.patches[0]!.layer).toBe(0);
    // The head runs back to the gills at roughly a fifth of the body.
    expect(pattern.patches[0]!.station).toBeLessThan(0.2);
  });

  it('leaves a self-coloured fish unmarked, in the 3D pond and the 2D one alike', () => {
    const { pattern, flat, appearance } = resolveLook(genome('orenji-ogon'));

    expect(pattern.patches).toHaveLength(0);
    expect(pattern.metallic).toBeGreaterThan(0.5);
    expect(flat.body).toBe(appearance.base);
    expect(flat.marking).toBe(appearance.base);
  });

  it('smooths a doitsu fish’s scales and makes a gin rin fish sparkle', () => {
    const plain = resolveLook(genome('kohaku'));
    const doitsu = resolveLook(genome('kohaku', 4242, ['doitsu']));
    const ginrin = resolveLook(genome('kohaku', 4242, ['ginrin']));

    expect(doitsu.appearance.scaleDepth).toBeLessThan(plain.appearance.scaleDepth);
    expect(ginrin.appearance.scaleDepth).toBeGreaterThan(plain.appearance.scaleDepth);
    expect(ginrin.appearance.gloss).toBeGreaterThan(plain.appearance.gloss);
    expect(ginrin.appearance.roughness).toBeLessThan(plain.appearance.roughness);
  });

  it('turns butterfly fins translucent', () => {
    const butterfly = resolveLook(genome('kohaku', 4242, ['butterfly']));

    expect(butterfly.appearance.finOpacity).toBeLessThan(
      resolveLook(genome('kohaku')).appearance.finOpacity
    );
  });
});

describe('buildMarkings', () => {
  it('paints a mirrored band on both flanks at once', () => {
    const patches = buildMarkings(findVariety('asagi')!.markings, 7);

    expect(patches.length % 2).toBe(0);

    for (let index = 0; index < patches.length; index += 2) {
      expect(patches[index + 1]!.girth).toBeCloseTo(-patches[index]!.girth);
      expect(patches[index + 1]!.station).toBe(patches[index]!.station);
    }
  });

  it('keeps every variety inside its band of the body', () => {
    for (const variety of VARIETIES) {
      for (const patch of buildMarkings(variety.markings, 99)) {
        expect(patch.station).toBeGreaterThanOrEqual(0);
        expect(patch.station).toBeLessThanOrEqual(0.8);
      }
    }
  });
});

describe('describing a koi', () => {
  it('names the traits before the variety, in the order breeders do', () => {
    expect(koiTitle(genome('kohaku', 1, ['ginrin', 'butterfly']))).toBe('Butterfly Gin Rin Kohaku');
    expect(koiTitle(genome('showa', 1, ['doitsu']))).toBe('Doitsu Showa Sanshoku');
    expect(koiTitle(genome('tancho'))).toBe('Tancho');
  });

  it('raises a fish’s rarity for each rare trait, up to legendary', () => {
    expect(koiRarity(genome('kohaku'))).toBe('common');
    expect(koiRarity(genome('kohaku', 1, ['ginrin']))).toBe('uncommon');
    expect(koiRarity(genome('kohaku', 1, ['ginrin', 'butterfly']))).toBe('rare');
    expect(koiRarity(genome('kohaku', 1, ['doitsu']))).toBe('common');
    expect(koiRarity(genome('kumonryu', 1, ['butterfly']))).toBe('legendary');
  });

  it('draws a variety it doesn’t know yet as a kohaku rather than failing', () => {
    const future = genome('space-koi' as KoiVarietyId, 5, ['butterfly']);

    expect(varietyOf(future).id).toBe('kohaku');
    expect(koiTitle(future)).toBe('Butterfly Kohaku');
    expect(() => resolveLook(future)).not.toThrow();
  });

  it('gives chagoi their famous size', () => {
    expect(koiBuildFor(genome('chagoi', 1))).toBe('react');
    expect(koiBuildFor(genome('chagoi', 2))).toBe('react');
  });

  it('quotes a believable adult length', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const length = koiLengthCm(genome('kohaku', seed));
      expect(length).toBeGreaterThanOrEqual(45);
      expect(length).toBeLessThanOrEqual(80);
    }
  });
});

describe('physiqueFor', () => {
  const phenotype = { length: 1, caudal: { span: 0.36 }, pectoral: { span: 0.16 } };

  it('passes an ordinary koi straight through', () => {
    expect(physiqueFor(genome('kohaku'), phenotype)).toBe(phenotype);
  });

  it('grows a butterfly koi’s fins well past the ordinary', () => {
    const grown = physiqueFor(genome('kohaku', 1, ['butterfly']), phenotype);

    expect(grown.pectoral!.span!).toBeGreaterThan(phenotype.pectoral.span * 1.5);
    expect(grown.caudal!.span!).toBeGreaterThan(phenotype.caudal.span * 1.3);
    expect(grown.dorsal!.span!).toBeGreaterThan(DEFAULT_PHYSICAL.dorsal.span);
    expect(grown.length).toBe(1);
  });
});

describe('rollModifiers', () => {
  it('never pairs sparkle with a doitsu’s missing scales, nor gives either to a scaleless fish', () => {
    const random = createRandom(1);

    for (let draw = 0; draw < 2000; draw += 1) {
      const kohaku = rollModifiers(findVariety('kohaku')!, random);
      const kumonryu = rollModifiers(findVariety('kumonryu')!, random);

      expect(kohaku.includes('doitsu') && kohaku.includes('ginrin')).toBe(false);
      expect(kumonryu.includes('doitsu') || kumonryu.includes('ginrin')).toBe(false);
    }
  });

  it('makes traits a pleasant surprise rather than the rule', () => {
    const random = createRandom(2);
    const rolls = Array.from({ length: 1000 }, () => rollModifiers(findVariety('kohaku')!, random));
    const plain = rolls.filter((modifiers) => modifiers.length === 0).length;

    expect(plain).toBeGreaterThan(600);
    expect(plain).toBeLessThan(950);
  });
});
