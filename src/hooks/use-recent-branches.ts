import { useCallback, useEffect, useState } from 'react';
import type { RecentBranch } from '../types';
import {
  MAX_RECENT_BRANCHES,
  RECENT_STORAGE_KEY,
  parseRecentBranches,
  readStorage,
  writeStorage
} from '../lib/storage';

type UseRecentBranches = {
  recentBranches: RecentBranch[];
  addRecentBranch: (value: string) => void;
  removeRecentBranch: (createdAt: string) => void;
};

/**
 * Manages the list of recently generated branch names, keeping the most recent
 * entries first, de-duplicating by value, and persisting to localStorage.
 */
export const useRecentBranches = (): UseRecentBranches => {
  const [recentBranches, setRecentBranches] = useState<RecentBranch[]>(() =>
    parseRecentBranches(readStorage(RECENT_STORAGE_KEY))
  );

  useEffect(() => {
    writeStorage(RECENT_STORAGE_KEY, JSON.stringify(recentBranches));
  }, [recentBranches]);

  const addRecentBranch = useCallback((value: string): void => {
    if (!value) {
      return;
    }

    setRecentBranches((current) =>
      [
        { value, createdAt: new Date().toISOString() },
        ...current.filter((item) => item.value !== value)
      ].slice(0, MAX_RECENT_BRANCHES)
    );
  }, []);

  const removeRecentBranch = useCallback((createdAt: string): void => {
    setRecentBranches((current) => current.filter((item) => item.createdAt !== createdAt));
  }, []);

  return { recentBranches, addRecentBranch, removeRecentBranch };
};
