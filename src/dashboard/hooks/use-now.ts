import { useEffect, useState } from 'react';

/** The current time, updated as each minute (or second) turns over. */
export const useNow = (precision: 'minute' | 'second' = 'minute'): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: number;
    const step = precision === 'second' ? 1000 : 60_000;

    const schedule = (): void => {
      const current = Date.now();
      timer = window.setTimeout(
        () => {
          setNow(new Date());
          schedule();
        },
        step - (current % step) + 20
      );
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [precision]);

  return now;
};
