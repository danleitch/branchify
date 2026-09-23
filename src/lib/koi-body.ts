/**
 * Builds the three.js koi for a market genome.
 *
 * The pond and the market's portraits both come through here, which is what
 * guarantees the fish in the listing is the fish that swims in the pond.
 *
 * The vendored koi only knows its own seven pattern recipes, so the koi is
 * built with a placeholder and its markings are then replaced with the
 * variety's own through the library's exported `applyAppearance` — the same
 * path its own `setAppearance` takes — rather than by editing vendored code.
 */
import type { KoiSwimTrim } from '../vendor/koi-pond/koi3d/config';
import type { KoiPhenotype } from '../vendor/koi-pond/model/types';
import { createKoi, type Koi } from '../vendor/koi-pond/three/koi';
import { applyAppearance } from '../vendor/koi-pond/three/materials';
import { physiqueFor, resolveLook, type KoiGenome } from './koi-genome';

export const createGenomeKoi = (
  genome: KoiGenome,
  phenotype: KoiPhenotype,
  trim?: Partial<KoiSwimTrim>
): Koi => {
  const look = resolveLook(genome);
  const koi = createKoi({
    seed: genome.seed,
    physical: physiqueFor(genome, phenotype),
    appearance: look.appearance,
    trim
  });

  applyAppearance(koi.uniforms, koi.config.appearance, look.pattern);
  koi.uniforms.uBellyColour.value.set(look.belly);

  return koi;
};
