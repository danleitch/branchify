import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KOI_ACCOUNT_STORAGE_KEY,
  buyListing,
  createAccount,
  dismissWelcome,
  markSeen,
  parseAccount,
  releaseKoi,
  restockTank,
  rewardBranch,
  type KoiAccount,
  type PurchaseOutcome,
  type RestockOutcome
} from '../lib/koi-account';
import { marketDay, msUntilRestock } from '../lib/koi-market-clock';
import type { KoiListing } from '../lib/koi-market';
import { readStorage, writeStorage } from '../lib/storage';
import type { RecentBranch } from '../types';

/** A payout the header can celebrate; `id` changes with every payout so repeats still animate. */
export type KoiReward = { id: number; coins: number };

export type UseKoiAccount = {
  account: KoiAccount;
  lastReward: KoiReward | null;
  /** Pays for a branch the first time it is put to use; repeats and over-limit days earn nothing. */
  rewardForBranch: (branch: string) => void;
  buy: (listing: KoiListing) => PurchaseOutcome;
  /** Releases a koi and returns what the market paid back for it. */
  release: (id: string) => number;
  /** Pays to swap the day's tank for a fresh six. */
  restock: (day: string) => RestockOutcome;
  markMarketSeen: (day: string) => void;
  dismissMarketWelcome: () => void;
};

/**
 * The visitor's coins and koi, persisted like the rest of Branchify's state.
 *
 * A mirror ref holds the latest account so a payout can be decided and
 * committed in one step: two copies in the same tick must not both read the
 * balance from before the first one landed.
 */
export const useKoiAccount = (recentBranches: readonly RecentBranch[]): UseKoiAccount => {
  const [account, setAccount] = useState<KoiAccount>(
    () =>
      parseAccount(readStorage(KOI_ACCOUNT_STORAGE_KEY)) ??
      createAccount(
        recentBranches.map((item) => item.value),
        marketDay(new Date())
      )
  );
  const [lastReward, setLastReward] = useState<KoiReward | null>(null);
  const accountRef = useRef(account);

  const commit = useCallback((next: KoiAccount): void => {
    accountRef.current = next;
    setAccount(next);
  }, []);

  useEffect(() => {
    writeStorage(KOI_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  }, [account]);

  // Another tab spending or earning coins must not be overwritten by this one.
  useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== KOI_ACCOUNT_STORAGE_KEY) {
        return;
      }

      const next = parseAccount(event.newValue);

      if (next) {
        commit(next);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [commit]);

  const rewardForBranch = useCallback(
    (branch: string): void => {
      const result = rewardBranch(accountRef.current, branch, marketDay(new Date()));

      if (result.earned > 0) {
        commit(result.account);
        setLastReward((previous) => ({ id: (previous?.id ?? 0) + 1, coins: result.earned }));
      }
    },
    [commit]
  );

  const buy = useCallback(
    (listing: KoiListing): PurchaseOutcome => {
      const result = buyListing(accountRef.current, listing, new Date());

      if (result.outcome === 'bought') {
        commit(result.account);
      }

      return result.outcome;
    },
    [commit]
  );

  const release = useCallback(
    (id: string): number => {
      const result = releaseKoi(accountRef.current, id);
      commit(result.account);
      return result.refund;
    },
    [commit]
  );

  const restock = useCallback(
    (day: string): RestockOutcome => {
      const result = restockTank(accountRef.current, day);

      if (result.outcome === 'restocked') {
        commit(result.account);
      }

      return result.outcome;
    },
    [commit]
  );

  const markMarketSeen = useCallback(
    (day: string): void => commit(markSeen(accountRef.current, day)),
    [commit]
  );

  const dismissMarketWelcome = useCallback(
    (): void => commit(dismissWelcome(accountRef.current)),
    [commit]
  );

  return {
    account,
    lastReward,
    rewardForBranch,
    buy,
    release,
    restock,
    markMarketSeen,
    dismissMarketWelcome
  };
};

/** Today's market day, rolling over by itself at the visitor's midnight. */
export const useMarketDay = (): string => {
  const [day, setDay] = useState(() => marketDay(new Date()));

  useEffect(() => {
    const rollOver = (): void => setDay(marketDay(new Date()));
    // A second past midnight, so the new day has definitely begun.
    const timer = window.setTimeout(rollOver, msUntilRestock(new Date()) + 1000);
    // A sleeping laptop fires timers late, so waking up checks the date too.
    document.addEventListener('visibilitychange', rollOver);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', rollOver);
    };
  }, [day]);

  return day;
};
