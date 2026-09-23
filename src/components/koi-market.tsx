import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COINS_PER_BRANCH,
  DAILY_BRANCH_REWARDS,
  WELCOME_COINS,
  purchaseBlocker,
  rewardsLeftToday,
  type KoiAccount,
  type OwnedKoi,
  type PurchaseOutcome
} from '../lib/koi-account';
import { MAX_KOI } from '../lib/koi';
import { closeLiveKoi } from '../lib/koi-live';
import { dailyStock, formatCountdown, msUntilRestock, type KoiListing } from '../lib/koi-market';
import { CoinAmount } from './coin-icon';
import { ListingCard, OwnedKoiRow } from './koi-market-cards';

type KoiMarketProps = {
  account: KoiAccount;
  /** Today's market day; the tank restocks when it changes. */
  day: string;
  onBuy: (listing: KoiListing) => PurchaseOutcome;
  /** Releases a koi and returns what the market paid back. */
  onRelease: (id: string) => number;
  onDismissWelcome: () => void;
  onClose: () => void;
};

type Tab = 'stock' | 'pond';

type Toast = { id: number; message: string };

const TOAST_MS = 4200;

/** Re-renders on an interval, for the restock countdown and "joined" dates. */
const useNow = (intervalMs: number): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
};

export const KoiMarket = ({
  account,
  day,
  onBuy,
  onRelease,
  onDismissWelcome,
  onClose
}: KoiMarketProps): JSX.Element => {
  const stock = useMemo(() => dailyStock(day), [day]);
  const [tab, setTab] = useState<Tab>('stock');
  const [toast, setToast] = useState<Toast | null>(null);
  const [celebrating, setCelebrating] = useState<string | null>(null);
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

    setCelebrating(listing.id);
    say(
      firstKoi
        ? `${listing.name} is swimming in your pond. Your branch koi will rest while market koi fill the pond.`
        : `${listing.name} is swimming in your pond.`
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
              Fresh koi every day · restocks in {formatCountdown(msUntilRestock(now))}
            </p>
          </div>
          <div className="market-header-actions">
            <span className="market-balance" aria-label={`${account.coins} coins`}>
              <CoinAmount coins={account.coins} />
            </span>
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

        {account.welcome && (
          <div className="market-welcome">
            <p>
              <strong>Welcome to the market.</strong> You start with{' '}
              <CoinAmount coins={account.welcome.coins} />
              {account.welcome.branches > 0
                ? `: ${WELCOME_COINS} to start, plus ${COINS_PER_BRANCH} for each of your ${account.welcome.branches} recent branches.`
                : '.'}{' '}
              Every new branch you copy or save earns {COINS_PER_BRANCH} more.
            </p>
            <button type="button" className="btn btn-secondary" onClick={onDismissWelcome}>
              Got it
            </button>
          </div>
        )}

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
                celebrating={celebrating === listing.id}
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
                  No market koi yet, so your branch koi have the pond to themselves. Buy one from
                  today&apos;s tank and your market koi take over.
                </p>
                <button type="button" className="btn btn-secondary" onClick={() => setTab('stock')}>
                  See today&apos;s koi
                </button>
              </div>
            ) : (
              <>
                <p className="market-note">
                  Market koi fill the whole pond. Release them all and your branch koi come back.
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
