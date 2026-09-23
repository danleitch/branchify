import { useState, type FocusEvent } from 'react';
import { refundFor, type OwnedKoi, type PurchaseOutcome } from '../lib/koi-account';
import { MAX_KOI } from '../lib/koi';
import { koiLengthCm, koiRarity, koiTitle, varietyOf, type KoiGenome } from '../lib/koi-genome';
import { describeListing, nameMeaning, type KoiListing } from '../lib/koi-market';
import { MODIFIER_INFO, RARITY_LABELS } from '../lib/koi-varieties';
import { CoinAmount, CoinIcon } from './coin-icon';
import { KoiPortraitImage } from './koi-portrait-image';

type Blocker = Exclude<PurchaseOutcome, 'bought'> | null;

/** Pointing at a card, or tabbing into it, wakes its koi. */
const useAwake = (): {
  awake: boolean;
  wakers: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onFocus: () => void;
    onBlur: (event: FocusEvent<HTMLElement>) => void;
  };
} => {
  const [awake, setAwake] = useState(false);

  return {
    awake,
    wakers: {
      onPointerEnter: () => setAwake(true),
      onPointerLeave: () => setAwake(false),
      onFocus: () => setAwake(true),
      onBlur: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setAwake(false);
        }
      }
    }
  };
};

const TraitChips = ({ genome }: { genome: KoiGenome }): JSX.Element | null =>
  genome.modifiers.length === 0 ? null : (
    <ul className="koi-traits" aria-label="Traits">
      {genome.modifiers.map((modifier) => (
        <li key={modifier} title={MODIFIER_INFO[modifier].blurb}>
          {MODIFIER_INFO[modifier].label}
        </li>
      ))}
    </ul>
  );

const buyLabel = (blocker: Blocker, shortBy: number): string => {
  switch (blocker) {
    case 'owned':
      return 'In your pond';
    case 'pond-full':
      return `Pond full (${MAX_KOI}/${MAX_KOI})`;
    case 'short':
      return `Need ${shortBy} more`;
    default:
      return 'Buy';
  }
};

type ListingCardProps = {
  listing: KoiListing;
  blocker: Blocker;
  coins: number;
  /** Just bought in this visit, which earns the card a moment of celebration. */
  celebrating: boolean;
  onBuy: (listing: KoiListing) => void;
};

export const ListingCard = ({
  listing,
  blocker,
  coins,
  celebrating,
  onBuy
}: ListingCardProps): JSX.Element => {
  const { genome } = listing;
  const variety = varietyOf(genome);
  const rarity = koiRarity(genome);
  const title = koiTitle(genome);
  const meaning = nameMeaning(listing.name);
  const headingId = `koi-${listing.id.replace(/[^a-z0-9]/gi, '-')}`;
  const { awake, wakers } = useAwake();

  return (
    <article
      className="koi-card"
      data-rarity={rarity}
      data-celebrating={celebrating || undefined}
      aria-labelledby={headingId}
      {...wakers}
    >
      <div className="koi-card-photo">
        <KoiPortraitImage genome={genome} alt={describeListing(listing)} active={awake} />
        <span className="rarity-badge" data-rarity={rarity}>
          {RARITY_LABELS[rarity]}
        </span>
        <span className="koi-size">{koiLengthCm(genome)} cm</span>
      </div>

      <div className="koi-card-body">
        <div className="koi-card-heading">
          <h3 id={headingId}>
            {listing.name}
            {meaning && <span className="koi-name-meaning"> · {meaning}</span>}
          </h3>
          <CoinAmount coins={listing.price} className="koi-price" />
        </div>
        <p className="koi-variety">
          {title}{' '}
          <span lang="ja" className="koi-kanji">
            {variety.kanji}
          </span>
        </p>
        <TraitChips genome={genome} />
        <p className="koi-blurb">{variety.blurb}</p>

        <button
          type="button"
          className={blocker === 'owned' ? 'btn btn-owned' : 'btn'}
          disabled={blocker !== null}
          onClick={() => onBuy(listing)}
          aria-label={
            blocker === null ? `Buy ${listing.name} for ${listing.price} coins` : undefined
          }
        >
          {blocker === null && <CoinIcon />}
          {buyLabel(blocker, listing.price - coins)}
          {blocker === 'owned' && ' ✓'}
        </button>
      </div>
    </article>
  );
};

const joinedLabel = (acquiredAt: string, now: Date): string => {
  const acquired = new Date(acquiredAt);
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(acquired.getFullYear(), acquired.getMonth(), acquired.getDate()).getTime()) /
      86_400_000
  );

  if (Number.isNaN(days) || days < 0) {
    return 'Joined recently';
  }

  if (days === 0) {
    return 'Joined today';
  }

  return days === 1 ? 'Joined yesterday' : `Joined ${days} days ago`;
};

type OwnedKoiRowProps = {
  koi: OwnedKoi;
  now: Date;
  onRelease: (koi: OwnedKoi) => void;
};

export const OwnedKoiRow = ({ koi, now, onRelease }: OwnedKoiRowProps): JSX.Element => {
  const [confirming, setConfirming] = useState(false);
  const title = koiTitle(koi.genome);
  const rarity = koiRarity(koi.genome);
  const refund = refundFor(koi);
  const { awake, wakers } = useAwake();

  return (
    <li className="owned-koi" data-rarity={rarity} {...wakers}>
      <KoiPortraitImage genome={koi.genome} alt={describeListing(koi)} active={awake} />
      <div className="owned-koi-info">
        <h3>{koi.name}</h3>
        <p className="koi-variety">
          {title} · {koiLengthCm(koi.genome)} cm
        </p>
        <p className="owned-koi-meta">
          <span className="rarity-badge" data-rarity={rarity}>
            {RARITY_LABELS[rarity]}
          </span>
          {joinedLabel(koi.acquiredAt, now)}
        </p>
      </div>

      {confirming ? (
        <div className="release-confirm" role="group" aria-label={`Release ${koi.name}?`}>
          <p>
            Release {koi.name}? You get <CoinAmount coins={refund} /> back.
          </p>
          <div className="release-actions">
            <button type="button" className="btn btn-danger" onClick={() => onRelease(koi)}>
              Release
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirming(false)}
            >
              Keep
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setConfirming(true)}
          aria-label={`Release ${koi.name}`}
        >
          Release
        </button>
      )}
    </li>
  );
};
