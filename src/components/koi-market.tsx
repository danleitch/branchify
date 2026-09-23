import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COINS_PER_BRANCH,
  DAILY_BRANCH_REWARDS,
  RESTOCK_PRICE,
  purchaseBlocker,
  rewardsLeftToday,
  tankToday,
  type KoiAccount,
  type OwnedKoi,
  type PurchaseOutcome,
  type RestockOutcome
} from '../lib/koi-account';
import { MAX_KOI } from '../lib/koi';
import { closeLiveKoi } from '../lib/koi-live';
import { formatCountdown, koiTank, msUntilRestock, type KoiListing } from '../lib/koi-market';
import { CoinAmount, CoinIcon } from './coin-icon';
import { KoiGuide } from './koi-guide';
import { KoiMarketExplainer } from './koi-market-explainer';
import { ListingCard, OwnedKoiRow } from './koi-market-cards';

type KoiMarketProps = {
  account: KoiAccount;
  /** Today's market day; the tank restocks when it changes. */
  day: string;
  onBuy: (listing: KoiListing) => PurchaseOutcome;
  /** Releases a koi and returns what the market paid back. */
  onRelease: (id: string) => number;
  onRestock: () => RestockOutcome;
  onDismissWelcome: () => void;
  onClose: () => void;
};

type Tab = 'stock' | 'pond';

type Toast = { id: number; message: string };

const TOAST_MS = 4600;

/** How long a new arrival wears its "Just in" badge. */
const FRESH_MS = 6000;

/** Re-renders on an interval, for the restock countdown and "joined" dates. */
const useNow = (intervalMs: number): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
};

/**
 * The fish that have swum into the tank since it was last drawn.
 *
 * The tank the market opens on is nobody's news; a replacement, a restock or
 * the midnight turnover is, and those arrivals are marked for a few seconds.
 */
const useArrivals = (stock: readonly KoiListing[]): ReadonlySet<string> => {
  const seen = useRef<ReadonlySet<string> | null>(null);
  const [arrivals, setArrivals] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const ids = new Set(stock.map((listing) => listing.id));
    const previous = seen.current;
    seen.current = ids;

    if (previous) {
      const arrived = [...ids].filter((id) => !previous.has(id));

      if (arrived.length > 0) {
        setArrivals(new Set(arrived));
      }
    }
  }, [stock]);

  useEffect(() => {
    if (arrivals.size === 0) {
      return;
    }

    const timer = window.setTimeout(() => setArrivals(new Set()), FRESH_MS);
    return () => window.clearTimeout(timer);
  }, [arrivals]);

  return arrivals;
};

const BookIcon = (): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    width="21"
    height="21"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 6.5C10.3 5 7.9 4.4 4 4.6v13.2c3.9-.2 6.3.4 8 1.9 1.7-1.5 4.1-2.1 8-1.9V4.6c-3.9-.2-6.3.4-8 1.9Z" />
    <path d="M12 6.5v13.2" />
  </svg>
);

type RestockControlProps = {
  coins: number;
  restocks: number;
  onRestock: () => void;
};

/** Paying to swap the tank, with a moment to think before the coins go. */
const RestockControl = ({ coins, restocks, onRestock }: RestockControlProps): JSX.Element => {
  const [confirming, setConfirming] = useState(false);
  const short = RESTOCK_PRICE - coins;

  if (confirming) {
    return (
      <div className="restock-confirm" role="group" aria-label="Restock the tank?">
        <span>Swap all six for a fresh tank?</span>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setConfirming(false);
            onRestock();
          }}
        >
          <CoinIcon />
          Restock for {RESTOCK_PRICE}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="restock-control">
      {restocks > 0 && (
        <span className="restock-count">
          Restocked {restocks === 1 ? 'once' : `${restocks} times`} today
        </span>
      )}
      <button
        type="button"
        className="btn btn-secondary restock-button"
        disabled={short > 0}
        onClick={() => setConfirming(true)}
      >
        <span aria-hidden="true">↻</span>
        {short > 0 ? (
          `Restock · need ${short} more`
        ) : (
          <>
            Restock now · <CoinAmount coins={RESTOCK_PRICE} />
          </>
        )}
      </button>
    </div>
  );
};

