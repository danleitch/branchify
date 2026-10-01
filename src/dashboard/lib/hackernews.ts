/** The front page of Hacker News, from its public Firebase API. */
import { hostOf } from './urls';

const API = 'https://hacker-news.firebaseio.com/v0';

export type Story = {
  id: number;
  title: string;
  url: string;
  host: string;
  score: number;
  comments: number;
  /** Unix seconds. */
  time: number;
  by: string;
};

type Item = {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  time?: number;
  by?: string;
  dead?: boolean;
  deleted?: boolean;
};

export const discussionUrl = (id: number): string => `https://news.ycombinator.com/item?id=${id}`;

export const fetchTopStories = async (count: number, signal: AbortSignal): Promise<Story[]> => {
  const response = await fetch(`${API}/topstories.json`, { signal });

  if (!response.ok) {
    throw new Error('Hacker News didn’t answer.');
  }

  const ids = ((await response.json()) as number[]).slice(0, count);
  const items = await Promise.all(
    ids.map(async (id) => {
      const itemResponse = await fetch(`${API}/item/${id}.json`, { signal });
      return itemResponse.ok ? ((await itemResponse.json()) as Item | null) : null;
    })
  );

  return items
    .filter(
      (item): item is Item => item !== null && !item.dead && !item.deleted && Boolean(item.title)
    )
    .map((item) => {
      const url = item.url ?? discussionUrl(item.id);
      return {
        id: item.id,
        title: item.title!,
        url,
        host: item.url ? hostOf(item.url) : 'news.ycombinator.com',
        score: item.score ?? 0,
        comments: item.descendants ?? 0,
        time: item.time ?? 0,
        by: item.by ?? ''
      };
    });
};

/** "4h", "35m", "2d": how long ago, the way the front page says it. */
export const timeAgo = (unixSeconds: number, now = Date.now()): string => {
  const minutes = Math.max(0, Math.round((now / 1000 - unixSeconds) / 60));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`;
};
