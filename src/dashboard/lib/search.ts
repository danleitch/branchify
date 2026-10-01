/** Finding bookmarks from a few typed letters. */
import type { Bookmark, Group } from './model';
import { displayUrl } from './urls';

export type BookmarkHit = { bookmark: Bookmark; group: Group; score: number };

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '');

/** Whether every letter of the query appears in order, as "gh" does in "GitHub". */
const isSubsequence = (query: string, target: string): boolean => {
  let position = 0;

  for (const letter of target) {
    if (letter === query[position]) {
      position += 1;

      if (position === query.length) {
        return true;
      }
    }
  }

  return false;
};

/** How well one field answers the query; 0 when it doesn't. */
const fieldScore = (query: string, field: string, weight: number): number => {
  const value = normalize(field);

  if (!value) {
    return 0;
  }

  if (value === query) {
    return 100 * weight;
  }

  if (value.startsWith(query)) {
    return 80 * weight;
  }

  if (value.split(/[\s./_-]+/).some((word) => word.startsWith(query))) {
    return 60 * weight;
  }

  if (value.includes(query)) {
    return 40 * weight;
  }

  return 0;
};

export const searchBookmarks = (
  groups: readonly Group[],
  rawQuery: string,
  limit = 8
): BookmarkHit[] => {
  const query = normalize(rawQuery.trim());

  if (!query) {
    return [];
  }

  const hits: BookmarkHit[] = [];

  for (const group of groups) {
    for (const bookmark of group.bookmarks) {
      const score = Math.max(
        fieldScore(query, bookmark.name, 1),
        fieldScore(query, displayUrl(bookmark.url), 0.7),
        fieldScore(query, bookmark.description, 0.5),
        fieldScore(query, group.name, 0.4),
        query.length >= 2 && isSubsequence(query, normalize(bookmark.name)) ? 20 : 0
      );

      if (score > 0) {
        hits.push({ bookmark, group, score });
      }
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
};