export const KoiMarket = ({
  account,
  day,
  onBuy,
  onRelease,
  onRestock,
  onDismissWelcome,
  onClose
}: KoiMarketProps): JSX.Element => {
  const { restocks, sold } = tankToday(account, day);
  const soldKey = sold.join(' ');
  const stock = useMemo(
    () => koiTank(day, restocks, soldKey ? soldKey.split(' ') : []),
    [day, restocks, soldKey]
  );
  const arrivals = useArrivals(stock);
  const [tab, setTab] = useState<Tab>('stock');
  const [guideOpen, setGuideOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const now = useNow(30_000);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
      // The live koi's WebGL context goes back the moment the market closes.
      closeLiveKoi();
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const say = (message: string): void =>
    setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));

  const handleBuy = (listing: KoiListing): void => {
    const firstKoi = account.owned.length === 0;

    if (onBuy(listing) !== 'bought') {
      return;
    }

    // Replayed exactly as the tank will be, so the name is the fish that appears.
    const newcomer = koiTank(day, restocks, [...sold, listing.id])[listing.slot];
    const joined = newcomer ? ` ${newcomer.name} has joined the tank.` : '';

    say(
      firstKoi
        ? `${listing.name} is swimming in your pond, and your branch koi are resting.${joined}`
        : `${listing.name} is swimming in your pond.${joined}`
    );
  };

  const handleRelease = (koi: OwnedKoi): void => {
    const refund = onRelease(koi.id);
    const last = account.owned.length === 1;

    say(
      last
        ? `${koi.name} swam off, and ${refund} coins came back. Your branch koi are back in the pond.`
        : `${koi.name} swam off, and ${refund} coins came back.`
    );
  };

  const handleRestock = (): void => {
    if (onRestock() === 'restocked') {
      say('Six fresh koi have swum into the tank.');
    }
  };

  const left = rewardsLeftToday(account, day);

  return (
    <div
      className="settings-backdrop market-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="market-panel" role="dialog" aria-modal="true" aria-labelledby="market-title">
        <header className="market-header">
          <div>
            <h2 id="market-title">Koi Market</h2>
            <p className="market-subtitle">
              Six fresh koi every day · restocks in {formatCountdown(msUntilRestock(now))}
            </p>
          </div>
          <div className="market-header-actions">
            <span className="market-balance" aria-label={`${account.coins} coins`}>
              <CoinAmount coins={account.coins} />
            </span>
            <button
              type="button"
              className="header-action market-guide-toggle"
              onClick={() => setGuideOpen((open) => !open)}
              aria-pressed={guideOpen}
              aria-label="Koi guide"
              title="Koi guide"
            >
              <BookIcon />
            </button>
            <button
              ref={closeRef}
              type="button"
              className="header-action"
              onClick={onClose}
              aria-label="Close koi market"
            >
              ✕
            </button>
          </div>
        </header>

        {guideOpen ? (
          <KoiGuide onBack={() => setGuideOpen(false)} />
        ) : (
          <>
            <KoiMarketExplainer
              welcome={account.welcome}
              onDismissWelcome={onDismissWelcome}
              onOpenGuide={() => setGuideOpen(true)}
            />

            <div className="market-toolbar">
              <div className="market-tabs" role="tablist" aria-label="Koi market">
                <button
                  type="button"
                  role="tab"
                  id="market-tab-stock"
                  aria-selected={tab === 'stock'}
                  aria-controls="market-panel-stock"
                  onClick={() => setTab('stock')}
                >
                  Today&apos;s koi
                </button>
                <button
                  type="button"
                  role="tab"
                  id="market-tab-pond"
                  aria-selected={tab === 'pond'}
                  aria-controls="market-panel-pond"
                  onClick={() => setTab('pond')}
                >
                  Your pond{' '}
                  <span className="market-tab-count">
                    {account.owned.length}/{MAX_KOI}
                  </span>
                </button>
              </div>

              {tab === 'stock' && (
                <RestockControl
                  coins={account.coins}
                  restocks={restocks}
                  onRestock={handleRestock}
                />
              )}
            </div>

            {tab === 'stock' ? (
              <section
                id="market-panel-stock"
                role="tabpanel"
                aria-labelledby="market-tab-stock"
                className="market-grid"
              >
                {stock.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    blocker={purchaseBlocker(account, listing)}
                    coins={account.coins}
                    fresh={arrivals.has(listing.id)}
                    onBuy={handleBuy}
                  />
                ))}
              </section>
            ) : (
              <section
                id="market-panel-pond"
                role="tabpanel"
                aria-labelledby="market-tab-pond"
                className="market-pond"
              >
                {account.owned.length === 0 ? (
                  <div className="market-empty">
                    <p>
                      No market koi yet, so your branch koi have the pond to themselves. Buy one
                      from today&apos;s tank and your market koi take over.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setTab('stock')}
                    >
                      See today&apos;s koi
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="market-note">
                      Market koi fill the whole pond. Release them all and your branch koi come
                      back.
                    </p>
                    <ul className="owned-list">
                      {account.owned.map((koi) => (
                        <OwnedKoiRow key={koi.id} koi={koi} now={now} onRelease={handleRelease} />
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}

            <footer className="market-footer">
              Earn <CoinAmount coins={COINS_PER_BRANCH} /> for every new branch you copy or save
              {left > 0
                ? ` · ${left} of ${DAILY_BRANCH_REWARDS} left today`
                : ' · daily limit reached, more tomorrow'}
            </footer>
          </>
        )}

        <div className="market-toast-region" role="status" aria-live="polite">
          {toast && (
            <p key={toast.id} className="market-toast">
              {toast.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
