/**
 * The market's calendar: which day's tank is on sale, and when the next arrives.
 *
 * Kept apart from the stock itself so the header can know whether there is new
 * stock without loading the catalogue, the genome, or anything that draws.
 */

/** Today's market day in the visitor's own calendar: `YYYY-MM-DD`. */
export const marketDay = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');

/** Milliseconds until the tank restocks, at the visitor's next local midnight. */
export const msUntilRestock = (now: Date): number => {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, midnight.getTime() - now.getTime());
};

/** "7h 12m", "12m", or "under a minute". */
export const formatCountdown = (ms: number): string => {
  const minutes = Math.floor(ms / 60_000);

  if (minutes < 1) {
    return 'under a minute';
  }

  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};
