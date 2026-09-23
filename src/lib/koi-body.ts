/**
 * Builds the three.js fish for a market genome: a koi, or a goldfish.
 *
 * The pond and the market's portraits both come through here, which is what
 * guarantees the fish in the listing is the fish that swims in the pond.
 *
 * The vendored koi only knows its own seven pattern recipes, so the fish is
 * built with a placeholder and its markings are then replaced with the
 * variety's own through the library's exported `applyAppearance` — the same
 * path its own `setAppearance` takes — rather than by editing vendored code.
 */
import type { Mesh } from 'three';
import { buildBodyMesh } from '../vendor/koi-pond/koi3d/body-mesh';
import type { KoiSwimTrim } from '../vendor/koi-pond/koi3d/config';
import type { KoiPhenotype } from '../vendor/koi-pond/model/types';
import { toBufferGeometry } from '../vendor/koi-pond/three/geometry';
import { createKoi, type Koi } from '../vendor/koi-pond/three/koi';
import { applyAppearance } from '../vendor/koi-pond/three/materials';
import { isGoldfish } from './goldfish';
import { physiqueFor, resolveLook, type FishGenome } from './koi-genome';

/**
 * Rebuilds a fish's skin without the barbels.
 *
 * The whiskers at the corners of a koi's mouth are the surest way to tell it
 * from a goldfish, which has none. The vendored koi always grows them, so a
 * goldfish's skin is rebuilt from the body alone, with the library's own mesh
 * builders. The silhouette trace shares the skin's geometry, so it is pointed
 * at the new one too.
 */
const shaveBarbels = (koi: Koi): void => {
  const { skin } = koi.surfaces;
  const whiskered = skin.geometry;
  skin.geometry = toBufferGeometry(buildBodyMesh(koi.config.physical, koi.config.resolution));

  const trace = koi.object.getObjectByName('koi-outline-skin') as Mesh | undefined;

  if (trace) {
    trace.geometry = skin.geometry;
  }

  whiskered.dispose();
};

export const createGenomeKoi = (
  genome: FishGenome,
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

  if (isGoldfish(genome)) {
    shaveBarbels(koi);
  }

  return koi;
};
