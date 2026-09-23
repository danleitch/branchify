import { useEffect, useRef, useState } from 'react';
import type { KoiGenome } from '../lib/koi-genome';
import { hideLiveKoi, showLiveKoi } from '../lib/koi-live';
import { koiPortrait, portraitKey } from '../lib/koi-portrait';

type KoiPortraitImageProps = {
  genome: KoiGenome;
  alt: string;
  /** While true, the photograph gives way to the koi itself, swimming. */
  active?: boolean;
  className?: string;
};

type PortraitState = { key: string; url: string | null } | null;

/**
 * A koi's portrait on a patch of pond water.
 *
 * The water is CSS and the fish is a transparent image laid over it, so the
 * card reads as a window onto the pond while the portrait is still rendering.
 */
export const KoiPortraitImage = ({
  genome,
  alt,
  active = false,
  className
}: KoiPortraitImageProps): JSX.Element => {
  const key = portraitKey(genome);
  const hostRef = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState<PortraitState>(null);
  // A state left over from a different fish is as good as no state at all.
  const current = portrait?.key === key ? portrait : null;
  const genomeRef = useRef(genome);
  genomeRef.current = genome;

  useEffect(() => {
    let live = true;

    void koiPortrait(genomeRef.current).then((url) => {
      if (live) {
        setPortrait({ key, url });
      }
    });

    return () => {
      live = false;
    };
  }, [key]);

  useEffect(() => {
    const host = hostRef.current;

    if (!active || !host) {
      return;
    }

    showLiveKoi(genomeRef.current, host);
    return () => hideLiveKoi(host);
  }, [active, key]);

  const state = current === null ? 'loading' : current.url ? 'ready' : 'missing';

  return (
    <div
      ref={hostRef}
      className={['koi-photo', className].filter(Boolean).join(' ')}
      data-state={state}
    >
      {current?.url ? (
        <img src={current.url} alt={alt} draggable={false} />
      ) : (
        <span className="visually-hidden">{alt}</span>
      )}
    </div>
  );
};
